# Status page setup

For soft launch we need a publicly-visible "is vite.in up?" page at
`status.vite.in`. The monitor configuration that feeds it is already
documented in [`uptime-monitors.md`](./uptime-monitors.md); this file
covers the publishing layer.

Three credible paths, ordered by speed-to-launch.

---

## Option A — BetterStack (recommended for soft launch)

**Why:** Free tier covers what we need (1 status page, 10 monitors).
Five-minute setup. The default theme is decent; we can polish later
without changing providers.

**Free tier limits:** 60-second monitor interval, 10 monitors,
unlimited history at 1-day granularity, 90-day full history.

### Setup steps

1. Sign up at https://betterstack.com/uptime — no card required for
   the free tier.

2. Create monitors matching [`uptime-monitors.md`](./uptime-monitors.md):

   | Name             | URL                                                                                 | Keyword            |
   | ---------------- | ----------------------------------------------------------------------------------- | ------------------ |
   | Web staging      | `https://next.vite.in/`                                                             | `vite.in`          |
   | API staging      | `https://api-staging.vite.in/v1/health`                                             | `"db":"connected"` |
   | MCP staging      | `https://mcp-staging.vite.in/`                                                      | `vitein-mcp`       |
   | Web prod\*       | `https://vite.in/`                                                                  | `vite.in`          |
   | API prod\*       | `https://api.vite.in/v1/health`                                                     | `"db":"connected"` |
   | MCP prod\*       | `https://mcp.vite.in/`                                                              | `vitein-mcp`       |

   \* Wire prod monitors only after the cutover deploy is live; otherwise
   they'll constantly alert.

3. Status page → Create new → name "vite.in" → group monitors:
   - **Web** (web staging + web prod)
   - **API** (api staging + api prod)
   - **MCP agent integration** (mcp staging + mcp prod)

4. Branding: upload the wordmark, set primary color to slate-900
   (`#0f172a`), hide BetterStack's footer in the paid tier later.

5. Custom domain: BetterStack → Status page → Settings → Custom domain
   → enter `status.vite.in`. They give you a CNAME target like
   `cname.betteruptime.com`.

6. In Cloudflare DNS for the `vite.in` zone:
   - Add a `CNAME` record: `status` → `cname.betteruptime.com`
   - **Proxy status: DNS-only** (grey cloud). BetterStack handles TLS
     termination directly; proxying through Cloudflare would double-
     hop and break their ACME challenges.

7. Wait ~5 minutes for ACME validation. `https://status.vite.in`
   should serve the page.

8. Footer link: edit `apps/web/src/routes/+layout.svelte` and add a
   "Status" entry to the footer nav next to Impressum / Privacy /
   Terms. One-line change, not a launch blocker — can ship in any PR.

### Notifications

BetterStack supports email, Slack, Telegram, PagerDuty, OpsGenie.
For solo-founder mode: email + Telegram covers everything. The same
incidents will already trigger Kuma alerts so this is the "user
visibility" layer, not the on-call paging layer.

---

## Option B — Self-host Uptime Kuma publicly

**Why:** We already run Kuma locally; the same monitors power the
public status page. Zero ongoing cost beyond the VPS bill.

**Tradeoff:** Hosting overhead (single point of failure unless you
add another), no slick incident-history UI compared to BetterStack.

### Setup steps

1. Pick a host. Reasonable options:
   - **Fly.io** — `flyctl launch` with a Uptime Kuma Docker image.
     ~$3/mo for a shared-cpu-1x with persistent volume.
   - **Hetzner CX11** — €4.51/mo, full VPS, runs anything.

2. Run Uptime Kuma with persistent volume:
   ```
   docker run -d --restart=always -p 3001:3001 \
     -v uptime-kuma:/app/data \
     louislam/uptime-kuma:latest
   ```

3. Behind a reverse proxy (Caddy easiest) with TLS for
   `status.vite.in`. Caddyfile excerpt:
   ```
   status.vite.in {
     reverse_proxy localhost:3001
   }
   ```

4. Re-create the monitors from
   [`uptime-monitors.md`](./uptime-monitors.md). Kuma's built-in
   **status page** lives at `/status/<slug>`. Configure it to
   group monitors by surface (Web / API / MCP).

5. Cloudflare DNS for the `vite.in` zone:
   - `A` or `AAAA` record: `status` → `<server IP>`
   - **Proxy status: DNS-only** (so Caddy can serve TLS via Let's
     Encrypt).

6. Move existing local Uptime Kuma monitors over (manual today; Kuma
   has an import/export but the local DB needs to be reachable).

### Migration concern

You're moving the on-call paging path too. Decide whether the new
hosted instance gets the alert webhook tokens, or whether local Kuma
keeps paging and the public instance is read-only.

---

## Option C — Minimal Worker-rendered status page

**Why:** Zero new services. Runs on Cloudflare like everything else.

**Tradeoff:** No historical uptime graph, no incident management UI,
no notification routing — just a live-now snapshot.

Useful as a **fallback if the public status page itself is down**
(rare but possible with self-hosted Kuma). Don't make this the
primary; pair with A or B.

### Sketch

A new Cloudflare Worker at `status.vite.in`:

- `GET /` — concurrently fetches `/v1/health` on api-staging + prod,
  the MCP / endpoint, and `https://vite.in/` HEAD. Renders the
  results as a single HTML page with traffic-light colors.
- Optional: stash the last 24h of results in KV for a sparkline.

Out of scope for this doc; revisit if A and B both prove unfit.

---

## Recommendation

**Soft launch with Option A.** Five minutes to set up; the free tier
covers everything we need. Revisit later if either cost or branding
control becomes a real concern.

Operator-side checklist (Kim):

- [ ] Sign up at betterstack.com/uptime
- [ ] Create the 3 staging monitors (web / api / mcp)
- [ ] Create a status page, group monitors
- [ ] Set up the `status.vite.in` CNAME (DNS-only)
- [ ] Verify the page loads
- [ ] Add notification channels (email + Telegram)
- [ ] Add a Status link in the web footer (PR'd separately when ready)
- [ ] Once prod is deployed: add prod monitors, then the prod group
      flips visible

After Phase 1 launch:

- [ ] Decide whether to keep BetterStack or migrate to hosted Kuma
      based on real-world usage / cost.
