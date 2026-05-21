<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import DirectionsLinks from './DirectionsLinks.svelte';
  import type { EventHeroProps } from './hero';

  // M2 ticket layout: a two-panel card — a cover/accent stub beside the
  // details — split by a dashed perforation with punched notches.
  let { event, cover, startsInEventTz, endsInEventTz, showLocalTime, startsInViewerTz }: EventHeroProps =
    $props();

  const kvLabel = 'font-mono text-[10px] tracking-[0.12em] uppercase opacity-55';
  const kvValue = 'font-display mt-1 text-lg font-bold leading-tight tracking-tight';
  // bg-paper matches the page behind the card, so a notch reads as a punch-out.
  const notch = 'absolute size-4 rounded-full bg-paper';
</script>

<article class="relative flex flex-col overflow-hidden rounded-card border border-rule bg-card sm:flex-row">
  <!-- stub: the cover image, or an accent panel when the event has none -->
  <div class="shrink-0 sm:w-[38%]">
    {#if cover?.url}
      <img
        src={cover.url}
        alt=""
        width="600"
        height="800"
        class="h-44 w-full object-cover sm:h-full"
      />
    {:else}
      <div class="flex h-44 items-center justify-center bg-accent p-6 text-accent-ink sm:h-full">
        <span class="font-mono text-[10px] tracking-[0.18em] uppercase opacity-80">
          {m.invite_eyebrow()}
        </span>
      </div>
    {/if}
  </div>

  <!-- perforation: a dashed seam, horizontal on mobile, vertical on desktop -->
  <div
    class="relative z-10 border-t border-dashed border-rule sm:border-t-0 sm:border-l"
    aria-hidden="true"
  >
    <!-- seam start — left end on mobile, top end on desktop -->
    <span class="{notch} top-0 left-0 -translate-x-1/2 -translate-y-1/2"></span>
    <!-- seam end — right end on mobile -->
    <span class="{notch} top-0 right-0 translate-x-1/2 -translate-y-1/2 sm:hidden"></span>
    <!-- seam end — bottom end on desktop -->
    <span class="{notch} bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 sm:block"></span>
  </div>

  <!-- details -->
  <div class="flex-1 p-6 sm:p-8">
    <span class="font-mono text-[10px] tracking-[0.18em] uppercase opacity-55">
      {m.invite_eyebrow()}
    </span>
    <h1
      class="font-display mt-3 text-3xl leading-[0.95] font-bold tracking-[var(--tracking-display)] text-balance sm:text-4xl"
    >
      {event.title}
    </h1>

    <div class="mt-6 space-y-4">
      <div>
        <p class={kvLabel}>{m.event_when_label()}</p>
        <p class={kvValue}>
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
          <p class={kvLabel}>{m.event_where_label()}</p>
          <p class={kvValue}>{event.locationText}</p>
          <div class="mt-2">
            <DirectionsLinks locationText={event.locationText} />
          </div>
        </div>
      {/if}
    </div>
  </div>
</article>
