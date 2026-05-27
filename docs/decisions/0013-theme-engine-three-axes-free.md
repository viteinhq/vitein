# 0013 — Theme engine: three free axes, retire the Template/Preset split

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Kim
- **Refines:** ADR 0009 (theme engine, M1) and ADR 0011 (layout/theme split). Both stay on the record; the parts of 0011 listed below are superseded.

## Context

ADR 0011 modelled the design system as **two** orthogonal axes — layout (structural component) and theme (colour palette / typography bundle) — plus a separate `Template` concept reserved as the premium curation surface (`{layout, theme, cover, contentModel}`). At that point we shipped two layouts (`standard`, `ticket`) and four themes (`classic`, `noir`, `paper`, `serif`), and explicitly tier-gated themes as either `community = free` or `premium = Basic`.

Two things changed on 2026-05-27. Kim ran a full design pass in Claude Design (handoff bundle archived in this repo's chat history) that landed on **three** orthogonal axes — Layout × Palette × Type pairing — with eight, eight and six entries respectively, plus eight curated combinations. And Kim said the whole engine ships as a free platform feature: extending vite.in's design range is part of what makes the product the product, not what makes it premium.

ADR 0011 said "two axes" three times, said `serif` was a community palette, called `Template` the curated premium surface, and assumed at least some themes would be `tier: 'basic'`. None of those is true after 2026-05-27.

## Decision

**Three orthogonal axes, all free, no premium tier on any axis.**

- **Axis 1 — Layout** (structural component): `standard`, `ticket`, `editorial`, `poster`, `card`, `photo`, `bento`, `mono`. Eight community layouts; all `free`. Adding a layout remains a code PR (the rendering components live in `apps/web/src/lib/event/`).
- **Axis 2 — Palette** (`themes` in code, persisted as `events.template_id` for the legacy reasons in ADR 0011): `volt`, `noir`, `paper`, `press`, `sorbet`, `garden`, `hot`, `sand`. Eight community palettes; all `free`. Adding a palette remains a data PR.
- **Axis 3 — Type pairing** (new): `bricolage-geist`, `instrument-geist`, `space-inter`, `bricolage-mono`, `instrument-instrument`, `geist-geist`. Six community pairings; all `free`. Persisted on the new `events.font_pairing` column. Adding a pairing remains a data PR.

The `Tier` type in `packages/template-engine` stays — premium themes registered via the extension hook still need it — but no shipping community entry on any axis is `'basic'`. The `assertThemeAllowed` paid-gate path is exercised only when the private `vitein-premium` package registers a premium theme; the open-source build can't reach it.

**`serif` palette retired.** It mixed palette and font, exactly the conflation the type-pairing axis separates. The data migration (`0011_organic_red_hulk.sql`) rewrites `events.template_id = 'serif'` rows to `('paper', 'instrument-instrument')` so existing events render almost-identically; the picker no longer offers `serif`.

**`classic` palette renamed to `volt`.** Same tokens; new id matches the Claude-Design naming. Same migration rewrites existing rows. The `LEGACY_THEME_ID_ALIASES` map in the engine carries the alias for runtime resolve safety, but the API rejects `classic` going forward (validation throws); the rename is permanent.

**Curated combinations become `Preset`, not `Template`.** Eight `Preset` triples ship in the open-core registry (`Launch`, `Dinner`, `Wedding`, `After dark`, `Birthday`, `Garden`, `The show`, `Kids`). Selecting a preset just sets the three axis fields on the event — no separate `preset_id` column, no DB persistence beyond the three axes. The `Template` type from ADR 0011 is dropped from `packages/template-engine`; if a future premium-curation product ever lands, it'll get a new type with its own purpose.

## Open-core boundary

- Layouts (components) stay open-source — premium layouts are still not a thing (ADR 0011 §15.6 carries).
- Palettes are data; the existing extension hook for premium themes (`registerExternalThemes`) stays in place but currently has no premium entries.
- Type pairings are data, same shape; a future `registerExternalFontPairings` hook is symmetric if we ever want to ship a premium-typography surface.
- Presets are data, all open and free. If a future product wants to sell curated premium designs, they would compose into a separate premium concept rather than re-using `Preset`.

## Alternatives considered

- **Keep two axes; fold typography into the palette as before.** Rejected: the design pass demonstrated that a palette × layout matrix where typography rides on the palette leaves 6 of 384 useful combinations unreachable, blocks premium typography as a separate surface, and made the `serif` mash-up palette necessary in the first place.
- **Three axes but keep some palettes / pairings tier-gated.** Rejected per Kim's "free for all" call: drawing the premium line at the curation layer (templates, presets, AI-design — future) instead of inside the axes themselves is a cleaner story for both the product narrative and the open-core boundary.
- **Migrate `serif` to a `paper × instrument-instrument` runtime alias rather than rewriting the data.** Rejected: a runtime alias makes the schema permanently lie, complicates analytics, and the alias would have to outlive the windowed read pattern. A one-shot data migration is cheaper.
- **Defer the type axis to a follow-up release.** Rejected: the design system is most coherent when shipped whole. Splitting risks getting Axis 3 deprioritised once the visible part (layouts + palettes) is live.

## Consequences

- The `events.font_pairing` column is part of the schema and the API contract going forward; the SDK exposes it on every event response.
- The `assertFontPairingAllowed` gate joins `assertThemeAllowed` and `assertLayoutAllowed` as the third design-axis assertion.
- ARCHITECTURE.md §8 (templates section) gets a partial rewrite — the "templates as Phase-3 premium-curation product" framing is wrong; what we shipped is presets, free. Done in the same PR as this ADR.
- ADR 0011's specific claims about "two axes", `serif` palette, premium theme gating, and the `Template` type are superseded by the rules above. The rest of ADR 0011 — the open-source / data / runtime extension model — stands.
- Adding a fourth axis later (e.g. motion / animation) is symmetric work: registry + types + assertion + picker. The shape stays the same.

## References

- ADR 0009 — template engine (M1)
- ADR 0011 — layout / theme separation (M2)
- `packages/template-engine/src/{types,fonts,themes,layouts,presets,index}.ts` — the engine surface
- `packages/db-schema/migrations/0011_organic_red_hulk.sql` — the data migration
- Claude Design handoff bundle (2026-05-26, archived in chat) — the source visual exploration
