# apps/api — vite.in v2 Core API

> This CLAUDE.md applies to the Core API specifically. The monorepo-root CLAUDE.md applies too.

## What this is

The single API that every client talks to: Web, iOS, Android, MCP server. Runs on Cloudflare Workers, written in TypeScript with Hono.

Business-logic responsibility: events, guests, RSVPs, creators, users, payments, reminders, auth, webhooks. Nothing else. Client-specific logic (rendering, UI state) does NOT live here.

## Stack

- **Runtime:** Cloudflare Workers (`wrangler`)
- **Framework:** Hono (`@hono/zod-openapi` for OpenAPI-first routing)
- **DB:** Neon Postgres via `@neondatabase/serverless` HTTP driver + Drizzle ORM
- **Auth:** Better-Auth for user sessions + OAuth, custom creator-token logic for anonymous events
- **Queue:** Cloudflare Queues (bound as `QUEUE_EMAIL`, `QUEUE_PUSH`)
- **Storage:** R2 bound as `R2_MEDIA`; KV as `KV_CACHE`
- **Rate limiting:** Durable Objects (`RATE_LIMITER`)
- **Observability:** `@sentry/cloudflare`, structured JSON logs, `traceparent` propagation

## File layout (inside `apps/api`)

```
src/
  index.ts              Worker entry, mounts all routes
  routes/
    events.ts
    rsvps.ts
    guests.ts
    auth.ts
    oauth.ts            (Phase 2+)
    webhooks/
      stripe.ts
  middleware/
    auth.ts             extract creator token OR user session OR OAuth token
    rate-limit.ts
    error.ts            maps thrown errors to localized JSON responses
    request-id.ts
  domain/               business logic (pure functions where possible)
    events/
    rsvps/
    payments/
    reminders/
  infra/
    db.ts               Drizzle client
    queue.ts
    sentry.ts
    email.ts            thin wrapper to enqueue email jobs
    stripe.ts
  types/
    env.ts              Cloudflare bindings typed here
test/
```

## Conventions

- **Routes are thin.** Parse input, call a domain function, shape output. No business logic in route handlers.
- **Domain functions are pure where possible.** Inject dependencies (DB, queues) as arguments; makes tests easy.
- **Zod schemas live next to routes.** Request and response schemas power both validation and OpenAPI docs.
- **Every endpoint has an `operationId`.** This becomes the SDK method name. Use camelCase: `createEvent`, `listRsvps`.
- **Errors are thrown, not returned.** A middleware maps them to HTTP + localized JSON. Don't return `{ error }` from handlers.
- **IDs are UUIDv7** (time-sortable). Generated server-side; never trust client-supplied IDs.
- **Every write is logged to `audit_log`.** Use the `auditLog()` helper; don't write directly.
- **All timestamps stored UTC. Event's own timezone is a separate `text` column (IANA tz name).**

## Key commands

```bash
pnpm -F @vitein/api dev                  # local dev against a Neon dev branch
pnpm -F @vitein/api deploy:staging       # wrangler deploy to staging
pnpm -F @vitein/api deploy:prod          # wrangler deploy to prod (requires tag)
pnpm -F @vitein/api test                 # vitest
pnpm -F @vitein/api test:integration     # hits a Neon ephemeral branch
pnpm db:migrate                          # from repo root, targets current DATABASE_URL
pnpm gen:sdk                             # after changing openapi-spec
```

## Adding a new endpoint (standard flow)

1. Add the route to `packages/openapi-spec/vitein.yaml`. Include request, response, examples, error codes.
2. Regenerate SDK: `pnpm gen:sdk`.
3. Implement the route in `src/routes/`. Use `@hono/zod-openapi` so the implementation validates against the spec.
4. Add the domain logic in `src/domain/`.
5. Write unit tests for the domain logic.
6. Write an integration test against the Neon ephemeral branch.
7. Confirm the generated SDK's new method has the expected shape.

## Auth model in this API

Three possible authentication contexts, resolved by middleware:

| Header / source                        | Populates `c.get('auth')` as                                      |
| -------------------------------------- | ----------------------------------------------------------------- |
| `X-Creator-Token: <token>`             | `{ kind: 'creator', eventId, email }`                             |
| `Authorization: Bearer <session>`      | `{ kind: 'user', userId, scopes: ['*'] }`                         |
| `Authorization: Bearer <oauth-access>` | `{ kind: 'oauth', userId, clientId, scopes: [...] }` _(Phase 2+)_ |
| `Authorization: Bearer <api-key>`      | `{ kind: 'api_key', userId, scopes: [...] }` _(Phase 3)_          |
| none                                   | `{ kind: 'anonymous' }`                                           |

Route handlers declare required auth via a helper (e.g. `requireCreator()`, `requireUser()`, `requireScope('events:write')`). Middleware throws with a localized error if missing.

## Rate limiting

All routes pass through `rate-limit.ts`. Keys are derived from auth context:

- anonymous → `ip:<hashed-ip>`
- creator token → `creator:<event_id>`
- user → `user:<user_id>`
- oauth → `oauth:<token_id>`

Limits are in `src/middleware/rate-limit.ts`. See @docs/ARCHITECTURE.md §7.4.

## Localization of errors

Errors carry a code like `event.not_found`. The error middleware maps code + `Accept-Language` to a message via `packages/i18n-messages`. Fallback to `en`. Never throw with raw English strings — always a code.

## Things to avoid

- Don't call external services (Stripe, Resend) directly from route handlers. Go through `src/infra/` wrappers which handle retries, errors, and testability.
- Don't write to the DB without going through Drizzle. Raw SQL only with `sql` tagged template in exceptional cases, with a comment explaining why.
- Don't add new bindings (KV namespaces, queues, etc.) without updating `types/env.ts` and `wrangler.toml` together.
- Don't introduce a new external dependency without checking bundle size (`pnpm -F @vitein/api build` and look at the output size — Workers have a 10 MB compressed limit).

## Where to look for context

- API shape: @packages/openapi-spec/vitein.yaml
- DB schema: @packages/db-schema/src/schema.ts
- Business decisions: @docs/ARCHITECTURE.md sections 5 (auth), 6 (data model), 7 (API design)
