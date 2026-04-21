<script lang="ts">
  import { t } from '$lib/i18n';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  const locale = $derived(data.locale);

  const features: { key: string }[] = [
    { key: 'home.features.anonymous' },
    { key: 'home.features.global' },
    { key: 'home.features.open' },
  ];
</script>

<svelte:head>
  <title>vite.in — {t('home.hero.headline', locale)}</title>
  <meta name="description" content={t('home.hero.sub', locale)} />
</svelte:head>

<section class="mx-auto max-w-3xl space-y-12">
  <header class="space-y-6 text-center">
    <h1 class="text-balance text-5xl font-bold tracking-tight">
      {t('home.hero.headline', locale)}
    </h1>
    <p class="mx-auto max-w-xl text-lg text-slate-600">
      {t('home.hero.sub', locale)}
    </p>
    <div class="flex flex-wrap justify-center gap-3">
      <a
        href="/create"
        class="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700"
      >
        {t('home.hero.cta_primary', locale)}
      </a>
      <a
        href="/pricing"
        class="rounded-md border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-50"
      >
        {t('home.hero.cta_secondary', locale)}
      </a>
    </div>
  </header>

  <section class="grid gap-6 sm:grid-cols-3">
    {#each features as f (f.key)}
      <article class="rounded-lg border border-slate-200 p-5">
        <h2 class="font-semibold">{t(`${f.key}.title`, locale)}</h2>
        <p class="mt-2 text-sm text-slate-600">{t(`${f.key}.body`, locale)}</p>
      </article>
    {/each}
  </section>

  {#if data.health}
    <aside class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
      <p>
        API: <code>{data.health.status}</code> ·
        <code>{data.health.environment}</code> · db
        <code>{data.health.db}</code>
      </p>
    </aside>
  {/if}
</section>
