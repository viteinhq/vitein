<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import DirectionsLinks from './DirectionsLinks.svelte';
  import type { EventHeroProps } from './hero';

  // Card — a bordered paper invitation inset on the page. Centered,
  // classical, slightly formal. The cover image sits as a band inside
  // the card frame so the border still reads.
  let { event, cover, startsInEventTz, endsInEventTz, showLocalTime, startsInViewerTz }: EventHeroProps =
    $props();
</script>

<article class="rounded-card bg-paper-2 p-3 sm:p-6">
  <div class="rounded-card border-2 border-ink/80 bg-card px-6 py-10 text-center sm:px-12 sm:py-16">
    {#if cover?.url}
      <img
        src={cover.url}
        alt=""
        width="1200"
        height="600"
        class="mx-auto mb-8 h-36 w-full rounded-md object-cover sm:h-48"
      />
    {/if}
    <span class="font-mono text-[10px] tracking-[0.32em] uppercase text-ink-muted">
      {m.invite_eyebrow()}
    </span>
    <div class="my-6 flex items-center justify-center gap-3" aria-hidden="true">
      <span class="h-px w-12 bg-ink/40"></span>
      <span class="h-1.5 w-1.5 rotate-45 bg-ink/40"></span>
      <span class="h-px w-12 bg-ink/40"></span>
    </div>
    <h1
      class="font-display mx-auto max-w-md text-4xl leading-[0.95] font-bold tracking-[var(--tracking-display)] text-balance sm:text-5xl"
    >
      {event.title}
    </h1>

    <p class="font-display mt-8 text-xl font-bold leading-tight tracking-tight">
      <time datetime={event.startsAt}>{startsInEventTz}</time>
      {#if endsInEventTz}
        <span class="opacity-60"> {m.event_until()} </span>
        <time datetime={event.endsAt}>{endsInEventTz}</time>
      {/if}
    </p>
    <p class="mt-1 font-mono text-[11px] text-ink-muted">
      {event.timezone}{#if showLocalTime}
        · {m.event_your_local_time()}
        {startsInViewerTz}{/if}
    </p>

    {#if event.locationText}
      <div class="mt-6">
        <p class="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-muted">
          {m.event_where_label()}
        </p>
        <p class="font-display mt-1 text-xl font-bold leading-tight tracking-tight">
          {event.locationText}
        </p>
        <div class="mt-2 flex justify-center">
          <DirectionsLinks locationText={event.locationText} />
        </div>
      </div>
    {/if}
  </div>
</article>
