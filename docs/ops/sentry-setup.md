# Sentry source-map upload — setup

Code-side support is already wired in deploy.yml. To turn it on, set up
Sentry org/projects and add four GitHub secrets/vars.

The upload steps in deploy.yml are conditional on `SENTRY_AUTH_TOKEN`
and `SENTRY_PROJECT_*` being present — until you complete this setup
deploys still succeed, they just skip the upload silently.

## 1. Sentry org + projects

On https://sentry.io (or self-hosted Sentry):

1. **Org**: create or reuse an org (`vitein` recommended).
2. **Projects**: one per app, platform = "JavaScript".
   - `vitein-api` (Cloudflare Workers)
   - `vitein-mcp` (Cloudflare Workers)
   - `vitein-web` (SvelteKit on Pages)
3. Each project's DSN goes into the matching app's Wrangler secret
   (`SENTRY_DSN`). Already done for API on staging.

## 2. Sentry auth token

1. User Settings → **Auth Tokens** → **Create New Token**.
2. Scopes: `project:read`, `project:releases`. **Do not** grant org
   admin — releases-only is enough.
3. Copy the token (`sntrys_…`).

## 3. GitHub secrets and vars

In the repo settings → Secrets and variables → Actions:

| Kind     | Name                 | Value                                |
| -------- | -------------------- | ------------------------------------ |
| Secret   | `SENTRY_AUTH_TOKEN`  | the `sntrys_…` token from step 2     |
| Variable | `SENTRY_ORG`         | your Sentry org slug (e.g. `vitein`) |
| Variable | `SENTRY_PROJECT_API` | `vitein-api`                         |
| Variable | `SENTRY_PROJECT_MCP` | `vitein-mcp`                         |
| Variable | `SENTRY_PROJECT_WEB` | `vitein-web`                         |

The auth token is a secret (write/destroy-only). Project slugs and the
org name are variables (visible in logs, fine — they're not sensitive).

## 4. Verify

Trigger any deploy (push a no-op commit to `main`, or use Actions →
Deploy → Run workflow). In the run log each app's "Upload … source
maps to Sentry" step should:

- Print `Created release <sha>`
- Print `> Uploading source maps`
- Print `> Finalizing release`

In Sentry → Releases, the SHA should appear under each project with
attached source maps. The next runtime error from that release will
render with proper file/line locations instead of minified noise.

## 5. Rollback

If uploads break a deploy (auth-token expired, Sentry down, etc.),
unset `SENTRY_AUTH_TOKEN` in GitHub Secrets — the `if:` guard on each
upload step turns them into no-ops. Deploys continue without source
maps until you restore the token.
