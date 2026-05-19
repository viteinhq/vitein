#!/usr/bin/env node
/**
 * Headless axe-core audit against a base URL.
 *
 * Boots Chromium via Playwright, visits the launch-critical pages,
 * runs axe against each, and prints the violations grouped by page.
 * Exits non-zero if any violation has impact `serious` or `critical`
 * — `moderate` and `minor` log as warnings but don't fail the run.
 *
 * Usage:
 *   node scripts/run-axe-audit.mjs https://next.vite.in
 *
 * Why no Playwright config / test runner: the audit is one straight
 * loop that exits on first hard failure. A full Playwright suite
 * brings its own retries, reporters, and parallel-shards that we
 * don't need for a single-pass deployment gate.
 */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = process.argv[2];
if (!BASE) {
  console.error('Usage: node scripts/run-axe-audit.mjs <base-url>');
  process.exit(2);
}

// Subset of the Roadmap "Web client" launch surfaces. Authenticated
// routes (/account/*) aren't audited here — they require a session
// cookie. Add a sign-in helper later when needed.
const PAGES = [
  '/',
  '/create',
  '/pricing',
  '/signin',
  '/legal/impressum',
  '/legal/privacy',
  '/legal/terms',
];

const HARD = new Set(['serious', 'critical']);

async function main() {
  const browser = await chromium.launch();
  let totalHard = 0;
  let totalSoft = 0;
  try {
    const ctx = await browser.newContext({ locale: 'en' });
    for (const route of PAGES) {
      const page = await ctx.newPage();
      const url = `${BASE}${route}`;
      console.log(`\n→ ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      } catch (err) {
        console.error(`  ✗ navigation failed: ${String(err)}`);
        totalHard += 1;
        await page.close();
        continue;
      }
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      if (result.violations.length === 0) {
        console.log(`  ✓ no violations`);
      } else {
        for (const v of result.violations) {
          const impact = v.impact ?? 'minor';
          const tag = HARD.has(impact) ? '✗' : '!';
          console.log(`  ${tag} [${impact}] ${v.id}: ${v.help}`);
          for (const node of v.nodes.slice(0, 3)) {
            console.log(`      ${node.target.join(' > ')}`);
          }
          if (v.nodes.length > 3) {
            console.log(`      …and ${String(v.nodes.length - 3)} more`);
          }
          if (HARD.has(impact)) totalHard += 1;
          else totalSoft += 1;
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(``);
  console.log(`Summary: ${String(totalHard)} hard / ${String(totalSoft)} soft violations`);

  if (totalHard > 0) {
    console.error(`\n✗ Failing the run — hard a11y violations must be fixed.`);
    process.exit(1);
  }
  console.log(`✓ No hard violations`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
