# Uptime Kuma monitor list

Kim runs a local Uptime Kuma instance. The monitors below are what
should be configured there — copy each row into a new monitor.

For each monitor:

- **Type:** HTTP(s) — Keyword
- **Interval:** 60 seconds
- **Retries:** 2
- **Notifications:** route to whichever channel the Kuma instance is
  already wired to (Telegram, Email, push, etc.)
- **Accepted status:** 200–299 unless noted

If a monitor expects a body keyword, the request fails when the keyword
is absent from the response — useful for catching "API is up but DB is
broken" (the keyword `"db":"connected"` will be missing) without
adding a custom synthetic check.

---

## Staging — current targets

| Name                          | URL                                   | Keyword            | Notes                                                                                                                                       |
| ----------------------------- | ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Web — staging landing         | https://next.vite.in/                 | `vite.in`          | Catches CSP/JS bundle issues that 200 the HTML but break rendering — the brand string lives in the rendered body.                           |
| API — staging health (DB)     | https://api-staging.vite.in/v1/health | `"db":"connected"` | The 2026-05-12 outage would have triggered this monitor — health 200'd but db key was `"error"`.                                            |
| API — staging health (status) | https://api-staging.vite.in/v1/health | `"status":"ok"`    | Catches non-200 from the health route itself.                                                                                               |
| MCP — staging banner          | https://mcp-staging.vite.in/          | `vitein-mcp`       | Server-info banner; if the worker is down the GET will 5xx.                                                                                 |
| Media — staging R2 reach      | https://media-staging.vite.in/        | (any 2xx/4xx)      | R2 public bucket reachable. A 404 with no body is fine — Kuma's status range catches a hard 5xx or DNS fail. Set accepted status `200-499`. |

## Production — wire these once the prod cutover happens

Don't enable these monitors until the corresponding surface exists,
otherwise they'll trigger constant alerts. Listed here as the eventual
state.

| Name                             | URL                           | Keyword            |
| -------------------------------- | ----------------------------- | ------------------ |
| Web — production                 | https://vite.in/              | `vite.in`          |
| API — production health (DB)     | https://api.vite.in/v1/health | `"db":"connected"` |
| API — production health (status) | https://api.vite.in/v1/health | `"status":"ok"`    |
| MCP — production                 | https://mcp.vite.in/          | `vitein-mcp`       |

## Heartbeats — cron-driven jobs

The hourly reminder cron is the one job whose silence would only show
up when a user complains about a missed reminder. Use a Kuma
**push monitor**: it expects a heartbeat from the API at least once
per N minutes, alerts when one is missed.

| Name          | Type | Expected interval                          | How the heartbeat is sent                                                                                                                                 |
| ------------- | ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reminder cron | Push | 90 minutes (75-minute base cycle + buffer) | `apps/api/src/cron.ts` POSTs to the Kuma push URL at the end of every `runScheduled` invocation — implementation pending; wire when prod cron is enabled. |

---

## Why these specific keywords

A monitor that only checks for HTTP 200 misses the failure mode we
actually had on 2026-05-12: the worker returned `200 OK` with a body
of `{"status":"ok","db":"error",...}` — the API was _up_ but it
couldn't talk to Neon. The keyword `"db":"connected"` is the
narrowest possible "the whole stack works" signal we can probe
without authentication.

Don't tighten further (e.g. matching the full JSON shape) — every
unrelated schema addition would then break the monitor. Match the one
piece of state that proves the dependency works.
