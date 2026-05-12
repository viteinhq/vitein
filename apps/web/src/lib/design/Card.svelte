<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Rounded container with a hairline border. The base of every "panel"
   * surface on the web app — event details, manage panels, RSVP form,
   * pricing cards. Pass children; spacing inside is the caller's job.
   *
   * `tone` lets the card carry a state hint without us inventing more
   * wrapper components. `info`/`success`/`warn` use a soft tinted
   * background; `default` is plain white-on-slate.
   */
  type Tone = 'default' | 'info' | 'success' | 'warn';

  interface Props {
    tone?: Tone;
    class?: string;
    children: Snippet;
  }

  let { tone = 'default', class: classes = '', children }: Props = $props();

  const tones: Record<Tone, string> = {
    default: 'border-slate-200 bg-white',
    info: 'border-sky-200 bg-sky-50',
    success: 'border-emerald-200 bg-emerald-50',
    warn: 'border-amber-300 bg-amber-50',
  };
</script>

<div class="rounded-lg border p-5 {tones[tone]} {classes}">
  {@render children()}
</div>
