# Production secrets — first-deploy checklist

A step-by-step walkthrough for setting every secret + var the Core API
needs before the first `wrangler deploy --env production` is run.
Treat this list as the source of truth for what production needs to
function. **Until every box is checked, do not deploy the Worker to
production.** Staging works regardless because most secrets fall back
to test-mode equivalents.

Run each command from `apps/api/`. The `--env production` selector
targets the `vitein-api` Worker (not `vitein-api-staging`).

---

## 1. Cryptographic basics

### `AUTH_SECRET`

Better-Auth signs and encrypts session cookies with this key. Must be
high-entropy and different from staging.

```bash
openssl rand -hex 32 | pnpm -F @vitein/api exec wrangler secret put AUTH_SECRET --env production
```

Capture the generated value in your password manager — there is no
way to fetch it back once stored.

---

## 2. Database — Neon production branch

The API talks to Neon over HTTPS. Two prerequisites in this order:

1. In the Neon dashboard, project `vite-in-v2`: create a `main` branch
   (or rename whatever is currently the production-intended branch).
   Confirm it's separate from `staging` and `dev`.
2. Copy the **pooled connection string** for the new branch (HTTP
   driver works against either, but pooled survives short reconnects
   better). It looks like:
   `postgres://<user>:<password>@<host>-pooler.neon.tech/<db>?sslmode=require`

```bash
pnpm -F @vitein/api exec wrangler secret put DATABASE_URL --env production
# Paste the connection string when prompted.
```

After setting:

```bash
DATABASE_URL='<prod-connection-string>' pnpm db:migrate
```

That applies every migration in `packages/db-schema/migrations/` to
the prod branch. Re-run any time a new schema lands on `main`.

---

## 3. Observability — Sentry

Production goes into a separate Sentry project to keep noise out of
the staging dashboards.

1. In Sentry, create project `vitein-api` (if not already done).
2. Copy the DSN. Looks like
   `https://<key>@o<org>.ingest.sentry.io/<project>`.

```bash
pnpm -F @vitein/api exec wrangler secret put SENTRY_DSN --env production
```

---

## 4. Email — Resend production domain

`vite.in` (or whichever apex you ship under) must be a **verified
domain** in Resend before you can send from it. DNS records were
already added during pre-launch; double-check the green checkmark in
the Resend dashboard before deploying.

```bash
pnpm -F @vitein/api exec wrangler secret put RESEND_API_KEY --env production
# Use the live API key, not the test key. Prefix `re_` for live.
```

---

## 5. Payments — Stripe live mode

Stripe needs **both** a secret key and a webhook signing secret before
any checkout flow works end-to-end.

```bash
pnpm -F @vitein/api exec wrangler secret put STRIPE_SECRET_KEY --env production
# `sk_live_…` — from Stripe dashboard → Developers → API keys.
```

For the webhook secret: in Stripe → Developers → Webhooks → create
endpoint pointing at `https://api.vite.in/v1/webhooks/stripe` and
subscribing to (at minimum) `checkout.session.completed`. Stripe will
show the signing secret once.

```bash
pnpm -F @vitein/api exec wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# `whsec_…`
```

### Price-ID secrets

The eight per-currency, per-tier Stripe Price IDs are stored as
secrets (not vars) so they're trivial to rotate per environment and
not committed to git. Create them as described in
[`stripe-live-setup.md`](stripe-live-setup.md), then:

```bash
# Basic tier
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_BASIC_EUR --env production
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_BASIC_USD --env production
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_BASIC_CHF --env production
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_BASIC_GBP --env production

# Plus tier
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_PLUS_EUR --env production
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_PLUS_USD --env production
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_PLUS_CHF --env production
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_PLUS_GBP --env production
```

---

## 6. Plain vars already wired in `wrangler.toml`

These do not need `wrangler secret put`; they are already set in
`[env.production.vars]`:

| Var                     | Current value           | Edit if                                                         |
| ----------------------- | ----------------------- | --------------------------------------------------------------- |
| `ENVIRONMENT`           | `production`            | Never change.                                                   |
| `WEB_BASE_URL`          | `https://vite.in`       | The web app moves to a new apex.                                |
| `MEDIA_PUBLIC_BASE_URL` | `https://media.vite.in` | A different R2 custom-domain is bound to the prod media bucket. |

---

## 7. Verification

After every box above is ticked, confirm the Worker sees the secrets:

```bash
pnpm -F @vitein/api exec wrangler secret list --env production
```

The output should list every name set above (values are not shown,
only names).

Then deploy via the tagged-release path (`api-vX.Y.Z`), and curl:

```bash
curl https://api.vite.in/v1/health
```

Expect `{"status":"ok","environment":"production","db":"connected",...}`.
If `db: error` or `db: unavailable`, jump to the
[Neon outage playbook](runbook.md#neon-outage).
