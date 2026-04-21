import { describe, expect, it } from 'vitest';
import { extensionFor, sniffImageMime } from '../src/domain/media/mime.js';

function bytes(...b: number[]): Uint8Array {
  return new Uint8Array(b);
}

describe('sniffImageMime', () => {
  it('detects JPEG', () => {
    expect(sniffImageMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe('image/jpeg');
  });

  it('detects PNG', () => {
    expect(sniffImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
  });

  it('detects GIF87a + GIF89a', () => {
    expect(sniffImageMime(bytes(0x47, 0x49, 0x46, 0x38, 0x37, 0x61))).toBe('image/gif');
    expect(sniffImageMime(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe('image/gif');
  });

  it('detects WebP (RIFF … WEBP)', () => {
    expect(
      sniffImageMime(
        bytes(
          0x52,
          0x49,
          0x46,
          0x46, // RIFF
          0,
          0,
          0,
          0, // size
          0x57,
          0x45,
          0x42,
          0x50, // WEBP
        ),
      ),
    ).toBe('image/webp');
  });

  it('detects AVIF (ISO BMFF ftyp avif)', () => {
    expect(
      sniffImageMime(
        bytes(
          0,
          0,
          0,
          0x20, // size prefix
          0x66,
          0x74,
          0x79,
          0x70, // ftyp
          0x61,
          0x76,
          0x69,
          0x66, // avif
        ),
      ),
    ).toBe('image/avif');
  });

  it('returns null for unknown payloads', () => {
    expect(sniffImageMime(bytes(1, 2, 3, 4))).toBeNull();
    expect(sniffImageMime(new Uint8Array(0))).toBeNull();
    // Plain PDF
    expect(sniffImageMime(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull();
  });
});

describe('extensionFor', () => {
  it('maps each accepted MIME to a lowercase extension', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/png')).toBe('png');
    expect(extensionFor('image/webp')).toBe('webp');
    expect(extensionFor('image/gif')).toBe('gif');
    expect(extensionFor('image/avif')).toBe('avif');
  });
});
