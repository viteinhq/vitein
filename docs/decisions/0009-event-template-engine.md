# 0009 — Event theme/template engine

- **Status:** Accepted
- **Date:** 2026-05-21
- **Deciders:** Kim

## Context

Every event renders one hard-coded look — `apps/web/src/routes/e/[slug]/+page.svelte` bakes in the lime/ink theme. We want creators to give an event a distinct design.

`apps/web/src/lib/design/InviteCard.svelte` already carries four house styles (`lime`, `noir`, `paper`, `serif`) that are used in previews but never wired up as the event theme. ARCHITECTURE §8.4 reserves a `template_id` for Phase 2 and frames templates as eventual content-model variants (Phase 3); §13 requires the open-core split (premium designs stay closed). ROADMAP places templates in Phase 2/3 — the founder elects to ship a **visual-only first slice (M1) now** as a Phase 1.x addition; structural/cultural variants stay deferred.

## Decision

Build a template engine in milestones. **M1 — this ADR's scope — is visual themes only.**

- **Data model.** Add `events.template_id text NOT NULL DEFAULT 'classic'`. Templates are defined in **code, not DB rows** — a typed registry; `template_id` is a registry key.
- **Open-core boundary.** A new public package `@vitein/template-engine` holds the `Template` type, the registry, the free/community templates, and a `registerExternalTemplates()` hook. Premium designs ship from the private `vitein-premium` repo as an optional package, registered through a guarded import and absent from the open-source build. Only the hook lives in the public repo.
- **Rendering.** A template is a set of values for the design tokens already defined as CSS custom properties in `apps/web/src/app.css`. It is applied via a theme scope on the event page, so token-classed markup restyles itself. Only one layout (`standard`) in M1.
- **Tiering.** Each template carries `tier: 'free' | 'basic'`. Four curated free themes ship at launch; premium themes are unlocked by the **Basic** tier (€5, the entry paid tier — themes are a Basic-conversion lever). Enforced server-side in the event-update path, mirroring the existing `password` feature-gate.
- **Selection & preview.** A creator may pick any template — free or premium — during creation and on the manage page. A premium pick renders as a **live preview on the creator's own event**; the public `/e/[slug]` keeps a free theme until the event is paid, and "publish with this design" triggers checkout. If the creator does not pay, the event simply stays on its current free theme — no locked or broken state.

## Alternatives considered

- **`theme jsonb` per event** (full token set denormalised onto each event) — rejected: a template tweak can't reach existing events; invites per-event colour-picker scope creep (an ARCHITECTURE §11 non-goal); no clean open-core boundary.
- **A `templates` DB table** — rejected: premium designs would land as rows in the shared database with no public/private code boundary, and need an admin CRUD nobody will build; a template marketplace is an explicit §11 non-goal.
- **HTTP-based premium extension** (per the §15.6 open question) — rejected for templates: they are static data, not behaviour. A build-time optional package is simpler and needs no per-request call. This settles §15.6 narrowly for templates only.

## Consequences

- The migration is purely additive (`template_id` with a `DEFAULT`) — zero backfill; existing events render unchanged on `classic` (the current look).
- Adding a template is a deploy. Acceptable — templates are a PR-based contribution path (§13.3).
- Per-event customisation (a `theme_overrides jsonb`) is deliberately **not** in M1; revisit in M2 only if needed.
- **M2** adds layout variants and the first premium designs; **M3** adds cultural content-model variants (a child table for multi-day events) — genuinely Phase 3, out of scope here. The `Template` type carries an optional `contentModel` field as the forward-compatible hook.
- M1 implementation is tracked as GitHub issues referencing this ADR.

## References

- docs/ARCHITECTURE.md §8.4 (templates), §13 (open-core), §15.6 (extension mechanism)
- docs/ROADMAP.md — templates as Phase 2/3
- apps/web/src/lib/design/InviteCard.svelte — the four existing house styles to migrate into the registry
