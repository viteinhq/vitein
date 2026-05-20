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

/**
 * Register a push subscription — or, when `oldEndpoint` is present, re-bind
 * a rotated one. The service worker fires `pushsubscriptionchange` with no
 * token, so the rotation path keys on the old endpoint instead.
 */
export const POST: RequestHandler = async (event) => {
  const body = (await event.request.json()) as {
    token?: string;
    oldEndpoint?: string;
    subscription?: { endpoint?: string; keys?: unknown };
  };

  if (body.oldEndpoint) {
    const sub = body.subscription ?? {};
    const res = await apiFetch(event, '/v1/push/subscriptions/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldEndpoint: body.oldEndpoint,
        endpoint: sub.endpoint,
        keys: sub.keys,
      }),
    });
    return new Response(null, { status: res.ok ? 204 : res.status });
  }

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
