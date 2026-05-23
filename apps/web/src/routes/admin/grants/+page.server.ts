import { error, fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

interface Grant {
  id: string;
  email: string;
  tier: string;
  note: string | null;
  grantedByUserId: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export const load: PageServerLoad = async (event) => {
  const res = await apiFetch(event, '/v1/admin/grants');
  if (!res.ok) throw error(res.status, 'Failed to load grants');
  const body = (await res.json()) as unknown as { items: Grant[] };
  return { grants: body.items };
};

export const actions: Actions = {
  add: async (event) => {
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim();
    const tier = String(form.get('tier') ?? 'plus');
    const note = String(form.get('note') ?? '').trim();

    if (!email) return fail(400, { addError: 'Email is required', email, tier, note });

    const res = await apiFetch(event, '/v1/admin/grants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, tier, note: note || null }),
    });

    if (!res.ok) {
      let code = `http_${String(res.status)}`;
      try {
        const body = (await res.json()) as { error?: { code?: string; message?: string } };
        if (body.error?.code) code = body.error.code;
      } catch {
        // ignore parse failures
      }
      return fail(res.status, { addError: code, email, tier, note });
    }

    return { added: email };
  },

  revoke: async (event) => {
    const form = await event.request.formData();
    const id = String(form.get('id') ?? '');
    if (!id) return fail(400, { revokeError: 'Missing id' });

    const res = await apiFetch(event, `/v1/admin/grants/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      return fail(res.status, { revokeError: `http_${String(res.status)}` });
    }
    return { revoked: id };
  },
};
