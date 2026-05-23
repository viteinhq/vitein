import { zValidator } from '@hono/zod-validator';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { applyGrantIfMatch } from '../domain/admin/grants.js';
import {
  createEvent,
  getEventBySlug,
  getEventForCreator,
  getEventPublic,
  softDeleteEvent,
  updateEvent,
} from '../domain/events/events.js';
import { buildEventIcs } from '../domain/events/ics.js';
import { verifyPassword } from '../domain/events/password.js';
import { assertLayoutAllowed, assertThemeAllowed } from '../domain/events/themes.js';
import {
  issueViewToken,
  isViewTokenValid,
  VIEW_TOKEN_TTL_SECONDS,
} from '../domain/events/view-tokens.js';
import { DomainError, UnauthorizedError, ValidationError } from '../domain/errors.js';
import { tierIncludes, tierOf } from '../domain/payments/payments.js';
import { db } from '../infra/db.js';
import { localeFromAcceptLanguage, sendCreatorMagicLink } from '../infra/email.js';
import { requireEventOwnership } from '../middleware/require-event-ownership.js';
import type { AppVariables, Env } from '../types/env.js';
import { announcementsRoute } from './announcements.js';
import { checkoutRoute } from './checkout.js';
import { guestsRoute } from './guests.js';
import { mediaRoute } from './media.js';
import { remindersRoute } from './reminders.js';
import { rsvpsRoute } from './rsvps.js';

export const eventsRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

eventsRoute.route('/:id/rsvps', rsvpsRoute);
eventsRoute.route('/:id/guests', guestsRoute);
eventsRoute.route('/:id/reminders', remindersRoute);
eventsRoute.route('/:id/media', mediaRoute);
eventsRoute.route('/:id/checkout', checkoutRoute);
eventsRoute.route('/:id/announcements', announcementsRoute);

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
  themeId: z.string().min(1).max(64).optional(),
  layout: z.string().min(1).max(64).optional(),
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
    themeId: z.string().min(1).max(64).optional(),
    layout: z.string().min(1).max(64).optional(),
    /** Custom URL slug (paid tiers). Lowercase alnum + hyphens, no edges. */
    slug: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
      .optional(),
    /** A.6b.2 password protection (Plus tier). null = clear, string = set. */
    password: z.string().min(4).max(200).nullable().optional(),
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
    // Only free themes may be chosen at creation — the event is unpaid.
    // Layout is free; only its id is validated.
    if (input.themeId !== undefined) {
      assertThemeAllowed(input.themeId, false);
    }
    if (input.layout !== undefined) {
      assertLayoutAllowed(input.layout);
    }
    const { event: created, creatorToken } = await createEvent(db(c), {
      ...input,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    });

    // If the creator's email is on an active admin grant, upgrade the
    // freshly-created event in place before we serialize it. Failures
    // here must not break event creation — log and continue.
    let event = created;
    try {
      const applied = await applyGrantIfMatch(db(c), created);
      if (applied) {
        event = applied.event;
      }
    } catch (err) {
      c.var.logger.warn('grant_apply_failed', { err: err as Error });
    }

    const manageUrl = `${c.env.WEB_BASE_URL ?? 'https://vite.in'}/e/${event.slug}/manage?token=${creatorToken}`;
    const { sent } = await sendCreatorMagicLink(
      c.env,
      {
        to: event.creatorEmail,
        eventTitle: event.title,
        manageUrl,
      },
      localeFromAcceptLanguage(event.defaultLocale),
    );

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
    const event = await getEventBySlug(db(c), slug);
    const locked = await resolveLocked(c, event);
    return c.json(toPublic(event, { locked }));
  },
);

eventsRoute.get(
  '/by-slug/:slug/ics',
  zValidator('param', z.object({ slug: z.string().min(1).max(64) }), (result) => {
    if (!result.success) throw new ValidationError('Invalid slug', { issues: result.error.issues });
  }),
  async (c) => {
    const { slug } = c.req.valid('param');
    const event = await getEventBySlug(db(c), slug);
    if (await resolveLocked(c, event)) {
      throw new UnauthorizedError(
        'event.locked',
        'This event is password-protected; unlock it in the web view first',
      );
    }
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
    const event = await getEventPublic(db(c), id);
    const locked = await resolveLocked(c, event);
    return c.json(toPublic(event, { locked }));
  },
);

eventsRoute.get(
  '/:id/manage',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  requireEventOwnership('id', { scope: 'events:read' }),
  async (c) => {
    const { id } = c.req.valid('param');
    const event = await getEventForCreator(db(c), id);
    return c.json(toManage(event));
  },
);

