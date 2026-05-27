<script lang="ts">
  /**
   * Type-pairing chooser — Axis 3 of the design engine (2026-05-26).
   * Each tile is a small typographic specimen: an "Aa" set in the
   * pairing's display font + style + weight, with the body font and
   * mono font sampled in the labels below. Carries the chosen id as a
   * `fontPairing` form field.
   */
  import * as m from '$lib/paraglide/messages.js';
  import { fontPairingRegistry } from '$lib/themes';

  let {
    value = $bindable('bricolage-geist'),
    name = 'fontPairing',
  }: { value?: string; name?: string } = $props();

  const pairings = fontPairingRegistry.list();

  // Static map — a dynamic `m[key]` would defeat message tree-shaking.
  const labels: Record<string, () => string> = {
    'bricolage-geist': m.font_bricolage_geist_name,
    'instrument-geist': m.font_instrument_geist_name,
    'space-inter': m.font_space_inter_name,
    'bricolage-mono': m.font_bricolage_mono_name,
    'instrument-instrument': m.font_instrument_instrument_name,
    'geist-geist': m.font_geist_geist_name,
  };
  function label(id: string): string {
    return (labels[id] ?? (() => id))();
  }
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
  {#each pairings as p (p.id)}
    <label
      class="cursor-pointer rounded-xl border-[1.5px] border-rule bg-card p-3 transition has-[:checked]:border-ink has-[:checked]:bg-paper-2"
    >
      <input type="radio" {name} value={p.id} bind:group={value} class="sr-only" />
      <div
        class="text-3xl leading-none font-bold text-ink"
        style="font-family:{p.display};font-style:{p.displayStyle};font-weight:{p.displayWeight};letter-spacing:{p.tracking}"
      >
        Aa
      </div>
      <div
        class="mt-2 text-[11px] leading-snug text-ink-muted"
        style="font-family:{p.body}"
      >
        The quick brown fox
      </div>
      <span class="mt-2 block text-center text-xs font-semibold text-ink">{label(p.id)}</span>
    </label>
  {/each}
</div>
