import { accounts, createDb, sessions, users, verifications } from '@vitein/db-schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
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
 */
export function createAuth(env: Env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for auth');
  if (!env.AUTH_SECRET) throw new Error('AUTH_SECRET is required for auth');

  const db = createDb(env.DATABASE_URL);

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
      // random-string generator so every row matches the column type.
      // sessions/accounts/verifications use text ids, but passing uuidv7
      // is still valid text, so this single setting covers every table.
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
        sendMagicLink: async ({ email, url }) => {
          console.warn('[debug] magic-link issued', { email, url });
          await sendSignInMagicLink(env, { to: email, url });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
