import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, resolveBaseUrl } from '$lib/server/api';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim();
    if (!email) {
      return fail(400, { error: 'Please enter your email.' });
    }

    const webBase = new URL(event.request.url).origin;
    const res = await apiFetch(event, '/v1/auth/sign-in/magic-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Better-Auth checks Origin against `trustedOrigins`. Server-side
        // fetch doesn't set this automatically; forward the web origin so
        // the request is treated as first-party.
        Origin: webBase,
      },
      body: JSON.stringify({
        email,
        callbackURL: `${webBase}/account/dashboard`,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[signin] magic-link upstream failed', {
        status: res.status,
        body: body.slice(0, 500),
        apiBase: resolveBaseUrl(event),
      });
      return fail(res.status, {
        error: `Could not send the magic link (HTTP ${String(res.status)}).`,
        details: body.slice(0, 300),
      });
    }

    throw redirect(303, '/signin/check-email');
  },
};
