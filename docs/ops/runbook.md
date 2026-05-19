# vite.in on-call runbook

This is the first place to look when something is broken in production
or staging. Kim is the only on-call human for now; everything here
should be runnable from a laptop with the same `wrangler` setup the
deploys use.

If you're under acute pressure, read [Quick triage](#quick-triage)
first, then come back for the relevant playbook.

---

## Surfaces & where they live

| Surface        | URL                                                      | Worker / Pages name                                       | wrangler env |
| -------------- | -------------------------------------------------------- | --------------------------------------------------------- | ------------ |
| Production API | https://api.vite.in                                      | `vitein-api`                                              | `production` |
| Staging API    | https://api-staging.vite.in                              | `vitein-api-staging`                                      | `staging`    |
| Production web | https://vite.in                                          | CF Pages project `vitein-web`                             | —            |
| Staging web    | https://next.vite.in                                     | CF Pages project `vitein-web` (preview)                   | —            |
| Staging MCP    | https://mcp-staging.vite.in                              | `vitein-mcp-staging`                                      | `staging`    |
| Database       | Neon Postgres                                            | project `vite-in-v2`, branches `main` / `staging` / `dev` | —            |
| Object storage | R2 buckets `vitein-media` (prod), `vitein-media-staging` | —                                                         | —            |
| Email          | Resend, domain `vite.in`                                 | —                                                         | —            |
| Payments       | Stripe — individual entity until OÜ migration completes  | —                                                         | —            |

## Quick triage

1. **Are users seeing errors?** Check Sentry: `vitein-api` project →
   Issues view → last 1h. If new issues are climbing, that's the lead.
