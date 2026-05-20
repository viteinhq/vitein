<script lang="ts">
  /**
   * The vite.in wordmark — `vite` set in italic display, `.in` in coral.
   * `size` is the font-size in px. Pass `href` to make it a home link.
   */
  interface Props {
    size?: number;
    href?: string;
    class?: string;
  }

  let { size = 22, href, class: classes = '' }: Props = $props();
</script>

{#snippet mark()}
  <span
    class="font-display inline-flex items-baseline leading-none font-bold tracking-[-0.04em] {classes}"
    style="font-size: {size}px"
  >
    <span class="italic">vite</span><span class="text-coral">.in</span>
  </span>
{/snippet}

{#if href}
  <a {href} class="inline-flex" aria-label="vite.in — home">
    {@render mark()}
  </a>
{:else}
  {@render mark()}
{/if}
