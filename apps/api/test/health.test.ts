import { describe, expect, it } from 'vitest';
import { healthRoute } from '../src/routes/health.js';

interface HealthResponse {
  status: string;
  environment: string;
  ts: string;
}

describe('/v1/health', () => {
  it('returns status ok with environment and timestamp', async () => {
    const res = await healthRoute.request('/', undefined, {
      ENVIRONMENT: 'dev',
    });
    expect(res.status).toBe(200);
    const body: HealthResponse = await res.json();
    expect(body.status).toBe('ok');
    expect(body.environment).toBe('dev');
    expect(() => new Date(body.ts).toISOString()).not.toThrow();
  });
});
