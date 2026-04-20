<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();

  const defaultTimezone = $derived(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  );
</script>

<svelte:head>
  <title>Create an event — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-xl space-y-6">
  <h1 class="text-3xl font-bold tracking-tight">Create an event</h1>

  {#if form?.success}
    <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <p class="font-medium">Event created.</p>
      <p class="mt-1 text-sm">
        Public link: <a class="underline" href="/e/{form.slug}">/e/{form.slug}</a>
      </p>
      {#if form.magicLinkSent}
        <p class="mt-2 text-sm">
          A magic link to manage this event has been sent to your email.
        </p>
      {:else if form.creatorTokenPreview}
        <p class="mt-2 text-sm">
          Email delivery is disabled in this environment. Manage link:
          <a class="underline" href="/e/{form.slug}/manage?token={form.creatorTokenPreview}">
            /e/{form.slug}/manage
          </a>
        </p>
      {/if}
    </div>
  {:else}
    <form method="POST" use:enhance class="space-y-4">
      {#if form?.error}
        <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {form.error}
        </p>
      {/if}

      <label class="block">
        <span class="text-sm font-medium">Title</span>
        <input
          name="title"
          required
          maxlength="200"
          value={form?.values?.title ?? ''}
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <label class="block">
        <span class="text-sm font-medium">Description</span>
        <textarea
          name="description"
          maxlength="5000"
          rows="3"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          >{form?.values?.description ?? ''}</textarea
        >
      </label>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="text-sm font-medium">Starts at</span>
          <input
            type="datetime-local"
            name="startsAt"
            required
            value={form?.values?.startsAt ?? ''}
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium">Timezone</span>
          <input
            name="timezone"
            required
            value={form?.values?.timezone ?? defaultTimezone}
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <label class="block">
        <span class="text-sm font-medium">Location (optional)</span>
        <input
          name="locationText"
          maxlength="500"
          value={form?.values?.locationText ?? ''}
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <label class="block">
        <span class="text-sm font-medium">Your email</span>
        <input
          type="email"
          name="creatorEmail"
          required
          value={form?.values?.creatorEmail ?? ''}
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <span class="mt-1 block text-xs text-slate-500">
          We'll send the management magic link here. No account needed.
        </span>
      </label>

      <button
        type="submit"
        class="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
      >
        Create event
      </button>
    </form>
  {/if}
</section>
