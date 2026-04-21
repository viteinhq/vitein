/**
 * Magic-number based MIME sniffing.
 *
 * Never trust the client's Content-Type header. We check the first N bytes
 * of the payload against known image signatures and derive the MIME from
 * that. If no signature matches, the upload is rejected.
 */

export type AcceptedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/avif';

export const ACCEPTED_MIMES: readonly AcceptedMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
// AVIF — ISO BMFF file with `ftyp` box and brand `avif` or `avis`.
const FTYP = [0x66, 0x74, 0x79, 0x70];
const AVIF = [0x61, 0x76, 0x69, 0x66];
const AVIS = [0x61, 0x76, 0x69, 0x73];

export function sniffImageMime(bytes: Uint8Array): AcceptedMime | null {
  if (startsWith(bytes, JPEG)) return 'image/jpeg';
  if (startsWith(bytes, PNG)) return 'image/png';
  if (startsWith(bytes, GIF87) || startsWith(bytes, GIF89)) return 'image/gif';
  if (startsWith(bytes, RIFF) && startsAt(bytes, 8, WEBP)) return 'image/webp';
  if (startsAt(bytes, 4, FTYP) && (startsAt(bytes, 8, AVIF) || startsAt(bytes, 8, AVIS))) {
    return 'image/avif';
  }
  return null;
}

export function extensionFor(mime: AcceptedMime): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/avif':
      return 'avif';
  }
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return startsAt(bytes, 0, signature);
}

function startsAt(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}
