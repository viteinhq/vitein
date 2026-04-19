# vite.in v2 — Monorepo

> This CLAUDE.md sits at the repository root and applies to every stack in the monorepo. Each app has its own nested CLAUDE.md with stack-specific guidance.

## What this repo is

vite.in v2 is a rebuild of a global invitation platform. The architecture is API-first: one Core API, consumed by Web, iOS, Android, and an MCP server for LLM agents. Native mobile apps live in separate repos (`vite-in-ios`, `vite-in-android`).

See @docs/ARCHITECTURE.md for the full picture and @docs/ROADMAP.md for phases.

## Stack at a glance

- **API:** Cloudflare Workers + Hono + TypeScript (`apps/api`)
- **Web:** SvelteKit on Cloudflare Pages (`apps/web`)
- **MCP server:** Cloudflare Worker + `@modelcontextprotocol/sdk` (`apps/mcp`)
- **DB:** Neon Postgres via Drizzle ORM (`packages/db-schema`)
- **Storage:** Cloudflare R2
- **Cache / sessions:** Cloudflare KV + Durable Objects
- **Queue:** Cloudflare Queues
- **Auth:** Better-Auth
- **Package manager:** pnpm (workspaces)
- **Build orchestration:** Turborepo

## Repo layout

```
apps/
  api/          Cloudflare Worker — Core API
  web/          SvelteKit
  mcp/          Cloudflare Worker — MCP server
packages/
  openapi-spec/ Single source of truth for API shape
  ts-sdk/       Generated from openapi-spec (regenerate on every spec change)
  db-schema/    Drizzle schema + migrations
  i18n-messages/
  config/       Shared eslint, tsconfig, prettier
docs/           ARCHITECTURE, ROADMAP, PROJECT_PLAN, decisions/
infra/          Wrangler configs, Terraform for Neon/Sentry
```

## Conventions

- **TypeScript strict mode everywhere.** No `any`. If you must, write `// TODO: narrow type` and move on.
- **The OpenAPI spec is the source of truth.** If you change `apps/api`, regenerate `packages/ts-sdk`. CI fails if they drift.
- **Drizzle migrations are SQL.** Commit the SQL alongside schema changes. Never hand-edit old migrations.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Scope when useful: `feat(api): ...`.
- **Branches:** `main` is always deployable. Feature branches merge via PR. No direct pushes to `main`.
- **ADRs for architectural decisions.** `docs/decisions/NNNN-slug.md`. Short (1 page), dated, and immutable once merged.

## Commands

```bash
pnpm install                # install all workspace deps
pnpm dev                    # run web + api locally (turbo handles parallelism)
pnpm -w build               # build all packages
pnpm -F @vitein/api dev     # run only the API
pnpm -F @vitein/web dev     # run only web
pnpm typecheck              # typecheck everywhere
pnpm lint                   # lint everywhere
pnpm test                   # test everywhere
pnpm gen:sdk                # regenerate packages/ts-sdk from openapi-spec
pnpm db:migrate             # run Drizzle migrations (env var picks branch)
```

## Non-negotiables

- **Never store secrets in code.** Use `wrangler secret put` or `.env` files that are gitignored.
- **Never commit generated files as hand-written.** `packages/ts-sdk` is generated; don't edit it directly.
- **Every new endpoint goes into the OpenAPI spec first, then gets implemented.** Not the other way around.
- **No account-required flows for event creation.** Anonymous creation is the viral mechanic. Never require signup to create.
- **No hard-coded language strings in user-facing code.** Route through `packages/i18n-messages` or the API's localized error responses.
- **Every timestamp is UTC in storage.** The event's timezone is a separate field. Never assume server or user tz.
- **Never hard-code prices.** Premium prices live in Stripe as `Price` objects per currency. Fetch them at runtime. See @docs/ARCHITECTURE.md §12.
- **No FX conversion in code.** We use fixed price anchors per currency (€5 / $5 / CHF 5 / £5 at launch), not dynamically converted values.
- **No premium features in this (public) repository.** Premium-specific implementations live in the separate private `vitein-premium` repo. If a feature is behind a paywall, its specific implementation does not go here — only the hook/extension point does. See @docs/ARCHITECTURE.md §13.

## Open-source posture

This repo is **AGPLv3** (except `apps/mcp` which is MIT). External contributions are welcomed via PR after signing the CLA. When Claude Code is working here:

- Assume code written here is publicly visible.
- Don't reference premium-specific logic, URLs, or credentials.
- Don't write code that only makes sense for the `vite.in` brand (e.g. brand-specific copy, logo paths) — those belong in the premium repo or brand-assets.
- If a design system token or component is *specific* to vite.in, flag it for premium-repo migration.

## Where Claude Code should look first

- A question about the API: @apps/api/CLAUDE.md + @packages/openapi-spec/vitein.yaml
- A question about the web app: @apps/web/CLAUDE.md
- A question about data: @packages/db-schema/CLAUDE.md (or just the schema file)
- A question about the MCP agent integration: @apps/mcp/CLAUDE.md
- A question about "should we do X" at the architecture level: @docs/ARCHITECTURE.md

## What not to do

- Don't propose adding a new runtime or framework without an ADR.
- Don't add features from Phase 2/3 during Phase 0/1. Park them in a `docs/backlog.md` file.
- Don't write tests that exercise real external services (Stripe, Resend). Use their test fixtures / mocks.
- Don't add "just a quick script" to the root. If it's reusable, it's a package. If it's one-shot, it's in `scripts/` with a README entry.
