import { getHealth } from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import type { PageServerLoad } from './$types';

/**
 * Hit the Core API at build/request time so we can show live health on the
 * placeholder homepage. Proves the workspace SDK wiring end-to-end.
 */
export const load: PageServerLoad = async ({ platform }) => {
  const baseUrl =
    platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
  configureApi(baseUrl);

  try {
    const { data, error } = await getHealth();
    if (error || !data) return { health: null };
    return { health: data };
  } catch {
    return { health: null };
  }
};
