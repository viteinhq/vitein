<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Inline message strip. Use for action-result feedback ("Saved.",
   * "Could not delete media.") and one-shot announcements. Always
   * dismissible-by-context — banners should disappear on the next page
   * action, not stick around. For sticky page-state, use Card with a
   * tone instead.
   *
   * Rendered as `<div role="alert|status">` so callers can drop in
   * additional block content (e.g. a `<pre>` with error details) without
   * tripping HTML5's "no block elements inside <p>" rule.
   */
  type Tone = 'info' | 'success' | 'warn' | 'error';

  interface Props {
    tone?: Tone;
    class?: string;
    children: Snippet;
  }

  let { tone = 'info', class: classes = '', children }: Props = $props();

  const tones: Record<Tone, string> = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-700',
  };
</script>

<div
  role={tone === 'error' ? 'alert' : 'status'}
  class="rounded-md border px-3 py-2 text-sm {tones[tone]} {classes}"
>
  {@render children()}
</div>
