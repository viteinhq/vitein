import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Short-circuits with 401 unless the caller has the given OAuth scope (or
 * is a user-session caller, which carries `scopes: ['*']`).
 *
 * Wear it on top of `requireUser`: `requireUser` proves "signed in";
 * `requireScope('events:read')` then narrows OAuth callers to those who
 * explicitly granted that permission.
 *
 * Why a separate middleware: scope decisions are per-endpoint, not
 * per-session, and bundling them into the user-resolver would force
 * every route to re-state its needs in two places.
 */
export function requireScope(...scopes: readonly string[]) {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
    const auth = c.var.auth;

    // Session-level callers have full access — they signed in directly.
    if (auth.kind === 'user') {
      await next();
      return;
    }

    if (auth.kind === 'oauth') {
      const granted = new Set(auth.scopes);
      const missing = scopes.filter((s) => !granted.has(s));
      if (missing.length > 0) {
        throw new UnauthorizedError(
          'oauth.insufficient_scope',
          `Required scope(s) not granted: ${missing.join(', ')}`,
        );
      }
      await next();
      return;
    }

    throw new UnauthorizedError('user.unauthorized', 'Sign-in required');
  });
}
