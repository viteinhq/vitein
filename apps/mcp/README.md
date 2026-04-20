# @vitein/mcp

MCP (Model Context Protocol) server for vite.in — a Cloudflare Worker that lets LLM agents act on vite.in data.

Licensed under [MIT](./LICENSE) (the rest of the repo is AGPLv3) so downstream MCP clients and forks can integrate freely.

## Status

**Phase 1 scaffold.** Exposes public, read-only tools over JSON-RPC 2.0 at `POST /mcp`. Full Streamable-HTTP transport, OAuth-scoped creator/user tools, and session state land in Phase 2 — see [`CLAUDE.md`](./CLAUDE.md) for the target design.

## Exposed tools (Phase 1)

| Tool                  | Description                                       |
| --------------------- | ------------------------------------------------- |
| `get_event_by_slug`   | Fetch an event's public view by its URL slug.     |
| `get_event_share_url` | Return the canonical shareable link for an event. |

## Quick start

```bash
# In one terminal:
pnpm -F @vitein/api dev     # → http://localhost:8787

# In another:
pnpm -F @vitein/mcp dev     # → http://localhost:8788

# Probe:
curl -s http://localhost:8788/ | jq

# Call a tool:
curl -sX POST http://localhost:8788/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq
```

Use [Anthropic's MCP Inspector](https://github.com/modelcontextprotocol/inspector) pointed at `http://localhost:8788/mcp` for an interactive UI.
