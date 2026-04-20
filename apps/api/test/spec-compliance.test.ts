import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { NotFoundError, UnauthorizedError, ValidationError } from '../src/domain/errors.js';
import { errorHandler } from '../src/middleware/error.js';
import { healthRoute } from '../src/routes/health.js';
import type { AppVariables, Env } from '../src/types/env.js';
import { assertResponseMatchesSpec } from './lib/spec-validator.js';

/**
 * Runtime spec-compliance: responses produced by route handlers must match
 * the shape declared in `vitein.yaml`. TypeScript catches static drift;
 * this catches cases where a handler returns extra/missing fields or the
 * wrong type at runtime (e.g. DB column change not reflected in the spec).
 *
 * Endpoints that require DB access are deferred until Task 0.1 unblocks a
 * real Neon connection; for now we cover the endpoints that run purely
 * in-process.
 */
describe('OpenAPI spec compliance', () => {
  it('getHealth 200 matches HealthResponse', async () => {
    const res = await healthRoute.request('/', undefined, { ENVIRONMENT: 'dev' });
    expect(res.status).toBe(200);
    const body = await res.json();
    await assertResponseMatchesSpec('getHealth', 200, body);
  });

  describe('Error responses match the spec Error shape', () => {
    const buildBoom = (thrown: unknown) => {
      const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
      app.get('/boom', () => {
        throw thrown;
      });
      app.onError(errorHandler);
      return app;
    };

    it('404 NotFound (getEvent)', async () => {
      const app = buildBoom(new NotFoundError());
      const res = await app.request('/boom');
      const body = await res.json();
      await assertResponseMatchesSpec('getEvent', 404, body);
    });

    it('401 Unauthorized (updateEvent)', async () => {
      const app = buildBoom(new UnauthorizedError());
      const res = await app.request('/boom');
      const body = await res.json();
      await assertResponseMatchesSpec('updateEvent', 401, body);
    });

    it('400 ValidationError (createEvent)', async () => {
      const app = buildBoom(new ValidationError('bad input'));
      const res = await app.request('/boom');
      const body = await res.json();
      await assertResponseMatchesSpec('createEvent', 400, body);
    });
  });
});
