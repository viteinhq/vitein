# vite.in

Global invitation platform. Web, native iOS, native Android, and an MCP server for LLM agents — one API behind them all.

**Status:** Phase 0 (Foundation). Not yet deployed. v1 remains live at [vite.in](https://vite.in) during the rebuild.

## Repository layout

This is the **public monorepo** (`viteinhq/vitein`). It contains the open-source core of the platform:

- `apps/api/` — Core API (Cloudflare Workers + Hono). AGPLv3.
- `apps/web/` — SvelteKit web client. AGPLv3.
- `apps/mcp/` — MCP server for LLM agents. MIT (to encourage ecosystem adoption).
- `packages/` — OpenAPI spec, generated SDKs, DB schema, shared types, i18n messages.
- `templates-community/` — Community-contributed invitation templates.
- `docs/` — Architecture, roadmap, decision records.

Mobile apps live separately: [`vite-in-ios`](https://github.com/viteinhq/vite-in-ios) and [`vite-in-android`](https://github.com/viteinhq/vite-in-android).

Proprietary premium features (branded templates, advanced analytics, AI-design generator) live in a private sibling repo and are not part of this codebase.

## License

Unless noted otherwise, this project is licensed under the **GNU Affero General Public License v3.0** — see [LICENSE](./LICENSE).

The MCP server in `apps/mcp/` is separately licensed under **MIT** — see [`apps/mcp/LICENSE`](./apps/mcp/LICENSE) once present.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). External contributions require signing our CLA.

## Security

Please do **not** open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md).
