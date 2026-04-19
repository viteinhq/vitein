import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../domain/errors.js';
import { listRsvps, submitRsvp } from '../domain/rsvps/rsvps.js';
import { db } from '../infra/db.js';
import { sendRsvpConfirmation, sendRsvpNotification } from '../infra/email.js';
import { requireCreator } from '../middleware/require-creator.js';
import type { AppVariables, Env } from '../types/env.js';

export const rsvpsRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const idParamSchema = z.object({ id: z.string().uuid() });

const rsvpInputSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  status: z.enum(['yes', 'maybe', 'no']),
  message: z.string().max(2000).nullable().optional(),
  plusOnes: z.number().int().min(0).max(20).optional(),
  guestId: z.string().uuid().nullable().optional(),
});

rsvpsRoute.post(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  zValidator('json', rsvpInputSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid RSVP body', { issues: r.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const input = c.req.valid('json');
    const { rsvp, event } = await submitRsvp(db(c.env), id, input);

    const webBase = c.env.WEB_BASE_URL ?? 'https://vite.in';
    const eventUrl = `${webBase}/e/${event.slug}`;

    if (input.email) {
      await sendRsvpConfirmation(c.env, {
        to: input.email,
        eventTitle: event.title,
        status: input.status,
        eventUrl,
      }).catch((err: unknown) => {
        console.warn('[rsvp] confirmation email failed', err);
      });
    }

    await sendRsvpNotification(c.env, {
      to: event.creatorEmail,
      eventTitle: event.title,
      guestName: input.name,
      status: input.status,
      plusOnes: input.plusOnes ?? 0,
      manageUrl: `${webBase}/e/${event.slug}/manage`,
    }).catch((err: unknown) => {
      console.warn('[rsvp] notification email failed', err);
    });

    return c.json(toRsvp(rsvp), 201);
  },
);

rsvpsRoute.get(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireCreator('id'),
  async (c) => {
    const { id } = c.req.valid('param');
    const items = await listRsvps(db(c.env), id);
    return c.json({ items: items.map(toRsvp) });
  },
);

type RsvpRow = Awaited<ReturnType<typeof submitRsvp>>['rsvp'];

function toRsvp(r: RsvpRow) {
  return {
    id: r.id,
    eventId: r.eventId,
    guestId: r.guestId,
    name: r.name,
    email: r.email,
    status: r.status as 'yes' | 'maybe' | 'no',
    plusOnes: r.plusOnes,
    message: r.message,
    respondedAt: r.respondedAt.toISOString(),
  };
}
