# i18n review workflow

The English (`en`) and German (`de`) message catalogs were written by
Kim. The other six languages — `fr`, `es`, `it`, `pt`, `nl`, `pl` —
were **machine-translated by Claude on 2026-05-12** and need a native
speaker pass before they're considered launch-ready. This doc explains
what to review, in what order, and how to make edits without breaking
the structure.

## What needs review

Two message catalogs live in this repo:

- `apps/web/messages/<locale>.json` — every user-facing string in the
  web app (243 keys per locale).
- `packages/i18n-messages/src/locales/<locale>.json` — API error
  messages (21 keys per locale).

For both, `en` is the source of truth. Other locales must:

1. Have **the same keys** as `en.json`. The parity test in
   `packages/i18n-messages/src/index.test.ts` enforces this for the
   API catalog. Paraglide compiles the web catalog and flags missing
   keys at build time.
2. Use **the same ICU placeholders** as `en` — `{name}`, `{count}`,
   `{status}`, `{date}`, `{max}`. Renaming or dropping a placeholder
   breaks the call site.

## Review priority

Not all strings matter equally. If a native speaker has limited time,
go in this order:

1. **Pricing + checkout** — `pricing_*`, `tier_*`, `manage_upgrade_*`.
   These convert revenue; subtle awkwardness kills trust.
2. **Errors** — anything in `packages/i18n-messages/src/locales/*.json`
   plus `err_*` keys in `apps/web/messages/*.json`. Users see these
   when something's already broken; opaque or robotic phrasing
   compounds frustration.
3. **Create-event + RSVP flows** — `create_*`, `event_rsvp_*`. The
   actual primary path; bad copy here makes the product feel cheap.
4. **Management page** — `manage_*`. Lower-frequency surface; the
   user is already invested by the time they see this.
5. **Marketing copy** — `home_*`, `pricing_*` taglines, hero text.
   Personality matters but errors here are recoverable.
6. **Legal + footer** — `legal_*`, `footer_*`. Mostly verbatim
   translations of fixed jargon; least likely to be wrong.

## How to edit

Each locale file is plain JSON. To edit `fr.json`:

```bash
$EDITOR apps/web/messages/fr.json
pnpm -F @vitein/web paraglide:compile   # regenerate $lib/paraglide
pnpm -F @vitein/web typecheck            # catches missing keys
```

For the API catalog:

```bash
$EDITOR packages/i18n-messages/src/locales/fr.json
pnpm -F @vitein/i18n-messages test       # parity test
```

The parity test fails if you accidentally introduce or remove a key —
that's intentional. A locale must be a perfect mirror of `en`.

## Conventions to keep

- **Don't translate brand names.** `vite.in`, `Basic`, `Plus`, the
  Stripe-product names — keep them as-is.
- **Tier names are product names.** Capitalised, untranslated.
- **Currency symbols follow local typography.** French uses `5 €` (with
  space, after the number), German `5 €` as well, English `€5`
  (before, no space), etc. The current AI translations follow each
  locale's convention; verify it matches your house style.
- **Tone is informal-but-considerate.** Closer to a friend recommending
  a tool than a corporate brochure. `du`/`tu`/`vos` consistently
  throughout — never switch within a flow.
- **Email subjects come from `apps/api/src/infra/email.ts`** which is
  still English-only. Translating those is a separate workstream — see
  the TODO at the top of that file.

## Quality flags to raise

If during review you spot any of these, flag them on the PR rather
than silently fixing:

- A pricing string that implies a recurring charge ("subscription",
  "monthly") — vite.in is one-time-per-event only.
- Any string that suggests an account is required to _create_ an
  event — that's the viral mechanic and translation drift can
  accidentally imply otherwise.
- Privacy/legal language that makes a promise the actual policy
  doesn't make. The `legal_*` translations are skeletons; real legal
  copy comes from a lawyer before launch.

## What is _not_ in this round

- **Email templates** (`apps/api/src/infra/email.ts`). All subjects
  and bodies are still hard-coded English. The architectural change
  needed (locale-aware send functions, templates per locale) is
  deferred until after the web translations are reviewed. Tracked in
  the TODO at the top of that file.
- **The footer language switcher** still only shows en ↔ de. With
  eight locales we need a proper dropdown — a small UI task, but a
  task. Filed as a follow-up.
- **Asian / RTL languages** (Hindi, Mandarin, Japanese, Korean,
  Arabic, Hebrew, Persian) are Phase 3 per ROADMAP §8.4. The current
  CSS uses logical properties so RTL is wired structurally, but no
  Asian/RTL locales are in launch scope.

## After review: how to clear the AI-translation flag

When all six new locales have been reviewed by a native speaker and
their edits merged, remove this disclaimer:

1. Strike through the "machine-translated" line at the top of this
   doc and replace with the review date + reviewer initials.
2. Note any locale that's still unreviewed at launch in
   `docs/ops/incidents/<launch-date>-phase1-launch.md`.
