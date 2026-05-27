<script lang="ts">
  /**
   * Preset Quick-start — one-click triples that set layout + palette +
   * font pairing in one go. The component is intentionally controlled
   * via two-way bindings on the three axis values so the regular
   * pickers below stay live: picking a preset updates them; nudging a
   * single axis just clears the preset's highlight (no preset id is
   * persisted — only the resolved triple lives on the event).
   *
   * Renders as a horizontal-scroll strip on mobile, a 4-up grid from
   * `sm:` up. Each tile previews the preset's palette + display font
   * so the user can scan the visual character at a glance.
   */
  import * as m from '$lib/paraglide/messages.js';
  import { communityPresets, type Preset } from '@vitein/template-engine';
  import { fontPairingRegistry, themeStyle } from '$lib/themes';

  let {
    layout = $bindable('standard'),
    themeId = $bindable('volt'),
    fontPairing = $bindable('bricolage-geist'),
  }: {
    layout?: string;
    themeId?: string;
    fontPairing?: string;
  } = $props();

  const presets: Preset[] = communityPresets;

  // Each preset's name + description are Paraglide keys (in case we want
  // to fully localise later); the map keeps the runtime call static so
  // tree-shaking still works.
  const nameOf: Record<string, () => string> = {
    launch: m.preset_launch_name,
    dinner: m.preset_dinner_name,
    wedding: m.preset_wedding_name,
    'after-dark': m.preset_after_dark_name,
    birthday: m.preset_birthday_name,
    garden: m.preset_garden_name,
    show: m.preset_show_name,
    kids: m.preset_kids_name,
  };
  const descOf: Record<string, () => string> = {
    launch: m.preset_launch_description,
    dinner: m.preset_dinner_description,
    wedding: m.preset_wedding_description,
    'after-dark': m.preset_after_dark_description,
    birthday: m.preset_birthday_description,
    garden: m.preset_garden_description,
    show: m.preset_show_description,
    kids: m.preset_kids_description,
  };

  const activePresetId = $derived(
    presets.find(
      (p) => p.layout === layout && p.theme === themeId && p.fontPairing === fontPairing,
    )?.id ?? null,
  );

  function apply(p: Preset): void {
    layout = p.layout;
    themeId = p.theme;
    fontPairing = p.fontPairing;
  }

  function displayStyleFor(id: string): string {
    const p = fontPairingRegistry.resolve(id);
    return `font-family:${p.display};font-style:${p.displayStyle};font-weight:${p.displayWeight};letter-spacing:${p.tracking}`;
  }
</script>

<div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
  {#each presets as p (p.id)}
    <button
      type="button"
      onclick={() => apply(p)}
      aria-pressed={activePresetId === p.id}
      class="group shrink-0 cursor-pointer rounded-xl border-[1.5px] p-2 text-left transition sm:shrink"
      class:border-ink={activePresetId === p.id}
      class:bg-paper-2={activePresetId === p.id}
      class:border-rule={activePresetId !== p.id}
    >
      <div style={themeStyle(p.theme)} class="overflow-hidden rounded-lg border border-rule">
        <div
          class="bg-accent px-2.5 py-2.5 text-base leading-none font-bold text-accent-ink"
          style={displayStyleFor(p.fontPairing)}
        >
          Aa
        </div>
        <div class="space-y-1 bg-paper px-2.5 py-2">
          <div class="h-1 w-3/4 rounded-full bg-ink/25"></div>
          <div class="h-1 w-1/2 rounded-full bg-ink/15"></div>
        </div>
      </div>
      <span class="mt-1.5 block w-24 text-center text-xs font-semibold text-ink sm:w-auto">
        {(nameOf[p.id] ?? (() => p.id))()}
      </span>
      <span class="block w-24 text-center text-[10px] text-ink-muted sm:w-auto">
        {(descOf[p.id] ?? (() => ''))()}
      </span>
    </button>
  {/each}
</div>
