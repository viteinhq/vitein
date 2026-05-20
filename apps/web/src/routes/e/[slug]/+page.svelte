<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { ArrowRight, Banner, Button, Eyebrow, TextField } from '$lib/design';
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

  function changeAnswer() {
    resetForm = true;
  }

  const showConfirmation = $derived(form?.rsvpSuccess && !resetForm);

  const isLocked = $derived(Boolean(data.event.locked));
  let pwdSubmitting = $state(false);

  const kvLabel = 'font-mono text-[10px] tracking-[0.12em] uppercase opacity-60';
  const kvValue = 'mt-1 font-display text-xl font-bold tracking-tight leading-tight';
</script>

<svelte:head>
  <title>{data.event.title} — vite.in</title>
  <meta name="description" content={data.event.description ?? data.event.title} />
</svelte:head>

<section class="mx-auto max-w-2xl px-6 py-10">
  {#if isLocked}
    <div class="rounded-card border border-rule bg-card p-7">
      <Eyebrow num="✦" label="vite.in" />
      <h1 class="font-display mt-4 text-3xl font-bold tracking-tighter">
        {m.event_locked_heading()}
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-ink-muted">{m.event_locked_body()}</p>

      {#if form && 'pwdError' in form && form.pwdError}
        <div class="mt-4"><Banner tone="error">{localizeError(form.pwdError)}</Banner></div>
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
        class="mt-5 space-y-3"
      >
        <TextField
          type="password"
          name="password"
          required
          autocomplete="current-password"
          label={m.event_locked_password_label()}
        />
        <Button type="submit" variant="accent" disabled={pwdSubmitting}>
          {pwdSubmitting ? m.event_locked_submitting() : m.event_locked_submit()}
        </Button>
      </form>
    </div>
  {:else}
    {#if data.cover?.url}
      <img
        src={data.cover.url}
        alt=""
        width="1200"
        height="630"
        class="mb-6 h-56 w-full rounded-card object-cover sm:h-72"
      />
    {/if}

    <!-- invitation hero -->
    <div class="rounded-card bg-accent p-7 text-accent-ink sm:p-10">
      <span class="font-mono text-[10px] tracking-[0.18em] uppercase opacity-70">
        {m.invite_eyebrow()}
      </span>
      <h1
        class="font-display mt-4 text-5xl leading-[0.92] font-bold tracking-tighter text-balance sm:text-6xl"
      >
        {data.event.title}
      </h1>

      <dl class="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <dt class={kvLabel}>{m.event_when_label()}</dt>
          <dd class={kvValue}>
            <time datetime={data.event.startsAt}>{startsInEventTz}</time>
            {#if endsInEventTz}
              <span class="opacity-60"> {m.event_until()} </span>
              <time datetime={data.event.endsAt}>{endsInEventTz}</time>
            {/if}
          </dd>
          <dd class="mt-1 font-mono text-[11px] opacity-55">{data.event.timezone}</dd>
          {#if showLocalTime}
            <dd class="mt-0.5 font-mono text-[11px] opacity-55">
              {m.event_your_local_time()}
              {startsInViewerTz}
            </dd>
          {/if}
        </div>

        {#if data.event.locationText}
          <div>
            <dt class={kvLabel}>{m.event_where_label()}</dt>
            <dd class={kvValue}>{data.event.locationText}</dd>
          </div>
        {/if}
      </dl>
    </div>

    {#if data.event.description}
      <p class="mt-6 text-base leading-relaxed whitespace-pre-line text-ink">
        {data.event.description}
      </p>
    {/if}

    <div class="mt-6 flex flex-wrap gap-2">
      <Button onclick={shareNative} variant="secondary" size="sm">{m.event_share()}</Button>
      <Button onclick={copyLink} variant="secondary" size="sm">
        {copied ? m.event_copied() : m.event_copy_link()}
      </Button>
      <Button href="/e/{data.event.slug}/event.ics" variant="secondary" size="sm">
        {m.event_add_to_calendar()}
      </Button>
    </div>

    {#if data.gallery.length > 0}
      <section class="mt-8">
        <span class="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
          {m.event_gallery_heading()}
        </span>
        <ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {#each data.gallery as g (g.id)}
            {#if g.url}
              <li>
                <img
                  src={g.url}
                  alt=""
                  width="400"
                  height="400"
                  class="h-32 w-full rounded-xl object-cover"
                />
              </li>
            {/if}
          {/each}
        </ul>
      </section>
    {/if}

    <!-- RSVP -->
    <div class="mt-8 rounded-card bg-ink p-6 text-paper sm:p-7">
      <span class="font-mono text-[10px] tracking-[0.12em] text-paper/55 uppercase">
        {m.event_rsvp_heading()}
      </span>

      {#if showConfirmation}
        <div class="mt-4 rounded-2xl bg-accent p-5 text-accent-ink">
          {#if form?.rsvpName}
            <p class="font-display text-xl font-bold tracking-tight">
              {m.event_rsvp_thanks_named({ name: form.rsvpName })}
            </p>
          {/if}
          <p class="mt-1 text-sm">
            {#if form?.rsvpStatus === 'yes'}
              {m.event_rsvp_thanks_yes()}
            {:else if form?.rsvpStatus === 'maybe'}
              {m.event_rsvp_thanks_maybe()}
            {:else}
              {m.event_rsvp_thanks_no()}
            {/if}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button href="/e/{data.event.slug}/event.ics" variant="secondary" size="sm">
              {m.event_add_to_calendar()}
            </Button>
            <button
              type="button"
              onclick={changeAnswer}
              class="rounded-full border-[1.5px] border-accent-ink px-3.5 py-2 text-xs font-semibold transition hover:bg-accent-ink hover:text-accent"
            >
              {m.event_rsvp_change()}
            </button>
          </div>
        </div>
      {:else}
        {#if form?.rsvpError}
          <div class="mt-4"><Banner tone="error">{localizeError(form.rsvpError)}</Banner></div>
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
          class="mt-4 space-y-4"
        >
          <fieldset>
            <legend class="text-sm font-semibold text-paper">{m.event_rsvp_question()}</legend>
            <div class="mt-2 grid grid-cols-3 gap-2">
              <label
                class="flex cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-paper/25 px-3 py-3 text-sm font-semibold text-paper transition has-[:checked]:border-transparent has-[:checked]:bg-accent has-[:checked]:text-accent-ink"
              >
                <input type="radio" name="status" value="yes" checked class="sr-only" />
                {m.event_rsvp_yes()}
              </label>
              <label
                class="flex cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-paper/25 px-3 py-3 text-sm font-semibold text-paper transition has-[:checked]:border-transparent has-[:checked]:bg-amber-300 has-[:checked]:text-ink"
              >
                <input type="radio" name="status" value="maybe" class="sr-only" />
                {m.event_rsvp_maybe()}
              </label>
              <label
                class="flex cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-paper/25 px-3 py-3 text-sm font-semibold text-paper transition has-[:checked]:border-transparent has-[:checked]:bg-paper has-[:checked]:text-ink"
              >
                <input type="radio" name="status" value="no" class="sr-only" />
                {m.event_rsvp_no()}
              </label>
            </div>
          </fieldset>

          <label class="block">
            <span class="font-mono text-[10px] tracking-[0.08em] text-paper/55 uppercase">
              {m.event_rsvp_name_label()}
            </span>
            <input
              name="name"
              required
              maxlength="200"
              class="mt-1.5 block w-full rounded-xl border border-paper/20 bg-paper/5 px-4 py-3 text-[15px] text-paper placeholder:text-paper/40 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <label class="block">
            <span class="font-mono text-[10px] tracking-[0.08em] text-paper/55 uppercase">
              {m.event_rsvp_email_optional()}
            </span>
            <input
              type="email"
              name="email"
              class="mt-1.5 block w-full rounded-xl border border-paper/20 bg-paper/5 px-4 py-3 text-[15px] text-paper placeholder:text-paper/40 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <span class="mt-1 block font-mono text-[10px] text-paper/40">
              {m.event_rsvp_email_hint()}
            </span>
          </label>

          <label class="block max-w-[10rem]">
            <span class="font-mono text-[10px] tracking-[0.08em] text-paper/55 uppercase">
              {m.event_rsvp_plus_ones()}
            </span>
            <input
              type="number"
              name="plusOnes"
              min="0"
              max="20"
              value={plusOnesCount}
              oninput={onPlusOnesInput}
              class="mt-1.5 block w-full rounded-xl border border-paper/20 bg-paper/5 px-4 py-3 text-[15px] text-paper focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          {#if plusOnesSlots.length > 0}
            <fieldset class="space-y-2 rounded-xl border border-paper/15 bg-paper/5 p-4">
              <legend class="px-1 font-mono text-[10px] tracking-[0.08em] text-paper/55 uppercase">
                {m.event_rsvp_plus_ones_names_label()}
              </legend>
              <p class="text-xs text-paper/50">{m.event_rsvp_plus_ones_names_hint()}</p>
              {#each plusOnesSlots as i (i)}
                <input
                  name="plusOneName"
                  maxlength="200"
                  placeholder={m.event_rsvp_plus_one_placeholder()}
                  class="block w-full rounded-lg border border-paper/20 bg-paper/5 px-3 py-2 text-sm text-paper placeholder:text-paper/40 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              {/each}
            </fieldset>
          {/if}

          <label class="block">
            <span class="font-mono text-[10px] tracking-[0.08em] text-paper/55 uppercase">
              {m.event_rsvp_message_optional()}
            </span>
            <textarea
              name="message"
              rows="2"
              maxlength="2000"
              class="mt-1.5 block w-full rounded-xl border border-paper/20 bg-paper/5 px-4 py-3 text-[15px] text-paper placeholder:text-paper/40 focus:outline-none focus:ring-2 focus:ring-accent"
            ></textarea>
          </label>

          <Button type="submit" variant="accent" size="lg" disabled={submitting} class="w-full">
            {submitting ? m.event_rsvp_submitting() : m.event_rsvp_submit()}
            {#if !submitting}<ArrowRight size={15} />{/if}
          </Button>
        </form>
      {/if}
    </div>
  {/if}
</section>
