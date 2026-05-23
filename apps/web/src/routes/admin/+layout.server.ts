import { error, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Admin layout gate. Probes `/v1/admin/stats` because the admin allowlist
 * is enforced server-side — there is no local equivalent. 401 → /signin
 * (no session at all); 403 → 404 (don't reveal that this URL exists to
 * non-admins). Any 2xx is enough to render the chrome.
 */
export const load: LayoutServerLoad = async (event) => {
  const profileRes = await apiFetch(event, '/v1/users/me');
  if (profileRes.status === 401 || !profileRes.ok) {
    throw redirect(303, '/signin');
  }
  const user = (await profileRes.json()) as unknown as UserProfile;

  const probe = await apiFetch(event, '/v1/admin/stats');
  if (probe.status === 401) {
    throw redirect(303, '/signin');
  }
  if (probe.status === 403) {
    throw error(404, 'Not found');
  }
  if (!probe.ok) {
    throw error(probe.status, 'Admin probe failed');
  }
  return { user };
};
