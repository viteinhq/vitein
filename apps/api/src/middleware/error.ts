import * as Sentry from '@sentry/cloudflare';
import type { ErrorHandler } from 'hono';
import { DomainError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Global error handler. Translates DomainError into JSON-per-spec responses.
 * Anything else becomes 500 and is captured in Sentry.
 */
export const errorHandler: ErrorHandler<{
  Bindings: Env;
  Variables: AppVariables;
}> = (err, c) => {
  if (err instanceof DomainError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.status as 400 | 401 | 403 | 404 | 409 | 429,
    );
  }

  Sentry.captureException(err);
  console.error('[unhandled]', err);
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
};
