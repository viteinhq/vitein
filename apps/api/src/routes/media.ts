import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { deleteMedia, listMedia, publicUrlFor, uploadMedia } from '../domain/media/media.js';
import { ValidationError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import { requireCreator } from '../middleware/require-creator.js';
import type { AppVariables, Env } from '../types/env.js';

export const mediaRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const idParamSchema = z.object({ id: z.string().uuid() });
const doubleIdParamSchema = z.object({ id: z.string().uuid(), mediaId: z.string().uuid() });

/**
 * All media routes are creator-scoped. Anonymous upload is not an option —
 * without auth we can't attribute quota, and the creator token is the
 * cheapest way to prove ownership of an event before letting someone write
 * to R2.
 */

mediaRoute.post(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireCreator('id'),
  async (c) => {
    if (!c.env.R2_MEDIA) {
      throw new ValidationError('Media storage is not configured in this environment.');
    }

    const { id } = c.req.valid('param');
    const url = new URL(c.req.url);
    const kindRaw = url.searchParams.get('kind');
    const kind = kindRaw === 'gallery' ? 'gallery' : 'cover';

    const buffer = await c.req.raw.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const row = await uploadMedia(db(c.env), c.env.R2_MEDIA, {
      eventId: id,
      kind,
      bytes,
      declaredContentType: c.req.header('content-type') ?? undefined,
    });

    return c.json(toMedia(row, c.env), 201);
  },
);

mediaRoute.get(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const rows = await listMedia(db(c.env), id);
    return c.json({ items: rows.map((r) => toMedia(r, c.env)) });
  },
);

mediaRoute.delete(
  '/:mediaId',
  zValidator('param', doubleIdParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid id(s)', { issues: r.error.issues });
  }),
  requireCreator('id'),
  async (c) => {
    if (!c.env.R2_MEDIA) {
      throw new ValidationError('Media storage is not configured in this environment.');
    }
    const { id, mediaId } = c.req.valid('param');
    await deleteMedia(db(c.env), c.env.R2_MEDIA, id, mediaId);
    return c.body(null, 204);
  },
);

type MediaRow = Awaited<ReturnType<typeof listMedia>>[number];

function toMedia(row: MediaRow, env: Env) {
  const publicBase = env.MEDIA_PUBLIC_BASE_URL ?? '';
  return {
    id: row.id,
    eventId: row.eventId,
    kind: row.kind,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    position: row.position,
    url: publicBase ? publicUrlFor(publicBase, row.r2Key) : null,
    createdAt: row.createdAt.toISOString(),
  };
}
