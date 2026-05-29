<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { addHoursToWall } from '$lib/datetime';
  import {
    ArrowRight,
    Banner,
    Button,
    DesignPreview,
    Eyebrow,
    LocationField,
    PresetPicker,
    ShareSheet,
    TextField,
    TimezonePicker,
  } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { form, data }: PageProps = $props();

  let submitting = $state(false);
  // The three orthogonal design axes (ADR 0011 + 2026-05-26 expansion) —
  // each bound to its own picker and reflected together in the live
  // preview. A preset Quick-start can set all three at once.
  let themeId = $state('volt');
  let layout = $state('standard');
  let fontPairing = $state('bricolage-geist');
  let shareInput = $state<HTMLInputElement | null>(null);
  // Timezone is detected and hidden by default — most creators never need
  // to touch it; this reveals the picker on demand.
  let showTimezone = $state(false);

  const defaultTimezone = $derived(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  );

  // A sensible default so an empty `datetime-local` never defaults the
  // time to "now": the next Saturday at 19:00. Picking another day in the
  // calendar keeps the time, because the field is no longer empty.
  const defaultStartsAt = (() => {
    const now = new Date();
    const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
    // Constructor-built (not mutated), so the date math stays side-effect-free.
    const sat = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSat, 19, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${sat.getFullYear()}-${pad(sat.getMonth() + 1)}-${pad(sat.getDate())}T19:00`;
  })();

  // Writable `$derived` — seeded from `form.values` (so a failed submit
  // re-populates every field) yet freely reassignable as the user types.
  // The user's edits hold until `form` changes again. Drives both the
  // form submit and the live invitation preview.
  let titleValue = $derived(String(form?.values?.title ?? ''));
  let descriptionValue = $derived(String(form?.values?.description ?? ''));
  let locationValue = $derived(String(form?.values?.locationText ?? ''));
  let startsAtValue = $derived(String(form?.values?.startsAt ?? defaultStartsAt));
  let endsAtValue = $derived(String(form?.values?.endsAt ?? ''));
  let timezoneValue = $derived(String(form?.values?.timezone ?? defaultTimezone));
  // Signed-in users get their session email as the default; a failed
  // submit's value still wins (so an in-flight correction isn't lost).
  let creatorEmailValue = $derived(
    String(form?.values?.creatorEmail ?? data?.sessionEmail ?? ''),
  );

  // End time is optional, so it starts empty. When the creator first
  // focuses the field, suggest a 2-hour event — same day, start + 2h — so
  // the native picker opens at the start date instead of today.
  function suggestEndsAt() {
    if (!endsAtValue) endsAtValue = addHoursToWall(startsAtValue, 2);
  }

  function formatPreviewDate(v: string): string {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  }

  const previewDate = $derived(formatPreviewDate(startsAtValue));

  const shareUrl = $derived(form?.success ? `${page.url.origin}/e/${form.slug}` : '');

  function selectShareUrl() {
    shareInput?.select();
  }

  const legendClass = 'font-mono text-[10px] font-medium tracking-[0.12em] text-ink-muted uppercase';
  const textareaClass =
    'mt-1.5 block w-full rounded-xl border border-rule bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-accent';
</script>

<svelte:head>
  <title>{m.create_title()} — vite.in</title>
</svelte:head>

{#if form?.success}
  <!-- ─── Created — share state ──────────────────────────── -->
  <section class="mx-auto max-w-xl px-6 py-14">
    <Eyebrow num="✓" label={m.create_success_heading()} />
    <h1
      class="font-display mt-4 text-4xl leading-[0.95] font-bold tracking-tighter sm:text-5xl"
    >
      {m.create_success_heading()}
    </h1>
    {#if form.title}
      <p class="mt-3 text-base text-ink-muted">{form.title}</p>
    {/if}

    <!-- link card -->
    <div class="mt-8 rounded-card bg-ink p-5 text-paper">
      <span class="font-mono text-[10px] tracking-[0.12em] text-paper/50 uppercase">
        {m.create_success_share_label()}
      </span>
      <input
        readonly
        bind:this={shareInput}
        value={shareUrl}
        onclick={selectShareUrl}
        class="mt-2 block w-full bg-transparent font-mono text-[15px] text-paper focus:outline-none"
      />
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <ShareSheet url={shareUrl} title={form.title ?? ''} />
        <a
          href="/e/{form.slug}"
          data-sveltekit-reload
          class="inline-flex items-center gap-2 rounded-full border border-paper/30 px-3.5 py-2 text-xs font-semibold text-paper transition hover:bg-paper hover:text-ink"
        >
          {m.create_success_open()}
          <ArrowRight size={12} />
        </a>
      </div>
    </div>

    {#if form.manageUrl}
      <!-- Manage handoff: surface the link prominently so the creator
           doesn't have to fetch the email just to jump to the manage
           page. The email is still the recovery channel — relabel it
           as such when the magic link was dispatched. -->
      <div class="mt-6 rounded-card border border-rule bg-card p-5">
        <span class="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
          {m.create_success_manage_label()}
        </span>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={form.manageUrl}
            data-sveltekit-reload
            class="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-paper transition hover:opacity-90"
          >
            {m.create_success_manage_open()}
            <ArrowRight size={12} />
          </a>
        </div>
        <p class="mt-3 text-xs leading-relaxed text-ink-muted">
          {#if form.magicLinkSent}
            {m.create_success_manage_email_backup()}
          {:else}
            {m.create_success_dev_mode()}
          {/if}
        </p>
      </div>
    {/if}
  </section>
{:else}
  <!-- ─── Create form ────────────────────────────────────── -->
  <section class="mx-auto max-w-xl px-6 py-14 lg:max-w-4xl">
    <Eyebrow num="01" label={m.nav_create()} />
    <h1
      class="font-display mt-4 text-4xl leading-[0.95] font-bold tracking-tighter sm:text-5xl"
    >
      {m.create_title()}
    </h1>
    <p class="mt-3 text-base leading-relaxed text-ink-muted">{m.create_subtitle()}</p>

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update();
          submitting = false;
        };
      }}
      class="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]"
    >
      <!-- Detail fields. Source order puts them first — on mobile they
           come before the Style section; on desktop the grid splits the
           two columns and the Style column sticks. -->
      <div class="space-y-8">
        {#if form?.error}
          <Banner tone="error">{localizeError(form.error)}</Banner>
        {/if}

        <fieldset class="space-y-4">
          <legend class={legendClass}>{m.create_section_basics()}</legend>

        <TextField
          name="title"
          required
          maxlength={200}
          bind:value={titleValue}
          label={m.create_field_title()}
        />

        <label class="block">
          <span class={legendClass}>{m.create_field_description()}</span>
          <textarea
            name="description"
            maxlength="5000"
            rows="3"
            class={textareaClass}
            bind:value={descriptionValue}
          ></textarea>
          <span class="mt-1 block font-mono text-[10px] tracking-wide text-ink-muted">
            {m.create_field_description_hint()}
          </span>
        </label>
      </fieldset>

      <fieldset class="space-y-4">
        <legend class={legendClass}>{m.create_section_when()}</legend>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            type="datetime-local"
            name="startsAt"
            required
            bind:value={startsAtValue}
            label={m.create_field_starts_at()}
          />
          <TextField
            type="datetime-local"
            name="endsAt"
            bind:value={endsAtValue}
            min={startsAtValue}
            onfocus={suggestEndsAt}
            label={m.create_field_ends_at_optional()}
          />
        </div>

        {#if showTimezone}
          <TimezonePicker
            name="timezone"
            bind:value={timezoneValue}
            label={m.create_field_timezone()}
            hint={m.create_field_timezone_hint()}
            listId="create-tz-list"
          />
        {:else}
          <input type="hidden" name="timezone" value={timezoneValue} />
          <p class="text-xs text-ink-muted">
            {m.create_timezone_note({ timezone: timezoneValue })}
            <button
              type="button"
              class="font-medium text-ink underline underline-offset-2"
              onclick={() => (showTimezone = true)}
            >
              {m.create_timezone_change()}
            </button>
          </p>
        {/if}
      </fieldset>

      <fieldset class="space-y-4">
        <legend class={legendClass}>{m.create_section_where()}</legend>

        <LocationField
          name="locationText"
          maxlength={500}
          bind:value={locationValue}
          label={m.create_field_location_optional()}
        />
      </fieldset>

      <!-- Visibility (link_only vs public) is hidden until a public event
           view exists — every event is link-only for now; the server
           defaults the field. Restore this fieldset with that feature. -->

      <fieldset class="space-y-4">
        <legend class={legendClass}>{m.create_section_contact()}</legend>

        <TextField
          type="email"
          name="creatorEmail"
          required
          value={creatorEmailValue}
          label={m.create_field_email()}
          hint={m.create_field_email_hint()}
        />
      </fieldset>

        <Button type="submit" variant="accent" size="lg" disabled={submitting} class="w-full">
          {submitting ? m.create_submitting() : m.create_submit()}
          {#if !submitting}<ArrowRight size={15} />{/if}
        </Button>
      </div>

      <!-- Style: a compact companion beside the form on desktop, a
           secondary section below the details on mobile. Only the
           live preview + a Quick-start preset row live here — full
           layout / palette / type pickers move to /manage so the
           create page stays a single, fast funnel. The three axes
           ride as hidden inputs so the preset choice (or the
           defaults) reaches the server. -->
      <div class="lg:sticky lg:top-8 lg:self-start">
        <fieldset class="space-y-5">
          <legend class={legendClass}>{m.create_style_label()}</legend>
          <div class="flex justify-center">
            <DesignPreview
              {themeId}
              {layout}
              {fontPairing}
              title={titleValue}
              date={previewDate}
              timezone={timezoneValue}
              location={locationValue}
            />
          </div>
          <div class="space-y-2">
            <span class="block {legendClass}">{m.create_preset_label()}</span>
            <PresetPicker bind:layout bind:themeId bind:fontPairing />
            <p class="font-mono text-[10px] tracking-wide text-ink-muted">
              {m.create_style_polish_hint()}
            </p>
          </div>
          <input type="hidden" name="themeId" value={themeId} />
          <input type="hidden" name="layout" value={layout} />
          <input type="hidden" name="fontPairing" value={fontPairing} />
        </fieldset>
      </div>
    </form>
  </section>
{/if}
