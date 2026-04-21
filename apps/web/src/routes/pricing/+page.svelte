<script lang="ts">
  import { t } from '$lib/i18n';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  const locale = $derived(data.locale);

  const freeItems = $derived(t('pricing.free.items', locale).split(';'));
  const paidItems = $derived(t('pricing.paid.items', locale).split(';'));
</script>

<svelte:head>
  <title>{t('pricing.title', locale)} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-3xl space-y-8">
  <h1 class="text-3xl font-bold tracking-tight">{t('pricing.title', locale)}</h1>

  <div class="grid gap-6 sm:grid-cols-2">
    <article class="space-y-3 rounded-lg border border-slate-200 p-6">
      <h2 class="text-xl font-semibold">{t('pricing.free.name', locale)}</h2>
      <p class="text-2xl font-bold">{t('pricing.free.price', locale)}</p>
      <p class="text-sm text-slate-600">{t('pricing.free.desc', locale)}</p>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {#each freeItems as item, i (i)}
          <li>{item}</li>
        {/each}
      </ul>
    </article>

    <article class="space-y-3 rounded-lg border-2 border-slate-900 p-6">
      <h2 class="text-xl font-semibold">{t('pricing.paid.name', locale)}</h2>
      <p class="text-2xl font-bold">{t('pricing.paid.price', locale)}</p>
      <p class="text-sm text-slate-600">{t('pricing.paid.desc', locale)}</p>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {#each paidItems as item, i (i)}
          <li>{item}</li>
        {/each}
      </ul>
    </article>
  </div>
</section>
