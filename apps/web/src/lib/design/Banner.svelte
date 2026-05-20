<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Inline message strip — action-result feedback and one-shot
   * announcements. Rendered as `<div role="alert|status">` so callers
   * can drop block content inside without tripping HTML5 `<p>` rules.
   */
  type Tone = 'info' | 'success' | 'warn' | 'error';

  interface Props {
    tone?: Tone;
    class?: string;
    children: Snippet;
  }

  let { tone = 'info', class: classes = '', children }: Props = $props();

  const tones: Record<Tone, string> = {
    info: 'border-rule bg-paper-2 text-ink',
    success: 'border-ink/15 bg-accent/40 text-ink',
    warn: 'border-amber-400/50 bg-amber-100/70 text-ink',
    error: 'border-coral/40 bg-coral/10 text-ink',
  };
</script>

<div
  role={tone === 'error' ? 'alert' : 'status'}
  class="rounded-xl border px-4 py-2.5 text-sm {tones[tone]} {classes}"
>
  {@render children()}
</div>
