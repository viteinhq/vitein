<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  /**
   * Brand button — pill-shaped, chunky, high-contrast.
   *
   * - `primary` — ink fill, paper text. The default "do this" action.
   * - `accent` — electric-chartreuse fill. The loudest CTA; one per view.
   * - `secondary` — outline only. "Go elsewhere" without competing.
   * - `danger` — coral fill. Destructive operations, sparingly.
   *
   * Sizes: `sm` (inline/footer actions), `md` (form-control default),
   * `lg` (hero / primary-page CTAs).
   *
   * Polymorphic: pass `href` to render as `<a>`; without it, a
   * `<button type="button">` (override `type` for forms).
   */
  type Variant = 'primary' | 'accent' | 'secondary' | 'danger';
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

  const classes = $derived(typeof classesProp === 'string' ? classesProp : '');

  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

  const variants: Record<Variant, string> = {
    primary: 'bg-ink text-paper hover:opacity-90',
    accent: 'bg-accent text-accent-ink hover:brightness-105',
    secondary: 'border-[1.5px] border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
    danger: 'bg-coral text-white hover:brightness-105',
  };

  const sizes: Record<Size, string> = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-[15px]',
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
