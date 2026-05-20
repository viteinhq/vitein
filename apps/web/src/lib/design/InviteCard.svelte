<script lang="ts">
  /**
   * Invitation card — the four house styles a creator can dress an event
   * in: `lime` (electric chartreuse), `noir` (ink), `paper` (warm
   * off-white), `serif` (editorial cream). Used in the landing peek, the
   * create-flow preview, and as the event theme.
   *
   * Sizing is the caller's job — pass a height/aspect via `class`.
   * `rotate` tilts the card for stacked compositions.
   */
  type Variant = 'lime' | 'noir' | 'paper' | 'serif';

  interface Props {
    variant?: Variant;
    title: string;
    date?: string;
    place?: string;
    eyebrow?: string;
    rotate?: number;
    class?: string;
  }

  // `eyebrow` carries no default copy — callers pass a localised string
  // (the design system keeps user-visible text out of components).
  let {
    variant = 'lime',
    title,
    date,
    place,
    eyebrow = '',
    rotate = 0,
    class: classes = '',
  }: Props = $props();

  const skins: Record<Variant, { bg: string; fg: string; eyebrow: string; muted: string }> = {
    lime: { bg: '#e3ff3a', fg: '#0a0a0a', eyebrow: '#0a0a0a', muted: 'rgba(10,10,10,0.65)' },
    noir: { bg: '#0a0a0a', fg: '#f1eee7', eyebrow: '#e3ff3a', muted: 'rgba(241,238,231,0.7)' },
    paper: { bg: '#f3efe6', fg: '#0a0a0a', eyebrow: '#0a0a0a', muted: 'rgba(10,10,10,0.6)' },
    serif: { bg: '#faf6ee', fg: '#1a1612', eyebrow: '#1a1612', muted: 'rgba(26,22,18,0.6)' },
  };

  const skin = $derived(skins[variant]);
  const titleClass = $derived(
    variant === 'serif'
      ? 'font-serif italic text-4xl leading-[0.98]'
      : variant === 'lime'
        ? 'font-display italic font-bold text-3xl leading-[0.92] tracking-tighter'
        : 'font-display font-bold text-3xl leading-[0.92] tracking-tighter',
  );
</script>

<div
  class="flex h-full w-full flex-col rounded-[14px] p-6 shadow-[0_24px_40px_-16px_rgba(0,0,0,0.25)] {classes}"
  style="background: {skin.bg}; color: {skin.fg}; transform: rotate({rotate}deg)"
>
  {#if variant === 'paper'}
    <span class="block size-7 rounded-full bg-coral"></span>
  {:else if eyebrow}
    <span
      class="font-mono text-[9px] tracking-[0.16em] uppercase"
      style="color: {skin.eyebrow}"
    >
      {eyebrow}
    </span>
  {/if}

  <span class="flex-1"></span>

  <div class={titleClass}>{title}</div>

  {#if date || place}
    <div
      class="mt-3.5 font-mono text-[10px] leading-relaxed tracking-[0.06em]"
      style="color: {skin.muted}"
    >
      {#if date}<span class="block">{date}</span>{/if}
      {#if place}<span class="block">{place}</span>{/if}
    </div>
  {/if}
</div>
