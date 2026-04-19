# 0001 — Stack choice for vite.in v2

- **Status:** Accepted
- **Date:** 2026-04-19
- **Deciders:** Kim

## Context

vite.in v1 runs on Supabase + Next.js. For v2 we rebuild from scratch with four client surfaces (web, iOS, Android, MCP) consuming one API. Constraints:

- Solo maintainer; runtime costs must scale from zero and tolerate long idle periods.
- Global latency (invitation links are shared cross-border).
- Strict data-sovereignty requirements for EU users.
- AGPLv3 open core; no runtime lock-in that prevents self-hosting.
- Clear separation between public core and private premium code.

## Decision

Adopt a Cloudflare-centric, API-first stack with a pnpm/Turborepo TypeScript monorepo at the centre.

- **API:** Cloudflare Workers + Hono.
- **Database:** Neon Postgres via Drizzle ORM (HTTP driver for Workers).
- **Edge surfaces:** Cloudflare Pages (SvelteKit web app), Cloudflare R2 (object storage), KV + Durable Objects (session, rate limiting), Queues (async work).
- **Auth:** Better-Auth on the API.
- **Mobile:** Native iOS (Swift/SwiftUI) and Android (Kotlin/Compose) in separate repos consuming generated SDKs.
- **MCP server:** Cloudflare Worker exposing a subset of the API to LLM agents.
- **Monorepo tooling:** pnpm workspaces + Turborepo.
- **Observability:** Sentry + PostHog (EU cloud).
- **Payments:** Stripe.
- **Email:** Resend (see ADR 0003).

See @planning/ARCHITECTURE.md for the full rationale and data model.

## Alternatives considered

- **Vercel + Postgres / PlanetScale.** Faster DX on the web, but worse global edge story for API endpoints, harder to put mobile + MCP behind the same backend at zero idle cost. Vendor pricing ramps aggressively once out of free tier.
- **AWS (Lambda + API Gateway + RDS/Aurora Serverless v2).** Most flexible, but operationally heavy for solo maintainer and Aurora Serverless v2 has a non-zero idle cost.
- **Supabase (stay on v1 stack).** Would be fastest to ship, but v1 already exposes the limits: rigid auth model, no clean path to an MCP server, and we want DB access from Workers without pooled-connection gymnastics.
- **Fly.io + Postgres.** Good global footprint and self-host story, but cold starts and ops burden exceed Workers for this shape of workload.

## Consequences

- **Good:** Pay-per-request at the edge; generous free tier; single DNS + CDN + Workers + KV + R2 vendor simplifies ops. Drizzle lets schema live in TS alongside the API. SvelteKit on Pages keeps the web stack close to the API stack. MCP and API share the same auth and SDK surface.
- **Bad:** Cloudflare vendor concentration. Mitigated by keeping the OpenAPI spec and Drizzle schema as the sources of truth — we could rebuild the runtime on another provider if needed, though some KV/R2 bindings would need replacing.
- **Follow-ups:** ADRs for ① SDK generator tooling (deferred, pending toy-spec spike in Task 0.4) and ② premium-integration mechanism (deferred, pending Week-2 spike in Task 0.4).

## References

- @planning/ARCHITECTURE.md
- @planning/ROADMAP.md
