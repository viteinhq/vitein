<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import DirectionsLinks from './DirectionsLinks.svelte';
  import type { EventHeroProps } from './hero';

  // Poster — the title fills the page. Everything else (date, location)
  // sits in a quiet mono strip below the headline. Cover image, if any,
  // becomes the background of the headline panel.
  let { event, cover, startsInEventTz, endsInEventTz, showLocalTime, startsInViewerTz }: EventHeroProps =
    $props();
</script>

<article class="overflow-hidden rounded-card">
  <div
    class="relative flex aspect-square w-full items-end justify-start bg-accent p-6 text-accent-ink sm:aspect-[4/3] sm:p-12"
  >
    {#if cover?.url}
      <img
        src={cover.url}
        alt=""
        class="absolute inset-0 h-full w-full object-cover opacity-40"
        aria-hidden="true"
      />
    {/if}
    <div class="relative">
      <span class="font-mono text-[10px] tracking-[0.24em] uppercase opacity-70">
        {m.invite_eyebrow()}
      </span>
      <h1
        class="font-display mt-3 text-6xl leading-[0.84] font-extrabold tracking-[var(--tracking-display)] text-balance sm:text-8xl"
      >
        {event.title}
      </h1>
    </div>
  </div>

  <div class="space-y-3 bg-card px-6 py-6 sm:px-8 sm:py-8">
    <p class="font-mono text-xs tracking-[0.18em] uppercase">
      <time datetime={event.startsAt}>{startsInEventTz}</time>
      {#if endsInEventTz}
        <span class="opacity-60"> {m.event_until()} </span>
        <time datetime={event.endsAt}>{endsInEventTz}</time>
      {/if}
    </p>
    <p class="font-mono text-[11px] text-ink-muted">
      {event.timezone}{#if showLocalTime}
        · {m.event_your_local_time()}
        {startsInViewerTz}{/if}
    </p>
    {#if event.locationText}
      <p class="font-mono text-xs tracking-[0.18em] uppercase">{event.locationText}</p>
      <DirectionsLinks locationText={event.locationText} />
    {/if}
  </div>
</article>
