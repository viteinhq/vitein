import { fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

interface EventListItem {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  timezone: string;
  locationText: string | null;
  visibility: string;
}

export const load: PageServerLoad = async (event) => {
  const res = await apiFetch(event, '/v1/users/me/events');
  if (!res.ok) return { events: [] };
  const body = (await res.json()) as unknown as { items: EventListItem[] };
  return { events: body.items };
};

export const actions: Actions = {
  claim: async (event) => {
    const res = await apiFetch(event, '/v1/auth/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return fail(res.status, {
        claimError: `Could not claim events (HTTP ${String(res.status)}).`,
        claimDetails: body.slice(0, 300),
      });
    }
    const data = (await res.json()) as unknown as { claimed: number };
    return { claimed: data.claimed };
  },
};
