import { oauthProvider } from '@better-auth/oauth-provider';
import {
  accounts,
  type Db,
  jwks,
  oauthAccessTokens,
  oauthClients,
  oauthConsents,
  oauthRefreshTokens,
  sessions,
  users,
  verifications,
} from '@vitein/db-schema';
import { type Locale } from '@vitein/i18n-messages';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt, magicLink } from 'better-auth/plugins';
import { uuidv7 } from 'uuidv7';
import type { Env } from '../types/env.js';
import { sendSignInMagicLink } from './email.js';

/**
 * Build a Better-Auth instance bound to the current request's environment.
 *
 * We build per-request because the database URL, secret, and trusted origin
 * are all worker-env values that are not available at module load. The cost
 * is ~microseconds of setup per request, which Workers can afford.
 *
 * Throws if required env vars are missing — callers should guard with a
 * clear error. Guarded in `middleware/auth.ts` and `routes/auth.ts`.
 *
 * `locale` is the recipient's negotiated locale, used only by the
 * magic-link email. The catch-all auth handler in `routes/auth.ts`
 * derives it from the request's `Accept-Language`; callers that never
 * trigger an email (session resolution, OAuth metadata) can omit it and
 * the email falls back to English.
 */
export function createAuth(env: Env, db: Db, locale?: Locale) {
  if (!env.AUTH_SECRET) throw new Error('AUTH_SECRET is required for auth');

  // Better-Auth's endpoints live on the API worker, so baseURL has to point
  // there — otherwise the magic-link URL is rendered against the web origin
  // and the verify route 404s. We still trust the web origin for CSRF on
  // proxied calls (see apps/web/src/lib/server/api.ts).
  const apiBaseURL =
    env.ENVIRONMENT === 'production'
      ? 'https://api.vite.in'
      : env.ENVIRONMENT === 'staging'
        ? 'https://api-staging.vite.in'
        : 'http://localhost:8787';
  const webBase = env.WEB_BASE_URL ?? 'https://vite.in';

  // Session cookie must survive the cross-subdomain hop: the user signs in
  // on api-staging.vite.in (the magic-link URL) but lands on next.vite.in
  // for the dashboard. Scope to the parent zone in staging + prod; leave
  // domain undefined in dev so localhost/127.0.0.1 keeps working.
  const cookieDomain =
    env.ENVIRONMENT === 'dev' ? undefined : new URL(apiBaseURL).hostname.replace(/^[^.]+/, '');

  return betterAuth({
    secret: env.AUTH_SECRET,
    baseURL: apiBaseURL,
    basePath: '/v1/auth',
    trustedOrigins: [apiBaseURL, webBase],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        // OAuth 2.1 Provider plugin tables — mapping follows the plugin's
        // expected entity names (singular camelCase).
        oauthClient: oauthClients,
        oauthAccessToken: oauthAccessTokens,
        oauthRefreshToken: oauthRefreshTokens,
        oauthConsent: oauthConsents,
        // JWT plugin key material. Required for every getSession() call
        // (jwt() hooks into the session resolution path), not just OAuth
        // bearer issuance — missing this binding crashes auth entirely.
        jwks,
      },
    }),
    emailAndPassword: { enabled: false },
    user: {
      additionalFields: {
        locale: { type: 'string', required: false, defaultValue: 'en' },
        timezone: { type: 'string', required: false, defaultValue: 'UTC' },
      },
    },
    advanced: {
      // Our users.id is a pg `uuid` column — override Better-Auth's
      // random-string generator at the DB-adapter layer (the top-level
      // `advanced.generateId` is a different code path and wasn't being
      // consulted before the insert). sessions/accounts/verifications use
      // text ids but uuidv7 is still valid text, so one override covers
      // every table.
      database: {
        generateId: () => uuidv7(),
      },
      generateId: () => uuidv7(),
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: env.ENVIRONMENT !== 'dev',
        httpOnly: true,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, token, url }) => {
          // Wrap the verify URL in a web-origin landing page. Gmail (and
          // similar) prefetches clicked links for safety-scan — a bare GET
          // to Better-Auth's single-use verify endpoint would be consumed
          // by the prefetch, leaving the user's actual click with an
          // INVALID_TOKEN. Our web page just shows a "Continue" button;
          // the actual verification POST only fires on real user gesture.
          const callbackURL = new URL(url).searchParams.get('callbackURL') ?? webBase;
          const landing = new URL('/auth/continue', webBase);
          landing.searchParams.set('t', token);
          landing.searchParams.set('cb', callbackURL);
          // Locale is plumbed from the originating request's Accept-Language
          // via createAuth(); undefined falls back to English inside the
          // template lookup.
          await sendSignInMagicLink(env, { to: email, url: landing.toString() }, locale);
        },
      }),
      // JWT plugin issues signed access tokens that the MCP server (and
      // any other resource server) can verify locally without a round
      // trip to /oauth/introspect. Required by the OAuth Provider plugin
      // for JWT-mode access tokens.
      jwt(),
      // OAuth 2.1 Provider — turns this Better-Auth instance into an
      // identity provider for third-party MCP clients (Phase 2).
      // PKCE is required by default; the plugin enforces it for every
      // authorization code flow.
      oauthProvider({
        loginPage: `${webBase}/signin`,
        consentPage: `${webBase}/oauth/consent`,
        // MCP-spec OAuth clients (Claude Desktop, ChatGPT, the MCP
        // Inspector, …) self-register via RFC 7591 Dynamic Client
        // Registration on first contact — there's no developer portal
        // for them to pre-register on, and they have no user session
        // yet at registration time. Enable both DCR and anonymous DCR
        // everywhere except production. Anonymous registration forces
        // `token_endpoint_auth_method: 'none'` (public PKCE clients
        // only) — secret-based confidential clients still require a
        // session. PKCE remains mandatory, and `skip_consent` is
        // rejected at DCR time so every dynamically-registered client
        // must clear the consent screen.
        allowDynamicClientRegistration: env.ENVIRONMENT !== 'production',
        allowUnauthenticatedClientRegistration: env.ENVIRONMENT !== 'production',
        // Phase-1.5 scope list. Add more (templates:read etc.) as the
        // corresponding endpoints land.
        scopes: [
          'openid',
          'profile',
          'email',
          'offline_access',
          'events:read',
          'events:write',
          'guests:read',
          'guests:write',
          'rsvps:read',
          'rsvps:write',
        ],
        // Seconds, per the plugin's input type. 1h access, 60d refresh
        // matches ARCHITECTURE §5.3.
        accessTokenExpiresIn: 60 * 60,
        refreshTokenExpiresIn: 60 * 60 * 24 * 60,
        // RFC 8707 "resource indicators": MCP clients (Inspector,
        // Claude Desktop, ChatGPT) pass `resource=<mcp-server-url>` on
        // authorize + token requests so the token is audience-bound
        // to the specific resource server. Accept the API origin AND
        // each MCP worker URL. The MCP host derives from the API
        // host (api-staging → mcp-staging, api → mcp).
        validAudiences: [apiBaseURL, apiBaseURL.replace('://api', '://mcp') + '/mcp'],
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
