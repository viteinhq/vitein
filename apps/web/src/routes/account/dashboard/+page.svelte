<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

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

  {#if form && 'claimed' in form && typeof form.claimed === 'number'}
    <p class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
      {#if form.claimed > 0}
        Claimed {form.claimed} event{form.claimed === 1 ? '' : 's'} to your account. Reload to see them.
      {:else}
        No anonymously-created events matched your email.
      {/if}
    </p>
  {/if}
  {#if form && 'claimError' in form}
    <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <p>{form.claimError}</p>
      {#if 'claimDetails' in form && form.claimDetails}
        <pre class="mt-1 overflow-x-auto text-xs">{form.claimDetails}</pre>
      {/if}
    </div>
  {/if}

  <form method="POST" action="?/claim" use:enhance>
    <button
      type="submit"
      class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
    >
      Claim events created with my email
    </button>
  </form>

  {#if data.events.length === 0}
    <p class="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No events yet. <a href="/create" class="underline">Create one</a>, or claim events you
      created anonymously with the same email.
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