2. **Is the API up at all?** `curl -i https://api.vite.in/v1/health` —
   expect `200 {"status":"ok","db":"connected",...}`. If `db: error`,
   jump to [Neon outage](#neon-outage). If TCP refused or 5xx,
   jump to [Worker rollback](#worker-rollback).
3. **Is the web app up?** `curl -I https://vite.in/` — expect `200`
   with an `x-request-id` and CSP header. If Pages is down it's almost
   always a CF-side incident; check status.cloudflare.com.
4. **Is mail flowing?** Resend dashboard → activity → last hour. Bounced
   or queued > a few minutes means [Resend outage](#resend-outage).
5. **Are payments going through?** Stripe dashboard → events → latest
   `checkout.session.completed`. Match against your most recent
   `/v1/webhooks/stripe` hits in CF logs.

If two or more surfaces are red simultaneously, suspect a shared
dependency: Cloudflare, Neon, or a bad deploy. Cloudflare status page
is the first stop.

---

## Common playbooks

### Worker rollback

Used when a recent deploy started returning 5xx or the Sentry error rate
spiked right after a release.

```bash
# Find the last 5 versions
wrangler versions list --name vitein-api

# Roll the production worker back to the previous version
wrangler rollback --name vitein-api --message "rollback: <reason>"
```

After rollback:

1. Confirm `GET /v1/health` returns the older `environment` build tag
   (or compare Sentry release tag).
2. Tag the bad release in GitHub as `bad/<sha>` so it doesn't get
   re-deployed by mistake.
3. File a `docs/ops/incidents/<YYYY-MM-DD>-<slug>.md` write-up.

The same applies to `vitein-api-staging`, `vitein-mcp-staging` — replace
`--name`.

### Neon outage

If `/v1/health` returns `db: error`:

1. Check Neon status: https://neon.tech/status.
2. If Neon is fine but we're getting errors, it's almost always a
   `DATABASE_URL` issue: secret unset, branch deleted, or password rotation
   left the worker holding a stale URL.
3. `wrangler secret list --name vitein-api --env production` to confirm
   the secret is present.
4. Reset: rotate the Neon role password, then
   `wrangler secret put DATABASE_URL --name vitein-api --env production`
   with the new value. The worker picks it up on the next request.

Note: as of 2026-04-21 the memory flag says `DATABASE_URL` is overdue for
rotation on staging — do that before the next release.

### Data-loss event

If the database is up but data went bad (mistaken `DELETE`, bad
migration, application bug wrote junk over hours): see
[`db-restore.md`](./db-restore.md). Restore is via branching at a
timestamp; we don't take or load dumps.

### Resend outage

If mail is queued > 15 minutes:

1. Check Resend status.
2. Run `wrangler tail --name vitein-api --env production --search resend`
   for the relevant timeframe; look for non-2xx Resend responses logged
   by `infra/email.ts`.
3. If Resend is healthy but our calls fail, check the API key has not
   been rotated outside our knowledge.
4. Backlog is queued in `cf-queues` (`QUEUE_EMAIL`). Once Resend
   recovers, the queue consumer drains automatically — verify via
   queue depth in CF dashboard.

### Stripe webhook misses

Symptom: a customer's checkout succeeded in Stripe but their event is
still `is_paid=false`.

1. Stripe → developers → webhooks → find the recent failed delivery.
2. Click "Resend" — our handler is idempotent.
3. If repeated failures: confirm `STRIPE_WEBHOOK_SECRET` matches between
   Stripe and `wrangler secret get`. Stripe rotates these silently if
   you accidentally regenerate a webhook endpoint.

### Cron is not firing

The hourly reminder + announcement cron lives in `apps/api/wrangler.toml`
under `[triggers] crons = ["0 * * * *"]`. If reminders aren't going out:

1. `wrangler tail --name vitein-api --env production --search runScheduled`.
   You should see one log line per hour.
2. CF Workers Cron history: dashboard → Workers → vitein-api →
   Triggers → Cron History (last 30 days).
3. If history is empty, the trigger is unbound. Redeploy with
   `wrangler deploy --env production`.

### Sentry storm

If a single error is firing thousands of times per minute:

1. Identify the issue in Sentry.
2. Open the affected route handler. Either patch and redeploy, or
   short-circuit the offending code path (e.g. feature-flag off).
3. If the storm is from a misbehaving client, add the source IP to
   Cloudflare's WAF block list temporarily — but document it in the
   incident write-up so it gets removed.

---

## Where the logs live

| Source                    | How to read                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| Sentry errors             | https://sentry.io/organizations/vitein/issues/                          |
| CF Worker logs (live)     | `wrangler tail --name <worker> --env <env>`                             |
| CF Worker logs (archived) | Logpush → R2 bucket `vitein-logs/<env>/<date>/`                         |
| Cron run history          | CF dashboard → Worker → Triggers → Cron history                         |
| Web requests              | CF dashboard → Web Analytics → next.vite.in / vite.in                   |
| Email deliveries          | Resend dashboard → Logs (90-day retention)                              |
| Payments                  | Stripe dashboard → Events                                               |
| Audit log                 | Postgres: `select * from audit_log order by created_at desc limit 200;` |

Every API response carries an `x-request-id`. Use it to correlate Sentry
events with Worker logs and the `audit_log` table.

---

## Sentry alerts that must exist

Sentry's alert rules are configured in the dashboard, not in code.
The list below is the source of truth for what should be configured;
re-create from scratch if it ever drifts. All rules route to the same
notification target (Kim's email by default; switch to a Slack
webhook once the workspace is set up).

| Alert name                  | Project      | Trigger                                                           | Routing            |
| --------------------------- | ------------ | ----------------------------------------------------------------- | ------------------ |
| API — 5xx rate spike        | `vitein-api` | Issue count > 5 in 5 min, level=error                             | Kim, immediate     |
| API — latency p95           | `vitein-api` | Transaction p95 > 1 s sustained over 10 min                       | Kim, low-priority  |
| API — DB unreachable        | `vitein-api` | `db_ping_failed` event fires (custom)                             | Kim, immediate     |
| MCP — tool-call failures    | `vitein-mcp` | Issue count > 3 in 5 min                                          | Kim, immediate     |
| Web — hydration failures    | `vitein-web` | Issue tag `level:fatal`, > 5 events in 10 min                     | Kim, low-priority  |
| Web — JS error rate         | `vitein-web` | Any new issue affecting > 1% of sessions                          | Kim, low-priority  |
| Cron — silent reminder pass | `vitein-api` | Use the Uptime Kuma push-monitor instead (see uptime-monitors.md) | (configured there) |

### Acceptance criteria for the alerts

- Every alert listed has a Slack/email destination that is verified to
  arrive within 1 minute of a test trigger.
- Each alert's grouping is set to "issue", not "event", so a single
  incident produces one notification, not hundreds.
- The DB-unreachable alert specifically watches for events tagged
  `tag:db_unreachable` — needs `Sentry.setTag('db_unreachable', true)`
  to be emitted from `infra/db.ts` when a query fails to reach Neon.
  Implementation pending — file the issue when wiring.

### What to do when an alert fires

1. Open the Sentry issue, copy the `request_id` from the breadcrumbs.
2. Grep Worker logs (`wrangler tail`) for the same id to see the full
   request lifecycle.
3. Run the relevant playbook from the section above (Neon outage,
   Worker rollback, etc.).
4. After resolution, file an incident write-up under
   `docs/ops/incidents/`.

---

## Deploys

| Surface     | Trigger                            | How to run manually                  |
| ----------- | ---------------------------------- | ------------------------------------ |
| API staging | GitHub push to `main`              | `pnpm -F @vitein/api deploy:staging` |
| API prod    | git tag `api-vX.Y.Z`               | `pnpm -F @vitein/api deploy:prod`    |
| Web staging | GitHub push to `main`              | CF Pages auto                        |
| Web prod    | merge to `main` after staging soak | CF Pages prod branch                 |
| MCP staging | GitHub push to `main`              | `pnpm -F @vitein/mcp deploy:staging` |

Production deploys require a passing CI run and a tag pushed by Kim. Do
not push tags from CI.

---

## Incident write-up template

`docs/ops/incidents/<YYYY-MM-DD>-<slug>.md`:

```
# <YYYY-MM-DD> <slug>

**Surfaces affected:** api / web / mcp / mail / payments
**Started:** <UTC timestamp>
**Detected by:** Sentry / user report / cron alarm
**Resolved:** <UTC timestamp>

## What happened
…

## Timeline
…

## Why it happened
…

## What we changed
…

## What we'll change to prevent recurrence
…
```

Keep them blunt and honest — incident write-ups are not marketing copy.
