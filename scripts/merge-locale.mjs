#!/usr/bin/env node
/**
 * Locale file completer.
 *
 * Translating a new locale, you only hand-write the keys you actually
 * translated (the product UI strings) into apps/web/messages/<tag>.json.
 * This script then rewrites that file so it carries *every* key from
 * the English source: keys you translated keep your value, keys you
 * omitted (legal pages, price strings) are filled from en.json. Output
 * is ordered exactly like en.json so diffs stay readable and the
 * key-parity check (check-i18n-completeness.mjs) passes.
 *
 * Usage:
 *   node scripts/merge-locale.mjs <tag> [<tag> ...]
 *
 * Idempotent — running it on an already-complete file is a no-op
 * beyond re-ordering.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const MESSAGES_DIR = path.join(REPO_ROOT, 'apps/web/messages');

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf-8'));
}

async function mergeLocale(tag, source) {
  const file = path.join(MESSAGES_DIR, `${tag}.json`);
  let partial;
  try {
    partial = await readJson(file);
  } catch {
    console.error(`✗ ${tag}: messages/${tag}.json not found — write the translated keys first.`);
    return false;
  }

  const merged = {};
  let translated = 0;
  let filled = 0;
  for (const [key, enValue] of Object.entries(source)) {
    if (key in partial && partial[key] !== '') {
      merged[key] = partial[key];
      if (key !== '$schema') translated += 1;
    } else {
      merged[key] = enValue;
      if (key !== '$schema') filled += 1;
    }
  }

  const extra = Object.keys(partial).filter((k) => !(k in source));
  if (extra.length > 0) {
    console.error(`✗ ${tag}: ${extra.length} key(s) not present in en.json — likely typos:`);
    for (const k of extra) console.error(`    ${k}`);
    return false;
  }

  await fs.writeFile(file, JSON.stringify(merged, null, 2) + '\n');
  console.log(`✓ ${tag}: ${translated} translated, ${filled} filled from en (en-fallback)`);
  return true;
}

async function main() {
  const tags = process.argv.slice(2);
  if (tags.length === 0) {
    console.error('Usage: node scripts/merge-locale.mjs <tag> [<tag> ...]');
    process.exit(2);
  }
  const source = await readJson(path.join(MESSAGES_DIR, 'en.json'));
  let ok = true;
  for (const tag of tags) {
    ok = (await mergeLocale(tag, source)) && ok;
  }
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
