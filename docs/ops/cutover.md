# v1 → v2 cutover plan

How vite.in transitions from the v1 stack (still serving production
traffic on `vite.in`) to the v2 stack currently on `next.vite.in` and
`api-staging.vite.in`. This is a one-time procedure; once it's done,
v1 becomes a read-only archive.

The plan keeps v1 reachable until v2 has met its exit criteria on real
traffic. There is no forced migration of users — v1 events stay
accessible at their existing URLs for as long as anyone is following
those links.

## Phase 1 exit criterion this addresses

> _100% of new event creation traffic goes to v2 for 2 consecutive weeks
> without regression._

The work below is what gets that criterion green.

---

## Step 0 — Pre-flight (done before any traffic moves)

- [ ] Phase 1 exit criteria from `docs/PROJECT_PLAN.md` are green
      (creation + RSVPs + payments + magic links + dashboard).
- [ ] `scripts/pentest.mjs` clean against staging; manual checklist in
      `docs/ops/pentest-checklist.md` run within the last week.
- [ ] Load test (`scripts/loadtest-suite.sh`) hit p95 < 150 ms read,
      < 400 ms write on staging.
- [ ] On-call runbook (`docs/ops/runbook.md`) reviewed and recently
      practised — rollback should be muscle memory before cutover, not
      after.
- [ ] Status page (`status.vite.in`) live and tested with a fake
      incident.
- [ ] Sentry alerts wired for: API 5xx > 1% over 5 min, p95 latency > 1 s sustained, cron miss > 1 hour.

## Step 1 — Archive v1 (T-7 days)

The point is to make v1 immortal as a read-only artefact before we stop
maintaining it. We're not migrating v1 data into v2 — different
schemas, different operational model. We're keeping v1 alive for the
URLs people already shared.

- [ ] Take a final SQL dump of the v1 database. Store under
      `r2://vitein-archives/v1/db-<ISO>.sql.gz`.
- [ ] Snapshot v1's media bucket / wherever uploads live. Push to
      `r2://vitein-archives/v1/media/<ISO>/`.
- [ ] Verify both archives are readable from a clean machine — the
      dump must round-trip into a local Postgres without errors.
- [ ] Set v1 to read-only:
  - Database: revoke INSERT/UPDATE/DELETE on the v1 role for the public
    schema; keep SELECT.
  - API: deploy a v1 build that returns 410 (`gone`) on every write
    endpoint with a `migration_in_progress` body. Read endpoints stay 200.
- [ ] Email creators with events in the next 30 days: heads-up that
      v1 is freezing, links keep working, dashboard moves to
      `vite.in/account/dashboard` on v2.

Retention: archives live for **one year**. After that, anonymised
aggregates may be retained for analytics; raw archives are deleted on
schedule under `docs/ops/data-retention.md` (TBD).

## Step 2 — DNS gating (T-0)

The cutover itself. We use a feature-flag-gated split so we can move
traffic percentage at a time and revert in seconds.

The flag key is `cutover.v2_traffic_pct` in `KV_FLAGS`. Values are
integers 0–100. The wedge worker at the apex (`vite.in`) reads the flag
on every request and either proxies to v1 or rewrites the request to
v2.

Sequence:

- [ ] Day 1: flip flag to **5**. Watch Sentry + Resend + Stripe for 24 h.
      If any metric drifts, set to **0**, debug, retry next day.
- [ ] Day 2: **20**.
- [ ] Day 4: **50**.
- [ ] Day 7: **100** — at this point all event creation goes to v2.
- [ ] Day 21 (after two clean weeks): tear down the wedge worker, point
      `vite.in` apex directly at v2's CF Pages project.

Reads of existing v1 events stay on v1 for the full 21-day soak.
After tear-down, the wedge logic becomes: `if path matches
/e/<v1-slug-pattern>, proxy to v1.read-only.vite.in; else serve v2`.
The slug patterns are listed in `infra/wedge/v1-slugs.txt` (generated
from the v1 archive).

## Step 3 — v1 sunset (T+90 days)

- [ ] Migrate the remaining read traffic — most events are by now in
      the past or have stopped attracting clicks. Redirect any URL
      that still resolves to a 404 page explaining the archive.
- [ ] Decommission the v1 worker. Keep the database snapshot.
- [ ] Update DNS: remove `v1.read-only.vite.in` and any v1-only
      records.
- [ ] Write up a closing post on the blog: what changed, what's
      preserved, how to export archived events on request.

## Rollback

If anything in Step 2 goes sideways:

1. `wrangler kv:key put cutover.v2_traffic_pct 0 --binding KV_FLAGS --env production`
   — instant revert. Wedge worker sees the new value on the next request.
2. File the incident in `docs/ops/incidents/`.
3. Decide whether to retry the next traffic step in 24h or pause for a
   week and investigate.

The wedge worker keeps v1 fully reachable throughout — Step 2 is
reversible by definition until you tear the wedge down. Don't tear it
down until you've had two clean weeks at 100%.

## What does NOT need to happen in cutover

- **No v1 → v2 data migration.** v1 events stay on v1. New events go
  to v2.
- **No notification to non-active users.** People with events in the
  past don't need to know.
- **No URL preservation guarantees for v1 management links.** Magic
  links from v1 will keep working until Step 3; after that the read-only
  fallback shows event details but no management UI.
