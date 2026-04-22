<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  let copied = $state(false);
  let submitting = $state(false);
  let resetForm = $state(false);
  let plusOnesCount = $state(0);
  const isPlusTier = $derived(data.event.tier === 'plus');
  const plusOnesSlots = $derived(
    isPlusTier
      ? Array.from({ length: Math.max(0, Math.min(20, plusOnesCount)) }, (_, i) => i)
      : [],
  );

  function formatInTz(iso: string, tz: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: tz,
    }).format(new Date(iso));
  }

  const viewerTz = $derived(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  );

  const startsInEventTz = $derived(formatInTz(data.event.startsAt, data.event.timezone));
  const endsInEventTz = $derived(
    data.event.endsAt ? formatInTz(data.event.endsAt, data.event.timezone) : null,
  );
  const showLocalTime = $derived(viewerTz !== data.event.timezone);
  const startsInViewerTz = $derived(showLocalTime ? formatInTz(data.event.startsAt, viewerTz) : '');

  const shareUrl = $derived(page.url.href);

  async function copyLink() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  async function shareNative() {
    if (typeof navigator === 'undefined' || !('share' in navigator)) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: data.event.title, url: shareUrl });
    } catch {
      /* user cancelled */
    }
  }

  // Show the form again after the user clicks "Change my answer".
  function changeAnswer() {
    resetForm = true;
  }

  const showConfirmation = $derived(form?.rsvpSuccess && !resetForm);
</script>

<svelte:head>
  <title>{data.event.title} — vite.in</title>
  <meta name="description" content={data.event.description ?? data.event.title} />
</svelte:head>

<section class="mx-auto max-w-2xl space-y-8">
  <article class="space-y-5">
    {#if data.cover?.url}
      <img
        src={data.cover.url}
        alt=""
        width="1200"
        height="630"
        class="h-56 w-full rounded-lg object-cover sm:h-72"
      />
    {/if}

    <h1 class="text-balance text-4xl font-bold tracking-tight">{data.event.title}</h1>

    <dl class="space-y-3 text-slate-700">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {m.event_when_label()}
        </dt>
        <dd class="mt-1">
          <time datetime={data.event.startsAt}>{startsInEventTz}</time>
          {#if endsInEventTz}
            <span class="text-slate-500">{m.event_until()}</span>
            <time datetime={data.event.endsAt}>{endsInEventTz}</time>
          {/if}
          <span class="text-sm text-slate-500"> · {data.event.timezone}</span>
        </dd>
        {#if showLocalTime}
          <dd class="mt-1 text-sm text-slate-500">
            {m.event_your_local_time()} {startsInViewerTz}
          </dd>
        {/if}
      </div>

      {#if data.event.locationText}
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {m.event_where_label()}
          </dt>
          <dd class="mt-1">{data.event.locationText}</dd>
        </div>
      {/if}
    </dl>

    {#if data.event.description}
      <p class="whitespace-pre-line text-slate-800">{data.event.description}</p>
    {/if}

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        onclick={shareNative}
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        {m.event_share()}
      </button>
      <button
        type="button"
        onclick={copyLink}
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        {copied ? m.event_copied() : m.event_copy_link()}
      </button>
      <a
        href="/e/{data.event.slug}/event.ics"
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        {m.event_add_to_calendar()}
      </a>
    </div>
  </article>

  {#if data.gallery.length > 0}
    <section class="space-y-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {m.event_gallery_heading()}
      </h2>
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {#each data.gallery as g (g.id)}
          {#if g.url}
            <li>
              <img
                src={g.url}
                alt=""
                width="400"
                height="400"
                class="h-32 w-full rounded-md object-cover"
              />
            </li>
          {/if}
        {/each}
      </ul>
    </section>
  {/if}

  <section class="space-y-4 rounded-lg border border-slate-200 p-6">
    <h2 class="text-xl font-semibold">{m.event_rsvp_heading()}</h2>

    {#if showConfirmation}
      <div class="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
        {#if form?.rsvpName}
          <p class="font-medium">{m.event_rsvp_thanks_named({ name: form.rsvpName })}</p>
        {/if}
        <p class="text-sm">
          {#if form?.rsvpStatus === 'yes'}
            {m.event_rsvp_thanks_yes()}
          {:else if form?.rsvpStatus === 'maybe'}
            {m.event_rsvp_thanks_maybe()}
          {:else}
            {m.event_rsvp_thanks_no()}
          {/if}
        </p>
        <div class="flex flex-wrap gap-2 pt-1">
          <a
            href="/e/{data.event.slug}/event.ics"
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {m.event_add_to_calendar()}
          </a>
          <button
            type="button"
            onclick={changeAnswer}
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {m.event_rsvp_change()}
          </button>
        </div>
      </div>
    {:else}
      {#if form?.rsvpError}
        <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localizeError(form.rsvpError)}
        </p>
      {/if}

      <form
        method="POST"
        action="?/rsvp"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => {
            await update();
            submitting = false;
            resetForm = false;
          };
        }}
        class="space-y-4"
      >
        <fieldset>
          <legend class="text-sm font-medium">{m.event_rsvp_question()}</legend>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <label
              class="flex cursor-pointer items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-900"
            >
              <input type="radio" name="status" value="yes" checked class="sr-only" />
              {m.event_rsvp_yes()}
            </label>
            <label
              class="flex cursor-pointer items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:text-amber-900"
            >
              <input type="radio" name="status" value="maybe" class="sr-only" />
              {m.event_rsvp_maybe()}
            </label>
            <label
              class="flex cursor-pointer items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50 has-[:checked]:text-rose-900"
            >
              <input type="radio" name="status" value="no" class="sr-only" />
              {m.event_rsvp_no()}
            </label>
          </div>
        </fieldset>

        <label class="block">
          <span class="text-sm font-medium">{m.event_rsvp_name_label()}</span>
          <input
            name="name"
            required
            maxlength="200"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium">{m.event_rsvp_email_optional()}</span>
          <input
            type="email"
            name="email"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <span class="mt-1 block text-xs text-slate-500">{m.event_rsvp_email_hint()}</span>
        </label>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label class="block sm:col-span-1">
            <span class="text-sm font-medium">{m.event_rsvp_plus_ones()}</span>
            <input
              type="number"
              name="plusOnes"
              min="0"
              max="20"
              bind:value={plusOnesCount}
              class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        {#if plusOnesSlots.length > 0}
          <fieldset class="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <legend class="px-1 text-sm font-medium">
              {m.event_rsvp_plus_ones_names_label()}
            </legend>
            <p class="text-xs text-slate-500">{m.event_rsvp_plus_ones_names_hint()}</p>
            {#each plusOnesSlots as i (i)}
              <input
                name="plusOneName"
                maxlength="200"
                placeholder={m.event_rsvp_plus_one_placeholder()}
                class="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            {/each}
          </fieldset>
        {/if}

        <label class="block">
          <span class="text-sm font-medium">{m.event_rsvp_message_optional()}</span>
          <textarea
            name="message"
            rows="2"
            maxlength="2000"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          ></textarea>
        </label>

        <button
          type="submit"
          disabled={submitting}
          class="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? m.event_rsvp_submitting() : m.event_rsvp_submit()}
        </button>
      </form>
    {/if}
  </section>
</section>
