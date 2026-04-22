<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();

  let submitting = $state(false);
  let copied = $state(false);

  const defaultTimezone = $derived(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  );

  // Intl.supportedValuesOf lands widely (iOS 15.4+, Chrome 99+, FF 93+).
  // Fall back to a short hand-picked list if absent — the freetext input
  // still accepts anything the API will parse.
  const timezoneOptions = $derived.by<string[]>(() => {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      try {
        return (
          Intl as unknown as { supportedValuesOf: (k: string) => string[] }
        ).supportedValuesOf('timeZone');
      } catch {
        /* fall through */
      }
    }
    return ['UTC', 'Europe/Zurich', 'Europe/Berlin', 'Europe/London', 'America/New_York'];
  });

  const shareUrl = $derived(form?.success ? `${page.url.origin}/e/${form.slug}` : '');

  async function copyShare() {
    if (typeof navigator === 'undefined' || !navigator.clipboard || !shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<svelte:head>
  <title>{m.create_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-xl space-y-8">
  {#if form?.success}
    <div class="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <h1 class="text-2xl font-semibold tracking-tight">{m.create_success_heading()}</h1>

      {#if form.title}
        <p class="text-sm font-medium text-slate-700">{form.title}</p>
      {/if}

      <div class="space-y-2">
        <p class="text-xs font-medium text-slate-600">{m.create_success_share_label()}</p>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readonly
            value={shareUrl}
            class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800"
            onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
          />
          <button
            type="button"
            onclick={copyShare}
            class="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {copied ? m.create_success_copied() : m.create_success_copy()}
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 text-sm">
        <a
          href="/e/{form.slug}"
          class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
        >
          {m.create_success_open()}
        </a>
      </div>

      {#if form.magicLinkSent}
        <p class="text-sm text-slate-700">{m.create_success_magic_sent()}</p>
      {:else if form.creatorTokenPreview}
        <p class="text-sm text-slate-700">
          {m.create_success_dev_mode()}
          <a class="underline" href="/e/{form.slug}/manage?token={form.creatorTokenPreview}">
            /e/{form.slug}/manage
          </a>
        </p>
      {/if}
    </div>
  {:else}
    <header class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">{m.create_title()}</h1>
      <p class="text-sm text-slate-600">{m.create_subtitle()}</p>
    </header>

    <datalist id="tz-list">
      {#each timezoneOptions as tz (tz)}
        <option value={tz}></option>
      {/each}
    </datalist>

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update();
          submitting = false;
        };
      }}
      class="space-y-8"
    >
      {#if form?.error}
        <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localizeError(form.error)}
        </p>
      {/if}

      <fieldset class="space-y-4">
        <legend class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {m.create_section_basics()}
        </legend>

        <label class="block">
          <span class="text-sm font-medium">{m.create_field_title()}</span>
          <input
            name="title"
            required
            maxlength="200"
            value={form?.values?.title ?? ''}
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium">{m.create_field_description()}</span>
          <textarea
            name="description"
            maxlength="5000"
            rows="3"
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >{form?.values?.description ?? ''}</textarea
          >
          <span class="mt-1 block text-xs text-slate-500">{m.create_field_description_hint()}</span>
        </label>
      </fieldset>

      <fieldset class="space-y-4">
        <legend class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {m.create_section_when()}
        </legend>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="text-sm font-medium">{m.create_field_starts_at()}</span>
            <input
              type="datetime-local"
              name="startsAt"
              required
              value={form?.values?.startsAt ?? ''}
              class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label class="block">
            <span class="text-sm font-medium">{m.create_field_ends_at_optional()}</span>
            <input
              type="datetime-local"
              name="endsAt"
              value={form?.values?.endsAt ?? ''}
              class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <label class="block">
          <span class="text-sm font-medium">{m.create_field_timezone()}</span>
          <input
            name="timezone"
            list="tz-list"
            required
            autocomplete="off"
            value={form?.values?.timezone ?? defaultTimezone}
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <span class="mt-1 block text-xs text-slate-500">{m.create_field_timezone_hint()}</span>
        </label>
      </fieldset>

      <fieldset class="space-y-4">
        <legend class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {m.create_section_where()}
        </legend>

        <label class="block">
          <span class="text-sm font-medium">{m.create_field_location_optional()}</span>
          <input
            name="locationText"
            maxlength="500"
            value={form?.values?.locationText ?? ''}
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </fieldset>

      <fieldset class="space-y-3">
        <legend class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {m.create_section_visibility()}
        </legend>

        <label class="flex items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
          <input
            type="radio"
            name="visibility"
            value="link_only"
            checked={(form?.values?.visibility ?? 'link_only') === 'link_only'}
            class="mt-1"
          />
          <span>
            <span class="block text-sm font-medium">{m.create_visibility_link_only()}</span>
            <span class="block text-xs text-slate-500">
              {m.create_visibility_link_only_hint()}
            </span>
          </span>
        </label>

        <label class="flex items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
          <input
            type="radio"
            name="visibility"
            value="public"
            checked={form?.values?.visibility === 'public'}
            class="mt-1"
          />
          <span>
            <span class="block text-sm font-medium">{m.create_visibility_public()}</span>
            <span class="block text-xs text-slate-500">{m.create_visibility_public_hint()}</span>
          </span>
        </label>
      </fieldset>

      <fieldset class="space-y-4">
        <legend class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {m.create_section_contact()}
        </legend>

        <label class="block">
          <span class="text-sm font-medium">{m.create_field_email()}</span>
          <input
            type="email"
            name="creatorEmail"
            required
            value={form?.values?.creatorEmail ?? ''}
            class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <span class="mt-1 block text-xs text-slate-500">{m.create_field_email_hint()}</span>
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        class="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? m.create_submitting() : m.create_submit()}
      </button>
    </form>
  {/if}
</section>
