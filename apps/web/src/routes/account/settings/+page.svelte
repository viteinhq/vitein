<script lang="ts">
  import { enhance } from '$app/forms';
  import { Banner, Button, Heading, Section, Text, TextField, TimezonePicker } from '$lib/design';
  import { LOCALE_ENDONYMS } from '$lib/i18n-locales';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  const { data, form }: PageProps = $props();

  // Local mirror of the profile fields so the form is controlled.
  // Initialise empty; the effect below seeds them from `data.profile`
  // on first render and re-seeds whenever the loaded profile changes
  // (e.g. after a successful update reloads the page data).
  const profile = $derived(data.profile);
  let name = $state('');
  let locale = $state('en');
  let timezone = $state('UTC');

  $effect(() => {
    if (profile) {
      name = profile.name ?? '';
      locale = profile.locale;
      timezone = profile.timezone;
    }
  });

  const locales = Object.entries(LOCALE_ENDONYMS) as Array<[string, string]>;
</script>

<svelte:head>
  <title>{m.settings_title()} — vite.in</title>
</svelte:head>

<section class="space-y-6">
  <Heading level="page">{m.settings_title()}</Heading>

  {#if data.loadError}
    <Banner tone="error">{m.settings_load_error()}</Banner>
  {:else if profile}
    <!-- Profile section -->
    <Section>
      <Heading level="panel">{m.settings_profile_heading()}</Heading>

      {#if form?.updated}
        <Banner tone="success">{m.settings_updated()}</Banner>
      {/if}
      {#if form && 'updateError' in form && form.updateError}
        <Banner tone="error">{m.settings_update_error()}</Banner>
      {/if}

      <form
        method="POST"
        action="?/update"
        use:enhance
        class="space-y-4"
      >
        <TextField
          label={m.settings_email_label()}
          name="email"
          value={profile.email}
          disabled
          hint={m.settings_email_hint()}
        />
        <TextField
          label={m.settings_name_label()}
          name="name"
          bind:value={name}
          hint={m.settings_name_hint()}
          maxlength={200}
        />

        <label class="block">
          <span class="font-mono text-[10px] font-medium tracking-[0.08em] text-ink-muted uppercase">
            {m.settings_locale_label()}
          </span>
          <select
            name="locale"
            bind:value={locale}
            class="mt-1.5 block w-full rounded-xl border border-rule bg-card px-4 py-3 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {#each locales as [tag, endonym] (tag)}
              <option value={tag}>{endonym}</option>
            {/each}
          </select>
        </label>

        <TimezonePicker
          label={m.settings_timezone_label()}
          name="timezone"
          bind:value={timezone}
          hint={m.settings_timezone_hint()}
          listId="settings-tz-list"
        />

        <Button type="submit">{m.settings_save()}</Button>
      </form>
    </Section>

    <!-- Data export -->
    <Section>
      <Heading level="panel">{m.settings_export_heading()}</Heading>
      <Text tone="muted" size="sm">{m.settings_export_body()}</Text>

      {#if form && 'exportReady' in form && form.exportReady && form.exportDataUrl}
        <Banner tone="success">
          <a class="underline" href={form.exportDataUrl} download="vitein-data.json">
            {m.settings_export_download()}
          </a>
        </Banner>
      {/if}
      {#if form && 'exportError' in form && form.exportError}
        <Banner tone="error">{m.settings_export_error()}</Banner>
      {/if}

      <form method="POST" action="?/exportData" use:enhance>
        <Button type="submit" variant="secondary">{m.settings_export_button()}</Button>
      </form>
    </Section>

    <!-- Danger zone -->
    <Section>
      <Heading level="panel">{m.settings_danger_heading()}</Heading>
      <Text tone="muted" size="sm">{m.settings_danger_body()}</Text>

      {#if form && 'deleteError' in form && form.deleteError === 'settings_delete_confirm_required'}
        <Banner tone="warn">{m.settings_delete_confirm_required()}</Banner>
      {:else if form && 'deleteError' in form && form.deleteError}
        <Banner tone="error">{m.settings_delete_error()}</Banner>
      {/if}

      <form method="POST" action="?/deleteAccount" use:enhance class="space-y-3">
        <TextField
          label={m.settings_delete_confirm_label()}
          name="confirm"
          placeholder="DELETE"
          hint={m.settings_delete_confirm_hint()}
        />
        <Button type="submit" variant="danger">{m.settings_delete_button()}</Button>
      </form>
    </Section>
  {/if}
</section>
