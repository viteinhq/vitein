import { apiFetch } from '$lib/server/api';
import type { PageServerLoad } from './$types';

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
  const body: { items: EventListItem[] } = await res.json();
  return { events: body.items };
};
