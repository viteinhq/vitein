/**
 * The resolved authentication context for a request. Populated by
 * `middleware/auth.ts`. Consumers read it via `c.get('auth')`.
 *
 * Phases:
 * - Phase 1: `anonymous` and `creator`.
 * - Phase 1+ (once Better-Auth is wired in): `user`.
 * - Phase 2: `oauth`.
 * - Phase 3: `api_key`.
 *
 * An `oauth` context represents a request from a third-party (or
 * first-party MCP) client acting on a user's behalf via OAuth 2.1
 * + PKCE. `scopes` is the subset the user actually granted, checked
 * at every protected endpoint via `requireScope`.
 */
export type AuthContext =
  | { kind: 'anonymous' }
  | { kind: 'creator'; eventId: string; tokenId: string }
  | { kind: 'user'; userId: string; scopes: ['*'] }
  | { kind: 'oauth'; userId: string; clientId: string; scopes: readonly string[] };
