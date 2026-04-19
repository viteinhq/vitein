import { client } from '@vitein/ts-sdk';

/**
 * Configure the generated SDK's client for the current runtime.
 *
 * Call once from `+layout.ts` (or equivalent) with the env-derived base URL.
 * In dev the API runs on port 8787; in staging and prod it lives at
 * `api-staging.vite.in` and `api.vite.in` respectively.
 */
export function configureApi(baseUrl: string): void {
  client.setConfig({ baseUrl });
}

export { client };
