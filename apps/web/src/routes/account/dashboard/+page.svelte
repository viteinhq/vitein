<script lang="ts">
  import { enhance } from '$app/forms';
  import { Banner, Button, Card } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  // Stats strip only earns its space once there's something to count.
  const showStats = $derived(data.stats.events.total > 0);

  function formatStart(iso: string, tz: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    }).format(new Date(iso));
  }
</script>

<svelte:head>
  <title>{m.account_nav_dashboard()} — vite.in</title>
</svelte:head>

<section class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold tracking-tight">{m.dashboard_title()}</h1>
    <Button href="/create" size="sm">{m.dashboard_new_event()}</Button>
  </div>

  {#if showStats}
    <div class="space-y-2">
      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-md border border-slate-200 p-4">
          <dt class="text-xs uppercase tracking-wider text-slate-500">
            {m.dashboard_stats_events()}
          </dt>
          <dd class="mt-1 text-2xl font-bold tabular-nums">{data.stats.events.total}</dd>
        </div>
        <div class="rounded-md border border-slate-200 p-4">
          <dt class="text-xs uppercase tracking-wider text-slate-500">
            {m.dashboard_stats_upcoming()}
          </dt>
          <dd class="mt-1 text-2xl font-bold tabular-nums">{data.stats.events.upcoming}</dd>
        </div>
        <div class="rounded-md border border-slate-200 p-4">
          <dt class="text-xs uppercase tracking-wider text-slate-500">
            {m.dashboard_stats_rsvps()}
          </dt>
          <dd class="mt-1 text-2xl font-bold tabular-nums">{data.stats.rsvps.total}</dd>
        </div>
        <div class="rounded-md border border-slate-200 p-4">
          <dt class="text-xs uppercase tracking-wider text-slate-500">
            {m.dashboard_stats_attending()}
          </dt>
          <dd class="mt-1 text-2xl font-bold tabular-nums">{data.stats.rsvps.yes}</dd>
        </div>
      </dl>
      {#if data.stats.rsvps.total > 0}
        <p class="text-xs text-slate-500">
          {m.dashboard_stats_rsvp_breakdown({
            yes: data.stats.rsvps.yes,
            maybe: data.stats.rsvps.maybe,
            no: data.stats.rsvps.no,
            plus: data.stats.rsvps.plusOnes,
          })}
        </p>
      {/if}
    </div>
  {/if}

  {#if form && 'claimed' in form && typeof form.claimed === 'number'}
    <Banner tone="success">
      {#if form.claimed === 1}
        {m.dashboard_claim_one()}
      {:else if form.claimed > 1}
        {m.dashboard_claim_many({ count: form.claimed })}
      {:else}
        {m.dashboard_claim_none()}
      {/if}
    </Banner>
  {/if}
  {#if form && 'claimError' in form}
    <Banner tone="error">
      <p>
        {localizeError(form.claimError, {
          status: 'claimStatus' in form ? form.claimStatus : undefined,
        })}
      </p>
      {#if 'claimDetails' in form && form.claimDetails}
        <pre class="mt-1 overflow-x-auto text-xs">{form.claimDetails}</pre>
      {/if}
    </Banner>
  {/if}

  <form method="POST" action="?/claim" use:enhance>
    <Button type="submit" variant="secondary" size="sm">{m.dashboard_claim_submit()}</Button>
  </form>

  {#if data.upcoming.length === 0 && data.past.length === 0}
    <Card class="!bg-slate-50">
      <p class="text-sm text-slate-600">
        {m.dashboard_empty_line()}
        <a href="/create" class="underline">{m.dashboard_empty_create()}</a>{m.dashboard_empty_or_claim()}
      </p>
    </Card>
  {/if}

  {#if data.upcoming.length > 0}
    <div class="space-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
        {m.dashboard_upcoming_heading()}
      </h2>
      <ul class="divide-y divide-slate-200 rounded-md border border-slate-200">
        {#each data.upcoming as ev (ev.id)}
          <li class="flex items-center justify-between p-4">
            <div>
              <!-- Owner reaches /manage with session auth — the API
                   accepts ownership-based access on manage routes. -->
              <a href="/e/{ev.slug}/manage" class="font-medium underline">{ev.title}</a>
              <p class="text-sm text-slate-500">
                {formatStart(ev.startsAt, ev.timezone)} ({ev.timezone})
                {#if ev.locationText}· {ev.locationText}{/if}
              </p>
            </div>
            <span class="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
              {ev.visibility}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if data.past.length > 0}
    <div class="space-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
        {m.dashboard_archive_heading()}
      </h2>
      <ul class="divide-y divide-slate-200 rounded-md border border-slate-200 opacity-75">
        {#each data.past as ev (ev.id)}
          <li class="flex items-center justify-between p-4">
            <div>
              <a href="/e/{ev.slug}/manage" class="font-medium underline">{ev.title}</a>
              <p class="text-sm text-slate-500">
                {formatStart(ev.startsAt, ev.timezone)} ({ev.timezone})
                {#if ev.locationText}· {ev.locationText}{/if}
              </p>
            </div>
            <span class="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
              {ev.visibility}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
