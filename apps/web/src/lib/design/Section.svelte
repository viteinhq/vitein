<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Sub-panel wrapper. Hairline rule, rounded-card corners, `p-5`, with
   * `space-y-3` baked in. Use it for stacked sub-panels of a management
   * screen. Heading is the caller's job (use the `Heading` primitive).
   */
  interface Props {
    class?: string;
    children: Snippet;
  }

  let { class: classes = '', children }: Props = $props();
</script>

<section class="rounded-card border border-rule bg-card space-y-3 p-5 {classes}">
  {@render children()}
</section>
