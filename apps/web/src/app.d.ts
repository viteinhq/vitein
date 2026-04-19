// See https://kit.svelte.dev/docs/types#app
declare global {
  namespace App {
    interface Error {
      code?: string;
    }
    // interface Locals {}
    // interface PageData {}
    interface Platform {
      env?: {
        API_BASE_URL?: string;
      };
    }
  }
}

export {};
