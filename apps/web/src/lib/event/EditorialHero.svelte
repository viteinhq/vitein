<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import DirectionsLinks from './DirectionsLinks.svelte';
  import type { EventHeroProps } from './hero';

  // Editorial — asymmetric magazine cover. Big display title dominates,
  // a side rail carries the metadata, cover image (if any) is a small
  // accent block bottom-left to anchor the asymmetry.
  let { event, cover, startsInEventTz, endsInEventTz, showLocalTime, startsInViewerTz }: EventHeroProps =
    $props();
</script>

<article class="overflow-hidden rounded-card border border-rule bg-card">
  <div class="grid gap-0 sm:grid-cols-[1.6fr_1fr]">
    <div class="border-b border-rule px-6 py-8 sm:border-r sm:border-b-0 sm:px-10 sm:py-12">
      <span class="font-mono text-[10px] tracking-[0.24em] uppercase opacity-55">
        {m.invite_eyebrow()}
      </span>
      <h1
        class="font-display mt-4 text-5xl leading-[0.88] font-bold tracking-[var(--tracking-display)] text-balance sm:text-6xl"
      >
        {event.title}
      </h1>
      {#if cover?.url}
        <img
          src={cover.url}
          alt=""
          width="800"
          height="600"
          class="mt-8 h-32 w-1/2 rounded-md object-cover sm:h-40"
        />
      {/if}
    </div>

    <div class="space-y-6 px-6 py-6 sm:px-8 sm:py-12">
      <div>
        <p class="font-mono text-[10px] tracking-[0.18em] uppercase opacity-55">
          {m.event_when_label()}
        </p>
        <p class="font-display mt-1 text-xl font-bold leading-tight tracking-tight">
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
          <p class="font-display mt-1 text-xl font-bold leading-tight tracking-tight">
            {event.locationText}
          </p>
          <div class="mt-2">
            <DirectionsLinks locationText={event.locationText} />
          </div>
        </div>
      {/if}
    </div>
  </div>
</article>
