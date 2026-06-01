import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthContext } from '../domain/auth/context.js';
import { listAuditForUser } from '../domain/audit/audit.js';
import {
  exportMe,
  getMe,
  getMyEvents,
  getMyStats,
  softDeleteMe,
  updateMe,
} from '../domain/users/users.js';
import { ValidationError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import { requireScope } from '../middleware/require-scope.js';
import { requireSession } from '../middleware/require-session.js';
import { requireUser } from '../middleware/require-user.js';
import type { AppVariables, Env } from '../types/env.js';

export const usersRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Baseline: every /me route needs *some* authenticated identity (never
// anonymous). Account-management routes additionally mount `requireSession`
// so a delegated OAuth token cannot reach them — see the per-route notes.
//
// IMPORTANT: a new account-management route added here is, by default, only
// guarded by `requireUser` and is therefore reachable by ANY OAuth token
// regardless of scope. Add `requireSession` to it unless it is genuinely a
// scoped, delegate-able read (like `/me/events`).
usersRoute.use('*', requireUser);

/**
 * Both `kind: 'user'` (session) and `kind: 'oauth'` (bearer) carry a
 * `userId`. This narrows the union so the route handlers stay terse.
 */
function userIdFromAuth(auth: AuthContext): string {
  if (auth.kind !== 'user' && auth.kind !== 'oauth') {
    throw new Error('unreachable — requireUser should have rejected');
  }
  return auth.userId;
}

usersRoute.get('/me', requireSession, async (c) => {
  const user = await getMe(db(c), userIdFromAuth(c.var.auth));
  return c.json(toProfile(user));
});

const updateMeInputSchema = z.object({
  name: z.string().max(200).nullable().optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

usersRoute.patch(
  '/me',
  requireSession,
  zValidator('json', updateMeInputSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid profile update', { issues: result.error.issues });
  }),
  async (c) => {
    const input = c.req.valid('json');
    const user = await updateMe(db(c), userIdFromAuth(c.var.auth), input);
    return c.json(toProfile(user));
  },
);

usersRoute.delete('/me', requireSession, async (c) => {
  await softDeleteMe(db(c), userIdFromAuth(c.var.auth));
  return c.body(null, 204);
});

usersRoute.get('/me/events', requireScope('events:read'), async (c) => {
  const rows = await getMyEvents(db(c), userIdFromAuth(c.var.auth));
  return c.json({
    items: rows.map((e) => ({
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
    })),
  });
});

usersRoute.get('/me/stats', requireSession, async (c) => {
  const stats = await getMyStats(db(c), userIdFromAuth(c.var.auth));
  return c.json(stats);
});

usersRoute.get('/me/audit', requireSession, async (c) => {
  const rows = await listAuditForUser(db(c), userIdFromAuth(c.var.auth));
  return c.json({
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      eventId: r.eventId,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

usersRoute.get('/me/export', requireSession, async (c) => {
  const bundle = await exportMe(db(c), userIdFromAuth(c.var.auth));
  return c.json({
    exportedAt: bundle.exportedAt.toISOString(),
    user: toProfile(bundle.user),
    events: bundle.events.map((e) => ({
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
    })),
    rsvps: bundle.rsvps.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      guestId: r.guestId,
      name: r.name,
      email: r.email,
      status: r.status as 'yes' | 'maybe' | 'no',
      plusOnes: r.plusOnes,
      message: r.message,
      respondedAt: r.respondedAt.toISOString(),
    })),
  });
});

type UserRow = Awaited<ReturnType<typeof getMe>>;

function toProfile(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    emailVerified: u.emailVerified,
    name: u.name,
    image: u.image,
    locale: u.locale,
    timezone: u.timezone,
    createdAt: u.createdAt.toISOString(),
  };
}
