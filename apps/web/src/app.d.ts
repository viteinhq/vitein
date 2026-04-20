// See https://kit.svelte.dev/docs/types#app
declare global {
  namespace App {
    interface Error {
      code?: string;
    }
    interface Locals {
      requestId: string;
    }
    // interface PageData {}
    interface Platform {
      env?: {
        API_BASE_URL?: string;
      };
    }
  }
}

export {};
