<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  /**
   * Labelled text input. Wraps the recurring `<label>{label}<input … /></label>`
   * pattern so we set the border, focus ring, and label styling in one
   * place. Use the plain `<input>` directly only for one-offs that don't
   * have a visible label (e.g. the readonly share-URL input).
   *
   * `hint` is rendered as a small secondary line below the field;
   * `error` overrides it and switches the border red. Keep both short —
   * full error text belongs in a Banner above the form.
   */
  // Narrow `value` to a string so the bindable type is concrete. For
  // number/datetime/etc. inputs that need a different binding type, use
  // a plain <input> or extend this component with a dedicated variant.
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
    'mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300';
  const borderTone = $derived(error ? 'border-red-400' : 'border-slate-300');
</script>

<label class="block">
  <span class="text-sm font-medium">{label}</span>
  <input {...rest} bind:value class="{inputBase} {borderTone} {classes}" />
  {#if error}
    <span class="mt-1 block text-xs text-red-600">{error}</span>
  {:else if hint}
    <span class="mt-1 block text-xs text-slate-500">{hint}</span>
  {/if}
</label>