eventsRoute.patch(
  '/:id',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  requireEventOwnership('id', { scope: 'events:write' }),
  zValidator('json', eventUpdateSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid update body', { issues: result.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const input = c.req.valid('json');

    // Layout is free — validate the id without loading the event.
    if (input.layout !== undefined) {
      assertLayoutAllowed(input.layout);
    }
    // Feature-gate: setting a password (Plus tier), a premium theme, or a
    // custom slug (any paid tier) needs the event's current paid state —
    // load it once. Clearing a password (null) is always allowed.
    if (
      typeof input.password === 'string' ||
      input.themeId !== undefined ||
      input.slug !== undefined
    ) {
      const existing = await getEventForCreator(db(c), id);
      if (typeof input.password === 'string') {
        const tier = tierOf(existing);
        if (!tier || !tierIncludes(tier, 'password_protected')) {
          throw new DomainError(
            'event.feature_gated',
            'Password protection is a Plus-tier feature',
            403,
          );
        }
      }
      if (input.themeId !== undefined) {
        assertThemeAllowed(input.themeId, tierOf(existing) !== null);
      }
      if (input.slug !== undefined) {
        const tier = tierOf(existing);
        if (!tier || !tierIncludes(tier, 'custom_slug')) {
          throw new DomainError(
            'event.feature_gated',
            'A custom event URL requires a paid tier',
            403,
          );
        }
      }
    }

    const event = await updateEvent(db(c), id, {
      title: input.title,
      description: input.description,
      timezone: input.timezone,
      locationText: input.locationText,
      defaultLocale: input.defaultLocale,
      visibility: input.visibility,
      themeId: input.themeId,
      layout: input.layout,
      slug: input.slug,
      password: input.password,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null,
    });
    return c.json(toManage(event));
  },
);

eventsRoute.post(
  '/:id/verify-password',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  zValidator('json', z.object({ password: z.string().min(1).max(200) }), (result) => {
    if (!result.success)
      throw new ValidationError('Invalid verify body', { issues: result.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const { password } = c.req.valid('json');
    const event = await getEventPublic(db(c), id);
    if (!event.passwordHash) {
      // Nothing to verify — surface as unauthorized to avoid leaking state
      // about whether this event would be gated at all.
      throw new UnauthorizedError('event.no_password', 'Event is not password-protected');
    }
    const ok = await verifyPassword(password, event.passwordHash);
    if (!ok) throw new UnauthorizedError('event.password_invalid', 'Wrong password');

    const { token, expiresAt } = await issueViewToken(db(c), event.id);
    return c.json({
      token,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: VIEW_TOKEN_TTL_SECONDS,
    });
  },
);

eventsRoute.delete(
  '/:id',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  requireEventOwnership('id', { scope: 'events:write' }),
  async (c) => {
    const { id } = c.req.valid('param');
    await softDeleteEvent(db(c), id);
    return c.body(null, 204);
  },
);

type EventRow = Awaited<ReturnType<typeof getEventPublic>>;

interface PublicOpts {
  locked: boolean;
}

function toPublic(e: EventRow, opts: PublicOpts = { locked: false }) {
  const hasPassword = Boolean(e.passwordHash);
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: opts.locked ? null : e.description,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    timezone: e.timezone,
    locationText: opts.locked ? null : e.locationText,
    visibility: e.visibility,
    defaultLocale: e.defaultLocale,
    themeId: e.themeId,
    layout: e.layout,
    // Surface the premium tier so guest-facing UIs can enable per-tier
    // affordances (named plus-ones, hide branding). Null for unpaid events.
    tier: tierOf(e),
    hasPassword,
    // `hasPassword` is static (password set or not). `locked` is dynamic:
    // true only when the current caller has no valid view token. UIs
    // branch the password prompt on `locked`, not `hasPassword`.
    locked: opts.locked,
  };
}

function toManage(e: EventRow) {
  const base = toPublic(e, { locked: false });
  return {
    ...base,
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

/**
 * Decide whether the public-facing view of `event` should hide sensitive
 * fields (description, location). A password-protected event with no valid
 * `X-Event-View-Token` header is locked.
 */
async function resolveLocked(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  event: EventRow,
): Promise<boolean> {
  if (!event.passwordHash) return false;
  const token = c.req.header('X-Event-View-Token');
  if (!token) return true;
  return !(await isViewTokenValid(db(c), event.id, token));
}
