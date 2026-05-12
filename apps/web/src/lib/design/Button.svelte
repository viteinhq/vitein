<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  /**
   * Brand button. Three variants × two sizes for now; add more only when
   * the existing palette can't cover the layout.
   *
   * - `primary` — slate-900, white text. The default "do this" action.
   * - `secondary` — white card with slate-300 border. For "go elsewhere"
   *   without competing with a primary CTA.
   * - `danger` — red-600. For destructive operations (delete event,
   *   remove guest). Sparingly.
   *
   * Sizes: `md` (the default form-control size) and `sm` (footer-level
   * actions, inline chips). Anything else is a one-off Tailwind class on
   * the call site, not a new variant.
   *
   * Polymorphic: pass `href` to render as `<a>` (navigation styled as a
   * button — common for "Back to home" affordances). Without `href`,
   * stays a `<button type="button">` (override `type` for forms).
   */
  type Variant = 'primary' | 'secondary' | 'danger';
  type Size = 'sm' | 'md' | 'lg';

  type Props = (
    | ({ href?: undefined } & HTMLButtonAttributes)
    | ({ href: string } & HTMLAnchorAttributes)
  ) & {
    variant?: Variant;
    size?: Size;
    children: Snippet;
  };

  let {
    variant = 'primary',
    size = 'md',
    class: classesProp,
    href,
    children,
    ...rest
  }: Props = $props();

  // ClassValue includes null/array/object shapes; we only consume it as a
  // string here, so coerce up front.
  const classes = $derived(typeof classesProp === 'string' ? classesProp : '');

  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900';

  const variants: Record<Variant, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-700',
    secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };

  const sizes: Record<Size, string> = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const klass = $derived(`${base} ${variants[variant]} ${sizes[size]} ${classes}`);
</script>

{#if href}
  <a {href} {...rest as HTMLAnchorAttributes} class={klass}>
    {@render children()}
  </a>
{:else}
  <button type="button" {...rest as HTMLButtonAttributes} class={klass}>
    {@render children()}
  </button>
{/if}
