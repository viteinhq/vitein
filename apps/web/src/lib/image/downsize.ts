/**
 * Client-side image downsize for cover uploads.
 *
 * Why this lives in the browser, not the API: decoding a modern phone
 * photo (24–48 MP) into RGBA requires ~96–192 MB of memory, which blows
 * past the Cloudflare Workers per-request budget. Browsers route image
 * decode through the GPU / a dedicated subsystem, so the device handles
 * it fine; running it before the bytes hit the network also gives the
 * user instant feedback and saves a huge round-trip.
 *
 * The helper is intentionally permissive: if anything goes wrong
 * (unsupported MIME, decode failure, no canvas context, toBlob returns
 * null), it returns the original file so the user is never blocked by
 * the optimisation step.
 */

const DEFAULT_MAX_EDGE = 2400;
const DEFAULT_QUALITY = 0.82;

// Formats the browser can decode into an <img>. HEIC/HEIF only on iOS
// Safari, but bailing out cleanly is fine for the others — they round-
// trip the original file.
const DECODABLE = /^image\/(jpeg|jpg|png|webp|heic|heif|avif)$/i;

export interface DownsizeOptions {
  maxEdge?: number;
  quality?: number;
}

export async function downsizeImageFile(file: File, options: DownsizeOptions = {}): Promise<File> {
  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  if (!file.type || !DECODABLE.test(file.type)) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      return file;
    }
    const { naturalWidth: width, naturalHeight: height } = img;
    if (!width || !height) return file;

    const longEdge = Math.max(width, height);
    // Already small AND already a JPEG → nothing to gain by re-encoding.
    // For HEIC / WebP / PNG, we still want to transcode to JPEG so the
    // server receives a format it can serve reliably.
    if (longEdge <= maxEdge && file.type === 'image/jpeg') return file;

    const scale = Math.min(1, maxEdge / longEdge);
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'cover';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
