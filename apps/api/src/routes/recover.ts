import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { issueRecoveryTokens } from '../domain/auth/recover.js';
import { ValidationError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import { localeFromAcceptLanguage, sendCreatorRecovery } from '../infra/email.js';
import type { AppVariables, Env } from '../types/env.js';

const recoverSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /v1/auth/recover — a creator who lost their magic link enters their
 * email; we mint a fresh `manage` token for every non-deleted event tied to
 * that address and email the management links.
 *
 * Mounted before the Better-Auth `/v1/auth/*` catch-all in index.ts so it is
 * matched first.
 *
 * Always responds 204, whether or not events matched, so the response never
 * reveals whether an address has events. Per-IP rate limiting (the anonymous
 * write bucket) is applied by the global middleware.
 */
export const recoverRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

recoverRoute.post(
  '/',
  zValidator('json', recoverSchema, (result) => {
    if (!result.success) {
      throw new ValidationError('Invalid recovery body', { issues: result.error.issues });
    }
  }),
  async (c) => {
    const { email } = c.req.valid('json');
    const recovered = await issueRecoveryTokens(db(c), email);

    const [first] = recovered;
    if (first) {
      const webBase = c.env.WEB_BASE_URL ?? 'https://vite.in';
      await sendCreatorRecovery(
        c.env,
        {
          to: email,
          events: recovered.map((ev) => ({
            title: ev.title,
            manageUrl: `${webBase}/e/${ev.slug}/manage?token=${ev.creatorToken}`,
          })),
        },
        localeFromAcceptLanguage(first.defaultLocale),
      );
    }

    return c.body(null, 204);
  },
);
