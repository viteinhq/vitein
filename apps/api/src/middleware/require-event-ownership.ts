import { eq, events } from '@vitein/db-schema';
import { createMiddleware } from 'hono/factory';
import { NotFoundError, UnauthorizedError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Short-circuits with 401 unless the resolved auth context proves the
 * caller owns the event referenced by the path parameter. Three accepted
 * paths:
 *
 *   1. `kind: 'creator'` with `eventId` matching the path — same as
 *      `requireCreator`, this is the magic-link case.
 *   2. `kind: 'user'` whose `userId` matches `events.creator_user_id`
 *      — the signed-in dashboard case. Account claim already wired
 *      `creator_user_id` on sign-up via `POST /v1/auth/claim`.
 *   3. `kind: 'oauth'` whose `userId` matches AND whose `scopes`
 *      include the required scope — the agent case.
 *
 * Why one middleware instead of three: every manage-style route has the
 * same authorization question ("does this caller own this event?"), and
 * the answer threads through three different signals. Centralising
 * keeps the routes terse — they just say `requireEventOwnership('id',
 * { scope: 'events:write' })` and stop thinking about it.
 *
 * The middleware fetches the event row (creator_user_id + nothing else)
 * for paths 2 and 3 — one extra select per request to authenticated
 * callers, but it's bounded and avoids leaking event metadata to
 * unauthorized callers via timing differences.
 */
export function requireEventOwnership(idParam: string, opts?: { scope?: string }) {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
    const auth = c.var.auth;
    const eventId = c.req.param(idParam);
    if (!eventId) {
      throw new UnauthorizedError('event.unauthorized', 'Invalid event id');
    }

    // Path 1: creator-token already proves ownership of this specific event.
    if (auth.kind === 'creator') {
      if (auth.eventId !== eventId) {
        throw new UnauthorizedError('event.unauthorized', 'Token does not match this event');
      }
      await next();
      return;
    }

    // Paths 2 + 3: signed-in user or OAuth bearer. We need to check the
    // event's creator_user_id matches the caller's userId.
    if (auth.kind === 'user' || auth.kind === 'oauth') {
      if (auth.kind === 'oauth' && opts?.scope) {
        if (!auth.scopes.includes(opts.scope)) {
          throw new UnauthorizedError(
            'oauth.insufficient_scope',
            `Required scope not granted: ${opts.scope}`,
          );
        }
      }

      const [row] = await db(c)
        .select({ creatorUserId: events.creatorUserId })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!row) {
        throw new NotFoundError('event.not_found', 'Event not found');
      }
      if (row.creatorUserId !== auth.userId) {
        throw new UnauthorizedError('event.unauthorized', 'Event does not belong to this user');
      }

      await next();
      return;
    }

    throw new UnauthorizedError('event.unauthorized', 'Creator token required');
  });
}
