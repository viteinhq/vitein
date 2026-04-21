# packages/db-schema — Drizzle schema + Neon client

> Applies the monorepo-root CLAUDE.md plus the specifics below.

## What this is

The **single source of truth for the Postgres schema** plus the Drizzle client factory. Everything that touches the database imports from here — no direct `postgres` / `pg` usage outside this package.

## Stack

- **ORM:** Drizzle.
- **Driver:** `@neondatabase/serverless` HTTP driver (Workers-friendly; no pooled connections).
- **Migrations:** `drizzle-kit` generates plain SQL into `./migrations/`. Each file is committed alongside the schema change that caused it.
- **IDs:** UUIDv7 generated in app code via the `uuidv7` package. Tables declare `.$defaultFn(() => uuidv7())`.

## File layout

```
src/
  schema.ts     table definitions + inferred row types
  client.ts     createDb(databaseUrl) → Drizzle client bound to full schema
  index.ts      public re-exports
drizzle.config.ts   drizzle-kit config; reads DATABASE_URL from env
migrations/         generated SQL + drizzle journal; commit both
```

## Conventions

- **Never hand-edit migrations.** Change `schema.ts`, run `pnpm -F @vitein/db-schema db:generate`, commit both the schema and the new migration file.
- **Never hand-edit old migrations.** Supersede with a new one (Drizzle handles sequencing).
- **Text over citext for now.** Emails are stored as `text` with a `lower(email)` unique index. Switching to citext is a tracked Phase-2 migration (needs `CREATE EXTENSION citext`).
- **Soft delete** via `deleted_at` on user-facing tables (`users`, `events`). Queries must filter where applicable.
- **All timestamps are `timestamptz`.** Never `timestamp without time zone`. UTC in storage.
- **FK cascade rules:** child rows of an event (`event_tokens`, `guests`, `rsvps`) cascade on event delete. `events.creator_user_id` and `rsvps.guest_id` use `SET NULL` — user/guest deletion must not lose the event or RSVP history.

## Workflow: schema change

1. Edit `src/schema.ts`.
2. From repo root: `DATABASE_URL=<dev-branch-url> pnpm -F @vitein/db-schema db:generate` → creates a new SQL file under `migrations/`.
3. Review the generated SQL. If it is wrong, delete and edit the schema until drizzle-kit produces the right thing.
4. Apply to your Neon dev branch: `DATABASE_URL=<dev-branch-url> pnpm -F @vitein/db-schema db:migrate`.
5. Commit schema + migration together.
6. CI (Task 0.11) deploys staging on merge to `main`; `db:migrate` is run there against the staging branch.
7. Production migrations run from tagged releases.

## Neon branches

- `dev` branch → local development (each maintainer can optionally fork their own child branch).
- `staging` branch → CI-deployed on `main`.
- `main` branch → production, only touched by tagged releases.

The Drizzle config has no "environment" selector. The right `DATABASE_URL` for the target branch is the environment.

## What not to do

- Don't import anything from `drizzle-orm/pg-core` outside `src/schema.ts` — other packages get the inferred row types from this package instead.
- Don't add a new column without also updating the affected Zod schemas in `apps/api`.
- Don't run `db:migrate` against the main branch from a developer laptop. That is the production DB.

## See also

- @docs/ARCHITECTURE.md §6 (data model) — source of truth for the design.
- @packages/db-schema/src/schema.ts — the schema itself.
