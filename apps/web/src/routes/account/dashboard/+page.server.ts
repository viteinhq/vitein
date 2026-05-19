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
  if (!res.ok) return { upcoming: [] as EventListItem[], past: [] as EventListItem[] };
  const body = (await res.json()) as unknown as { items: EventListItem[] };

  // The API returns newest-startsAt first. We split into "upcoming or
  // happening now" vs "already happened" so the dashboard can show
  // past events under an Archive section instead of mixing them with
  // active ones. Upcoming flips to soonest-first (closest hosting
  // commitment at the top); past stays newest-first.
  const now = Date.now();
  const upcoming: EventListItem[] = [];
  const past: EventListItem[] = [];
  for (const it of body.items) {
    if (new Date(it.startsAt).getTime() >= now) upcoming.push(it);
    else past.push(it);
  }
  upcoming.reverse();
  return { upcoming, past };
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
        claimError: 'claim_http',
        claimStatus: res.status,
        claimDetails: body.slice(0, 300),
      });
    }
    const data = (await res.json()) as unknown as { claimed: number };
    return { claimed: data.claimed };
  },
};
