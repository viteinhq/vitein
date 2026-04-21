# vite.in

Global invitation platform. Web, native iOS, native Android, and an MCP server for LLM agents — one API behind them all.

**Status:** Phase 0 complete; Phase 1 in progress. v2 lives on staging (links below); v1 remains live at [vite.in](https://vite.in) during the rebuild.

## Live (staging)

| Surface | URL                         | Notes                                                     |
| ------- | --------------------------- | --------------------------------------------------------- |
| Web     | https://next.vite.in        | SvelteKit on Cloudflare Pages                             |
| API     | https://api-staging.vite.in | `/v1/health`, `/v1/events/*`, `/v1/auth/*`, `/v1/users/*` |
| MCP     | https://mcp-staging.vite.in | `POST /mcp` (JSON-RPC 2.0), two public read-only tools    |

## Repository layout

This is the **public monorepo** (`viteinhq/vitein`). It contains the open-source core of the platform:

- `apps/api/` — Core API (Cloudflare Workers + Hono). AGPLv3.
- `apps/web/` — SvelteKit web client. AGPLv3.
- `apps/mcp/` — MCP server for LLM agents. MIT (to encourage ecosystem adoption).
- `packages/` — OpenAPI spec, generated TS SDK, Drizzle schema, shared ESLint/TSConfig, i18n messages.
- `docs/` — Architecture, roadmap, project plan, and ADRs.

Mobile apps live separately: [`vite-in-ios`](https://github.com/viteinhq/vite-in-ios) and [`vite-in-android`](https://github.com/viteinhq/vite-in-android).

Proprietary premium features (branded templates, advanced analytics, AI-design generator) live in a private sibling repo and are not part of this codebase.

## Local development

```bash
pnpm install
pnpm -F @vitein/api dev   # http://localhost:8787
pnpm -F @vitein/web dev   # http://localhost:5173
pnpm typecheck
pnpm test
```

See per-app `CLAUDE.md` and [`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md) for workflow details.

## License

Unless noted otherwise, this project is licensed under the **GNU Affero General Public License v3.0** — see [LICENSE](./LICENSE).

The MCP server in `apps/mcp/` is separately licensed under **MIT** — see [`apps/mcp/LICENSE`](./apps/mcp/LICENSE).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). External contributions require signing the CLA (automated via PR comment — see `CLA.md`).

## Security

Please do **not** open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md).
