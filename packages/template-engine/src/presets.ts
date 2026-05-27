import type { Preset } from './types.js';

/**
 * Quick-start presets — pre-mixed (layout, theme, fontPairing) triples
 * for users who don't want to choose three axes themselves. Free per the
 * 2026-05-26 theme-engine decision: presets are platform sugar, not a
 * premium curation surface (the term `Template` is reserved for that
 * future product if it ever exists).
 *
 * Selecting a preset just sets the three fields on the event; nothing
 * about the persistence model knows the preset id. So users can also
 * tweak any axis after picking a preset without losing the changes.
 */
export const communityPresets: Preset[] = [
  {
    id: 'launch',
    name: 'preset_launch_name',
    description: 'preset_launch_description',
    origin: 'community',
    layout: 'poster',
    theme: 'volt',
    fontPairing: 'bricolage-geist',
  },
  {
    id: 'dinner',
    name: 'preset_dinner_name',
    description: 'preset_dinner_description',
    origin: 'community',
    layout: 'mono',
    theme: 'paper',
    fontPairing: 'instrument-geist',
  },
  {
    id: 'wedding',
    name: 'preset_wedding_name',
    description: 'preset_wedding_description',
    origin: 'community',
    layout: 'card',
    theme: 'sand',
    fontPairing: 'instrument-instrument',
  },
  {
    id: 'after-dark',
    name: 'preset_after_dark_name',
    description: 'preset_after_dark_description',
    origin: 'community',
    layout: 'poster',
    theme: 'hot',
    fontPairing: 'space-inter',
  },
  {
    id: 'birthday',
    name: 'preset_birthday_name',
    description: 'preset_birthday_description',
    origin: 'community',
    layout: 'bento',
    theme: 'sorbet',
    fontPairing: 'bricolage-geist',
  },
  {
    id: 'garden',
    name: 'preset_garden_name',
    description: 'preset_garden_description',
    origin: 'community',
    layout: 'editorial',
    theme: 'garden',
    fontPairing: 'instrument-geist',
  },
  {
    id: 'show',
    name: 'preset_show_name',
    description: 'preset_show_description',
    origin: 'community',
    layout: 'editorial',
    theme: 'press',
    fontPairing: 'space-inter',
  },
  {
    id: 'kids',
    name: 'preset_kids_name',
    description: 'preset_kids_description',
    origin: 'community',
    layout: 'ticket',
    theme: 'sorbet',
    fontPairing: 'geist-geist',
  },
];
