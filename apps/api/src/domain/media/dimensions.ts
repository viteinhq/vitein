/**
 * Image dimension extraction from header bytes — no full decode.
 *
 * Populates `event_media.width/height` (so clients can reserve layout space
 * and avoid CLS) and feeds the pixel-count ceiling in `media.ts`. Parsing is
 * best-effort: an unrecognised or truncated header yields `null` and the
 * upload still proceeds.
 *
 * AVIF dimensions live in a nested ISO-BMFF `ispe` box; that parser is not
 * implemented, so AVIF uploads store no dimensions (see ADR 0007).
 */
import type { AcceptedMime } from './mime.js';

export interface ImageDimensions {
  width: number;
  height: number;
}

export function readImageDimensions(bytes: Uint8Array, mime: AcceptedMime): ImageDimensions | null {
  switch (mime) {
    case 'image/png':
      return readPng(bytes);
    case 'image/gif':
      return readGif(bytes);
    case 'image/jpeg':
      return readJpeg(bytes);
    case 'image/webp':
      return readWebp(bytes);
    case 'image/avif':
      return null;
  }
}

function u16be(b: Uint8Array, o: number): number {
  return (b[o]! << 8) | b[o + 1]!;
}
function u16le(b: Uint8Array, o: number): number {
  return b[o]! | (b[o + 1]! << 8);
}
function u24le(b: Uint8Array, o: number): number {
  return b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16);
}
function u32be(b: Uint8Array, o: number): number {
  return ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
}

/** PNG: width/height are big-endian uint32 in the IHDR chunk. */
function readPng(b: Uint8Array): ImageDimensions | null {
  if (b.length < 24) return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

/** GIF: width/height are little-endian uint16 in the logical screen descriptor. */
function readGif(b: Uint8Array): ImageDimensions | null {
  if (b.length < 10) return null;
  return { width: u16le(b, 6), height: u16le(b, 8) };
}

/** JPEG: walk segments to the first Start-Of-Frame marker. */
function readJpeg(b: Uint8Array): ImageDimensions | null {
  let off = 2; // skip SOI (FF D8)
  while (off + 4 <= b.length) {
    if (b[off] !== 0xff) {
      off += 1;
      continue;
    }
    const marker = b[off + 1]!;
    // Padding 0xFF, or standalone markers (RSTn, SOI, EOI, TEM) carry no length.
    if (marker === 0xff) {
      off += 1;
      continue;
    }
    if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) {
      off += 2;
      continue;
    }
    const segLen = u16be(b, off + 2);
    // SOF markers C0–CF, excluding DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (off + 9 > b.length) return null;
      return { height: u16be(b, off + 5), width: u16be(b, off + 7) };
    }
    off += 2 + segLen;
  }
  return null;
}

/** WebP: dimensions depend on the VP8 / VP8L / VP8X chunk variant. */
function readWebp(b: Uint8Array): ImageDimensions | null {
  if (b.length < 30) return null;
  const fourcc = String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!);

  if (fourcc === 'VP8 ') {
    // Lossy: 14-bit width/height after the 3-byte frame tag + start code.
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    // Lossless: 14-bit width-1/height-1 packed after the 0x2F signature byte.
    const b0 = b[21]!;
    const b1 = b[22]!;
    const b2 = b[23]!;
    const b3 = b[24]!;
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (fourcc === 'VP8X') {
    // Extended: 24-bit width-1/height-1 little-endian.
    return { width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) };
  }
  return null;
}
