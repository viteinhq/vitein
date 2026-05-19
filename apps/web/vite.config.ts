import { paraglide } from '@inlang/paraglide-sveltekit/vite';
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
    paraglide({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
    }),
    sveltekit(),
  ],
  server: {
    port: 5173,
  },
});
