import type { Layout } from './types.js';

/**
 * The open community layouts (ADR 0011 — layout is the structural axis,
 * orthogonal to theme). Descriptors only; the rendering components live in
 * `apps/web`, keyed by `id`. Layouts are open-source and PR-contributable.
 *
 * - `standard` — the baseline stacked hero.
 * - `ticket` — a two-panel ticket card hero (ADR 0009 M2).
 */
export const communityLayouts: Layout[] = [
  { id: 'standard', name: 'layout_standard_name', tier: 'free', origin: 'community' },
  { id: 'ticket', name: 'layout_ticket_name', tier: 'free', origin: 'community' },
];
