# 0008 — Hyperdrive for the Worker→Postgres connection

- **Status:** Accepted
- **Date:** 2026-05-20
- **Deciders:** Kim

## Context

The Core API Worker connects to Neon Postgres via the `@neondatabase/serverless` **HTTP driver** (`drizzle-orm/neon-http`), which issues each query as an HTTPS request to Neon's public `/sql` endpoint.

On 2026-05-20 (launch day) that endpoint began returning **HTTP 403 / Cloudflare error 1006** ("access denied") intermittently — Cloudflare's edge protection in front of Neon's `/sql` endpoint blocking the Worker's egress under request volume. Both staging and production were affected; the failure rate scaled with load (prod ~90%, staging ~25%).

Ruled out during the incident:

- Not the connection limit — `max_connections` is 901, ~15 in use.
- Not the driver version — a production rollback to the pre-bump build (neon `0.10.4`) still failed.
- Not a Neon IP allowlist — none is configured.
- Not CU-hour exhaustion — the compute runs fine (the SQL Editor and `pg_stat_activity` work).
- Not a Neon platform incident — status is operational.

The block is at the Cloudflare edge of Neon's `/sql` HTTP service. The Neon project is on the **Free plan**, so there is no support-driven unblock.

## Decision

Move the Worker's **runtime** database connection off the Neon HTTP `/sql` endpoint onto **Cloudflare Hyperdrive + a native Postgres driver** (`node-postgres` / `pg`, via `drizzle-orm/node-postgres`).

Hyperdrive connects to Postgres over the **wire protocol** (the Neon pooler endpoint over TCP) — a different path than `/sql`, not subject to that edge block — and pools/caches connections at Cloudflare's edge. This is Cloudflare's documented recommendation for Postgres from Workers.

**Scope:** only the runtime Worker DB client changes. `drizzle-kit` migration tooling (`db:generate` / `db:migrate`) keeps connecting directly with `@neondatabase/serverless` — it runs from CI / locally, not inside a Worker.

## Implementation plan

1. Create Hyperdrive configs (Cloudflare) for the staging and production Neon branches → two Hyperdrive IDs.
2. `apps/api/wrangler.toml`: add a `[[hyperdrive]]` binding (`HYPERDRIVE`) per environment.
3. `apps/api/src/types/env.ts`: add the `HYPERDRIVE` binding type.
4. `packages/db-schema/client.ts`: `createDb` builds a `drizzle-orm/node-postgres` client over a `pg` Pool from the Hyperdrive connection string. The exported `Db` type updates accordingly; domain functions consume `Db` generically and need no change.
5. Connection lifecycle: the wire-protocol driver is **not** stateless. A per-request `pg` Pool is created in middleware, stored on the Hono context, and closed via `ctx.waitUntil(pool.end())`. The `db()` helper resolves the request's client from context. The cron and queue handlers get their own create-and-close path (no Hono context — they own `ctx`).
6. Add `pg` as a dependency; `nodejs_compat` is already enabled.
7. **Smoke-test against the staging Neon branch** before production — per ADR-lesson, no blind driver swap.

## Alternatives considered

- **Neon WebSocket driver (`drizzle-orm/neon-serverless`).** Still terminates on `*.neon.tech` behind the same Cloudflare zone — may hit the same edge protection. Rejected as uncertain.
- **Upgrade the Neon plan.** Cannot be confirmed to change the `/sql` edge limit, and does not address the architecture. A separate operational decision, not the fix.
- **Wait out the ban.** It decays with zero load, but recurs under normal traffic — not a fix for a live product.

## Consequences

- The DB-access pattern changes from stateless (neon-http) to connection-pooled (`pg`) — per-request connection lifecycle is now required.
- One new Cloudflare resource type (Hyperdrive) and the `pg` dependency are introduced.
- `@neondatabase/serverless` remains, used only by `drizzle-kit` for migrations.
- Resolves the 403 / 1006 outage structurally rather than depending on ban decay or a plan upgrade.

## References

- Cloudflare error 1006 — https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1006/
- Cloudflare Hyperdrive + Neon — https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/
- `packages/db-schema/client.ts`, `apps/api/src/infra/db.ts` — the code that changes.
