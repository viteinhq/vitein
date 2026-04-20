import * as Sentry from '@sentry/cloudflare';
import { negotiateLocale, translate } from '@vitein/i18n-messages';
import type { ErrorHandler } from 'hono';
import { DomainError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Global error handler. Translates DomainError codes into the caller's
 * preferred language (via Accept-Language), then ships the structured JSON
 * body our clients expect. Anything else becomes 500 and is captured in
 * Sentry.
 */
export const errorHandler: ErrorHandler<{
  Bindings: Env;
  Variables: AppVariables;
}> = (err, c) => {
  const locale = negotiateLocale(c.req.header('accept-language'));

  if (err instanceof DomainError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: translate(err.code, locale),
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.status as 400 | 401 | 403 | 404 | 409 | 429,
    );
  }

  Sentry.captureException(err);
  console.error('[unhandled]', err);
  return c.json(
    {
      error: { code: 'internal_error', message: translate('internal_error', locale) },
    },
    500,
  );
};
