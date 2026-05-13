<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Body copy. Three tones cover everything in the app today:
   *
   * - `default` — the standard slate-700 paragraph.
   * - `muted` — slate-600, for supporting/secondary copy.
   * - `subtle` — slate-500, for caption-level hints (e.g. "Wrong email?
   *   Try again").
   *
   * Sizes: `md` is the regular paragraph; `sm` is for in-card help text
   * and the muted caption row that several pages already use.
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
    default: 'text-slate-700',
    muted: 'text-slate-600',
    subtle: 'text-slate-500',
  };

  const sizes: Record<Size, string> = {
    sm: 'text-sm',
    md: 'text-base',
  };
</script>

<p class="{sizes[size]} {tones[tone]} {classes}">{@render children()}</p>
