/**
 * Cloudinary image uploads for BazarBD.
 *
 * Cloud name is fixed to the project cloud. Uploads use an UNSIGNED upload
 * preset so the API secret never ships in the browser.
 *
 * Required env (Vite):
 *   VITE_CLOUDINARY_CLOUD_NAME=iok4ild8
 *   VITE_CLOUDINARY_UPLOAD_PRESET=<unsigned preset name>
 * Optional:
 *   VITE_CLOUDINARY_API_KEY=<public api key only>
 *   VITE_CLOUDINARY_FOLDER=bazarbd
 */

export const CLOUDINARY_CLOUD_NAME =
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ||
  'iok4ild8';

const UPLOAD_PRESET =
  (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim() ||
  '';

const DEFAULT_FOLDER =
  (import.meta.env.VITE_CLOUDINARY_FOLDER as string | undefined)?.trim() ||
  'bazarbd';

export type CloudinaryUploadResult = {
  url: string;
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resource_type?: string;
  raw: Record<string, unknown>;
};

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && UPLOAD_PRESET);
}

export function cloudinaryConfigError(): string | null {
  if (!CLOUDINARY_CLOUD_NAME) return 'VITE_CLOUDINARY_CLOUD_NAME is missing';
  if (!UPLOAD_PRESET) {
    return 'VITE_CLOUDINARY_UPLOAD_PRESET is missing — create an unsigned upload preset in Cloudinary and set it in Render env';
  }
  return null;
}

/** Delivery URL helpers (transforms). */
export function cloudinaryUrl(
  publicId: string,
  opts?: { width?: number; height?: number; crop?: string; quality?: string | number },
): string {
  const parts = ['f_auto', 'q_auto'];
  if (opts?.width) parts.push(`w_${opts.width}`);
  if (opts?.height) parts.push(`h_${opts.height}`);
  if (opts?.crop) parts.push(`c_${opts.crop}`);
  if (opts?.quality != null) parts.push(`q_${opts.quality}`);
  const transform = parts.join(',');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${publicId}`;
}

/**
 * Upload a browser File/Blob to Cloudinary (unsigned preset).
 * folder e.g. "ads/{adId}", "avatars/{userId}"
 */
export async function uploadToCloudinary(
  file: File | Blob,
  opts?: {
    folder?: string;
    publicId?: string;
    tags?: string[];
    context?: Record<string, string>;
  },
): Promise<CloudinaryUploadResult> {
  const cfgErr = cloudinaryConfigError();
  if (cfgErr) throw new Error(cfgErr);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);

  const folder = opts?.folder || DEFAULT_FOLDER;
  if (folder) form.append('folder', folder);
  if (opts?.publicId) form.append('public_id', opts.publicId);
  if (opts?.tags?.length) form.append('tags', opts.tags.join(','));
  if (opts?.context) {
    form.append(
      'context',
      Object.entries(opts.context)
        .map(([k, v]) => `${k}=${v}`)
        .join('|'),
    );
  }

  const res = await fetch(endpoint, { method: 'POST', body: form });
  const data = (await res.json()) as Record<string, any>;
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Cloudinary upload failed (${res.status})`;
    throw new Error(msg);
  }

  const secure = String(data.secure_url || data.url || '');
  if (!secure) throw new Error('Cloudinary response missing secure_url');

  return {
    url: secure,
    secure_url: secure,
    public_id: String(data.public_id || ''),
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
    resource_type: data.resource_type,
    raw: data,
  };
}

/** Upload many files; returns secure URLs in order. */
export async function uploadManyToCloudinary(
  files: Array<File | Blob>,
  opts?: { folder?: string; tags?: string[] },
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const r = await uploadToCloudinary(file, opts);
    urls.push(r.secure_url);
  }
  return urls;
}
