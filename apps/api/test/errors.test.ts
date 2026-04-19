import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../src/domain/errors.js';
import { errorHandler } from '../src/middleware/error.js';
import type { AppVariables, Env } from '../src/types/env.js';

function buildApp(thrown: unknown) {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.get('/boom', () => {
    throw thrown;
  });
  app.onError(errorHandler);
  return app;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

describe('errorHandler', () => {
  it.each([
    [new NotFoundError(), 404, 'not_found'],
    [new UnauthorizedError(), 401, 'unauthorized'],
    [new ValidationError('bad input'), 400, 'validation_error'],
    [new ConflictError(), 409, 'conflict'],
    [new DomainError('event.taken', 'Slug taken', 409), 409, 'event.taken'],
  ])('maps %s → %i with code %s', async (err, status, code) => {
    const res = await buildApp(err).request('/boom');
    expect(res.status).toBe(status);
    const body: ErrorBody = await res.json();
    expect(body.error.code).toBe(code);
  });

  it('maps unknown errors to 500 internal_error', async () => {
    const res = await buildApp(new Error('boom')).request('/boom');
    expect(res.status).toBe(500);
    const body: ErrorBody = await res.json();
    expect(body.error.code).toBe('internal_error');
  });

  it('preserves details when provided', async () => {
    const res = await buildApp(new ValidationError('bad', { field: 'title' })).request('/boom');
    expect(res.status).toBe(400);
    const body: ErrorBody = await res.json();
    expect(body.error.details).toEqual({ field: 'title' });
  });
});
