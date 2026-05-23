import { describe, expect, it } from 'vitest';
import { uploadMedia, type MediaBucket } from '../src/domain/media/media.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Build a minimal PNG: signature + IHDR with the given dimensions. */
function pngBytes(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set(PNG_SIGNATURE, 0);
  b.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8); // chunk length + "IHDR"
  b.set([(width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff], 16);
  b.set([(height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff], 20);
  return b;
}

function fakeBucket(): MediaBucket {
  return { put: () => Promise.resolve(), delete: () => Promise.resolve() };
}

describe('uploadMedia', () => {
  it('stores a valid image and records its dimensions', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    const row = await uploadMedia(db, fakeBucket(), {
      eventId: event.id,
      bytes: pngBytes(800, 600),
    });
    expect(row.mimeType).toBe('image/png');
    expect(row.width).toBe(800);
    expect(row.height).toBe(600);
  });

  it('rejects an image over the 100 MP pixel ceiling', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    await expect(
      uploadMedia(db, fakeBucket(), { eventId: event.id, bytes: pngBytes(20000, 6000) }),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('rejects bytes that are not a recognised image', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    await expect(
      uploadMedia(db, fakeBucket(), { eventId: event.id, bytes: new Uint8Array([1, 2, 3, 4]) }),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });
});
