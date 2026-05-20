import { describe, expect, it } from 'vitest';
import { readImageDimensions } from '../src/domain/media/dimensions.js';

/** Build a Uint8Array from byte values, optionally zero-padded to `length`. */
function bytes(values: number[], length?: number): Uint8Array {
  const arr = new Uint8Array(length ?? values.length);
  arr.set(values);
  return arr;
}

describe('readImageDimensions', () => {
  it('reads PNG dimensions from the IHDR chunk', () => {
    const png = bytes([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // signature
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52, // length + "IHDR"
      0x00,
      0x00,
      0x00,
      0x64, // width 100
      0x00,
      0x00,
      0x00,
      0x32, // height 50
    ]);
    expect(readImageDimensions(png, 'image/png')).toEqual({ width: 100, height: 50 });
  });

  it('reads GIF dimensions from the screen descriptor', () => {
    const gif = bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x64, 0x00, 0x32, 0x00]);
    expect(readImageDimensions(gif, 'image/gif')).toEqual({ width: 100, height: 50 });
  });

  it('reads JPEG dimensions from the first SOF marker', () => {
    const jpeg = bytes([
      0xff,
      0xd8, // SOI
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      0x00,
      0x32,
      0x00,
      0x64, // SOF0: height 50, width 100
    ]);
    expect(readImageDimensions(jpeg, 'image/jpeg')).toEqual({ width: 100, height: 50 });
  });

  it('walks past a leading JPEG APP0 segment', () => {
    const jpeg = bytes([
      0xff,
      0xd8, // SOI
      0xff,
      0xe0,
      0x00,
      0x04,
      0x00,
      0x00, // APP0 segment, length 4
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      0x01,
      0x00,
      0x02,
      0x00, // SOF0: height 256, width 512
    ]);
    expect(readImageDimensions(jpeg, 'image/jpeg')).toEqual({ width: 512, height: 256 });
  });

  it('reads WebP VP8X dimensions', () => {
    const webp = bytes(
      [
        0x52,
        0x49,
        0x46,
        0x46,
        0,
        0,
        0,
        0,
        0x57,
        0x45,
        0x42,
        0x50, // RIFF....WEBP
        0x56,
        0x50,
        0x38,
        0x58, // "VP8X"
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0, // chunk size + flags
        0x63,
        0x00,
        0x00, // width - 1 = 99
        0x31,
        0x00,
        0x00, // height - 1 = 49
      ],
      30,
    );
    expect(readImageDimensions(webp, 'image/webp')).toEqual({ width: 100, height: 50 });
  });

  it('returns null for AVIF and for truncated headers', () => {
    expect(readImageDimensions(bytes([0, 0, 0, 0]), 'image/avif')).toBeNull();
    expect(readImageDimensions(bytes([0x89, 0x50]), 'image/png')).toBeNull();
  });
});
