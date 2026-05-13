<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Tighter sibling to `Card`. Same hairline border + rounded corners,
   * but `p-4` instead of `p-5` and `space-y-2` baked into the inner
   * layout. Use it for stacked sub-panels of a management screen — the
   * manage page repeats this exact wrapper 7 times.
   *
   * Heading is the caller's job (use the `Heading` primitive); this
   * component is purely about the chrome.
   */
  interface Props {
    class?: string;
    children: Snippet;
  }

  let { class: classes = '', children }: Props = $props();
</script>

<section class="space-y-2 rounded-lg border border-slate-200 p-4 {classes}">
  {@render children()}
</section>
