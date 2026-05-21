import { fail, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim();
    if (!email) {
      return fail(400, { error: 'recover_email_required' });
    }

    const res = await apiFetch(event, '/v1/auth/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    // The API answers 204 whether or not the address has events — this page
    // never reveals that either. A 400 means a malformed address.
    if (res.status === 400) {
      return fail(400, { error: 'recover_email_invalid' });
    }
    if (!res.ok) {
      return fail(res.status, { error: 'recover_http', status: res.status });
    }

    throw redirect(303, '/recover/check-email');
  },
};
