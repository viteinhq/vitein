# @vitein/web

SvelteKit web client deployed to Cloudflare Pages.

See [`CLAUDE.md`](./CLAUDE.md) for stack, conventions, and route map.

## Quick start

```bash
# In one terminal:
pnpm -F @vitein/api dev          # → http://localhost:8787

# In another:
API_BASE_URL=http://localhost:8787 pnpm -F @vitein/web dev  # → http://localhost:5173
```

## Scripts

- `pnpm -F @vitein/web dev` — local dev server
- `pnpm -F @vitein/web build` — production build (Cloudflare adapter)
- `pnpm -F @vitein/web typecheck` — svelte-kit sync + svelte-check
- `pnpm -F @vitein/web lint`
