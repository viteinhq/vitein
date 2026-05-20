<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  /**
   * Labelled text input. Wraps the recurring
   * `<label>{label}<input … /></label>` pattern so the label style,
   * border, and focus ring live in one place.
   *
   * The label is a mono, uppercase, tracked micro-caption — the
   * design's field-label treatment. `hint` renders below; `error`
   * overrides it and switches the border to coral.
   */
  interface Props extends Omit<HTMLInputAttributes, 'value'> {
    label: string;
    hint?: string;
    error?: string;
    value?: string;
  }

  let {
    label,
    hint,
    error,
    value = $bindable(''),
    class: classes = '',
    ...rest
  }: Props = $props();

  const inputBase =
    'mt-1.5 block w-full rounded-xl border bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-accent';
  const borderTone = $derived(error ? 'border-coral' : 'border-rule');
</script>

<label class="block">
  <span
    class="font-mono text-[10px] font-medium tracking-[0.08em] text-ink-muted uppercase"
  >
    {label}
  </span>
  <input {...rest} bind:value class="{inputBase} {borderTone} {classes}" />
  {#if error}
    <span class="mt-1 block text-xs text-coral">{error}</span>
  {:else if hint}
    <span class="mt-1 block font-mono text-[10px] tracking-wide text-ink-muted/70">
      {hint}
    </span>
  {/if}
</label>
