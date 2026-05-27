<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import DirectionsLinks from './DirectionsLinks.svelte';
  import type { EventHeroProps } from './hero';

  // Photo — hero image dominates. Title and date overlay the image at
  // the bottom; the meta lives in a quiet panel underneath. Without a
  // cover, falls back to an accent panel so the layout still reads.
  let { event, cover, startsInEventTz, endsInEventTz, showLocalTime, startsInViewerTz }: EventHeroProps =
    $props();
</script>

<article class="overflow-hidden rounded-card border border-rule bg-card">
  <div class="relative">
    {#if cover?.url}
      <img
        src={cover.url}
        alt=""
        width="1600"
        height="900"
        class="aspect-[16/10] w-full object-cover"
      />
    {:else}
      <div class="aspect-[16/10] w-full bg-accent"></div>
    {/if}
    <div
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-6 text-paper sm:p-10"
    >
      <span class="font-mono text-[10px] tracking-[0.24em] uppercase opacity-70">
        {m.invite_eyebrow()}
      </span>
      <h1
        class="font-display mt-2 text-4xl leading-[0.92] font-bold tracking-[var(--tracking-display)] text-balance sm:text-6xl"
      >
        {event.title}
      </h1>
    </div>
  </div>

  <div class="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
    <div>
      <p class="font-mono text-[10px] tracking-[0.18em] uppercase opacity-55">
        {m.event_when_label()}
      </p>
      <p class="font-display mt-1 text-lg font-bold leading-tight tracking-tight">
        <time datetime={event.startsAt}>{startsInEventTz}</time>
        {#if endsInEventTz}
          <span class="opacity-60"> {m.event_until()} </span>
          <time datetime={event.endsAt}>{endsInEventTz}</time>
        {/if}
      </p>
      <p class="mt-1 font-mono text-[11px] opacity-55">{event.timezone}</p>
      {#if showLocalTime}
        <p class="mt-0.5 font-mono text-[11px] opacity-55">
          {m.event_your_local_time()}
          {startsInViewerTz}
        </p>
      {/if}
    </div>
    {#if event.locationText}
      <div>
        <p class="font-mono text-[10px] tracking-[0.18em] uppercase opacity-55">
          {m.event_where_label()}
        </p>
        <p class="font-display mt-1 text-lg font-bold leading-tight tracking-tight">
          {event.locationText}
        </p>
        <div class="mt-2">
          <DirectionsLinks locationText={event.locationText} />
        </div>
      </div>
    {/if}
  </div>
</article>
