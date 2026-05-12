<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { Banner, Button, Card, TextField } from '$lib/design';
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
  function onPlusOnesInput(e: Event) {
    const raw = Number((e.target as HTMLInputElement).value);
    plusOnesCount = Number.isFinite(raw) ? Math.max(0, Math.min(20, raw)) : 0;
  }

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

  // `locked` is the dynamic flag: true when the event has a password AND
  // the current caller has no valid view token. `hasPassword` stays true
  // even after unlocking, so we branch on `locked` for the UI.
  const isLocked = $derived(Boolean(data.event.locked));
  let pwdSubmitting = $state(false);
</script>

<svelte:head>
  <title>{data.event.title} — vite.in</title>
  <meta name="description" content={data.event.description ?? data.event.title} />
</svelte:head>

<section class="mx-auto max-w-2xl space-y-8">
  {#if isLocked}
    <Card class="!p-6">
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">{m.event_locked_heading()}</h1>
        <p class="text-sm text-slate-600">{m.event_locked_body()}</p>

        {#if form && 'pwdError' in form && form.pwdError}
          <Banner tone="error">{localizeError(form.pwdError)}</Banner>
        {/if}

        <form
          method="POST"
          action="?/verifyPassword"
          use:enhance={() => {
            pwdSubmitting = true;
            return async ({ update }) => {
              await update();
              pwdSubmitting = false;
            };
          }}
          class="space-y-3"
        >
          <TextField
            type="password"
            name="password"
            required
            autocomplete="current-password"
            label={m.event_locked_password_label()}
          />
          <Button type="submit" disabled={pwdSubmitting}>
            {pwdSubmitting ? m.event_locked_submitting() : m.event_locked_submit()}
          </Button>
        </form>
      </div>
    </Card>
  {:else}
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
              {m.event_your_local_time()}
              {startsInViewerTz}
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
        <Button onclick={shareNative} variant="secondary" size="sm">{m.event_share()}</Button>
        <Button onclick={copyLink} variant="secondary" size="sm">
          {copied ? m.event_copied() : m.event_copy_link()}
        </Button>
        <Button href="/e/{data.event.slug}/event.ics" variant="secondary" size="sm">
          {m.event_add_to_calendar()}
        </Button>
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

    <Card class="!p-6">
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">{m.event_rsvp_heading()}</h2>

        {#if showConfirmation}
          <Card tone="success" class="!p-4">
            <div class="space-y-3">
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
                <Button href="/e/{data.event.slug}/event.ics" variant="secondary" size="sm">
                  {m.event_add_to_calendar()}
                </Button>
                <Button onclick={changeAnswer} variant="secondary" size="sm">
                  {m.event_rsvp_change()}
                </Button>
              </div>
            </div>
          </Card>
        {:else}
          {#if form?.rsvpError}
            <Banner tone="error">{localizeError(form.rsvpError)}</Banner>
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

            <TextField
              name="name"
              required
              maxlength={200}
              label={m.event_rsvp_name_label()}
            />

            <TextField
              type="email"
              name="email"
              label={m.event_rsvp_email_optional()}
              hint={m.event_rsvp_email_hint()}
            />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label class="block sm:col-span-1">
                <span class="text-sm font-medium">{m.event_rsvp_plus_ones()}</span>
                <input
                  type="number"
                  name="plusOnes"
                  min="0"
                  max="20"
                  value={plusOnesCount}
                  oninput={onPlusOnesInput}
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

            <Button type="submit" disabled={submitting}>
              {submitting ? m.event_rsvp_submitting() : m.event_rsvp_submit()}
            </Button>
          </form>
        {/if}
      </div>
    </Card>
  {/if}
</section>
