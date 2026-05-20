<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Rounded container with a hairline rule. The base "panel" surface —
   * event details, manage panels, RSVP form, pricing cards. Pass
   * children; inner spacing is the caller's job.
   *
   * `tone` carries a state hint without inventing more wrappers:
   * `accent` is the loud chartreuse panel, `success`/`warn`/`info` are
   * soft tints, `default` is plain card-white.
   */
  type Tone = 'default' | 'accent' | 'info' | 'success' | 'warn';

  interface Props {
    tone?: Tone;
    class?: string;
    children: Snippet;
  }

  let { tone = 'default', class: classes = '', children }: Props = $props();

  const tones: Record<Tone, string> = {
    default: 'border-rule bg-card text-ink',
    accent: 'border-transparent bg-accent text-accent-ink',
    info: 'border-rule bg-paper-2 text-ink',
    success: 'border-ink/15 bg-accent/35 text-ink',
    warn: 'border-amber-400/40 bg-amber-100/60 text-ink',
  };
</script>

<div class="rounded-card border p-5 {tones[tone]} {classes}">
  {@render children()}
</div>
