import type { RequestHandler } from './$types';

/** Intentional throw used to verify Sentry wiring end-to-end. */
export const GET: RequestHandler = () => {
  throw new Error('web_debug_boom — intentional Sentry canary');
};
