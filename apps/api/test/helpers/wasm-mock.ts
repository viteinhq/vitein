// Test-only stand-in for the bundled WASM modules used by the OG endpoint.
// Vitest runs through Node ESM which can't resolve `.wasm` extensions;
// vitest.config aliases the package's WASM path to this file so the
// spec-coverage import of `src/index.ts` doesn't blow up. Runtime
// behaviour is unaffected — wrangler bundles the real WASM at deploy
// time and never sees this file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const placeholder: WebAssembly.Module = {} as any;
export default placeholder;
