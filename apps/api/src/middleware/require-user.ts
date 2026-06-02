import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Short-circuits with 401 unless the resolved auth context represents a
 * signed-in user — either a `user` (Better-Auth session cookie) or an
 * `oauth` token acting on a user's behalf. Mount per-route after the
 * global auth middleware.
 *
 * This middleware only asserts "we know who you are." It does NOT, on its
 * own, authorize anything for OAuth tokens: a valid OAuth bearer passes
 * regardless of its granted scopes. Therefore every route behind
 * `requireUser` MUST additionally either:
 *   - call `requireScope('…')` to constrain delegated OAuth access, or
 *   - call `requireSession` to forbid OAuth entirely (account-management,
 *     data export, deletion — actions no scope can express).
 * A route that does neither is reachable by any OAuth token. See the
 * note in `routes/users.ts`.
 */
export const requireUser = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const auth = c.var.auth;
  if (auth.kind !== 'user' && auth.kind !== 'oauth') {
    throw new UnauthorizedError('user.unauthorized', 'Sign-in required');
  }
  await next();
});
