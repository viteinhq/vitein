# Production stack — first-time setup

Umbrella doc that wires the pieces of a production deploy together.
Most pieces have their own doc; this one is the order-of-operations
checklist plus the bits that didn't fit anywhere else (Neon prod
branch + migration, Cloudflare prod-Worker creation, DNS).

> Run this **once**, in order. After production exists, the routine is
> `git tag api-vX.Y.Z && git push --tags` plus the standard deploy
> workflow.

---

## Order of operations

1. [Stripe live setup](stripe-live-setup.md) — needs to happen first
   because the Price IDs go into prod secrets in step 4.
2. Neon prod branch — see §1 below.
3. Cloudflare prod-Worker registration — §2.
4. [Production secrets](prod-secrets-setup.md) — `wrangler secret put`
   against the prod Workers.
5. Cloudflare Pages prod project — §3.
6. DNS for `api.vite.in`, `mcp.vite.in`, `media.vite.in`, eventually
   apex — §4.
7. First tagged release deploy — §5.
8. [Cutover](cutover.md) — apex DNS flip.

---

## 1. Neon prod branch

In the Neon dashboard, project `vite-in-v2`:

1. Click **Branches** → **New branch**.
2. Name it `main` (or `production` — match whatever convention the
   project already uses for prod; staging is named `staging`).
3. Parent: whichever current branch holds the most recent schema —
   typically `staging`. Branching copies the schema and recent data.
4. Click create.

Copy the **pooled** connection string from the branch's "Connection
details" panel. It looks like:

```
postgres://<user>:<password>@<host>-pooler.neon.tech/<db>?sslmode=require
```

Don't store this anywhere except your password manager and the
`wrangler secret put DATABASE_URL --env production` step in
[prod-secrets-setup.md](prod-secrets-setup.md). It's the only
credential standing between a casual reader and prod data.

After the secret is set, run the migration pass against prod:

```bash
DATABASE_URL='<prod-pooled-url>' pnpm db:migrate
```

This applies every file in `packages/db-schema/migrations/` in order
to the prod branch. Confirm with a quick read:

```bash
DATABASE_URL='<prod-pooled-url>' pnpm -F @vitein/db-schema exec drizzle-kit studio
```

Studio's web UI should show the same tables as staging, all empty.

---

## 2. Cloudflare prod Workers

The `apps/*/wrangler.toml` files declare the prod environments with:

- `apps/api/wrangler.toml` → `[env.production]` → name `vitein-api`,
  custom domain `api.vite.in`.
- `apps/mcp/wrangler.toml` → `[env.production]` → name `vitein-mcp`,
  custom domain `mcp.vite.in`.

The first `wrangler deploy --env production` call against each
Worker creates the deployment automatically — no separate dashboard
step is needed. Wrangler also asks to bind the custom domain on
first deploy; accept the prompt.

For the API specifically: confirm the `RATE_LIMITER` Durable Object
binding migration is applied:

```bash
pnpm -F @vitein/api exec wrangler deployments list --env production
```

Should show one entry per `wrangler.toml [[migrations]]` block.
Currently that's tag `v1` (`new_sqlite_classes = ["RateLimiter"]`).

R2 bucket `vitein-media` must exist as a public bucket (Cloudflare
dashboard → R2). The `[[env.production.r2_buckets]]` binding wires
the Worker to it.

---

## 3. Cloudflare Pages prod project

Pages is configured through the dashboard, not `wrangler.toml`. The
production-mode equivalent of `vitein-web-staging` needs to be
created:

1. Dashboard → Workers & Pages → Create application → Pages → Create
   using direct uploads.
2. Project name: `vitein-web`.
3. Production branch: `main`.
4. Build settings: handled by GitHub Actions, not Pages' built-in
   build. Leave the build command empty.
5. Custom domains: `vite.in` (apex) once the cutover is run; pre-launch,
   stage at `www.vite.in` or `app.vite.in`.

Wire the GitHub Action to push to this project — currently
`deploy.yml` only pushes to `vitein-web-staging`. The prod equivalent
should fire on a tag pattern (`web-vX.Y.Z`) and push the build to
`vitein-web` with `--branch=main`. Not yet wired; file as follow-up
after the first manual prod push proves the project works.

---

## 4. DNS

Each surface needs a DNS record under `vite.in` pointed at Cloudflare:

| Hostname         | Record type                                       | Target                                                                                          |
| ---------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `api.vite.in`    | Worker custom domain (auto-bound on first deploy) | —                                                                                               |
| `mcp.vite.in`    | Worker custom domain                              | —                                                                                               |
| `media.vite.in`  | CNAME → R2 custom-domain endpoint                 | Cloudflare dashboard → R2 → bucket settings → connect custom domain                             |
| `vite.in` (apex) | CNAME-flattened to Pages project                  | Set as part of the cutover, see [cutover.md](cutover.md)                                        |
| `www.vite.in`    | Optional CNAME → Pages project                    | If you want it; the SvelteKit app handles either, but pick one canonical and redirect the other |

All four should be **proxied** (orange cloud) to get Cloudflare's CDN

- TLS.

---

## 5. First tagged release

After steps 1–4 are done and `pnpm -F @vitein/api exec wrangler secret list --env production`
shows every name from [prod-secrets-setup.md](prod-secrets-setup.md):

```bash
git tag -a api-v1.0.0 -m "First production release"
git push origin api-v1.0.0
```

If a `release.yml` workflow is wired (Phase 1 follow-up — not yet),
this triggers a prod deploy. Until then, manually:

```bash
git checkout api-v1.0.0
pnpm install --frozen-lockfile
pnpm -F @vitein/api exec wrangler deploy --env production \
  --var BUILD_SHA:$(git rev-parse HEAD) \
  --var BUILD_STAMP:$(date -u +%Y-%m-%dT%H:%MZ)
```

Same shape for `apps/mcp`. For `apps/web`, see the Pages flow in §3.

Verify:

```bash
curl https://api.vite.in/v1/health
```

Expect `{"status":"ok","environment":"production","db":"connected","buildSha":"...","buildStamp":"..."}`.

If `db: error`, jump to [Neon outage](runbook.md#neon-outage). If the
curl fails with a TLS error, the custom domain may not have finished
provisioning — wait a minute, then retry.

---

## What's deliberately deferred

- **Automated tagged-release deploy workflow.** First few prod
  releases are manual on purpose so Kim sees exactly what wrangler
  does. Once the pattern is muscle memory, automate via a separate
  `release.yml` triggered on `v*` tags.
- **B2B / team accounts** infrastructure (Phase 2).
- **PPP rollout** beyond launch four currencies (Phase 1.5+).
