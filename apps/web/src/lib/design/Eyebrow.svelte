<script lang="ts">
  /**
   * Section eyebrow — a mono micro-caption: `num —————— label`.
   * The number is coral; a hairline rule fills the gap between.
   */
  interface Props {
    num: string;
    label: string;
    class?: string;
  }

  let { num, label, class: classes = '' }: Props = $props();
</script>

<div
  class="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase {classes}"
>
  <span class="font-semibold text-coral">{num}</span>
  <span class="h-px flex-1 bg-current opacity-30"></span>
  <span>{label}</span>
</div>
