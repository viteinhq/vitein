<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  function formatStart(iso: string, tz: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    }).format(new Date(iso));
  }
</script>

<svelte:head>
  <title>Dashboard — vite.in</title>
</svelte:head>

<section class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold tracking-tight">Your events</h1>
    <a
      href="/create"
      class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
    >
      New event
    </a>
  </div>

  {#if data.events.length === 0}
    <p class="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No events yet. <a href="/create" class="underline">Create one</a>.
    </p>
  {:else}
    <ul class="divide-y divide-slate-200 rounded-md border border-slate-200">
      {#each data.events as ev (ev.id)}
        <li class="flex items-center justify-between p-4">
          <div>
            <a href="/e/{ev.slug}" class="font-medium underline">{ev.title}</a>
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
  {/if}
</section>
