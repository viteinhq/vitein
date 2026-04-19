import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { addGuest, listGuests } from '../domain/guests/guests.js';
import { ValidationError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import { requireCreator } from '../middleware/require-creator.js';
import type { AppVariables, Env } from '../types/env.js';

export const guestsRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const idParamSchema = z.object({ id: z.string().uuid() });

const guestInputSchema = z.object({
  name: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'E.164 phone number required')
    .nullable()
    .optional(),
  invitedVia: z.enum(['link', 'email', 'sms', 'whatsapp', 'agent']),
});

guestsRoute.post(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireCreator('id'),
  zValidator('json', guestInputSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid guest body', { issues: r.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const input = c.req.valid('json');
    const row = await addGuest(db(c.env), id, input);
    return c.json(toGuest(row), 201);
  },
);

guestsRoute.get(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireCreator('id'),
  async (c) => {
    const { id } = c.req.valid('param');
    const items = await listGuests(db(c.env), id);
    return c.json({ items: items.map(toGuest) });
  },
);

type GuestRow = Awaited<ReturnType<typeof addGuest>>;

function toGuest(g: GuestRow) {
  return {
    id: g.id,
    eventId: g.eventId,
    name: g.name,
    email: g.email,
    phone: g.phone,
    invitedVia: g.invitedVia,
    invitedAt: g.invitedAt.toISOString(),
  };
}
