import { apiFetch } from '$lib/server/api';
import type { RequestHandler } from './$types';

/**
 * Sign-out. Hits Better-Auth's `/v1/auth/sign-out` on the API with the
 * user's cookies, then forwards the API's `Set-Cookie` response back to
 * the browser so the session cookie actually gets cleared client-side.
 *
 * Without the forwarding the API correctly invalidates the session on
 * the server, but the browser keeps its cookie — re-loading the dashboard
 * still shows the old session until the cookie expires naturally.
 *
 * A failed API call still redirects: the user loses the session at
 * worst on next request, and bouncing to /signin matches the user's
 * intent. We just can't propagate cookie-clearing if the API never
 * answered.
 */
export const POST: RequestHandler = async (event) => {
  const origin = new URL(event.request.url).origin;
  const apiRes = await apiFetch(event, '/v1/auth/sign-out', {
    method: 'POST',
    headers: { Origin: origin },
  }).catch(() => null);

  const headers = new Headers({ Location: '/signin' });
  if (apiRes) {
    for (const cookie of apiRes.headers.getSetCookie()) {
      headers.append('set-cookie', cookie);
    }
  }
  return new Response(null, { status: 303, headers });
};
