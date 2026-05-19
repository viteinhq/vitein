<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { Banner, Button, Card, TextField, TimezonePicker } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();

  let submitting = $state(false);
  let copied = $state(false);
  let shareInput = $state<HTMLInputElement | null>(null);

  const defaultTimezone = $derived(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  );

  // Timezone options now live inside the reusable TimezonePicker
  // component — see `$lib/design/TimezonePicker.svelte`.
  let timezoneValue = $state('');
  $effect(() => {
    timezoneValue = String(form?.values?.timezone ?? defaultTimezone);
  });

  const shareUrl = $derived(form?.success ? `${page.url.origin}/e/${form.slug}` : '');

  function selectShareUrl() {
    shareInput?.select();
  }

  async function copyShare() {
    if (!shareUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        shareInput?.select();
        document.execCommand('copy');
      }
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      shareInput?.select();
    }
  }
</script>

<svelte:head>
  <title>{m.create_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-xl space-y-8">
  {#if form?.success}
    <Card tone="success">
      <div class="space-y-4">
        <h1 class="text-2xl font-semibold tracking-tight">{m.create_success_heading()}</h1>

        {#if form.title}
          <p class="text-sm font-medium text-slate-700">{form.title}</p>
        {/if}

        <div class="space-y-2">
          <p class="text-xs font-medium text-slate-600">{m.create_success_share_label()}</p>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readonly
              bind:this={shareInput}
              value={shareUrl}
              class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800"
              onclick={selectShareUrl}
            />
            <Button onclick={copyShare} class="shrink-0">
              {copied ? m.create_success_copied() : m.create_success_copy()}
            </Button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            href="/e/{form.slug}"
            variant="secondary"
            size="sm"
            data-sveltekit-reload
          >
            {m.create_success_open()}
          </Button>
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
    </Card>
  {:else}
    <header class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">{m.create_title()}</h1>
      <p class="text-sm text-slate-600">{m.create_subtitle()}</p>
    </header>

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
        <Banner tone="error">{localizeError(form.error)}</Banner>
      {/if}

      <fieldset class="space-y-4">
        <legend class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {m.create_section_basics()}
        </legend>

        <TextField
          name="title"
          required
          maxlength={200}
          value={form?.values?.title ?? ''}
          label={m.create_field_title()}
        />

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
          <TextField
            type="datetime-local"
            name="startsAt"
            required
            value={form?.values?.startsAt ?? ''}
            label={m.create_field_starts_at()}
          />
          <TextField
            type="datetime-local"
            name="endsAt"
            value={form?.values?.endsAt ?? ''}
            label={m.create_field_ends_at_optional()}
          />
        </div>

        <TimezonePicker
          name="timezone"
          bind:value={timezoneValue}
          label={m.create_field_timezone()}
          hint={m.create_field_timezone_hint()}
          listId="create-tz-list"
        />
      </fieldset>

      <fieldset class="space-y-4">
        <legend class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {m.create_section_where()}
        </legend>

        <TextField
          name="locationText"
          maxlength={500}
          value={form?.values?.locationText ?? ''}
          label={m.create_field_location_optional()}
        />
      </fieldset>

      <fieldset class="space-y-3">
        <legend class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {m.create_section_visibility()}
        </legend>

        <label
          class="flex items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
        >
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

        <label
          class="flex items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
        >
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

        <TextField
          type="email"
          name="creatorEmail"
          required
          value={form?.values?.creatorEmail ?? ''}
          label={m.create_field_email()}
          hint={m.create_field_email_hint()}
        />
      </fieldset>

      <Button type="submit" disabled={submitting}>
        {submitting ? m.create_submitting() : m.create_submit()}
      </Button>
    </form>
  {/if}
</section>
