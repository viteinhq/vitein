<script lang="ts">
  import { t } from '$lib/i18n';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
  const locale = $derived(data.locale);
</script>

<svelte:head><title>{t('legal.impressum.title', locale)} — vite.in</title></svelte:head>

<section class="mx-auto max-w-2xl space-y-4">
  <h1 class="text-3xl font-bold tracking-tight">{t('legal.impressum.title', locale)}</h1>
  <p class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
    {t('legal.draft', locale)}
  </p>
  <!-- TODO(task-0.1-legal): final text from counsel before public launch. -->
</section>
