<script lang="ts">
  /**
   * Colour-theme chooser (ADR 0011). Renders each registered theme as a
   * radio tile previewed through its own design tokens. Carries the chosen
   * id as a `themeId` form field — drops straight into the create / manage
   * forms with no client state.
   */
  import * as m from '$lib/paraglide/messages.js';
  import { themeRegistry, themeStyle } from '$lib/themes';

  let { value = $bindable('classic'), name = 'themeId' }: { value?: string; name?: string } =
    $props();

  const themes = themeRegistry.list();

  // Static map — a dynamic `m[key]` would defeat message tree-shaking.
  const labels: Record<string, () => string> = {
    classic: m.theme_classic_name,
    noir: m.theme_noir_name,
    paper: m.theme_paper_name,
    serif: m.theme_serif_name,
  };
  function label(id: string): string {
    return (labels[id] ?? (() => id))();
  }
</script>

<div class="grid grid-cols-2 gap-3">
  {#each themes as t (t.id)}
    <label
      class="cursor-pointer rounded-xl border-[1.5px] border-rule p-2 transition has-[:checked]:border-ink has-[:checked]:bg-paper-2"
    >
      <input type="radio" {name} value={t.id} bind:group={value} class="sr-only" />
      <div style={themeStyle(t.id)} class="overflow-hidden rounded-lg border border-rule">
        <div class="bg-accent px-2.5 py-3 font-display text-base font-bold text-accent-ink">Aa</div>
        <div class="space-y-1.5 bg-paper px-2.5 py-2.5">
          <div class="h-1.5 w-3/4 rounded-full bg-ink/25"></div>
          <div class="h-1.5 w-1/2 rounded-full bg-ink/15"></div>
        </div>
      </div>
      <span class="mt-1.5 block text-center text-xs font-semibold text-ink">{label(t.id)}</span>
    </label>
  {/each}
</div>
