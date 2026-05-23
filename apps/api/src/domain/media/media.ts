import { and, eq, eventMedia, events, isNull, type Db } from '@vitein/db-schema';
import { rootLogger } from '../../infra/logger.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors.js';
import { readImageDimensions } from './dimensions.js';
import { extensionFor, sniffImageMime, type AcceptedMime } from './mime.js';
import { maybeResizeJpeg } from './resize.js';

export const MAX_BYTES = 10 * 1024 * 1024; // 10 MiB
/**
 * Pixel-count ceiling — defence-in-depth against decompression-bomb inputs.
 * Set generously because JPEG uploads are downsized to `RESIZE_LONG_EDGE`
 * before storage; the ceiling only stops outright-pathological inputs.
 */
export const MAX_PIXELS = 50_000_000; // 50 MP
const MAX_PER_EVENT = 10;

export type MediaKind = 'cover' | 'gallery';

export interface UploadInput {
  eventId: string;
  kind?: MediaKind;
  bytes: Uint8Array;
  declaredContentType?: string | undefined;
}

export interface MediaBucket {
  put(
    key: string,
    body: Uint8Array,
    opts: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

export async function uploadMedia(
  db: Db,
  bucket: MediaBucket,
  input: UploadInput,
): Promise<typeof eventMedia.$inferSelect> {
  assertSize(input.bytes.byteLength);

  const mime = sniffImageMime(input.bytes);
  if (!mime) {
    throw new ValidationError('Only JPEG, PNG, WebP, GIF, or AVIF images are accepted.');
  }

  // Header-only dimension read — populates width/height and rejects
  // pathological pixel counts. `null` for headers we can't parse (AVIF).
  const dimensions = readImageDimensions(input.bytes, mime);
  if (dimensions && dimensions.width * dimensions.height > MAX_PIXELS) {
    throw new ValidationError(`Image exceeds the maximum of ${String(MAX_PIXELS)} pixels.`);
  }

  await assertEventActive(db, input.eventId);
  await assertQuota(db, input.eventId);

  // For JPEGs over the display-safe ceiling, downscale before storage so
  // browsers (notably iOS Safari, which silently refuses to decode images
  // past ~16 MP) can always render the cover. Failure to resize is
  // non-fatal: we keep the original bytes and log it; the upload still
  // succeeds, only the displayability of huge images becomes best-effort.
  let storedBytes = input.bytes;
  let storedWidth: number | null = dimensions?.width ?? null;
  let storedHeight: number | null = dimensions?.height ?? null;

  if (mime === 'image/jpeg' && dimensions) {
    try {
      const resized = await maybeResizeJpeg(input.bytes, dimensions.width, dimensions.height);
      if (resized) {
        storedBytes = resized.bytes;
        storedWidth = resized.width;
        storedHeight = resized.height;
      }
    } catch (err) {
      rootLogger.warn('media_resize_failed', {
        err: err as Error,
        width: dimensions.width,
        height: dimensions.height,
      });
    }
  }

  const kind = input.kind ?? 'cover';
  // Stage a new row to get an id; we use that id in the R2 key.
  const [staged] = await db
    .insert(eventMedia)
    .values({
      eventId: input.eventId,
      r2Key: 'pending',
      kind,
      mimeType: mime,
      sizeBytes: storedBytes.byteLength,
      width: storedWidth,
      height: storedHeight,
    })
    .returning();
  if (!staged) throw new Error('Media insert returned no row');

  const r2Key = buildR2Key(input.eventId, staged.id, mime);
  try {
    await bucket.put(r2Key, storedBytes, { httpMetadata: { contentType: mime } });
  } catch (err) {
    // Best-effort rollback — leave the DB clean on an R2 failure.
    await db.delete(eventMedia).where(eq(eventMedia.id, staged.id));
    throw err;
  }

  const [row] = await db
    .update(eventMedia)
    .set({ r2Key })
    .where(eq(eventMedia.id, staged.id))
    .returning();
  if (!row) throw new Error('Media update returned no row');
  return row;
}

export async function listMedia(
  db: Db,
  eventId: string,
): Promise<(typeof eventMedia.$inferSelect)[]> {
  await assertEventActive(db, eventId);
  return db
    .select()
    .from(eventMedia)
    .where(eq(eventMedia.eventId, eventId))
    .orderBy(eventMedia.position, eventMedia.createdAt);
}

export async function deleteMedia(
  db: Db,
  bucket: MediaBucket,
  eventId: string,
  mediaId: string,
): Promise<void> {
  const [row] = await db
    .select()
    .from(eventMedia)
    .where(and(eq(eventMedia.id, mediaId), eq(eventMedia.eventId, eventId)))
    .limit(1);
  if (!row) throw new NotFoundError('media.not_found', 'Media not found');

  await bucket.delete(row.r2Key).catch(() => {
    // R2 404 is fine — we still want to clear the row.
  });
  await db.delete(eventMedia).where(eq(eventMedia.id, mediaId));
}

export function publicUrlFor(baseUrl: string, r2Key: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${r2Key}`;
}

function assertSize(size: number): void {
  if (size === 0) throw new ValidationError('Empty upload body.');
  if (size > MAX_BYTES) {
    throw new ValidationError(`Upload exceeds maximum size of ${String(MAX_BYTES)} bytes.`);
  }
}

async function assertQuota(db: Db, eventId: string): Promise<void> {
  const existing = await db
    .select({ id: eventMedia.id })
    .from(eventMedia)
    .where(eq(eventMedia.eventId, eventId));
  if (existing.length >= MAX_PER_EVENT) {
    throw new ConflictError(
      'media.quota_exceeded',
      `At most ${String(MAX_PER_EVENT)} media per event.`,
    );
  }
}

async function assertEventActive(db: Db, eventId: string): Promise<void> {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('event.not_found', 'Event not found');
}

function buildR2Key(eventId: string, mediaId: string, mime: AcceptedMime): string {
  return `events/${eventId}/${mediaId}.${extensionFor(mime)}`;
}
