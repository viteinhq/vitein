import { createI18n } from '@inlang/paraglide-sveltekit';
import * as runtime from './paraglide/runtime.js';

/**
 * Paraglide-SvelteKit integration instance. Provides the `handle`,
 * `preprocess`, and `route` helpers that wire locale detection into the
 * SvelteKit request chain. Locale persistence uses a cookie; detection
 * falls back to `Accept-Language` on first visit.
 */
export const i18n = createI18n(runtime);
