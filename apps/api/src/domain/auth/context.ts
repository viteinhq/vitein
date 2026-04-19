/**
 * The resolved authentication context for a request. Populated by
 * `middleware/auth.ts`. Consumers read it via `c.get('auth')`.
 *
 * Phases:
 * - Phase 1: `anonymous` and `creator`.
 * - Phase 1+ (once Better-Auth is wired in): `user`.
 * - Phase 2: `oauth`.
 * - Phase 3: `api_key`.
 */
export type AuthContext =
  | { kind: 'anonymous' }
  | { kind: 'creator'; eventId: string; tokenId: string }
  | { kind: 'user'; userId: string; scopes: ['*'] };
