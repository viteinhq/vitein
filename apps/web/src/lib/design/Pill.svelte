<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Small rounded-full chip — version eyebrows, status tags, trust marks.
   *
   * - `default` — card background with a hairline rule.
   * - `dark` — ink fill.
   * - `accent` — chartreuse fill.
   */
  type Tone = 'default' | 'dark' | 'accent';

  interface Props {
    tone?: Tone;
    class?: string;
    children: Snippet;
  }

  let { tone = 'default', class: classes = '', children }: Props = $props();

  const tones: Record<Tone, string> = {
    default: 'border border-rule bg-card text-ink',
    dark: 'bg-ink text-paper',
    accent: 'bg-accent text-accent-ink',
  };
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap {tones[
    tone
  ]} {classes}"
>
  {@render children()}
</span>
