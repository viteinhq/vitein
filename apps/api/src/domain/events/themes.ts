import {
  createFontPairingRegistry,
  createLayoutRegistry,
  createThemeRegistry,
  type FontPairing,
  type Layout,
  type Registry,
  type Theme,
} from '@vitein/template-engine';
import { DomainError, ValidationError } from '../errors.js';

/**
 * Community-only theme / layout / font-pairing registries for the
 * open-source API build. The hosted build can register premium themes
 * on top via the extension hook (ADR 0011) — so in this repo only free
 * entries ever resolve.
 */
export const themeRegistry: Registry<Theme> = createThemeRegistry();
export const layoutRegistry: Registry<Layout> = createLayoutRegistry();
export const fontPairingRegistry: Registry<FontPairing> = createFontPairingRegistry();

/**
 * Assert that a theme id may be applied to an event. The id must resolve
 * to a known theme; a premium (non-`free`) theme additionally requires the
 * event to be on a paid tier. `registry` is injectable so the gate can be
 * unit-tested with a premium theme present.
 */
export function assertThemeAllowed(
  themeId: string,
  isPaidEvent: boolean,
  registry: Registry<Theme> = themeRegistry,
): void {
  const theme = registry.get(themeId);
  if (!theme) {
    throw new ValidationError(`Unknown theme "${themeId}"`);
  }
  if (theme.tier !== 'free' && !isPaidEvent) {
    throw new DomainError(
      'event.feature_gated',
      'This theme requires a paid tier — upgrade the event first',
      403,
    );
  }
}

/**
 * Assert that a layout id is known. Layouts are free (ADR 0011) — there is
 * no tier gate, only an existence check.
 */
export function assertLayoutAllowed(
  layoutId: string,
  registry: Registry<Layout> = layoutRegistry,
): void {
  if (!registry.has(layoutId)) {
    throw new ValidationError(`Unknown layout "${layoutId}"`);
  }
}

/**
 * Assert that a font-pairing id is known. Type pairings are free
 * (2026-05-26 theme-engine decision) — existence check only, same
 * shape as layouts.
 */
export function assertFontPairingAllowed(
  fontPairingId: string,
  registry: Registry<FontPairing> = fontPairingRegistry,
): void {
  if (!registry.has(fontPairingId)) {
    throw new ValidationError(`Unknown font pairing "${fontPairingId}"`);
  }
}
