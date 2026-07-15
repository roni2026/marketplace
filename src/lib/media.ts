/**
 * Media management utilities: media library CRUD, duplicate detection,
 * image optimization, thumbnails, watermarks, ad media upload,
// reordering, and file validation.
 */

import { supabase } from '@/integrations/supabase/client';
import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';
import type {
  MediaLibraryItem,
  MediaLibraryInsert,
  AdMedia,
  AdMediaInsert,
  MediaType,
} from '@/integrations/supabase/types_v2_listings';

// -------------------------------------------------------------------------
// Media Library
// -------------------------------------------------------------------------

export async function uploadToMediaLibrary(
  userId: string,
  file: File
): Promise<MediaLibraryItem | null> {
  const hash = await computeFileHash(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Prefer Cloudinary when configured; fall back to Supabase Storage.
  let url = '';
  if (isCloudinaryConfigured()) {
    try {
      const up = await uploadToCloudinary(file, {
        folder: `bazarbd/media-library/${userId}`,
        tags: ['media-library', userId],
      });
      url = up.secure_url;
      // Keep a stable path-ish id for later deletes (best-effort)
      // filePath already generated above for supabase path; ignore when using CDN.
    } catch (err) {
      console.error('Cloudinary media-library upload failed, trying Supabase:', err);
    }
  }
  if (!url) {
    const { error: uploadError } = await supabase.storage
      .from('media-library')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Failed to upload file');
      console.error('uploadToMediaLibrary upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('media-library')
      .getPublicUrl(filePath);

    url = urlData.publicUrl;
  }

  // Generate thumbnail
  const thumbnailUrl = await generateThumbnail(file);

  // Get image dimensions
  let width: number | null = null;
  let height: number | null = null;
  if (file.type.startsWith('image/')) {
    const dims = await getImageDimensions(file);
    width = dims.width;
    height = dims.height;
  }

  // Check for duplicates
  const existing = await detectDuplicateImage(userId, hash);
  const duplicateOf = existing?.id || null;

  const payload: MediaLibraryInsert = {
    user_id: userId,
    filename: file.name,
    url,
    thumbnail_url: thumbnailUrl,
    file_size: file.size,
    mime_type: file.type,
    width,
    height,
    hash,
    duplicate_of: duplicateOf,
  };

  const { data, error } = await supabase
    .from('media_library')
    .insert(payload)
    .select()
    .single();

  if (error) {
    toast.error('Failed to add to media library');
    console.error('uploadToMediaLibrary insert error:', error);
    return null;
  }

  if (duplicateOf) {
    toast.info('Duplicate image detected in your library');
  } else {
    toast.success('File uploaded to media library');
  }
  return data as MediaLibraryItem;
}

export async function getMediaLibrary(userId: string): Promise<MediaLibraryItem[]> {
  const { data, error } = await supabase
    .from('media_library')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getMediaLibrary error:', error);
    return [];
  }
  return (data as MediaLibraryItem[]) || [];
}

export async function deleteMedia(mediaId: string): Promise<boolean> {
  // Fetch the media item to get the storage path
  const { data: media, error: fetchError } = await supabase
    .from('media_library')
    .select('url, user_id')
    .eq('id', mediaId)
    .single();

  if (fetchError || !media) {
    toast.error('Failed to find media');
    return false;
  }

  // Extract path from URL
  const url = media.url;
  const pathMatch = url.match(/\/media-library\/(.+)$/);
  if (pathMatch) {
    await supabase.storage.from('media-library').remove([pathMatch[1]]);
  }

  const { error } = await supabase
    .from('media_library')
    .delete()
    .eq('id', mediaId);

  if (error) {
    toast.error('Failed to delete media');
    console.error('deleteMedia error:', error);
    return false;
  }
  toast.success('Media deleted');
  return true;
}

// -------------------------------------------------------------------------
// Duplicate Detection
// -------------------------------------------------------------------------

export async function detectDuplicateImage(
  userId: string,
  hash: string
): Promise<MediaLibraryItem | null> {
  const { data, error } = await supabase
    .from('media_library')
    .select('*')
    .eq('user_id', userId)
    .eq('hash', hash)
    .is('duplicate_of', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('detectDuplicateImage error:', error);
    return null;
  }
  return data as MediaLibraryItem | null;
}

// -------------------------------------------------------------------------
// Image Optimization (client-side using canvas)
// -------------------------------------------------------------------------

export async function optimizeImage(
  file: File,
  options?: { maxWidth?: number; quality?: number }
): Promise<Blob | null> {
  const maxWidth = options?.maxWidth || 1200;
  const quality = options?.quality || 0.8;

  if (!file.type.startsWith('image/')) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob),
        file.type,
        quality
      );
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

