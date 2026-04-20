import { redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { RequestHandler } from './$types';

/**
 * Best-effort sign-out. Hits the API's Better-Auth `/sign-out` endpoint with
 * the user's current cookies attached, then redirects to `/signin`. A failed
 * API call still redirects — the cookie is gone from the client's session
 * either way.
 */
export const POST: RequestHandler = async (event) => {
  await apiFetch(event, '/v1/auth/sign-out', { method: 'POST' }).catch(() => undefined);
  throw redirect(303, '/signin');
};
