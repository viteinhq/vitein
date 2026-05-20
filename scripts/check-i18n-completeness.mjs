#!/usr/bin/env node
/**
 * i18n key-parity check.
 *
 * Every locale must carry exactly the same set of keys as its source
 * locale — no missing keys, no stragglers. Paraglide falls back to the
 * source at runtime when a key is absent, which means a half-translated
 * locale ships silently. As the locale count grows (Phase 1.5+ adds
 * Indian + East-Asian languages) that silent drift becomes the main
 * i18n failure mode. This check makes it loud: CI goes red on any
 * key-set mismatch.
 *
 * Scope: two message stores —
 *   - apps/web/messages/*.json            (Paraglide UI strings)
 *   - packages/i18n-messages/src/locales  (API error messages)
 *
 * What this does NOT check: translation *quality* or whether a value
 * is still the English placeholder. Key presence only — that's the
 * part that's mechanically verifiable. Untranslated-but-present keys
 * are caught by the human/contractor review pass.
 *
 * The `$schema` metadata key is ignored in the comparison.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const STORES = [
  { label: 'web UI (apps/web/messages)', dir: 'apps/web/messages', source: 'en' },
  {
    label: 'API errors (packages/i18n-messages)',
    dir: 'packages/i18n-messages/src/locales',
    source: 'en',
  },
];

const IGNORED_KEYS = new Set(['$schema']);

async function loadKeys(file) {
  const raw = await fs.readFile(file, 'utf-8');
  const obj = JSON.parse(raw);
  return new Set(Object.keys(obj).filter((k) => !IGNORED_KEYS.has(k)));
}

async function checkStore(store) {
  const dir = path.join(REPO_ROOT, store.dir);
  let files;
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    console.error(`✗ ${store.label}: directory not found (${store.dir})`);
    return false;
  }

  const sourceFile = `${store.source}.json`;
  if (!files.includes(sourceFile)) {
    console.error(`✗ ${store.label}: source locale ${sourceFile} missing`);
    return false;
  }

  const sourceKeys = await loadKeys(path.join(dir, sourceFile));
  let ok = true;

  console.log(`\n${store.label} — source \`${store.source}\` has ${sourceKeys.size} keys`);

  for (const file of files.sort()) {
    if (file === sourceFile) continue;
    const locale = file.replace(/\.json$/, '');
    const keys = await loadKeys(path.join(dir, file));

    const missing = [...sourceKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !sourceKeys.has(k));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ✓ ${locale}`);
      continue;
    }
    ok = false;
    console.error(`  ✗ ${locale}: ${missing.length} missing, ${extra.length} extra`);
    for (const k of missing.slice(0, 15)) console.error(`      missing: ${k}`);
    if (missing.length > 15) console.error(`      …and ${missing.length - 15} more missing`);
    for (const k of extra.slice(0, 15)) console.error(`      extra:   ${k}`);
    if (extra.length > 15) console.error(`      …and ${extra.length - 15} more extra`);
  }
  return ok;
}

async function main() {
  let allOk = true;
  for (const store of STORES) {
    const ok = await checkStore(store);
    allOk = allOk && ok;
  }
  console.log('');
  if (!allOk) {
    console.error('✗ i18n key parity check failed — fix the locale files above.');
    process.exit(1);
  }
  console.log('✓ All locales have key parity with their source.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
