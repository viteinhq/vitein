import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Short-circuits with 401 unless the resolved auth context is `creator` and
 * matches the event id in the path parameter. Mount per-route after the
 * global auth middleware.
 */
export function requireCreator(param: string) {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
    const auth = c.var.auth;
    if (auth.kind !== 'creator') {
      throw new UnauthorizedError('event.unauthorized', 'Creator token required');
    }
    const eventId = c.req.param(param);
    if (!eventId || auth.eventId !== eventId) {
      throw new UnauthorizedError('event.unauthorized', 'Token does not match this event');
    }
    await next();
  });
}
