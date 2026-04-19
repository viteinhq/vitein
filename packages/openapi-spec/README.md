# @vitein/openapi-spec

Single source of truth for the vite.in API. Every endpoint goes here first, then gets implemented.

## Workflow

1. Edit `vitein.yaml`.
2. `pnpm -F @vitein/openapi-spec lint` — redocly validates.
3. `pnpm gen:sdk` from root — regenerates `@vitein/ts-sdk` in place.
4. Commit spec + regenerated SDK together. CI blocks any commit where they drift.
5. Implement the route in `apps/api/src/routes/` using the schema types.

## Preview docs locally

```bash
pnpm -F @vitein/openapi-spec preview
```
