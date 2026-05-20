<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowRight, Banner, Button } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  const showStats = $derived(data.stats.events.total > 0);

  function formatStart(iso: string, tz: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    }).format(new Date(iso));
  }

  const stats = $derived([
    { label: m.dashboard_stats_events(), value: data.stats.events.total, accent: false },
    { label: m.dashboard_stats_upcoming(), value: data.stats.events.upcoming, accent: false },
    { label: m.dashboard_stats_rsvps(), value: data.stats.rsvps.total, accent: false },
    { label: m.dashboard_stats_attending(), value: data.stats.rsvps.yes, accent: true },
  ]);
</script>

<svelte:head>
  <title>{m.account_nav_dashboard()} — vite.in</title>
</svelte:head>

<section class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-display text-3xl font-bold tracking-tighter sm:text-4xl">
      {m.dashboard_title()}
    </h1>
    <Button href="/create" variant="accent" size="sm">
      {m.dashboard_new_event()}
      <ArrowRight size={12} />
    </Button>
  </div>

  {#if showStats}
    <div>
      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {#each stats as s (s.label)}
          <div
            class="rounded-card border p-4 {s.accent
              ? 'border-transparent bg-accent text-accent-ink'
              : 'border-rule bg-card'}"
          >
            <dt
              class="font-mono text-[10px] tracking-[0.1em] uppercase {s.accent
                ? 'text-accent-ink/70'
                : 'text-ink-muted'}"
            >
              {s.label}
            </dt>
            <dd class="font-display mt-1 text-3xl font-bold tracking-tighter tabular-nums">
              {s.value}
            </dd>
          </div>
        {/each}
      </dl>
      {#if data.stats.rsvps.total > 0}
        <p class="mt-2 font-mono text-[11px] text-ink-muted">
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

  {#if data.upcoming.length === 0 && data.past.length === 0}
    <div class="rounded-card border border-rule bg-paper-2/50 p-6">
      <p class="text-sm text-ink-muted">
        {m.dashboard_empty_line()}
        <a href="/create" class="font-medium text-ink underline">{m.dashboard_empty_create()}</a
        >{m.dashboard_empty_or_claim()}
      </p>
    </div>
  {/if}

  {#if data.upcoming.length > 0}
    <div>
      <h2 class="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
        {m.dashboard_upcoming_heading()}
      </h2>
      <ul class="mt-3 overflow-hidden rounded-card border border-rule">
        {#each data.upcoming as ev, i (ev.id)}
          <li
            class="flex items-center justify-between gap-3 bg-card p-4 {i > 0
              ? 'border-t border-rule'
              : ''}"
          >
            <div class="min-w-0">
              <a
                href="/e/{ev.slug}/manage"
                class="font-display font-bold tracking-tight hover:text-coral"
              >
                {ev.title}
              </a>
              <p class="mt-0.5 truncate font-mono text-[11px] text-ink-muted">
                {formatStart(ev.startsAt, ev.timezone)}
                {#if ev.locationText}· {ev.locationText}{/if}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full border border-rule px-2.5 py-1 font-mono text-[10px] tracking-wide text-ink-muted"
            >
              {ev.visibility}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if data.past.length > 0}
    <div>
      <h2 class="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
        {m.dashboard_archive_heading()}
      </h2>
      <ul class="mt-3 overflow-hidden rounded-card border border-rule opacity-70">
        {#each data.past as ev, i (ev.id)}
          <li
            class="flex items-center justify-between gap-3 bg-card p-4 {i > 0
              ? 'border-t border-rule'
              : ''}"
          >
            <div class="min-w-0">
              <a
                href="/e/{ev.slug}/manage"
                class="font-display font-bold tracking-tight hover:text-coral"
              >
                {ev.title}
              </a>
              <p class="mt-0.5 truncate font-mono text-[11px] text-ink-muted">
                {formatStart(ev.startsAt, ev.timezone)}
                {#if ev.locationText}· {ev.locationText}{/if}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full border border-rule px-2.5 py-1 font-mono text-[10px] tracking-wide text-ink-muted"
            >
              {ev.visibility}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <form method="POST" action="?/claim" use:enhance>
    <Button type="submit" variant="secondary" size="sm">{m.dashboard_claim_submit()}</Button>
  </form>
</section>
