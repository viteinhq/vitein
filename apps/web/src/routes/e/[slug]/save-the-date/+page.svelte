<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  // Wall-clock formatting in the event's own timezone — same logic as the
  // regular event page; without it the displayed date would shift based
  // on the viewer's locale.
  const startsAt = new Date(data.event.startsAt);
  const startsInEventTz = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeZone: data.event.timezone,
  }).format(startsAt);

  const canonicalUrl = $derived(`${page.url.origin}/e/${data.event.slug}/save-the-date`);
  // Dynamic OG endpoint on the API worker (where wrangler bundles the
  // resvg-wasm correctly). Falls back to cover if the OG URL wasn't
  // resolved server-side for any reason.
  const ogImageUrl = $derived(data.ogImageUrl ?? data.cover?.url ?? null);
</script>

<svelte:head>
  <title>{m.std_page_title({ title: data.event.title })}</title>
  <meta property="og:title" content={m.std_page_title({ title: data.event.title })} />
  <meta property="og:description" content={m.std_og_description()} />
  {#if ogImageUrl}
    <meta property="og:image" content={ogImageUrl} />
    <meta name="twitter:image" content={ogImageUrl} />
    <meta name="twitter:card" content="summary_large_image" />
  {/if}
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:type" content="website" />
  <link rel="canonical" href={canonicalUrl} />
</svelte:head>

<section class="mx-auto max-w-2xl px-6 py-10">
  {#if data.cover?.url}
    <img
      src={data.cover.url}
      alt=""
      width="1200"
      height="630"
      class="mb-6 h-56 w-full rounded-card object-cover sm:h-72"
    />
  {/if}

  <div class="rounded-card bg-accent p-7 text-accent-ink sm:p-10">
    <span class="font-mono text-[10px] tracking-[0.18em] uppercase opacity-70">
      {m.std_eyebrow()}
    </span>
    <h1
      class="font-display mt-4 text-5xl leading-[0.92] font-bold tracking-[var(--tracking-display)] text-balance sm:text-6xl"
    >
      {data.event.title}
    </h1>

    <dl class="mt-8">
      <dt class="font-mono text-[10px] tracking-[0.12em] uppercase opacity-60">
        {m.event_when_label()}
      </dt>
      <dd class="mt-1 font-display text-2xl font-bold tracking-tight leading-tight">
        <time datetime={data.event.startsAt}>{startsInEventTz}</time>
      </dd>
      <dd class="mt-1 font-mono text-[11px] opacity-55">{data.event.timezone}</dd>
    </dl>

    <p class="mt-6 text-sm opacity-75">{m.std_tagline()}</p>
  </div>

  <div class="mt-6 flex flex-wrap gap-2">
    <Button href="/e/{data.event.slug}/event.ics" variant="secondary" size="sm">
      {m.std_add_to_calendar()}
    </Button>
  </div>
</section>
