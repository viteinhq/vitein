import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { Hono } from 'hono';
import { createAuth } from '../infra/auth.js';
import { db } from '../infra/db.js';
import { localeFromAcceptLanguage } from '../infra/email.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Mount Better-Auth's router at `/v1/auth/*`. Better-Auth owns all the
 * routing underneath (sign-in, sign-out, magic-link, session, OAuth callbacks
 * once providers are added).
 *
 * We do not enforce auth on these paths via our own middleware — they are
 * the paths that _produce_ auth. But the auth middleware still runs so
 * request logging / Sentry tags can see "kind: anonymous".
 */
export const authRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// OAuth 2.1 / 8414 discovery doc. The oauth-provider plugin tags its
// internal `/.well-known/oauth-authorization-server` endpoint as
// SERVER_ONLY (not exposed via HTTP) when `basePath` is non-root, so we
// surface it ourselves using the plugin's exported handler. Mounts at
// `/v1/auth/.well-known/oauth-authorization-server`.
authRoute.get('/.well-known/oauth-authorization-server', async (c) => {
  const auth = createAuth(c.env, db(c));
  const handler = oauthProviderAuthServerMetadata(auth);
  return handler(c.req.raw);
});

authRoute.all('/*', async (c) => {
  // Plumb the caller's locale so the sign-in magic-link email is sent in
  // their language (the web app forwards the browser's Accept-Language via
  // apiFetch). Other Better-Auth endpoints ignore it; no email, no effect.
  const locale = localeFromAcceptLanguage(c.req.header('accept-language'));
  const auth = createAuth(c.env, db(c), locale);
  return auth.handler(c.req.raw);
});
