import { redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
}

export const load: LayoutServerLoad = async (event) => {
  const res = await apiFetch(event, '/v1/users/me');
  if (res.status === 401) {
    throw redirect(303, '/signin');
  }
  if (!res.ok) {
    throw redirect(303, '/signin');
  }
  const user: UserProfile = await res.json();
  return { user };
};
