<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  let copied = $state(false);
  async function copyLink() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const startsAtFormatted = $derived(
    new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: data.event.timezone,
    }).format(new Date(data.event.startsAt)),
  );
</script>

<svelte:head>
  <title>{data.event.title} — vite.in</title>
  <meta name="description" content={data.event.description ?? data.event.title} />
</svelte:head>

<section class="mx-auto max-w-2xl space-y-8">
  <article class="space-y-4">
    {#if data.cover?.url}
      <img
        src={data.cover.url}
        alt=""
        width="1200"
        height="630"
        class="h-56 w-full rounded-lg object-cover sm:h-72"
      />
    {/if}

    <h1 class="text-4xl font-bold tracking-tight">{data.event.title}</h1>

    <div class="space-y-1 text-slate-700">
      <p><span class="text-slate-500">When:</span> {startsAtFormatted} ({data.event.timezone})</p>
      {#if data.event.locationText}
        <p><span class="text-slate-500">Where:</span> {data.event.locationText}</p>
      {/if}
    </div>

    {#if data.event.description}
      <p class="whitespace-pre-line text-slate-800">{data.event.description}</p>
    {/if}

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        onclick={copyLink}
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <a
        href="/e/{data.event.slug}/event.ics"
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Add to calendar
      </a>
    </div>
  </article>

  <section class="space-y-4 rounded-lg border border-slate-200 p-6">
    <h2 class="text-xl font-semibold">Your RSVP</h2>

    {#if form?.rsvpSuccess}
      <p class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        Thanks! Your RSVP was recorded as <strong>{form.rsvpStatus}</strong>.
      </p>
    {:else}
      {#if form?.rsvpError}
        <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {form.rsvpError}
        </p>
      {/if}

      <form method="POST" action="?/rsvp" use:enhance class="space-y-3">
        <label class="block">
          <span class="text-sm font-medium">Name</span>
          <input
            name="name"
            required
            maxlength="200"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium">Email (optional)</span>
          <input
            type="email"
            name="email"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <fieldset>
          <legend class="text-sm font-medium">Are you coming?</legend>
          <div class="mt-2 flex gap-4 text-sm">
            <label><input type="radio" name="status" value="yes" checked /> Yes</label>
            <label><input type="radio" name="status" value="maybe" /> Maybe</label>
            <label><input type="radio" name="status" value="no" /> No</label>
          </div>
        </fieldset>

        <label class="block">
          <span class="text-sm font-medium">Plus ones</span>
          <input
            type="number"
            name="plusOnes"
            min="0"
            max="20"
            value="0"
            class="mt-1 block w-24 rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium">Message (optional)</span>
          <textarea
            name="message"
            rows="2"
            maxlength="2000"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          ></textarea>
        </label>

        <button
          type="submit"
          class="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          Submit RSVP
        </button>
      </form>
    {/if}
  </section>
</section>
