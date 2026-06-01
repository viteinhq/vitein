import { verifyJwsAccessToken } from 'better-auth/oauth2';

// `jose`'s JSONWebKeySet shape isn't directly exposed by better-auth/oauth2,
// and `jose` isn't a direct dependency. Locally type it just enough.
interface JsonWebKeySetLike {
  keys: Array<Record<string, unknown>>;
}
import { and, eq, eventTokens } from '@vitein/db-schema';
import type { Context, MiddlewareHandler } from 'hono';
import type { AuthContext } from '../domain/auth/context.js';
import { hashToken } from '../domain/auth/tokens.js';
import { createAuth, deriveMcpUrl } from '../infra/auth.js';
import { db, dbConnectionString } from '../infra/db.js';
import { rootLogger } from '../infra/logger.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Resolve the request's authentication context and stash it on `c.var.auth`.
 *
 * Precedence:
 *   1. `X-Creator-Token` header (creator).
 *   2. `Authorization: Bearer <jwt>` (OAuth 2.1 access token — Phase 2).
 *   3. Better-Auth session cookie (user).
 *   4. Anonymous.
 *
 * Creator tokens win over sessions so signed-in users can still hold a
 * creator link for an event that was anonymously created with a different
 * email — the token represents direct proof-of-creation. OAuth bearer
 * comes before the cookie path so an OAuth client that happens to share a
 * browser cookie with the user resolves with scoped permissions, not full
 * session-level `'*'`.
 */
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: AppVariables;
}> = async (c, next) => {
  const creatorToken = c.req.header('X-Creator-Token');
  if (creatorToken) {
    c.set('auth', await resolveCreatorToken(c, creatorToken));
    await next();
    return;
  }

  const bearer = extractBearer(c.req.header('Authorization'));
  if (bearer) {
    const oauth = await resolveOAuthBearer(c, bearer);
    if (oauth) {
      c.set('auth', oauth);
      await next();
      return;
    }
    // Bearer present but invalid — fall through to anonymous rather than
    // also probing the cookie. Mixing bearer-and-cookie auth would let a
    // failed OAuth client silently fall back to the user's full session.
    c.set('auth', anonymous());
    await next();
    return;
  }

  const userAuth = await resolveUserSession(c, c.req.raw);
  c.set('auth', userAuth ?? anonymous());
  await next();
};

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

function anonymous(): AuthContext {
  return { kind: 'anonymous' };
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

async function resolveCreatorToken(c: AppContext, token: string): Promise<AuthContext> {
  if (!dbConnectionString(c.env)) return anonymous();

  const hash = await hashToken(token);
  const [row] = await db(c)
    .select({
      id: eventTokens.id,
      eventId: eventTokens.eventId,
      expiresAt: eventTokens.expiresAt,
      revokedAt: eventTokens.revokedAt,
    })
    .from(eventTokens)
    .where(and(eq(eventTokens.tokenHash, hash), eq(eventTokens.purpose, 'manage')))
    .limit(1);

  if (!row || row.revokedAt) return anonymous();
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return anonymous();

  return { kind: 'creator', eventId: row.eventId, tokenId: row.id };
}

async function resolveUserSession(c: AppContext, request: Request): Promise<AuthContext | null> {
  if (!dbConnectionString(c.env) || !c.env.AUTH_SECRET) return null;
  try {
    const auth = createAuth(c.env, db(c));
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user.id) return null;
    return { kind: 'user', userId: session.user.id, scopes: ['*'] };
  } catch (err) {
    rootLogger.warn('auth_get_session_failed', { err: err as Error });
    return null;
  }
}

/**
 * Verify an OAuth 2.1 JWT access token against our own JWKS endpoint.
 *
 * The JWT is signed by Better-Auth's `jwt` plugin, served via the
 * `/v1/auth/jwks` endpoint of the same Worker that just received the
 * request. Workers can call their own hostname (Cloudflare wires up the
 * loop transparently). `verifyAccessToken` caches the JWKS internally.
 *
 * Extracts userId from `sub`, scopes from the space-delimited `scope`
 * claim, and the issuing client from `client_id`. Returns null on any
 * verification failure — caller falls through to anonymous.
 */
async function resolveOAuthBearer(c: AppContext, token: string): Promise<AuthContext | null> {
  if (!dbConnectionString(c.env) || !c.env.AUTH_SECRET) return null;

  const apiBaseURL = deriveApiBaseURL(c.env);
  // Better-Auth's JWT issuer matches the discovery doc's `issuer`,
  // which is `<api-base>/v1/auth` (baseURL + basePath), not `<api-base>`.
  const issuer = `${apiBaseURL}/v1/auth`;
  // MCP clients pass `resource=<mcp-url>` per RFC 8707, so tokens issued
  // to them are bound to the MCP audience. Only that audience is honored
  // here — the bare API origin (Phase-3 server-to-server) is excluded so
  // an API-audience token cannot be replayed against the core API today
  // (GHSA-rx56).
  const audience = [deriveMcpUrl(apiBaseURL)];

  try {
    // Fetch JWKS in-process via the Better-Auth API instead of
    // looping back through the public URL. Cloudflare Workers can
    // hit their own custom-domain hostnames, but the loopback
    // pathway is unreliable enough that the JWKS fetch was failing
    // with `Jwks failed: <none>` even though the same URL responds
    // from the outside. Reading directly off the Auth instance is
    // simpler and faster (no HTTP, no edge round-trip).
    const auth = createAuth(c.env, db(c));
    const jwksFetch = async () => {
      const result = (await auth.api.getJwks()) as JsonWebKeySetLike;
      return result;
    };

    const payload = await verifyJwsAccessToken(token, {
      verifyOptions: { issuer, audience },
      // The function type wants a jose JSONWebKeySet which we don't
      // depend on directly; the shape matches at runtime.
      jwksFetch: jwksFetch,
    });

    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    if (!userId) return null;

    const scopeClaim = payload['scope'];
    const scopes: readonly string[] =
      typeof scopeClaim === 'string'
        ? scopeClaim.split(' ').filter(Boolean)
        : Array.isArray(scopeClaim)
          ? scopeClaim.filter((s): s is string => typeof s === 'string')
          : [];

    const clientId =
      typeof payload['client_id'] === 'string' ? payload['client_id'] : 'unknown_client';

    return { kind: 'oauth', userId, clientId, scopes };
  } catch (err) {
    rootLogger.warn('oauth_token_verify_failed', { err: err as Error });
    return null;
  }
}

function deriveApiBaseURL(env: Env): string {
  if (env.ENVIRONMENT === 'production') return 'https://api.vite.in';
  if (env.ENVIRONMENT === 'staging') return 'https://api-staging.vite.in';
  return 'http://localhost:8787';
}
