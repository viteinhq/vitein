<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import DirectionsLinks from './DirectionsLinks.svelte';
  import type { EventHeroProps } from './hero';

  // Bento — modular grid. The title takes the big cell, when / where /
  // cover each get their own tile. Densely arranged but breathable;
  // collapses to a stack on mobile so nothing crowds.
  let { event, cover, startsInEventTz, endsInEventTz, showLocalTime, startsInViewerTz }: EventHeroProps =
    $props();
</script>

<article class="grid gap-3 sm:grid-cols-3">
  <div class="rounded-card bg-accent p-6 text-accent-ink sm:col-span-2 sm:p-10">
    <span class="font-mono text-[10px] tracking-[0.24em] uppercase opacity-70">
      {m.invite_eyebrow()}
    </span>
    <h1
      class="font-display mt-4 text-4xl leading-[0.9] font-bold tracking-[var(--tracking-display)] text-balance sm:text-6xl"
    >
      {event.title}
    </h1>
  </div>

  <div class="rounded-card border border-rule bg-card p-5 sm:p-6">
    <p class="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-muted">
      {m.event_when_label()}
    </p>
    <p class="font-display mt-2 text-lg font-bold leading-tight tracking-tight">
      <time datetime={event.startsAt}>{startsInEventTz}</time>
    </p>
    {#if endsInEventTz}
      <p class="font-display text-sm leading-tight opacity-70">
        {m.event_until()}
        <time datetime={event.endsAt}>{endsInEventTz}</time>
      </p>
    {/if}
    <p class="mt-2 font-mono text-[11px] text-ink-muted">{event.timezone}</p>
    {#if showLocalTime}
      <p class="mt-0.5 font-mono text-[11px] text-ink-muted">
        {m.event_your_local_time()}
        {startsInViewerTz}
      </p>
    {/if}
  </div>

  {#if cover?.url}
    <div class="overflow-hidden rounded-card border border-rule sm:col-span-1">
      <img src={cover.url} alt="" width="600" height="600" class="aspect-square w-full object-cover" />
    </div>
  {/if}

  {#if event.locationText}
    <div
      class="rounded-card border border-rule bg-card p-5 sm:p-6"
      class:sm:col-span-2={!cover?.url}
    >
      <p class="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-muted">
        {m.event_where_label()}
      </p>
      <p class="font-display mt-2 text-lg font-bold leading-tight tracking-tight">
        {event.locationText}
      </p>
      <div class="mt-2">
        <DirectionsLinks locationText={event.locationText} />
      </div>
    </div>
  {/if}
</article>
