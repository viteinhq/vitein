# 0004 — SDK generator tooling

- **Status:** Accepted
- **Date:** 2026-04-19
- **Deciders:** Kim

## Context

PROJECT_PLAN §0.4 recommended `openapi-typescript-codegen` for the TS SDK plus `openapi-generator-cli` for Swift and Kotlin, pending a spike on a toy spec. We ran the TS half of the spike:

- `openapi-typescript-codegen` has been effectively unmaintained since 2023 and has been superseded by `@hey-api/openapi-ts`, which forked it and took over active development. Sticking with the original risks inheriting unpatched bugs and falling behind OpenAPI 3.1 support.
- `@hey-api/openapi-ts` generates a clean fetch-based client, has a plugin model for swapping transports (fetch / axios / nuxt), supports OpenAPI 3.1, and its generated types consume the spec's `oneOf`/`allOf`/discriminators idiomatically.
- Alternative surveyed: `openapi-fetch` (drwpow). Smaller runtime, but types are less ergonomic and it does not give us a named method per `operationId` (which we rely on — see `apps/api/CLAUDE.md`). Rejected.

The mobile side of the decision (Swift / Kotlin) is still **deferred**. It is unblocked only once the API surface is wide enough that a real SDK is worth generating, which is after Stream A.1–A.3.

## Decision

- **TypeScript SDK:** generate with `@hey-api/openapi-ts` + `@hey-api/client-fetch`. Output lands in `packages/ts-sdk/src/generated/`. The generator is invoked via `pnpm gen:sdk` at repo root and `pnpm gen:sdk:check` in CI (fails on drift).
- **Swift and Kotlin SDKs:** decision deferred until mobile work begins in Streams C and D. The likely candidate remains `openapi-generator-cli`, but we re-evaluate at that time against `swift-openapi-generator` (Apple) and Ktor's native codegen.

## Alternatives considered

- **`openapi-typescript-codegen` (PROJECT_PLAN recommendation).** Origin project. Replaced by `@hey-api/openapi-ts` upstream.
- **`openapi-fetch` / `openapi-typescript` (drwpow).** Slimmer runtime but loses the named-operation method surface that our clients rely on.
- **Roll our own with `openapi-typescript` + hand-written fetch wrappers.** Extra maintenance for no real benefit.

## Consequences

- **Good:** Modern, maintained generator. Clean output that typechecks under `strict` (with `exactOptionalPropertyTypes` relaxed inside the `ts-sdk` package — generated code is not ours to make strictly well-typed).
- **Neutral:** One TS dev-dep we have to track for breaking-config releases. The 0.57 → 0.96 jump we hit during scaffolding produced a config-format migration (`lint`/`format` → `postProcess`) — a reminder that pre-1.0 SDK generators still churn.
- **Follow-ups:** Add CI job to run `pnpm gen:sdk:check` (drift guard). Revisit Swift/Kotlin choice when mobile scaffolding begins.

## References

- `packages/ts-sdk/` — the consumer.
- `packages/openapi-spec/vitein.yaml` — the source of truth.
- https://heyapi.dev
- PROJECT_PLAN §0.4
