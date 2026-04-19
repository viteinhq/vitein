import { Hono } from 'hono';
import { claimEventsForUser } from '../domain/users/claim.js';
import { getMe } from '../domain/users/users.js';
import { db } from '../infra/db.js';
import { requireUser } from '../middleware/require-user.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * POST /v1/auth/claim — attributes anonymously-created events to the
 * authenticated user when the event's `creatorEmail` matches the user's
 * email (case-insensitive). Safe to call repeatedly.
 *
 * This route is mounted BEFORE the `/v1/auth/*` Better-Auth catch-all in
 * `index.ts` so it is matched first.
 */
export const claimRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

claimRoute.post('/', requireUser, async (c) => {
  if (c.var.auth.kind !== 'user') throw new Error('unreachable');
  const user = await getMe(db(c.env), c.var.auth.userId);
  const result = await claimEventsForUser(db(c.env), user.id, user.email);
  return c.json(result);
});
