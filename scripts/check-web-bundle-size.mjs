#!/usr/bin/env node
/**
 * Bundle-size budget check for apps/web.
 *
 * Runs after `pnpm build`. Walks the SvelteKit client-side immutable
 * directory, sums raw bytes and gzip-compressed bytes for each
 * .js file, and fails the build when totals exceed the budget.
 *
 * Why so coarse: this is a gross-regression catch — if total JS
 * doubles overnight (e.g. someone pulls in a huge dep), the build
 * goes red. Per-page LCP/TBT/CLS budgets live in
 * apps/web/lighthouserc.json and run as a separate workflow against
 * the deployed staging URL.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

const gzip = promisify(zlib.gzip);

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CLIENT_DIR = path.join(
  REPO_ROOT,
  'apps/web/.svelte-kit/output/client/_app/immutable',
);

// Budgets (bytes). Keep loose; Lighthouse handles the fine grain.
const RAW_TOTAL_BUDGET = 500 * 1024; // 500 KB
const GZ_TOTAL_BUDGET = 120 * 1024; // 120 KB

const fmt = (n) =>
  n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

async function main() {
  try {
    await fs.access(CLIENT_DIR);
  } catch {
    console.error(`✗ ${CLIENT_DIR} not found — run \`pnpm build\` first.`);
    process.exit(2);
  }

  const files = await walk(CLIENT_DIR);
  let rawTotal = 0;
  let gzTotal = 0;
  const rows = [];

  for (const f of files) {
    const buf = await fs.readFile(f);
    const gz = await gzip(buf);
    rawTotal += buf.length;
    gzTotal += gz.length;
    rows.push({ file: path.relative(CLIENT_DIR, f), raw: buf.length, gz: gz.length });
  }

  rows.sort((a, b) => b.gz - a.gz);

  console.log('Top 5 client JS files (by gzip):');
  for (const r of rows.slice(0, 5)) {
    console.log(`  ${fmt(r.gz).padStart(10)}  gz · ${fmt(r.raw).padStart(10)} raw  ${r.file}`);
  }
  console.log(``);
  console.log(
    `Total: ${fmt(rawTotal)} raw / ${fmt(gzTotal)} gz across ${String(files.length)} files`,
  );
  console.log(`Budget: ${fmt(RAW_TOTAL_BUDGET)} raw / ${fmt(GZ_TOTAL_BUDGET)} gz`);

  const overRaw = rawTotal > RAW_TOTAL_BUDGET;
  const overGz = gzTotal > GZ_TOTAL_BUDGET;

  if (overRaw || overGz) {
    console.error(``);
    if (overRaw) console.error(`✗ Raw total ${fmt(rawTotal)} > budget ${fmt(RAW_TOTAL_BUDGET)}`);
    if (overGz) console.error(`✗ Gzip total ${fmt(gzTotal)} > budget ${fmt(GZ_TOTAL_BUDGET)}`);
    console.error(``);
    console.error(`Either trim a dependency or raise the budget intentionally in this script.`);
    process.exit(1);
  }

  console.log(`✓ Bundle within budget`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
