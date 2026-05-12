# v1 → v2 cutover plan

How vite.in launches v2 on the `vite.in` apex. The original cutover
plan assumed a live v1 stack we needed to gate against; v1 has since
been shut down and its data is gone (see [[lesson — v1 is gone]]
note in conversation, 2026-05-12). The plan below is therefore a
**straight launch**, not a percentage-gated wedge.

The old archive + wedge-worker approach is preserved at the bottom of
this file as an appendix in case a future hosted-v1 ever comes back —
do not reintroduce that complexity for the current go-live.

## Phase 1 exit criterion this addresses

> _100% of new event creation traffic goes to v2 for 2 consecutive weeks
> without regression._

The criterion still applies. We just no longer need a wedge to direct
percentage of traffic — apex DNS goes from "nowhere" or "placeholder"
straight to v2 on Day 1, and the soak window measures real usage on v2.

---

## Step 0 — Pre-flight (must all be ticked before any DNS change)

- [ ] Phase 1 exit criteria from `docs/PROJECT_PLAN.md` are green
      (creation + RSVPs + payments + magic links + dashboard).
- [ ] `scripts/pentest.mjs` clean against staging; manual checklist in
      `docs/ops/pentest-checklist.md` run within the last week.
- [ ] Load test (`scripts/loadtest-suite.sh`) hit p95 < 150 ms read,
      < 400 ms write on staging.
- [ ] On-call runbook (`docs/ops/runbook.md`) reviewed and recently
      practised — rollback should be muscle memory before cutover, not
      after.
- [ ] Status page wired to the local Uptime Kuma instance with the
      monitors in [`uptime-monitors.md`](uptime-monitors.md).
- [ ] Sentry alerts created per [runbook → Sentry alerts that must
      exist](runbook.md#sentry-alerts-that-must-exist).
- [ ] Deploy-failure auto-issue verified by triggering a synthetic
      failure (e.g. push a deliberately broken `wrangler.toml` to a
      throwaway branch — already in place since #29).
- [ ] All production secrets set per
      [`prod-secrets-setup.md`](prod-secrets-setup.md).
- [ ] Stripe live-mode products + 8 prices + webhook exist per
      [`stripe-live-setup.md`](stripe-live-setup.md), tested with a
      synthetic event.
- [ ] Neon `main` (prod) branch created and migrated to the latest
      schema via `DATABASE_URL=… pnpm db:migrate`.
- [ ] `wrangler deploy --env production` succeeds for `apps/api`,
      `apps/mcp`, and `apps/web` against tagged release commits, with
      green Cloudflare-side health checks at their `*-prod.vite.in`
      preview routes _before_ the apex flips.

## Step 1 — Pre-launch dry run on prod hostnames

Before flipping `vite.in`, deploy to the prod Workers but at the
intermediate hostnames `api.vite.in`, `mcp.vite.in`, and a prelaunch
subdomain like `www.vite.in` or `app.vite.in` (whichever the web app
will live behind once apex is HTTPS-cached on Cloudflare).

- [ ] `curl https://api.vite.in/v1/health` → `{"status":"ok","db":"connected",...}`
- [ ] `curl https://api.vite.in/v1/health | jq .buildSha` matches the
      latest production tag's commit (verifies the deploy actually went).
- [ ] Open `https://www.vite.in/` in a browser, create a real event with
      a real email address. Confirm the magic-link mail arrives via
      live Resend.
- [ ] RSVP from a different device. Confirm RSVP appears on the
      management page.
- [ ] Trigger a `STRIPE_PRICE_BASIC_EUR` checkout end-to-end using a
      live test card (Stripe still allows test cards in live mode for
      verified Connect accounts — confirm with Stripe support before
      relying on this; otherwise use a small real charge against your
      own card and refund).
- [ ] Watch `wrangler tail --env production` during the test —
      no unexpected errors.

If everything's clean, proceed to Step 2. If anything is off, fix
forward; the apex is still untouched, no user-facing impact.

## Step 2 — Apex DNS flip (T-0)

This is the moment users start landing on v2.

- [ ] In the Cloudflare dashboard for `vite.in`: change the apex
      `A`/`AAAA` records to whatever Cloudflare Pages instructs for the
      `vitein-web` Pages project (typically a Cloudflare-managed CNAME
      target). Save.
- [ ] DNS propagation on Cloudflare is near-instant (proxied records).
      Verify within 60 seconds via `dig +short @1.1.1.1 vite.in` and
      `curl -I https://vite.in/`.
- [ ] Hit `https://vite.in/` in a fresh browser — the landing page
      should serve from `vitein-web` (production), with the build-stamp
      footer showing the tagged-release commit SHA.

Cloudflare Pages handles SSL automatically once the domain is bound;
no separate cert work needed.

## Step 3 — Soak window (T+0 to T+14)

Watch metrics. Specifically:

- [ ] Sentry error rate on `vitein-api`, `vitein-web`, `vitein-mcp`
      stays at or below staging baseline.
- [ ] Stripe live-mode dashboard shows the first paid events flowing
      through, no chargebacks, no failed-webhook entries.
- [ ] Resend dashboard shows magic-link delivery rate > 95 % to gmail,
      outlook, yahoo, and the long tail.
- [ ] No deploy-failure issues opened by the auto-notifier.
- [ ] Uptime Kuma reports > 99.9 % over the window.

Two clean weeks → Phase 1 exit criterion met. File the exit-criteria
sign-off in `docs/ops/incidents/2026-XX-XX-phase1-launch.md` (use the
template, even if there were no incidents — it doubles as the launch
record).

## Rollback

The rollback path is "point the apex back at the previous DNS state":

1. In Cloudflare DNS, restore the previous apex record (point at the
   landing-page provider that served `vite.in` before v2, or a parked
   page if there is none).
2. Propagation is < 60 seconds for proxied records.
3. File the incident in `docs/ops/incidents/`.

There is no v1 to fall back to; rollback means **vite.in is down**
until the underlying v2 problem is fixed. That's an acceptable trade
because v1 traffic in the period leading up to launch was already at
or near zero.

## What does NOT need to happen in cutover

- **No v1 → v2 data migration.** No v1 data exists.
- **No wedge worker / percentage gating.** No v1 stack to gate
  against — the apex either points at v2 or at a placeholder.
- **No URL preservation for v1 management links.** v1 magic links are
  already dead.

---

## Appendix — wedge-worker plan (archived)

Historical: the original cutover plan called for a Cloudflare Worker
at the apex that read a KV flag `cutover.v2_traffic_pct` and routed a
configurable percentage of requests to v2 vs. v1. The motivation was
zero-impact rollback during a live-traffic migration.

We are deliberately **not** building this — v1 is gone, there is
nothing to gate against. If a future scenario needs the same shape
(e.g. soft-launching a new region or rolling a major rewrite), revisit
this section.

The flag key would have been `cutover.v2_traffic_pct` in `KV_FLAGS`,
ramped 5 → 20 → 50 → 100 % over a week. The worker code never
existed in the repo, only the operational plan above.
