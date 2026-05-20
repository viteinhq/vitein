import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// CI passes BUILD_SHA on the deploy step so Sentry can match runtime
// errors to uploaded source maps. Locally it's empty — Sentry just
// drops the `release` tag and reports unversioned events.
const BUILD_SHA = process.env.BUILD_SHA ?? '';

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(BUILD_SHA),
  },
  plugins: [
    tailwindcss(),
    // URL prefix is the source of truth; cookie persists an explicit
    // choice; preferredLanguage covers first-time visitors via
    // Accept-Language; baseLocale (en) is the final fallback.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
      strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
    }),
    sveltekit(),
  ],
  server: {
    port: 5173,
  },
});
