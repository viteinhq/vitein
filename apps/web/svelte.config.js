import { execSync } from 'node:child_process';
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Build identifier injected into `import { version } from '$app/environment'`.
 * Prefer Cloudflare Pages' `CF_PAGES_COMMIT_SHA`; fall back to a local
 * `git rev-parse` so `pnpm dev` still shows something sensible.
 *
 * Shape: `abc1234 · 2026-05-12T09:35Z` — 7-char SHA plus a minute-precision
 * UTC stamp so a reload visibly bumps even if commits stay the same.
 */
function buildVersion() {
  let sha = process.env.CF_PAGES_COMMIT_SHA ?? '';
  if (!sha) {
    try {
      sha = execSync('git rev-parse HEAD').toString().trim();
    } catch {
      sha = 'unknown';
    }
  }
  const stamp = new Date().toISOString().slice(0, 16) + 'Z';
  return `${sha.slice(0, 7)} · ${stamp}`;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib',
    },
    version: {
      name: buildVersion(),
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
