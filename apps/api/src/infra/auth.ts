import { accounts, createDb, sessions, users, verifications } from '@vitein/db-schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
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
  const baseURL = env.WEB_BASE_URL ?? 'https://vite.in';

  return betterAuth({
    secret: env.AUTH_SECRET,
    baseURL,
    basePath: '/v1/auth',
    trustedOrigins: [baseURL],
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
      cookies: {
        session_token: {
          attributes: {
            sameSite: 'lax',
            secure: env.ENVIRONMENT !== 'dev',
            httpOnly: true,
          },
        },
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendSignInMagicLink(env, { to: email, url });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
