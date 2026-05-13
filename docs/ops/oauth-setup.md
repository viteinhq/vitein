# OAuth 2.1 provider — setup

vite.in's Core API now acts as an OAuth 2.1 + PKCE identity provider via
Better-Auth's `@better-auth/oauth-provider` plugin. This doc walks the
end-to-end setup once the plugin lands on `main`.

The Phase-2 motivation is to let LLM-agent clients (Claude, ChatGPT,
Gemini via MCP) act on a user's vite.in account with explicit, scoped
consent. The same machinery later supports third-party developer apps
(Phase 3).

---

## Architecture overview

```
[LLM client] ──► [auth.vite.in / oauth2/authorize] ──► sign-in + consent
     │                       │
     │                       └─► issues authorization_code (PKCE-bound)
     │
     │ POST /v1/auth/oauth2/token  (with code + verifier)
     ▼
[access_token (JWT) + refresh_token]
     │
     │ Bearer header on every MCP tool call
     ▼
[mcp.vite.in/mcp] ── verifies JWT locally ──► [api.vite.in] (forwards with the same token)
```

JWT mode is enabled so the MCP server can verify access tokens locally
without a per-call round-trip to `/oauth/introspect`.

---

## Steps (run once per environment)

### 1. Apply the migration

The OAuth tables are added in
`packages/db-schema/migrations/0004_soft_vanisher.sql`:

```bash
DATABASE_URL='<staging|prod connection string>' pnpm db:migrate
```

Verify the tables exist:

```sql
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name LIKE 'oauth_%';
```

Expect:

- `oauth_clients`
- `oauth_access_tokens`
- `oauth_refresh_tokens`
- `oauth_consents`

### 2. Register the first-party MCP client

A one-time admin call inserts a row in `oauth_clients` for our own MCP
server. Use the seed script:

```bash
API_BASE_URL=https://api-staging.vite.in \
ADMIN_SESSION_COOKIE='better-auth.session_token=…' \
node scripts/register-mcp-oauth-client.mjs
```

The session cookie comes from signing in to the dashboard as Kim and
copying the `better-auth.session_token` cookie from devtools.

The script prints `client_id` and `client_secret`. **Capture both
immediately — the secret is shown only once.**

### 3. Wire the secrets onto the MCP worker

```bash
pnpm -F @vitein/mcp exec wrangler secret put MCP_OAUTH_CLIENT_ID --env staging
pnpm -F @vitein/mcp exec wrangler secret put MCP_OAUTH_CLIENT_SECRET --env staging
```

### 4. Verify well-known metadata

```bash
curl https://api-staging.vite.in/v1/auth/.well-known/oauth-authorization-server | jq
```

Expect a document with `issuer`, `authorization_endpoint`,
`token_endpoint`, `jwks_uri`, `registration_endpoint`,
`scopes_supported`, `response_types_supported`,
`grant_types_supported` (must include `authorization_code` and
`refresh_token`), and `code_challenge_methods_supported: ["S256"]`.

### 5. Sanity-check the flow

Drive an end-to-end flow with the MCP Inspector once the MCP server
side is wired:

```bash
npx @modelcontextprotocol/inspector https://mcp-staging.vite.in/mcp
```

The Inspector should:

1. Open a browser tab to `api-staging.vite.in/v1/auth/oauth2/authorize`
   with PKCE params.
2. Bounce through `/signin` if not authenticated.
3. Skip the consent screen (`skip_consent: true` on the first-party
   client) and immediately issue the code.
4. The MCP Inspector then exchanges the code for a token at
   `/v1/auth/oauth2/token` and uses the bearer on subsequent
   `tools/call` requests.

---

## Scopes

Issued by the Provider (see `apps/api/src/infra/auth.ts`):

| Scope            | Allows                                              |
| ---------------- | --------------------------------------------------- |
| `openid`         | OIDC sub claim — required for any OIDC client.      |
| `profile`        | User's display name + locale + timezone.            |
| `email`          | User's email address.                               |
| `offline_access` | Issue a refresh token alongside the access token.   |
| `events:read`    | `GET /v1/events/...` for events owned by the user.  |
| `events:write`   | `POST/PATCH/DELETE /v1/events/...` on those events. |
| `guests:read`    | List invited guests on owned events.                |
| `guests:write`   | Modify the guest list on owned events.              |
| `rsvps:read`     | List RSVPs for owned events.                        |
| `rsvps:write`    | Submit/edit RSVPs (programmatic batch imports).     |

LLM-client requests narrow as much as possible. The MCP server's
default scope set in Phase 1 is `events:read events:write rsvps:read`.

---

## What's _not_ in this round

- **Consent page UI.** First-party clients (`skip_consent: true`)
  don't need one. When the developer portal opens for third-party
  apps in Phase 3, add a `/oauth/consent` route to the web app and
  remove the consent-page placeholder.
- **MCP-server-side token validation + OAuth-gated tools.** Filed as
  a follow-up — the foundation is here, but the MCP worker still
  exposes only the no-auth tools from PR #34.
- **Apex DNS for `auth.vite.in`.** The current setup keeps OAuth
  endpoints under `api.vite.in/v1/auth/...`. Splitting them onto a
  dedicated `auth.vite.in` subdomain is cosmetic and can wait.

See [`apps/mcp/CLAUDE.md`](../../apps/mcp/CLAUDE.md) for the agent
side of this story.
