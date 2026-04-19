# @vitein/config

Shared ESLint (flat config), Prettier, and TSConfig base for all workspaces.

## Usage

### TypeScript

```jsonc
// apps/<app>/tsconfig.json
{
  "extends": "@vitein/config/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

### ESLint (flat config)

```js
// apps/<app>/eslint.config.js
import base from '@vitein/config/eslint';
export default base;
```

### Prettier

```js
// apps/<app>/prettier.config.js
export { default } from '@vitein/config/prettier';
```
