/**
 * Design-system entry point.
 *
 * Components surface via this barrel so call sites read
 * `import { Button, Card } from '$lib/design'` rather than
 * importing each `.svelte` file individually. Keep this list curated —
 * the design system intentionally has fewer primitives than the surface
 * might suggest.
 *
 * To preview every component live, run `pnpm -F @vitein/web dev` and
 * open `/_design`.
 */

export { default as ArrowRight } from './ArrowRight.svelte';
export { default as Banner } from './Banner.svelte';
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as CookieConsent } from './CookieConsent.svelte';
export { default as Eyebrow } from './Eyebrow.svelte';
export { default as Heading } from './Heading.svelte';
export { default as InviteCard } from './InviteCard.svelte';
export { default as LanguageSwitcher } from './LanguageSwitcher.svelte';
export { default as LocationField } from './LocationField.svelte';
export { default as Pill } from './Pill.svelte';
export { default as Section } from './Section.svelte';
export { default as Text } from './Text.svelte';
export { default as TemplatePicker } from './TemplatePicker.svelte';
export { default as TextField } from './TextField.svelte';
export { default as TimezonePicker } from './TimezonePicker.svelte';
export { default as Wordmark } from './Wordmark.svelte';
