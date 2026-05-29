<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import DirectionsLinks from './DirectionsLinks.svelte';
  import type { EventHeroProps } from './hero';

  // The baseline event hero: an optional cover image above an accent-filled
  // card carrying the title and a when/where grid.
  let { event, cover, startsInEventTz, endsInEventTz, showLocalTime, startsInViewerTz }: EventHeroProps =
    $props();

  const kvLabel = 'font-mono text-[10px] tracking-[0.12em] uppercase opacity-60';
  const kvValue = 'mt-1 font-display text-xl font-bold tracking-tight leading-tight';
</script>

{#if cover?.url}
  <img
    src={cover.url}
    alt=""
    width="1200"
    height="630"
    class="mb-6 h-56 w-full rounded-card object-cover sm:h-72"
  />
{/if}

<div class="rounded-card bg-accent p-7 text-accent-ink sm:p-10">
  <span class="font-mono text-[10px] tracking-[0.18em] uppercase opacity-70">
    {m.invite_eyebrow()}
  </span>
  <h1
    class="font-display mt-4 text-5xl leading-[0.92] font-bold tracking-[var(--tracking-display)] text-balance sm:text-6xl"
  >
    {event.title}
  </h1>

  <dl class="mt-8 grid gap-6 sm:grid-cols-2">
    <div>
      <dt class={kvLabel}>{m.event_when_label()}</dt>
      <dd class={kvValue}>
        <time datetime={event.startsAt}>{startsInEventTz}</time>
        {#if endsInEventTz}
          <span class="opacity-60"> {m.event_until()} </span>
          <time datetime={event.endsAt}>{endsInEventTz}</time>
        {/if}
      </dd>
      <dd class="mt-1 font-mono text-[11px] text-accent-ink-muted">{event.timezone}</dd>
      {#if showLocalTime}
        <dd class="mt-0.5 font-mono text-[11px] text-accent-ink-muted">
          {m.event_your_local_time()}
          {startsInViewerTz}
        </dd>
      {/if}
    </div>

    {#if event.locationText}
      <div>
        <dt class={kvLabel}>{m.event_where_label()}</dt>
        <dd class={kvValue}>{event.locationText}</dd>
        <dd class="mt-2">
          <DirectionsLinks locationText={event.locationText} />
        </dd>
      </div>
    {/if}
  </dl>
</div>
