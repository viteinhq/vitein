<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Page and section headings — Bricolage display, tight tracking.
   *
   * `level` is the *visual* size; pass `tag` if the semantic level
   * differs. Defaults to matching tag and level.
   *
   * The italic accent in the design ("plan." / "for any kind") is the
   * caller's job — wrap a span in `italic` inside the heading children.
   */
  type Level = 'page' | 'section' | 'panel' | 'subsection';
  type Tag = 'h1' | 'h2' | 'h3';

  interface Props {
    level?: Level;
    tag?: Tag;
    class?: string;
    children: Snippet;
  }

  let { level = 'page', tag, class: classes = '', children }: Props = $props();

  const levels: Record<Level, string> = {
    page: 'font-display text-4xl font-bold tracking-tighter sm:text-5xl',
    section: 'font-display text-2xl font-bold tracking-tight sm:text-3xl',
    panel: 'font-display text-lg font-bold tracking-tight',
    subsection: 'text-base font-semibold',
  };

  const defaultTagFor: Record<Level, Tag> = {
    page: 'h1',
    section: 'h2',
    panel: 'h2',
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
