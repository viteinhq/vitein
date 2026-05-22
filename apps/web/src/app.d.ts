// See https://kit.svelte.dev/docs/types#app
declare global {
  namespace App {
    interface Error {
      code?: string;
    }
    interface Locals {
      requestId: string;
    }
    interface PageData {
      /** Set by the public event page when the event is paid — the root
       *  layout then drops vite.in branding (Basic `no_branding`). */
      noBranding?: boolean;
    }
    interface Platform {
      env?: {
        API_BASE_URL?: string;
        SENTRY_DSN?: string;
        PUBLIC_SENTRY_DSN?: string;
        GEOAPIFY_API_KEY?: string;
      };
    }
  }
}

export {};
