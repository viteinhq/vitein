import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Short-circuits with 401 unless the caller holds a first-party user
 * SESSION (Better-Auth cookie) — i.e. `auth.kind === 'user'`.
 *
 * Unlike `requireUser`, this deliberately REJECTS OAuth bearer tokens,
 * even valid ones. Account-management endpoints (profile read/update,
 * GDPR data export, account deletion, event claim) must never be
 * reachable by a delegated agent token regardless of its granted
 * scopes: the issued scopes (`events:read`, `guests:write`, …) cannot
 * express "manage the account itself", so there is no scope under which
 * an OAuth token should be allowed to export all data or delete the
 * account. Gating those routes on scope alone fails open — this gates
 * on the credential kind instead.
 *
 * Mount it per-route, on top of the route group's baseline `requireUser`.
 */
export const requireSession = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  if (c.var.auth.kind !== 'user') {
    throw new UnauthorizedError(
      'user.session_required',
      'A signed-in session is required for this action',
    );
  }
  await next();
});