// -------------------------------------------------------------------------
// Thumbnail Generation
// -------------------------------------------------------------------------

export async function generateThumbnail(
  file: File,
  size = 200
): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = img.width / img.height;
      let width = size;
      let height = size;

      if (ratio > 1) {
        height = Math.round(size / ratio);
      } else {
        width = Math.round(size * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

// -------------------------------------------------------------------------
// Watermark
// -------------------------------------------------------------------------

export async function addWatermark(
  imageUrl: string,
  watermarkText: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(16, Math.floor(img.width / 20));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      const padding = fontSize;
      ctx.fillText(watermarkText, img.width - padding, img.height - padding);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

// -------------------------------------------------------------------------
// Ad Media Upload
// -------------------------------------------------------------------------

export async function uploadAdMedia(
  adId: string,
  file: File,
  mediaType: MediaType
): Promise<AdMedia | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const filePath = `${adId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('ad-media')
    .upload(filePath, file);

  if (uploadError) {
    toast.error('Failed to upload media');
    console.error('uploadAdMedia upload error:', uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('ad-media')
    .getPublicUrl(filePath);

  const url = urlData.publicUrl;
  let thumbnailUrl: string | null = null;

  if (mediaType === 'image') {
    thumbnailUrl = await generateThumbnail(file);
  }

  // Get current max sort order
  const { data: existing } = await supabase
    .from('ad_media')
    .select('sort_order')
    .eq('ad_id', adId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSort = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0;

  const payload: AdMediaInsert = {
    ad_id: adId,
    media_type: mediaType,
    url,
    thumbnail_url: thumbnailUrl,
    sort_order: nextSort,
    metadata: { original_filename: file.name, file_size: file.size },
  };

  const { data, error } = await supabase
    .from('ad_media')
    .insert(payload)
    .select()
    .single();

  if (error) {
    toast.error('Failed to add ad media');
    console.error('uploadAdMedia insert error:', error);
    return null;
  }
  toast.success('Media uploaded');
  return data as AdMedia;
}

// -------------------------------------------------------------------------
// Reorder Ad Media (drag & drop ordering)
// -------------------------------------------------------------------------

export async function reorderAdMedia(
  adId: string,
  mediaIds: string[]
): Promise<boolean> {
  const updates = mediaIds.map((id, index) =>
    supabase
      .from('ad_media')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('ad_id', adId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    toast.error('Failed to reorder media');
    console.error('reorderAdMedia error');
    return false;
  }
  toast.success('Media reordered');
  return true;
}

// -------------------------------------------------------------------------
// File Validation
// -------------------------------------------------------------------------

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  const maxDuration = 60; // 60 seconds

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid video format. Allowed: MP4, WebM, OGG, MOV' };
  }
  if (file.size > maxSize) {
    return { valid: false, error: 'Video file too large. Maximum size: 100MB' };
  }

  // Duration check would require loading the video element
  // This is a placeholder — actual duration validation happens client-side
  void maxDuration;
  return { valid: true };
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const minDimension = 200;
  const maxDimension = 8000;

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid image format. Allowed: JPEG, PNG, WebP, GIF' };
  }
  if (file.size > maxSize) {
    return { valid: false, error: 'Image file too large. Maximum size: 10MB' };
  }

  // Dimension check is async — placeholder for client-side validation
  void minDimension;
  void maxDimension;
  return { valid: true };
}

// -------------------------------------------------------------------------
// CDN URL
// -------------------------------------------------------------------------

export async function getImageCDNUrl(mediaId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('media_library')
    .select('url')
    .eq('id', mediaId)
    .single();

  if (error || !data) {
    console.error('getImageCDNUrl error:', error);
    return null;
  }
  return data.url;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}
