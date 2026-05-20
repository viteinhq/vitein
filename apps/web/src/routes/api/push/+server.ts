import { error, json } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { RequestHandler } from './$types';

/**
 * Same-origin proxy for the Core API's Web Push endpoints. The browser
 * subscribe/unsubscribe flow is client-side, but the call into the Core
 * API runs here so it can carry the session cookie / creator token
 * server-side — the client never needs the API origin.
 */

/** Fetch the VAPID public key the browser needs to subscribe. */
export const GET: RequestHandler = async (event) => {
  const res = await apiFetch(event, '/v1/push/vapid-key');
  if (!res.ok) error(res.status, 'Web Push is unavailable');
  return json((await res.json()) as { key: string });
};

/** Register a push subscription. */
export const POST: RequestHandler = async (event) => {
  const body = (await event.request.json()) as { token?: string; subscription?: unknown };
  const res = await apiFetch(event, '/v1/push/subscriptions', {
    method: 'POST',
    headers: pushHeaders(body.token),
    body: JSON.stringify(body.subscription),
  });
  return new Response(null, { status: res.ok ? 204 : res.status });
};

/** Remove a push subscription. */
export const DELETE: RequestHandler = async (event) => {
  const body = (await event.request.json()) as { token?: string; endpoint?: string };
  const res = await apiFetch(event, '/v1/push/subscriptions', {
    method: 'DELETE',
    headers: pushHeaders(body.token),
    body: JSON.stringify({ endpoint: body.endpoint }),
  });
  return new Response(null, { status: res.ok ? 204 : res.status });
};

function pushHeaders(token: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Creator-Token'] = token;
  return headers;
}
