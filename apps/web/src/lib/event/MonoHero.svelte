<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import DirectionsLinks from './DirectionsLinks.svelte';
  import type { EventHeroProps } from './hero';

  // Mono — pure type, no chrome. Title up top, facts as a definition
  // list. No card border, no accent block. Reads like a printed
  // programme; relies on the font pairing for personality.
  let { event, cover, startsInEventTz, endsInEventTz, showLocalTime, startsInViewerTz }: EventHeroProps =
    $props();
</script>

<article class="px-1">
  <span class="font-mono text-[10px] tracking-[0.24em] uppercase text-ink-muted">
    {m.invite_eyebrow()}
  </span>
  <h1
    class="font-display mt-4 text-5xl leading-[0.9] font-bold tracking-[var(--tracking-display)] text-balance sm:text-7xl"
  >
    {event.title}
  </h1>

  <dl class="mt-10 divide-y divide-rule border-t border-b border-rule">
    <div class="grid grid-cols-[8rem_1fr] items-baseline gap-4 py-4">
      <dt class="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-muted">
        {m.event_when_label()}
      </dt>
      <dd>
        <p class="font-display text-lg font-bold leading-tight tracking-tight">
          <time datetime={event.startsAt}>{startsInEventTz}</time>
          {#if endsInEventTz}
            <span class="opacity-60"> {m.event_until()} </span>
            <time datetime={event.endsAt}>{endsInEventTz}</time>
          {/if}
        </p>
        <p class="mt-1 font-mono text-[11px] text-ink-muted">{event.timezone}</p>
        {#if showLocalTime}
          <p class="mt-0.5 font-mono text-[11px] text-ink-muted">
            {m.event_your_local_time()}
            {startsInViewerTz}
          </p>
        {/if}
      </dd>
    </div>
    {#if event.locationText}
      <div class="grid grid-cols-[8rem_1fr] items-baseline gap-4 py-4">
        <dt class="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-muted">
          {m.event_where_label()}
        </dt>
        <dd>
          <p class="font-display text-lg font-bold leading-tight tracking-tight">
            {event.locationText}
          </p>
          <div class="mt-2">
            <DirectionsLinks locationText={event.locationText} />
          </div>
        </dd>
      </div>
    {/if}
  </dl>

  {#if cover?.url}
    <img
      src={cover.url}
      alt=""
      width="1200"
      height="600"
      class="mt-10 aspect-[2/1] w-full rounded-md object-cover"
    />
  {/if}
</article>
