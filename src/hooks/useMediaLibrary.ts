import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  uploadToMediaLibrary,
  getMediaLibrary,
  deleteMedia,
  detectDuplicateImage,
  uploadAdMedia,
  reorderAdMedia,
} from '@/lib/media';
import type {
  MediaLibraryItem,
  AdMedia,
  MediaType,
} from '@/integrations/supabase/types_v2_listings';

export function useMediaLibrary() {
  const { user } = useAuth();
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>([]);
  const [adMedia, setAdMedia] = useState<AdMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMediaLibrary = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMediaLibrary(user.id);
      setMediaLibrary(data);
    } catch (err) {
      setError('Failed to fetch media library');
      console.error('fetchMediaLibrary error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const uploadMedia = useCallback(
    async (file: File) => {
      if (!user) return { data: null, error: 'Not authenticated' };
      setIsLoading(true);
      try {
        const data = await uploadToMediaLibrary(user.id, file);
        if (data) {
          setMediaLibrary((prev) => [data, ...prev]);
          return { data, error: null };
        }
        return { data: null, error: 'Failed to upload media' };
      } catch (err) {
        setError('Failed to upload media');
        console.error('uploadMedia error:', err);
        return { data: null, error: 'Failed to upload media' };
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const handleDeleteMedia = useCallback(async (mediaId: string) => {
    const success = await deleteMedia(mediaId);
    if (success) {
      setMediaLibrary((prev) => prev.filter((m) => m.id !== mediaId));
    }
    return success;
  }, []);

  const detectDuplicate = useCallback(
    async (hash: string) => {
      if (!user) return null;
      return detectDuplicateImage(user.id, hash);
    },
    [user]
  );

  const handleUploadAdMedia = useCallback(
    async (adId: string, file: File, mediaType: MediaType) => {
      setIsLoading(true);
      try {
        const data = await uploadAdMedia(adId, file, mediaType);
        if (data) {
          setAdMedia((prev) => [...prev, data]);
          return { data, error: null };
        }
        return { data: null, error: 'Failed to upload ad media' };
      } catch (err) {
        setError('Failed to upload ad media');
        console.error('uploadAdMedia error:', err);
        return { data: null, error: 'Failed to upload ad media' };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleReorderMedia = useCallback(async (adId: string, mediaIds: string[]) => {
    const success = await reorderAdMedia(adId, mediaIds);
    if (success) {
      setAdMedia((prev) => {
        const reordered = mediaIds
          .map((id, index) => {
            const item = prev.find((m) => m.id === id);
            return item ? { ...item, sort_order: index } : null;
          })
          .filter((m): m is AdMedia => m !== null);
        return reordered;
      });
    }
    return success;
  }, []);

  useEffect(() => {
    if (user) {
      fetchMediaLibrary();
    }
  }, [user, fetchMediaLibrary]);

  return {
    mediaLibrary,
    adMedia,
    isLoading,
    error,
    fetchMediaLibrary,
    uploadMedia,
    deleteMedia: handleDeleteMedia,
    detectDuplicate,
    uploadAdMedia: handleUploadAdMedia,
    reorderMedia: handleReorderMedia,
  };
}
