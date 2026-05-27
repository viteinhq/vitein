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
const CLIENT_DIR = path.join(REPO_ROOT, 'apps/web/.svelte-kit/output/client/_app/immutable');

// Budgets (bytes). Keep loose; Lighthouse handles the fine grain.
// Note: this is the total across every client JS file. A given route
// only downloads a small subset (typically the route node + two
// shared chunks). Lighthouse asserts the per-page budgets.
//
// Recalibrated 2026-05-20 for the 8 → 20 locale expansion: all 20
// locales' compiled message code ships in the client output, so this
// all-files total is ~1 MB raw regardless of framework version.
// Paraglide v2 splits messages per locale — a page only *downloads*
// its own language — but this check sums every file, so the total
// budget stays put. Per-page transfer is what users feel and is gated
// by Lighthouse separately.
//
// Recalibrated 2026-05-23: +8 KB gz headroom for the staff-only
// `/admin` routes. These routes are not in any user-facing flow, but
// the script sums every emitted client chunk regardless of route.
//
// Recalibrated 2026-05-24: +10 KB gz / +20 KB raw for the i18n sweep
// of the day's batch (~316 strings translated across 19 non-EN
// locales — real translations replace the English placeholders the
// parity gate seeded). Paraglide v2 splits messages per locale so a
// page only downloads one language; this all-files total grows
// because the sum spans every locale.
//
// Recalibrated 2026-05-27: +12 KB gz / +30 KB raw for the 6 new
// layout Hero components (Editorial / Poster / Card / Photo / Bento
// / Mono — theme engine PR 2). Each is its own chunk; a page only
// downloads the hero its event's layout id resolves to, but the
// all-files sum carries them all.
//
// Recalibrated 2026-05-27 (later same day): +10 KB raw for the
// ShareSheet component (multi-target share menu — punchlist #6).
// Inline SVG icons for 5 targets push the chunk just past the
// previous raw ceiling; gz total is unchanged.
const RAW_TOTAL_BUDGET = 1170 * 1024; // 1.17 MB
const GZ_TOTAL_BUDGET = 350 * 1024; // 350 KB

const fmt = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

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
