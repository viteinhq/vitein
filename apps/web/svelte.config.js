import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib',
    },
    // SvelteKit's hydration bootstrap is a small inline script per page.
    // `mode: 'hash'` makes the framework emit a sha256 for each inline
    // block into a <meta http-equiv="content-security-policy"> tag, so
    // we keep a strict `script-src 'self'` stance without `unsafe-inline`.
    // The manual header in `hooks.server.ts` intentionally omits
    // script-src/style-src so it doesn't intersect with the meta CSP.
    csp: {
      mode: 'hash',
      directives: {
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
      },
    },
  },
  compilerOptions: {
    runes: true,
  },
};

export default config;
