<script lang="ts">
  /**
   * The vite.in wordmark — `vite` set in italic display, `.in` in coral.
   * `size` is the font-size in px. Pass `href` to make it a home link.
   *
   * `onDark` switches the `.in` to the bright coral, which only clears
   * WCAG contrast on a dark surface (footer). The default deep coral is
   * the one that passes on light backgrounds (header).
   */
  interface Props {
    size?: number;
    href?: string;
    onDark?: boolean;
    class?: string;
  }

  let { size = 22, href, onDark = false, class: classes = '' }: Props = $props();
</script>

{#snippet mark()}
  <span
    class="font-display inline-flex items-baseline leading-none font-bold tracking-[-0.04em] {classes}"
    style="font-size: {size}px"
  >
    <span class="italic">vite</span><span class={onDark ? 'text-coral' : 'text-coral-deep'}>.in</span>
  </span>
{/snippet}

{#if href}
  <a {href} class="inline-flex" aria-label="vite.in — home">
    {@render mark()}
  </a>
{:else}
  {@render mark()}
{/if}
