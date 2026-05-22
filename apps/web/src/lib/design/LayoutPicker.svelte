<script lang="ts">
  /**
   * Layout chooser (ADR 0011) — the structural axis, orthogonal to the
   * colour theme. Each tile is a schematic of the layout's page structure,
   * drawn in the neutral app theme (the structure is what differs, not the
   * colour). Carries the chosen id as a `layout` form field.
   */
  import * as m from '$lib/paraglide/messages.js';
  import { layoutRegistry } from '$lib/themes';

  let { value = $bindable('standard'), name = 'layout' }: { value?: string; name?: string } =
    $props();

  const layouts = layoutRegistry.list();

  const labels: Record<string, () => string> = {
    standard: m.layout_standard_name,
    ticket: m.layout_ticket_name,
  };
  function label(id: string): string {
    return (labels[id] ?? (() => id))();
  }
</script>

<div class="grid grid-cols-2 gap-3">
  {#each layouts as l (l.id)}
    <label
      class="cursor-pointer rounded-xl border-[1.5px] border-rule p-2 transition has-[:checked]:border-ink has-[:checked]:bg-paper-2"
    >
      <input type="radio" {name} value={l.id} bind:group={value} class="sr-only" />
      {#if l.id === 'ticket'}
        <div class="flex overflow-hidden rounded-lg border border-rule bg-card">
          <div
            class="flex w-2/5 items-center justify-center bg-accent font-display text-base font-bold text-accent-ink"
          >
            Aa
          </div>
          <div class="border-l border-dashed border-rule"></div>
          <div class="flex-1 space-y-1.5 bg-paper px-2.5 py-3">
            <div class="h-1.5 w-3/4 rounded-full bg-ink/25"></div>
            <div class="h-1.5 w-1/2 rounded-full bg-ink/15"></div>
          </div>
        </div>
      {:else}
        <div class="overflow-hidden rounded-lg border border-rule bg-card">
          <div class="bg-accent px-2.5 py-3 font-display text-base font-bold text-accent-ink">
            Aa
          </div>
          <div class="space-y-1.5 bg-paper px-2.5 py-2.5">
            <div class="h-1.5 w-3/4 rounded-full bg-ink/25"></div>
            <div class="h-1.5 w-1/2 rounded-full bg-ink/15"></div>
          </div>
        </div>
      {/if}
      <span class="mt-1.5 block text-center text-xs font-semibold text-ink">{label(l.id)}</span>
    </label>
  {/each}
</div>
