import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { schema, type Db } from '@vitein/db-schema';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db-schema/migrations',
);

/**
 * An isolated in-memory Postgres (pglite) with the full schema migrated.
 * Each call returns a fresh database — tests never share state. Typed as the
 * app's `Db` so domain functions accept it directly; the cast bridges the
 * pglite driver to the neon-http-shaped `Db` alias, which is sound because
 * domain code only uses driver-agnostic Drizzle query methods.
 */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  // `casing: 'snake_case'` must match `createDb` in db-schema — the
  // migrations use snake_case columns, so the runtime client has to too.
  const db = drizzle(client, { schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder });
  return db as unknown as Db;
}
