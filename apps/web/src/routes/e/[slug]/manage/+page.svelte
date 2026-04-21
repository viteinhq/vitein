<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  const startsAtForInput = $derived(toLocalInputValue(data.event.startsAt));

  function toLocalInputValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const rsvpCounts = $derived.by(() => {
    const counts = { yes: 0, maybe: 0, no: 0, plusOnes: 0 };
    for (const r of data.rsvps) {
      counts[r.status] += 1;
      counts.plusOnes += r.plusOnes ?? 0;
    }
    return counts;
  });
</script>

<svelte:head>
  <title>Manage: {data.event.title}</title>
</svelte:head>

<section class="mx-auto max-w-3xl space-y-8">
  <header class="space-y-1">
    <p class="text-sm text-slate-500">Managing</p>
    <h1 class="text-3xl font-bold tracking-tight">{data.event.title}</h1>
    <p class="text-sm text-slate-500">
      Public link: <a class="underline" href="/e/{data.event.slug}">/e/{data.event.slug}</a>
    </p>
  </header>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">Media</h2>
    <p class="mt-1 text-sm text-slate-600">Up to 10 images, 10 MiB each.</p>

    {#if form?.mediaError}
      <p class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {form.mediaError}
      </p>
    {/if}
    {#if form?.mediaUploaded}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        Uploaded.
      </p>
    {/if}
    {#if form?.mediaDeleted}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        Deleted.
      </p>
    {/if}

    {#if data.media.length > 0}
      <ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {#each data.media as m (m.id)}
          <li class="space-y-2">
            {#if m.url}
              <img
                src={m.url}
                alt=""
                width="200"
                height="200"
                class="h-32 w-full rounded-md object-cover"
              />
            {:else}
              <div
                class="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400"
              >
                (no public URL)
              </div>
            {/if}
            <form method="POST" action="?/deleteMedia&token={data.token}" use:enhance>
              <input type="hidden" name="mediaId" value={m.id} />
              <button
                type="submit"
                class="w-full rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
              >
                Remove
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}

    <form
      method="POST"
      action="?/uploadMedia&token={data.token}"
      enctype="multipart/form-data"
      use:enhance
      class="mt-4 flex items-center gap-3"
    >
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        required
        class="block w-full text-sm"
      />
      <button
        type="submit"
        class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Upload
      </button>
    </form>
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">RSVPs</h2>
    <p class="mt-1 text-sm text-slate-600">
      {rsvpCounts.yes} yes · {rsvpCounts.maybe} maybe · {rsvpCounts.no} no · {rsvpCounts.plusOnes} plus-ones
    </p>

    {#if data.rsvps.length === 0}
      <p class="mt-3 text-sm text-slate-500">No RSVPs yet.</p>
    {:else}
      <ul class="mt-3 divide-y divide-slate-200">
        {#each data.rsvps as r (r.id)}
          <li class="py-2 text-sm">
            <span class="font-medium">{r.name}</span>
            <span class="text-slate-500">— {r.status}{r.plusOnes ? ` (+${r.plusOnes})` : ''}</span>
            {#if r.message}
              <p class="mt-1 text-slate-600">{r.message}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">Edit details</h2>

    {#if form?.updateSuccess}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        Saved.
      </p>
    {/if}
    {#if form?.updateError}
      <p class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {form.updateError}
      </p>
    {/if}

    <form method="POST" action="?/update&token={data.token}" use:enhance class="mt-4 space-y-3">
      <label class="block">
        <span class="text-sm font-medium">Title</span>
        <input
          name="title"
          value={data.event.title}
          maxlength="200"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <label class="block">
        <span class="text-sm font-medium">Description</span>
        <textarea
          name="description"
          rows="3"
          maxlength="5000"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          >{data.event.description ?? ''}</textarea
        >
      </label>

      <label class="block">
        <span class="text-sm font-medium">Starts at</span>
        <input
          type="datetime-local"
          name="startsAt"
          value={startsAtForInput}
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <label class="block">
        <span class="text-sm font-medium">Location</span>
        <input
          name="locationText"
          value={data.event.locationText ?? ''}
          maxlength="500"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        class="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
      >
        Save changes
      </button>
    </form>
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">Send reminder</h2>
    <p class="mt-1 text-sm text-slate-600">
      Queues an email reminder to the creator address. Sent by the next cron run.
    </p>

    {#if form?.reminderQueued}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        Reminder queued.
      </p>
    {/if}
    {#if form?.reminderError}
      <p class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {form.reminderError}
      </p>
    {/if}

    <form method="POST" action="?/remind&token={data.token}" use:enhance class="mt-3">
      <button
        type="submit"
        class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
      >
        Queue reminder now
      </button>
    </form>
  </section>
</section>
