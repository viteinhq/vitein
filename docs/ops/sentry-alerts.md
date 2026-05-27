# Sentry alert rules — setup

Click-by-click guide for creating the alert rules that
`runbook.md` §"Sentry alerts that must exist" declares the
contract for. Sibling to `sentry-setup.md` (source-map upload) —
that one is wired through CI; alert rules have to be clicked in
the Sentry UI, no CLI / API path with the current scope of the
auth token.

**Source of truth for *what* alerts exist:** `runbook.md`.
**This doc:** *how* to click them.

## Before you start

- Source-map upload is configured (`sentry-setup.md` complete) —
  otherwise alerts arrive with minified stack traces.
- Production DSNs are live for `vitein-api`, `vitein-mcp`,
  `vitein-web` (per `project_production_launch` memory).
- You're signed into Sentry as a user with `Manager` role or
  higher (alert-rule creation is gated on that).

## The six rules (per the runbook)

### 1. API — 5xx rate spike (`vitein-api`)

Issue-type alert. Most common "something just broke" signal.

- Project → `vitein-api`
- Alerts → Create Alert → **Issues**
- Name: `[api] 5xx rate spike`
- Environment: `production`
- When: **The issue is seen more than `5` times in `5 minutes`**
- Filter: **The event's level is equal to `error`**
- Then: Send notification → email
- Action interval: `1h`
- Routing label: **immediate** (used by runbook §"What to do
  when an alert fires")

### 2. API — latency p95 (`vitein-api`)

Metric alert. Lower priority — degrades slowly.

- Alerts → Create Alert → **Metric**
- Dataset: **Transactions**
- Aggregate: **p95(transaction.duration)**
- Filter: `event.type:transaction`
- Trigger: warning at **> 800 ms** sustained 10 min; critical at
  **> 1 s** sustained 10 min
- Resolve when: < 600 ms sustained 10 min
- Then: email — `[api] p95 latency` — **low-priority**

### 3. API — DB unreachable (`vitein-api`)

Custom-tag alert. Requires `Sentry.setTag('db_unreachable', true)`
to be emitted from `apps/api/src/infra/db.ts` when a query fails
to reach Neon — *implementation pending per the runbook*. File
the alert rule now anyway; it'll start firing once the tag is
wired.

- Alerts → Create Alert → **Issues**
- Name: `[api] DB unreachable`
- Filter: **The event has tag `db_unreachable` equal to `true`**
- When: **A new issue is created** (first occurrence is enough)
- Then: email — **immediate**

### 4. MCP — tool-call failures (`vitein-mcp`)

- Project → `vitein-mcp`
- Alerts → Create Alert → **Issues**
- Name: `[mcp] tool-call failures`
- When: **The issue is seen more than `3` times in `5 minutes`**
- Filter: `event.level:error`
- Then: email — **immediate**

### 5. Web — hydration failures (`vitein-web`)

Sentry tags hydration mismatches at level `fatal`.

- Project → `vitein-web`
- Alerts → Create Alert → **Issues**
- Name: `[web] hydration failures`
- When: **Number of events > `5` in `10 minutes`**
- Filter: `event.level:fatal`
- Then: email — **low-priority**

### 6. Web — JS error rate (`vitein-web`)

Issue alert with session-percentage filter.

- Alerts → Create Alert → **Issues**
- Name: `[web] JS error rate`
- When: **A new issue affects more than `1%` of sessions in the
  last `1 hour`**
- Then: email — **low-priority**

## Acceptance check (mirrored from runbook)

- [ ] Every rule above appears in
  `sentry.io/organizations/<org>/alerts/rules/` with
  `Status: Active`.
- [ ] Each rule's grouping is "issue", not "event" — one incident
  produces one notification, not hundreds.
- [ ] Send a test event: from a non-prod request, throw a fresh
  exception with `Sentry.captureException(new Error('alerts smoke
  test 2026-05-27'))`. The matching rule should email within
  ~1 minute.
- [ ] Delete the smoke-test issue afterward.

## Tuning after the first week of production data

Thresholds above are first-pass guesses. After ~7 days:

- If a rule has fired 0 times → lower the threshold (you're missing
  real signal).
- If it has cried wolf > 3 times → raise the threshold.
- If both — split the rule into two (e.g. critical vs. warning
  with different thresholds).

## Slack hook (optional)

When the workspace exists, add Slack as a **second** "Then"
action on each rule via Settings → Integrations → Slack. Don't
remove email until Slack has proven reliable; alert delivery
failing silently is worse than getting it twice.

## Why the manual-click path

Sentry's REST API supports alert-rule CRUD
(`/api/0/projects/<org>/<project>/rules/`), but:

- The required scope is `alerts:write`, which is not on the auth
  token used by CI (`project:read` + `project:releases` only —
  see `sentry-setup.md`).
- Six rules × three projects = 18 clicks. One-time work; the UI
  wins over scripting.

If we ever need to manage these in code (e.g. > 20 rules, or
multiple non-prod environments), revisit and treat them as IaC
alongside the Wrangler / Pages config in `infra/`.
