import { Hono } from 'hono';
import { listAuditForUser } from '../domain/audit/audit.js';
import { exportMe, getMe, getMyEvents, softDeleteMe } from '../domain/users/users.js';
import { db } from '../infra/db.js';
import { requireUser } from '../middleware/require-user.js';
import type { AppVariables, Env } from '../types/env.js';

export const usersRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

usersRoute.use('*', requireUser);

usersRoute.get('/me', async (c) => {
  if (c.var.auth.kind !== 'user') throw new Error('unreachable');
  const user = await getMe(db(c.env), c.var.auth.userId);
  return c.json(toProfile(user));
});

usersRoute.delete('/me', async (c) => {
  if (c.var.auth.kind !== 'user') throw new Error('unreachable');
  await softDeleteMe(db(c.env), c.var.auth.userId);
  return c.body(null, 204);
});

usersRoute.get('/me/events', async (c) => {
  if (c.var.auth.kind !== 'user') throw new Error('unreachable');
  const rows = await getMyEvents(db(c.env), c.var.auth.userId);
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

usersRoute.get('/me/audit', async (c) => {
  if (c.var.auth.kind !== 'user') throw new Error('unreachable');
  const rows = await listAuditForUser(db(c.env), c.var.auth.userId);
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

usersRoute.get('/me/export', async (c) => {
  if (c.var.auth.kind !== 'user') throw new Error('unreachable');
  const bundle = await exportMe(db(c.env), c.var.auth.userId);
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
