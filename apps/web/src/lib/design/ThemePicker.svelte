<script lang="ts">
  /**
   * Colour-palette chooser (ADR 0011 + 0013). Renders each registered
   * palette as a radio tile previewed through its own design tokens.
   * Carries the chosen id as a `themeId` form field — drops straight
   * into the create / manage forms with no client state.
   *
   * Each tile shows a real four-swatch palette strip (paper-2, paper,
   * ink, accent) plus an Aa specimen on the accent band, so the
   * character of the palette reads at a glance rather than only the
   * accent colour.
   */
  import * as m from '$lib/paraglide/messages.js';
  import { themeRegistry, themeStyle } from '$lib/themes';

  let { value = $bindable('volt'), name = 'themeId' }: { value?: string; name?: string } =
    $props();

  const themes = themeRegistry.list();

  // Static map — a dynamic `m[key]` would defeat message tree-shaking.
  // Eight community palettes after ADR 0013; the retired `classic`
  // alias resolves to `volt` at runtime in the engine but never
  // surfaces in the picker.
  const labels: Record<string, () => string> = {
    volt: m.theme_volt_name,
    noir: m.theme_noir_name,
    paper: m.theme_paper_name,
    press: m.theme_press_name,
    sorbet: m.theme_sorbet_name,
    garden: m.theme_garden_name,
    hot: m.theme_hot_name,
    sand: m.theme_sand_name,
  };
  function label(id: string): string {
    return (labels[id] ?? (() => id))();
  }
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
  {#each themes as t (t.id)}
    <label
      class="cursor-pointer rounded-xl border-[1.5px] border-rule p-2 transition has-[:checked]:border-ink has-[:checked]:bg-paper-2"
    >
      <input type="radio" {name} value={t.id} bind:group={value} class="sr-only" />
      <div style={themeStyle(t.id)} class="overflow-hidden rounded-lg border border-rule">
        <div
          class="flex items-center justify-center bg-accent px-2.5 py-3 font-display text-lg leading-none font-bold text-accent-ink"
        >
          Aa
        </div>
        <div class="grid h-5 grid-cols-4">
          <div class="bg-paper"></div>
          <div class="bg-paper-2"></div>
          <div class="bg-ink"></div>
          <div class="bg-accent"></div>
        </div>
      </div>
      <span class="mt-1.5 block text-center text-xs font-semibold text-ink">{label(t.id)}</span>
    </label>
  {/each}
</div>
