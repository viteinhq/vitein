import { decode as decodeJpeg, encode as encodeJpeg } from '@jsquash/jpeg';
import resize from '@jsquash/resize';

// `ImageData` is a DOM global that the API's tsconfig doesn't pull in.
// jsquash's types name it directly, so without this shim every `decode()`
// / `resize()` result reads as `any` and ESLint's no-unsafe-assignment
// trips. The shape is enough for jsquash's typed surface — the WASM
// modules do the real work at runtime.
declare global {
  interface ImageData {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
  }
}

/**
 * Maximum long-edge (px) of a stored cover. Picked so the served image
 * stays well under iOS Safari's image-decode ceiling (~16 MP at the
 * pessimistic end) while keeping reasonable detail for 2x retina displays
 * on phones and tablets. Roughly 2400×1800 ≈ 4 MP.
 */
export const RESIZE_LONG_EDGE = 2400;

/** Re-encoded JPEG quality. 82 is the sweet spot — file shrinks ~5× from the
 *  original while keeping perceptual fidelity on photographic content. */
const JPEG_QUALITY = 82;

export interface ResizeResult {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * If the image is a JPEG whose long edge exceeds `RESIZE_LONG_EDGE`, decode
 * it, resize keeping aspect ratio, and re-encode at our target quality.
 * Returns null when no work was needed (already small enough, or decoding
 * was a no-op). Throws on decode/encode failure — the caller is expected
 * to swallow and fall back to the original bytes if it wants leniency.
 */
export async function maybeResizeJpeg(
  bytes: Uint8Array,
  width: number,
  height: number,
): Promise<ResizeResult | null> {
  const longEdge = Math.max(width, height);
  if (longEdge <= RESIZE_LONG_EDGE) return null;

  const scale = RESIZE_LONG_EDGE / longEdge;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  // jsquash expects an ArrayBuffer; `slice()` returns a fresh-backed
  // Uint8Array whose .buffer is exactly the bytes we want.
  const decoded = await decodeJpeg(bytes.slice().buffer);
  const downsized = await resize(decoded, {
    width: targetWidth,
    height: targetHeight,
  });
  const encoded = await encodeJpeg(downsized, { quality: JPEG_QUALITY });

  return {
    bytes: new Uint8Array(encoded),
    width: targetWidth,
    height: targetHeight,
  };
}
