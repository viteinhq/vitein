import { Hono } from 'hono';
import type { AppVariables, Env } from '../types/env.js';

export const healthRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

healthRoute.get('/', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    ts: new Date().toISOString(),
  });
});
