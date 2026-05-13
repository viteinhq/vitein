import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Short-circuits with 401 unless the resolved auth context represents a
 * signed-in user — either a `user` (Better-Auth session cookie) or an
 * `oauth` token acting on a user's behalf. Mount per-route after the
 * global auth middleware.
 *
 * For OAuth tokens, scope-narrowing happens with `requireScope` at the
 * call site; this middleware only asserts "we know who you are."
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
