# @vitein/ts-sdk

TypeScript SDK for the vite.in API. **Generated** from `@vitein/openapi-spec` via `@hey-api/openapi-ts` — do not edit `src/generated/` by hand.

## Usage

```ts
import { client, getHealth } from '@vitein/ts-sdk';

client.setConfig({ baseUrl: 'https://api-staging.vite.in' });

const { data, error } = await getHealth();
if (error) throw error;
console.log(data.db); // 'connected' | 'unavailable' | 'error'
```

## Regenerate after a spec change

From the repo root:

```bash
pnpm gen:sdk
```

CI fails any PR where the committed `src/generated` drifts from the spec.
