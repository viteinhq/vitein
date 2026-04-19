import { defineConfig } from 'drizzle-kit';

/**
 * DATABASE_URL is read from the environment. Invoke per target:
 *   DATABASE_URL=<dev-branch-url>     pnpm db:generate
 *   DATABASE_URL=<staging-branch-url> pnpm db:migrate
 *   DATABASE_URL=<prod-branch-url>    pnpm db:migrate
 *
 * Neon gives each Git-like branch its own URL — that is how we scope
 * dev / staging / prod. There is no "environment" selector here.
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl ?? 'postgres://placeholder',
  },
  strict: true,
  verbose: true,
  casing: 'snake_case',
});
