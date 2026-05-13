<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Page and section headings. One component instead of three so call sites
   * always get the same tracking, weight, and ramp between levels.
   *
   * `level` is the *visual* size; pass `tag` if the semantic level differs
   * (e.g. a `<h2>` that should still look like a page title at the top of
   * a sub-page). Defaults to matching tag and level.
   *
   * Sizes deliberately mirror the existing inline styles that were
   * duplicated across pricing / legal / signin/check-email so the
   * migration is visually a no-op.
   */
  type Level = 'page' | 'section' | 'subsection';
  type Tag = 'h1' | 'h2' | 'h3';

  interface Props {
    level?: Level;
    tag?: Tag;
    class?: string;
    children: Snippet;
  }

  let { level = 'page', tag, class: classes = '', children }: Props = $props();

  const levels: Record<Level, string> = {
    page: 'text-3xl font-bold tracking-tight',
    section: 'text-xl font-semibold',
    subsection: 'text-base font-semibold',
  };

  const defaultTagFor: Record<Level, Tag> = {
    page: 'h1',
    section: 'h2',
    subsection: 'h3',
  };

  const resolvedTag = $derived(tag ?? defaultTagFor[level]);
  const klass = $derived(`${levels[level]} ${classes}`);
</script>

{#if resolvedTag === 'h1'}
  <h1 class={klass}>{@render children()}</h1>
{:else if resolvedTag === 'h2'}
  <h2 class={klass}>{@render children()}</h2>
{:else}
  <h3 class={klass}>{@render children()}</h3>
{/if}
