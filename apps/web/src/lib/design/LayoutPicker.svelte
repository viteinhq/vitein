<script lang="ts">
  /**
   * Layout chooser (ADR 0011 + 2026-05-26 theme-engine expansion).
   * Each tile is a schematic of the layout's page structure, drawn in
   * the neutral app theme — the structure is what differs, not the
   * colour. Carries the chosen id as a `layout` form field.
   */
  import * as m from '$lib/paraglide/messages.js';
  import { layoutRegistry } from '$lib/themes';

  let { value = $bindable('standard'), name = 'layout' }: { value?: string; name?: string } =
    $props();

  const layouts = layoutRegistry.list();

  const labels: Record<string, () => string> = {
    standard: m.layout_standard_name,
    ticket: m.layout_ticket_name,
    editorial: m.layout_editorial_name,
    poster: m.layout_poster_name,
    card: m.layout_card_name,
    photo: m.layout_photo_name,
    bento: m.layout_bento_name,
    mono: m.layout_mono_name,
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
        <!-- Ticket: two-panel stub with perforation. -->
        <div class="flex h-[88px] overflow-hidden rounded-lg border border-rule bg-card">
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
      {:else if l.id === 'editorial'}
        <!-- Editorial: asymmetric — small accent block bottom-left, big
             headline area on the right. Magazine cover feel. -->
        <div class="flex h-[88px] gap-1.5 overflow-hidden rounded-lg border border-rule bg-paper p-2">
          <div class="flex flex-col justify-end">
            <div class="h-5 w-7 rounded bg-accent"></div>
          </div>
          <div class="flex flex-1 flex-col justify-between py-0.5">
            <div class="font-display text-[15px] leading-none font-bold text-ink">Aa</div>
            <div class="space-y-1">
              <div class="h-1 w-full rounded-full bg-ink/25"></div>
              <div class="h-1 w-2/3 rounded-full bg-ink/15"></div>
            </div>
          </div>
        </div>
      {:else if l.id === 'poster'}
        <!-- Poster: title fills the page. -->
        <div
          class="flex h-[88px] items-center justify-center overflow-hidden rounded-lg bg-accent font-display text-3xl leading-none font-extrabold tracking-tighter text-accent-ink"
        >
          Aa
        </div>
      {:else if l.id === 'card'}
        <!-- Card: bordered paper invite inset on the page. -->
        <div class="flex h-[88px] items-center justify-center overflow-hidden rounded-lg bg-paper-2 p-2">
          <div class="flex h-full w-full flex-col items-center justify-center rounded-md border border-ink/30 bg-card">
            <div class="font-display text-sm font-bold text-ink">Aa</div>
            <div class="mt-1 h-1 w-8 rounded-full bg-ink/25"></div>
          </div>
        </div>
      {:else if l.id === 'photo'}
        <!-- Photo: hero image area on top, info beneath. -->
        <div class="flex h-[88px] flex-col overflow-hidden rounded-lg border border-rule bg-card">
          <div
            class="h-12 bg-accent"
            style="background-image: repeating-linear-gradient(135deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 6px)"
          ></div>
          <div class="flex flex-1 flex-col justify-center space-y-1 px-2">
            <div class="h-1 w-3/4 rounded-full bg-ink/25"></div>
            <div class="h-1 w-1/2 rounded-full bg-ink/15"></div>
          </div>
        </div>
      {:else if l.id === 'bento'}
        <!-- Bento: 2x2 grid of info modules. -->
        <div class="grid h-[88px] grid-cols-3 gap-1 overflow-hidden rounded-lg bg-paper-2 p-1.5">
          <div class="col-span-2 flex items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-accent-ink">
            Aa
          </div>
          <div class="rounded-md bg-card"></div>
          <div class="rounded-md bg-card"></div>
          <div class="col-span-2 rounded-md bg-card"></div>
        </div>
      {:else if l.id === 'mono'}
        <!-- Mono: pure type, list of facts, no chrome. -->
        <div class="flex h-[88px] flex-col justify-center gap-1.5 overflow-hidden rounded-lg border border-rule bg-paper px-3">
          <div class="font-display text-base leading-none font-bold text-ink">Aa.</div>
          <div class="h-1 w-full rounded-full bg-ink/25"></div>
          <div class="h-1 w-3/4 rounded-full bg-ink/20"></div>
          <div class="h-1 w-1/2 rounded-full bg-ink/15"></div>
        </div>
      {:else}
        <!-- standard (default): accent band on top, two content lines below. -->
        <div class="flex h-[88px] flex-col overflow-hidden rounded-lg border border-rule bg-card">
          <div class="bg-accent px-2.5 py-3 font-display text-base font-bold text-accent-ink">
            Aa
          </div>
          <div class="flex-1 space-y-1.5 bg-paper px-2.5 py-2.5">
            <div class="h-1.5 w-3/4 rounded-full bg-ink/25"></div>
            <div class="h-1.5 w-1/2 rounded-full bg-ink/15"></div>
          </div>
        </div>
      {/if}

      <span class="mt-1.5 block text-center text-xs font-semibold text-ink">{label(l.id)}</span>
    </label>
  {/each}
</div>
