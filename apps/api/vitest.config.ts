import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Integration tests spin up an in-memory pglite database and apply the
    // full migration set per case — slower than the default 5s, especially
    // on CI runners.
    testTimeout: 20000,
  },
});
