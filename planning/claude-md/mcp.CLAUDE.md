# apps/mcp — vite.in MCP Server

> Stack-specific CLAUDE.md for the MCP (Model Context Protocol) server. The monorepo-root CLAUDE.md also applies. Phase 2+ workstream — this directory may not exist during Phase 0/1.

## What this is

An MCP server that lets LLM clients (Claude, ChatGPT, Gemini, etc.) act on a user's vite.in account with user-granted permissions. Not an auth authority — it's itself an OAuth client of the Core API, forwarding operations.

Deployed as a separate Cloudflare Worker at `mcp.vite.in`. Isolation is deliberate: a vulnerability here does not expose the Core API directly.

## Stack

- **Runtime:** Cloudflare Workers
- **SDK:** `@modelcontextprotocol/sdk` (TypeScript)
- **Transport:** Streamable HTTP (MCP spec); SSE for older clients
- **Auth:** OAuth 2.1 Authorization Code + PKCE flow, implemented by Core API; tokens presented here
- **API client:** `@vitein/ts-sdk` (same as web)

## Model of operation

```
[LLM client: Claude] ⟷ [MCP server at mcp.vite.in] ⟷ [Core API at api.vite.in]
                              │
                              │ holds OAuth access token per user session
                              │ never stores user data itself
                              ▼
                         validates every tool call's scopes against token
```

## Exposed tools (Phase 2 launch set)

| Tool                  | Purpose                                 | Required scope |
| --------------------- | --------------------------------------- | -------------- |
| `list_events`         | List the user's events                  | `events:read`  |
| `get_event`           | Fetch one event by id or slug           | `events:read`  |
| `create_event`        | Create a new invitation                 | `events:write` |
| `update_event`        | Edit fields of an existing event        | `events:write` |
| `delete_event`        | Soft-delete an event                    | `events:write` |
| `add_guests`          | Append guests to an event's invite list | `guests:write` |
| `list_guests`         | List invited guests for an event        | `guests:read`  |
| `list_rsvps`          | List RSVPs for an event                 | `rsvps:read`   |
| `send_reminders`      | Trigger reminder emails                 | `events:write` |
| `get_event_share_url` | Get the shareable link for an event     | `events:read`  |

Every tool:

- Has a clear, non-ambiguous name and description (LLMs use descriptions for tool selection).
- Takes structured input with Zod/JSON Schema validation.
- Returns both a human-readable summary AND structured data (for chaining).
- Fails loudly on missing scopes — with a message that nudges the LLM to ask the user to authorize.

## File layout (inside `apps/mcp`)

```
src/
  index.ts            Worker entry, MCP handshake
  server.ts           MCP server setup, tool registration
  tools/
    events.ts         list / get / create / update / delete
    guests.ts
    rsvps.ts
    reminders.ts
  auth/
    oauth-client.ts   validates tokens with Core API
    session.ts        per-connection session state (Durable Object)
  infra/
    api-client.ts     wraps @vitein/ts-sdk with the token
    logging.ts
```

## Conventions

- **Tools are idempotent where possible.** LLMs retry. Design for that (creator-supplied `idempotency_key` parameter).
- **Tool inputs use the API's types.** Don't invent MCP-specific shapes; reuse what the SDK exposes.
- **Tool outputs include a `summary` string** for the LLM to quote back, plus `data` for downstream tool calls.
- **Every tool invocation is logged** with: user_id, client_id (which LLM app), tool name, duration, success/failure.
- **Never expose internal IDs needlessly.** Use slugs where the user thinks in slugs (event URLs); reserve UUIDs for internal references.

## Commands

```bash
pnpm -F @vitein/mcp dev               # local dev on port 8788
pnpm -F @vitein/mcp deploy:staging
pnpm -F @vitein/mcp deploy:prod
pnpm -F @vitein/mcp test              # vitest + MCP protocol conformance
```

Local testing: use Anthropic's MCP Inspector (`npx @modelcontextprotocol/inspector`) pointed at `http://localhost:8788`.

## OAuth flow

1. User clicks "Connect vite.in" in their LLM client.
2. LLM client redirects user to `https://vite.in/oauth/authorize?client_id=...&scopes=...&code_challenge=...`.
3. Web app (not this server) handles consent UI — user sees scopes, approves.
4. Web app redirects back to LLM with auth code.
5. LLM exchanges code for access + refresh tokens at `https://api.vite.in/oauth/token`.
6. LLM sends access token to `https://mcp.vite.in` on every tool call.

The MCP server itself does NOT implement OAuth endpoints. It only _validates_ tokens presented to it.

## Security considerations

- **Scope checks are enforced per tool call**, not per session. Tokens can be scoped narrower than the user has authorized.
- **Rate limits per token are stricter** than user-session limits (agents loop; humans don't).
- **Error messages never leak data across users** — a scope failure returns "not authorized," not "this event belongs to someone else."
- **Tool outputs are sanitized** — no HTML/markdown injection that could trick a downstream LLM into harmful behavior.
- **Audit logging is mandatory**. Every tool call is a line in the audit log.

## Things to avoid

- Don't add a new tool without updating the OpenAPI spec (the tool's underlying endpoint must exist in the Core API).
- Don't return raw DB rows — shape outputs for LLM consumption.
- Don't build features here that should live in the Core API. This server is a translator, not a brain.
- Don't implement your own token validation logic. Use the Core API's `/oauth/introspect` endpoint.

## Where to look for context

- MCP spec: https://modelcontextprotocol.io/docs
- OAuth scopes and design: @docs/ARCHITECTURE.md §5.3
- Core API endpoints available: @packages/openapi-spec/vitein.yaml
