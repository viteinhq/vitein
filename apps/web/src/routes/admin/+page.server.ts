import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { PageServerLoad } from './$types';

interface AdminStats {
  users: { total: number; last30d: number };
  events: {
    total: number;
    paid: number;
    basic: number;
    plus: number;
    free: number;
    last30d: number;
  };
  rsvps: { total: number; plusOnes: number };
  payments: { last30dCount: number };
  grants: { active: number; revoked: number };
}

export const load: PageServerLoad = async (event) => {
  const res = await apiFetch(event, '/v1/admin/stats');
  if (!res.ok) {
    throw error(res.status, 'Failed to load stats');
  }
  const stats = (await res.json()) as unknown as AdminStats;
  return { stats };
};
