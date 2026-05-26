import type { Layout } from './types.js';

/**
 * The eight open community layouts — Axis 1 of the design engine
 * (2026-05-26 expansion of ADR 0011's original two). Descriptors only;
 * the rendering components live in `apps/web/src/lib/event/<Id>Hero.svelte`,
 * keyed by `id`. All layouts are free.
 *
 * - `standard` — centered stacked hero (the baseline).
 * - `ticket`   — two-panel ticket card hero.
 * - `editorial` — asymmetric magazine cover.
 * - `poster`   — title fills the page, large display type.
 * - `card`     — bordered paper invitation.
 * - `photo`    — hero image dominant, details beneath.
 * - `bento`    — grid of info modules.
 * - `mono`     — pure type, list of facts, no chrome.
 */
export const communityLayouts: Layout[] = [
  { id: 'standard', name: 'layout_standard_name', tier: 'free', origin: 'community' },
  { id: 'ticket', name: 'layout_ticket_name', tier: 'free', origin: 'community' },
  { id: 'editorial', name: 'layout_editorial_name', tier: 'free', origin: 'community' },
  { id: 'poster', name: 'layout_poster_name', tier: 'free', origin: 'community' },
  { id: 'card', name: 'layout_card_name', tier: 'free', origin: 'community' },
  { id: 'photo', name: 'layout_photo_name', tier: 'free', origin: 'community' },
  { id: 'bento', name: 'layout_bento_name', tier: 'free', origin: 'community' },
  { id: 'mono', name: 'layout_mono_name', tier: 'free', origin: 'community' },
];
