import { error as httpError, redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { resolveBaseUrl } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

type CookieOpts = Parameters<Cookies['set']>[2];

/**
 * Intermediate landing page for Better-Auth magic links. The real verify
 * endpoint at `api-staging.vite.in/v1/auth/magic-link/verify` is a
 * single-use GET — if Gmail's (or any other) link-safety prefetch hits it
 * first, the user's subsequent click lands on a consumed token. Our
 * `sendMagicLink` callback rewrites the email URL to here instead; the
 * actual verify POST runs only on a real form submit (prefetch is GET-only).
 *
 * Load parses `t` (token) + `cb` (callbackURL) for the form. The action
 * fetches the upstream verify URL server-side, forwards any Set-Cookie to
 * the user, and redirects to the app.
 */

function requireParams(url: URL): { token: string; callbackURL: string } {
  const token = url.searchParams.get('t');
  const cb = url.searchParams.get('cb');
  if (!token || !cb) throw httpError(400, 'Missing token or callback');
  return { token, callbackURL: cb };
}

export const load: PageServerLoad = ({ url }) => {
  const { token, callbackURL } = requireParams(url);
  return { token, callbackURL };
};

export const actions: Actions = {
  default: async (event) => {
    const { token, callbackURL } = requireParams(event.url);

    const apiBase = resolveBaseUrl(event);
    const verifyUrl = new URL('/v1/auth/magic-link/verify', apiBase);
    verifyUrl.searchParams.set('token', token);
    verifyUrl.searchParams.set('callbackURL', callbackURL);

    const res = await fetch(verifyUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Origin: event.url.origin,
      },
    });

    // Forward Set-Cookie headers from the API response to the browser.
    // The cookie is scoped to `.vite.in` so once it lands it's valid on
    // both api-staging and next. getSetCookie() returns the array form.
    const setCookies = res.headers.getSetCookie();
    console.warn('[auth/continue] verify status', res.status, 'location', res.headers.get('location'));
    console.warn('[auth/continue] setCookies count', setCookies.length, 'raw', JSON.stringify(setCookies));
    const rawSetCookie = res.headers.get('set-cookie');
    console.warn('[auth/continue] raw set-cookie header', rawSetCookie);
    for (const raw of setCookies) {
      const [nameValue, ...attrs] = raw.split(';').map((s) => s.trim());
      const eq = nameValue?.indexOf('=') ?? -1;
      if (eq < 0 || !nameValue) continue;
      const name = nameValue.slice(0, eq);
      const value = nameValue.slice(eq + 1);
      const opts: CookieOpts = { path: '/' };
      for (const attr of attrs) {
        const [k, v] = attr.split('=').map((s) => s.trim());
        const key = (k ?? '').toLowerCase();
        if (key === 'path' && v) opts.path = v;
        else if (key === 'domain' && v) opts.domain = v;
        else if (key === 'max-age' && v) opts.maxAge = Number(v);
        else if (key === 'expires' && v) opts.expires = new Date(v);
        else if (key === 'httponly') opts.httpOnly = true;
        else if (key === 'secure') opts.secure = true;
        else if (key === 'samesite' && v)
          opts.sameSite = v.toLowerCase() as 'lax' | 'strict' | 'none';
      }
      event.cookies.set(name, value, opts);
    }

    const location = res.headers.get('location') ?? callbackURL;
    throw redirect(303, location);
  },
};
