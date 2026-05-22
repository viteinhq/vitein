# 0011 — Theme engine: layout, theme and template as distinct concepts

- **Status:** Accepted
- **Date:** 2026-05-22
- **Deciders:** Kim
- **Refines:** ADR 0009 (immutable — this supersedes its M2 model)

## Context

ADR 0009 introduced a template engine where one `Template` bundles a palette (design tokens) and a `layout` into a single registry entry. M1 shipped four templates that differ only in palette (`classic` / `noir` / `paper` / `serif`, all `layout: standard`). M2 added `ticket` — a template that differs in **layout**.

Listing `ticket` as a fifth peer to four colour themes is inconsistent: "pick a colour mood" and "pick a page structure" are different kinds of choice. Bundling them into one `Template` forces every (palette × layout) pair to be its own registry entry (N×M growth), blocks combinations the curated set does not pre-bake (e.g. ticket + noir), and leaves no clean home for the eventual premium curated designs.

## Decision

Model three distinct concepts:

- **Layout** — the structural arrangement of the event page. Rendered by Svelte components in `apps/web`. Open-source, PR-contributable (§13.3). Ids: `standard`, `ticket`, … The engine package holds layout _descriptors_ (id, name key, tier); the components live in the web app.
- **Theme** — a palette + font set. Pure data (token values). Community themes ship in `@vitein/template-engine`; premium themes register at runtime through the existing data hook. Ids: `classic`, `noir`, `paper`, `serif`, …
- **Template** — a curated _preset_: `{ layout, theme, cover imagery?, contentModel? }`. The premium product surface; ships from the private `vitein-premium` repo. Applying a template sets the event's layout + theme (+ premium layers).

Layout and theme are **orthogonal axes** the creator chooses independently — any layout works with any theme. A template (preset) is a curated composition for buyers who want a finished design.

**Data model.** The event carries two fields, `layout` and `themeId`, replacing the single `templateId`.

**Open-core boundary.** Layouts are open-source: they are components, and a "secret" component reopens the §15.6 extension problem. The platform keeps full structural capability; premium sells curation, palettes, imagery and AI-generated design — not withheld structure. Themes are data, so premium themes work through the data hook. Templates (presets) are premium and compose open layouts with open-or-premium themes.

**Tiering.** Layouts are free. Themes carry a tier (community = free, premium = Basic). Templates (presets) are premium. Server-side gating moves from `assertTemplateAllowed` to a per-theme check; layout needs no gate.

**Picker.** The create / manage Style section presents two pickers — Layout and Colour — plus, later, a Designs gallery for premium presets.

## Alternatives considered

- **Keep `Template` as one bundle, only group the picker by layout** — rejected: cosmetic; the N×M growth, the missing combinations and the absent premium-preset home all remain.
- **Premium layouts via a build-time component package** — rejected: layouts are behaviour, not data; this reopens ADR 0009 §15.6. Layouts stay open-source.
- **A per-event `design jsonb`** — rejected for the reasons ADR 0009 rejected `theme jsonb`: two typed columns are clearer and let a layout/theme change reach existing events.

## Consequences

- The migration only **adds** `events.layout` (`text NOT NULL DEFAULT 'standard'`). The event's theme stays in the existing `template_id` column, surfaced in code as `themeId`: keeping the physical column name makes the migration purely additive — a metadata-only op on the live table, no rewrite, no interactive rename. Production events all sit on the four colour themes, so they map cleanly to `(theme, standard)`. `ticket` exists only on staging — no production data is reshaped twice, **provided the M2 ticket work (PR #177 / #178) is not deployed to production before this refactor**.
- The M2 ticket implementation is reused: `TicketHero`, the perforation and the layout-aware preview all carry over; only the modelling changes — `ticket` becomes a layout, not a template.
- The OpenAPI spec, the generated SDK and the web clients change `templateId` → `themeId` + `layout`.
- This settles ADR 0009 §15.6 for the whole theme system: layouts open, themes and presets via data / build-time, never HTTP.
- M3 cultural content-model variants become a facet of a premium Template (preset) through the existing `contentModel` hook.
- Adding a layout is a code PR; adding a theme is a data PR. Both remain deploy-time.

## References

- ADR 0009 — the template engine this refines
- docs/ARCHITECTURE.md §8.4 (templates), §13 (open-core), §15.6 (extension mechanism)
