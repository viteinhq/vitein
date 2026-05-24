import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // `.wasm` imports (the OG endpoint pulls @resvg/resvg-wasm) —
      // wrangler bundles them at deploy time, but vitest runs through
      // Node ESM which can't resolve the `.wasm` extension. Aliasing
      // to a placeholder lets `src/index.ts` import cleanly during
      // spec-coverage; no test actually exercises the OG handler.
      '@resvg/resvg-wasm/index_bg.wasm': resolve(__dirname, 'test/helpers/wasm-mock.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Integration tests spin up an in-memory pglite database and apply the
    // full migration set per case — slower than the default 5s, especially
    // on CI runners.
    testTimeout: 20000,
  },
});
