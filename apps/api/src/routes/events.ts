import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createEvent,
  getEventBySlug,
  getEventForCreator,
  getEventPublic,
  softDeleteEvent,
  updateEvent,
} from '../domain/events/events.js';
import { buildEventIcs } from '../domain/events/ics.js';
import { ValidationError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import { sendCreatorMagicLink } from '../infra/email.js';
import { requireCreator } from '../middleware/require-creator.js';
import type { AppVariables, Env } from '../types/env.js';
import { guestsRoute } from './guests.js';
import { mediaRoute } from './media.js';
import { remindersRoute } from './reminders.js';
import { rsvpsRoute } from './rsvps.js';

export const eventsRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

eventsRoute.route('/:id/rsvps', rsvpsRoute);
eventsRoute.route('/:id/guests', guestsRoute);
eventsRoute.route('/:id/reminders', remindersRoute);
eventsRoute.route('/:id/media', mediaRoute);

const eventCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  timezone: z.string().min(1).max(64),
  locationText: z.string().max(500).nullable().optional(),
  creatorEmail: z.string().email(),
  defaultLocale: z.string().min(2).max(10).optional(),
  visibility: z.enum(['link_only', 'public']).optional(),
});

const eventUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    timezone: z.string().min(1).max(64).optional(),
    locationText: z.string().max(500).nullable().optional(),
    defaultLocale: z.string().min(2).max(10).optional(),
    visibility: z.enum(['link_only', 'public']).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Provide at least one field to update',
  });

const idSchema = z.object({ id: z.string().uuid() });

eventsRoute.post(
  '/',
  zValidator('json', eventCreateSchema, (result) => {
    if (!result.success) {
      throw new ValidationError('Invalid event body', { issues: result.error.issues });
    }
  }),
  async (c) => {
    const input = c.req.valid('json');
    const { event, creatorToken } = await createEvent(db(c.env), {
      ...input,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    });

    const manageUrl = `${c.env.WEB_BASE_URL ?? 'https://vite.in'}/e/${event.slug}/manage?token=${creatorToken}`;
    const { sent } = await sendCreatorMagicLink(c.env, {
      to: event.creatorEmail,
      eventTitle: event.title,
      manageUrl,
    });

    return c.json(
      {
        event: toPublic(event),
        magicLinkSent: sent,
        creatorTokenPreview: sent ? null : creatorToken,
      },
      201,
    );
  },
);

eventsRoute.get(
  '/by-slug/:slug',
  zValidator('param', z.object({ slug: z.string().min(1).max(64) }), (result) => {
    if (!result.success) throw new ValidationError('Invalid slug', { issues: result.error.issues });
  }),
  async (c) => {
    const { slug } = c.req.valid('param');
    const event = await getEventBySlug(db(c.env), slug);
    return c.json(toPublic(event));
  },
);

eventsRoute.get(
  '/by-slug/:slug/ics',
  zValidator('param', z.object({ slug: z.string().min(1).max(64) }), (result) => {
    if (!result.success) throw new ValidationError('Invalid slug', { issues: result.error.issues });
  }),
  async (c) => {
    const { slug } = c.req.valid('param');
    const event = await getEventBySlug(db(c.env), slug);
    const webBase = c.env.WEB_BASE_URL ?? 'https://vite.in';
    const ics = buildEventIcs(event, `${webBase}/e/${event.slug}`);
    c.header('Content-Type', 'text/calendar; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${event.slug}.ics"`);
    return c.body(ics);
  },
);

eventsRoute.get(
  '/:id',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const event = await getEventPublic(db(c.env), id);
    return c.json(toPublic(event));
  },
);

eventsRoute.get(
  '/:id/manage',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  requireCreator('id'),
  async (c) => {
    const { id } = c.req.valid('param');
    const event = await getEventForCreator(db(c.env), id);
    return c.json(toManage(event));
  },
);

eventsRoute.patch(
  '/:id',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  requireCreator('id'),
  zValidator('json', eventUpdateSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid update body', { issues: result.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const input = c.req.valid('json');
    const event = await updateEvent(db(c.env), id, {
      title: input.title,
      description: input.description,
      timezone: input.timezone,
      locationText: input.locationText,
      defaultLocale: input.defaultLocale,
      visibility: input.visibility,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null,
    });
    return c.json(toManage(event));
  },
);

eventsRoute.delete(
  '/:id',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  requireCreator('id'),
  async (c) => {
    const { id } = c.req.valid('param');
    await softDeleteEvent(db(c.env), id);
    return c.body(null, 204);
  },
);

type EventRow = Awaited<ReturnType<typeof getEventPublic>>;

function toPublic(e: EventRow) {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    timezone: e.timezone,
    locationText: e.locationText,
    visibility: e.visibility,
    defaultLocale: e.defaultLocale,
  };
}

function toManage(e: EventRow) {
  return {
    ...toPublic(e),
    creatorEmail: e.creatorEmail,
    creatorUserId: e.creatorUserId,
    isPaid: e.isPaid,
    paidFeatures: e.paidFeatures,
    paymentProvider: e.paymentProvider,
    paymentRef: e.paymentRef,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
