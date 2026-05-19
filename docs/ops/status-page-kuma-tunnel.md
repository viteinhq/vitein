# Status page — Uptime Kuma on Pi via Cloudflare Tunnel

This is the concrete setup for Option B of
[`status-page.md`](./status-page.md): expose an existing self-hosted
Uptime Kuma at `status.vite.in` without opening ports on the home
router.

Cloudflare Tunnel does all the heavy lifting: outbound-only
connection from the Pi to Cloudflare's edge, TLS terminated by CF,
survives IP changes (cable provider re-rolls, etc.). Free tier covers
this without limits.

Monitor configuration lives in
[`uptime-monitors.md`](./uptime-monitors.md) — set those up before
making the page public.

---

## 1. Install `cloudflared` on the Pi

SSH in, then install the release matching the Pi's architecture:

```bash
# Pi 3 / 4 / 5 running 64-bit OS:
curl -L \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb \
  -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Pi 2 or older 32-bit OS:
# curl -L .../cloudflared-linux-armhf.deb -o cloudflared.deb
```

Verify: `cloudflared --version`.

---

## 2. Authenticate to Cloudflare

```bash
cloudflared tunnel login
```

The command prints a browser URL. Open it on any machine, pick the
`vite.in` zone, click Authorize. The Pi now holds an account-scoped
cert at `~/.cloudflared/cert.pem`.

---

## 3. Create the tunnel + DNS

```bash
cloudflared tunnel create vitein-status
```

This prints a tunnel **UUID** and the path to a credentials JSON
(`~/.cloudflared/<uuid>.json`). Save the UUID — you need it in the
next step.

```bash
cloudflared tunnel route dns vitein-status status.vite.in
```

Adds a `status` CNAME pointing to `<uuid>.cfargotunnel.com` in the
zone. Proxied (orange cloud) is correct here — Cloudflare needs to
intercept the request to route it through the tunnel.

---

## 4. Tunnel configuration

```bash
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml > /dev/null <<'EOF'
tunnel: vitein-status
credentials-file: /home/<user>/.cloudflared/<uuid>.json

ingress:
  - hostname: status.vite.in
    service: http://localhost:3001
  - service: http_status:404
EOF
```

Replace `<user>` and `<uuid>` with the actual values. `3001` is
Uptime Kuma's default port — adjust if Kim runs it elsewhere.

Validate the config without running it:

```bash
cloudflared tunnel ingress validate
```

Should print "OK".

---

## 5. Install + start the systemd service

```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
sudo systemctl status cloudflared
```

`status` should show `active (running)`. If not, `journalctl -u
cloudflared -n 100` for the failure log — most issues are typos in
the config path.

Smoke test from any machine: `curl -I https://status.vite.in` should
return whatever Kuma serves (200 + HTML for the dashboard, 302 to
`/dashboard` if not authenticated).

---

## 6. Configure the Uptime Kuma status page

Open Kuma's web UI (via the tunnel, or local LAN — either works).

1. **Monitors** — if not already set up, add the rows from
   [`uptime-monitors.md`](./uptime-monitors.md): Web staging, API
   staging health (DB + status keyword variants), MCP staging, R2
   media. Add prod monitors only after the prod cutover deploy is
   live; until then they constantly alert.

2. **Settings → Status Pages → New Status Page**:
   - **Slug:** `vitein`
   - **Title:** `vite.in`
   - **Footer:** `Status of vite.in services. Issues? mailto:status@vite.in`
   - **Theme:** match your brand (slate-900 primary works).
   - **Groups:**
     - **Web** — Web staging monitor (Web prod, when added)
     - **API** — both API health monitors
     - **MCP** — MCP staging monitor (MCP prod, when added)
     - **Media** — R2 staging monitor
   - **Show certificate expiry** — yes (catches the cf cert renewal
     edge case).

3. **Save**.

The status page is now reachable at `https://status.vite.in/status/vitein`.

---

## 7. Serve the status page at the root path

By default Kuma lives at `/status/vitein` not `/`. Two options to
fix:

### Option A — Kuma "Default Status Page"

Kuma ≥ 1.20 has a "Default Status Page" setting. In **Settings →
Status Pages**, click the status page, scroll to the bottom, toggle
**"Set as the default"**. Now `https://status.vite.in/` redirects to
the right slug.

If your Kuma version doesn't have this toggle, use Option B.

### Option B — Cloudflare redirect rule

In the Cloudflare dashboard for `vite.in`:

- **Rules → Page Rules** (or Redirect Rules under Rules → Overview).
- **URL match:** `status.vite.in/`
- **Forwarding URL:** 301 → `https://status.vite.in/status/vitein`
- Save and deploy.

Only one rule needed; it doesn't affect any path other than the bare
root.

---

## 8. Footer link on vite.in

Once `https://status.vite.in` reliably loads the dashboard, ping me
and I'll add the **Status** link to the marketing footer in
`apps/web/src/routes/+layout.svelte` alongside Impressum / Privacy /
Terms.

---

## Maintenance

- **Tunnel survives Pi reboots** via the systemd unit.
- **Cloudflare cert auto-renews**, no action needed.
- **Pi update notes:** if you upgrade Kuma and the version mismatches
  the running container/binary, the tunnel keeps serving the old
  process until Kuma restarts. Check `systemctl status uptime-kuma`
  (or your equivalent) after a Kuma upgrade.
- **Rotating the tunnel:** `cloudflared tunnel delete vitein-status`
  + re-run from step 3. The DNS record rotates with the new UUID.
- **Local LAN access still works:** the tunnel is purely additive;
  Kuma's local port stays reachable for direct admin sessions.

---

## Troubleshooting

| Symptom                                  | Likely cause                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `cloudflared` won't start                | typo in `config.yml`. Run `cloudflared tunnel ingress validate`.                          |
| `status.vite.in` 502                     | Kuma isn't reachable at `localhost:3001` from the Pi. `curl localhost:3001` to verify.    |
| `status.vite.in` 522 / connection-reset  | Tunnel is down. `journalctl -u cloudflared -n 100`.                                       |
| `status.vite.in/` shows 404              | Default status page not configured. See section 7.                                        |
| Kuma works locally, tunnel can't see it  | Kuma bound to `127.0.0.1` only; bind to `0.0.0.0` (or the loopback the tunnel goes through). |
