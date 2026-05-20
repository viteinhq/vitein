<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Body copy. Three tones:
   *
   * - `default` — standard ink paragraph.
   * - `muted` — supporting / secondary copy.
   * - `subtle` — caption-level hints.
   *
   * Sizes: `md` is the regular paragraph; `sm` is in-card help text.
   */
  type Tone = 'default' | 'muted' | 'subtle';
  type Size = 'sm' | 'md';

  interface Props {
    tone?: Tone;
    size?: Size;
    class?: string;
    children: Snippet;
  }

  let { tone = 'default', size = 'md', class: classes = '', children }: Props = $props();

  const tones: Record<Tone, string> = {
    default: 'text-ink',
    muted: 'text-ink-muted',
    subtle: 'text-ink-muted',
  };

  const sizes: Record<Size, string> = {
    sm: 'text-sm',
    md: 'text-base',
  };
</script>

<p class="{sizes[size]} {tones[tone]} {classes} leading-relaxed">{@render children()}</p>
