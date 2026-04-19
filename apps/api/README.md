# @vitein/api

vite.in Core API — Cloudflare Worker + Hono.

See [`CLAUDE.md`](./CLAUDE.md) for stack, conventions, and the full file layout.

## Quick start

```bash
cp .dev.vars.example .dev.vars   # fill in local secrets (never commit)
pnpm -F @vitein/api dev          # → http://localhost:8787/v1/health
pnpm -F @vitein/api test
pnpm -F @vitein/api typecheck
```

## Deploying

Staging (auto from `main` via CI in Task 0.11):

```bash
pnpm -F @vitein/api deploy:staging
```

Production (gated behind tagged releases):

```bash
pnpm -F @vitein/api deploy:prod
```

Secrets are set per-environment with `wrangler secret put <NAME> --env staging|production`.
