<script lang="ts">
  /**
   * Live preview of an event's design for the create / manage forms.
   * Reflects both orthogonal axes (ADR 0011): the `themeId` palette (via
   * `themeStyle`) and the `layout` structure — a `ticket` layout previews
   * as a two-panel ticket, not the standard portrait card.
   */
  import * as m from '$lib/paraglide/messages.js';
  import { themeStyle } from '$lib/themes';

  let {
    themeId,
    layout,
    title,
    description = '',
    date = '',
    location = '',
  }: {
    themeId: string;
    layout: string;
    title: string;
    description?: string;
    date?: string;
    location?: string;
  } = $props();

  const shadow = 'shadow-[0_24px_40px_-16px_rgba(0,0,0,0.25)]';
  const displayTitle = $derived(title || m.create_field_title());
</script>

{#if layout === 'ticket'}
  <div
    style={themeStyle(themeId)}
    class="flex aspect-[4/3] w-64 overflow-hidden rounded-card bg-card text-ink {shadow}"
  >
    <div class="flex w-2/5 items-center justify-center bg-accent p-3 text-accent-ink">
      <span class="font-mono text-[8px] tracking-[0.16em] uppercase opacity-80">
        {m.invite_eyebrow()}
      </span>
    </div>
    <div class="border-l border-dashed border-rule"></div>
    <div class="flex flex-1 flex-col p-4">
      <div
        class="font-display text-lg leading-[0.95] font-bold tracking-[var(--tracking-display)]"
      >
        {displayTitle}
      </div>
      {#if date}<p class="mt-2 font-mono text-[9px] text-ink-muted">{date}</p>{/if}
      {#if location}<p class="mt-0.5 font-mono text-[9px] text-ink-muted">{location}</p>{/if}
    </div>
  </div>
{:else}
  <div
    style={themeStyle(themeId)}
    class="flex aspect-[3/4] w-52 flex-col overflow-hidden rounded-card bg-paper text-ink {shadow}"
  >
    <div class="bg-accent px-5 py-5 text-accent-ink">
      <span class="font-mono text-[9px] tracking-[0.16em] uppercase opacity-70">
        {m.invite_eyebrow()}
      </span>
      <div
        class="font-display mt-3 text-2xl leading-[0.95] font-bold tracking-[var(--tracking-display)]"
      >
        {displayTitle}
      </div>
    </div>
    {#if description}
      <p class="line-clamp-3 px-5 pt-4 text-[13px] leading-snug">{description}</p>
    {/if}
    {#if date || location}
      <div class="space-y-0.5 px-5 py-4 font-mono text-[10px] text-ink-muted">
        {#if date}<span class="block">{date}</span>{/if}
        {#if location}<span class="block">{location}</span>{/if}
      </div>
    {/if}
  </div>
{/if}
