# Secret rotation playbook

For each secret the Workers depend on, this doc explains **when to
rotate** and **how to roll it without taking the API down**. Pair
this with [`prod-secrets-setup.md`](prod-secrets-setup.md), which is
the first-time setup; this one is recurring maintenance.

Rotations affect both `--env staging` and `--env production`. Run the
same command twice with the matching env each time.

There's a known open rotation flagged in memory: **`DATABASE_URL` on
staging has been overdue since 2026-04-21.** Start there.

---

## DATABASE_URL — Neon

**Rotate when:**

- The current connection string has been copied or potentially
  leaked.
- A team member with access leaves (single-founder right now — moot
  until that changes).
- A Neon role password is rotated proactively (recommended every
  6 months).

**How:**

1. In the Neon dashboard for project `vite-in-v2`, branch `staging`
   (or `main` for prod): **Roles** → click the role → **Reset
   password**. Capture the new password into your password manager.
2. Build the new connection string by replacing the password in the
   pooled URL.
3. Push the new secret:

   ```bash
   pnpm -F @vitein/api exec wrangler secret put DATABASE_URL --env staging
   # Paste the new connection string.
   ```

4. Verify within 60 seconds:

   ```bash
   curl https://api-staging.vite.in/v1/health
   # Expect: { "db": "connected", ... }
   ```

5. The Worker picks up secret changes on the **next** request; no
   redeploy needed. If `db: error`, the old password is still cached
   in some isolate — wait 30 seconds and retry.

**No downtime?** Yes, if you go in order: set password → push secret
→ test. The brief overlap where some isolates have the new URL and
some have the old will manifest as transient 500s for a few seconds at
worst. For production, do this off-peak.

---

## AUTH_SECRET — Better-Auth signing key

**Rotate when:**

- The current value is leaked.
- After a security incident.
- Annually as good hygiene.

**Side effect:** Rotating `AUTH_SECRET` invalidates **every active
user session**. Everyone signed in gets bounced back to the magic-link
sign-in flow. Communicate this if you have any active users.

**How:**

```bash
openssl rand -hex 32 | pnpm -F @vitein/api exec wrangler secret put AUTH_SECRET --env staging
```

No verification step beyond a sign-in test: open `/signin` in a fresh
browser, request a magic link, click it, confirm `/account/dashboard`
loads.

---

## SENTRY_DSN

**Rotate when:**

- The DSN is leaked publicly (Sentry DSNs are technically not
  secrets, but leaking ours lets others spam our error budget).

**How:**

1. Sentry → Project → Settings → Client Keys (DSN) → **Generate New
   Key**.
2. Mark the old key as **Disabled** (don't delete — historical events
   need the key to remain valid).
3. `wrangler secret put SENTRY_DSN --env staging` with the new value.

**Verify:** Hit `https://api-staging.vite.in/_debug/boom` and confirm
a new event appears in Sentry under the new DSN.

---

## RESEND_API_KEY

**Rotate when:**

- The current key is leaked or shared with a third party that should
  no longer have access.
- Every 12 months as hygiene.

**How:**

1. Resend dashboard → API Keys → **Create API Key** (full-access for
   the API Worker). Capture the key.
2. `wrangler secret put RESEND_API_KEY --env staging`.
3. Verify by triggering a magic-link from the sign-in page or
   creating an event with a fresh email — expect a delivery in the
   Resend "Logs" tab.
4. Once verified, delete the old key from the Resend dashboard.

---

## STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET

**Rotate when:**

- The current key is leaked.
- After offboarding a contractor who had access to Stripe.

**Order matters** — webhook secret first, then API key:

### Webhook secret

1. Stripe → Developers → Webhooks → endpoint → **Roll signing
   secret**. Stripe shows the new value once.
2. `wrangler secret put STRIPE_WEBHOOK_SECRET --env production`.
3. Stripe → Webhooks → **Send test webhook** → expect 200 from the
   handler.

### API key

1. Stripe → Developers → API keys → **Create new secret key**.
2. `wrangler secret put STRIPE_SECRET_KEY --env production`.
3. Trigger a checkout end-to-end (real €1 charge against your own
   card, refund after).
4. Once verified, **delete** the old secret key in Stripe.

Don't reverse the order: rolling the API key before the webhook
secret leaves any in-flight webhook deliveries unable to verify until
the new key lands.

---

## STRIPE_PRICE\_\* — Price ID rotation

Strictly speaking these aren't secrets; they're product configuration.
But because they're stored as `wrangler secret put`, "rotation" means
"point at a different Price object."

**When to update:**

- A pricing change (e.g. Phase 1.5 INR launch, or PPP rollout).
- A market is being shut down (delete the secret rather than just
  changing it; the API will return `stripe.price_not_configured` and
  the UI will gray out that currency option).

**How:**

```bash
pnpm -F @vitein/api exec wrangler secret put STRIPE_PRICE_BASIC_INR --env production
# Paste new price_… ID
```

No verification beyond a synthetic checkout in the affected currency.

---

## Verifying after any rotation

For every secret rotation, capture the result in the
`audit_log`-equivalent for ops: a one-line entry in
`docs/ops/incidents/<YYYY-MM-DD>-rotation-<name>.md` (yes, even
non-incident rotations — easier than tracking them anywhere else).

The runbook entry for the [Neon outage
playbook](runbook.md#neon-outage) cross-references this doc.
