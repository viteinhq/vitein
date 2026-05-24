// Wrangler bundles `.wasm` imports as `WebAssembly.Module` at runtime.
// TS doesn't ship a declaration for that import shape; this shim covers
// the two specific paths the API imports plus a wildcard for anything
// added later.
declare module '*.wasm' {
  const wasm: WebAssembly.Module;
  export default wasm;
}
declare module '@resvg/resvg-wasm/index_bg.wasm' {
  const wasm: WebAssembly.Module;
  export default wasm;
}
