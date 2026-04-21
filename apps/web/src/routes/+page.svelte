<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>vite.in — {m.home_title()}</title>
  <meta name="description" content={m.home_sub()} />
</svelte:head>

<section class="mx-auto max-w-3xl space-y-12">
  <header class="space-y-6 text-center">
    <h1 class="text-balance text-5xl font-bold tracking-tight">{m.home_title()}</h1>
    <p class="mx-auto max-w-xl text-lg text-slate-600">{m.home_sub()}</p>
    <div class="flex flex-wrap justify-center gap-3">
      <a
        href="/create"
        class="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700"
      >
        {m.home_cta_primary()}
      </a>
      <a
        href="/pricing"
        class="rounded-md border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-50"
      >
        {m.home_cta_secondary()}
      </a>
    </div>
  </header>

  <section class="grid gap-6 sm:grid-cols-3">
    <article class="rounded-lg border border-slate-200 p-5">
      <h2 class="font-semibold">{m.home_features_anonymous_title()}</h2>
      <p class="mt-2 text-sm text-slate-600">{m.home_features_anonymous_body()}</p>
    </article>
    <article class="rounded-lg border border-slate-200 p-5">
      <h2 class="font-semibold">{m.home_features_global_title()}</h2>
      <p class="mt-2 text-sm text-slate-600">{m.home_features_global_body()}</p>
    </article>
    <article class="rounded-lg border border-slate-200 p-5">
      <h2 class="font-semibold">{m.home_features_open_title()}</h2>
      <p class="mt-2 text-sm text-slate-600">{m.home_features_open_body()}</p>
    </article>
  </section>

  {#if data.health}
    <aside class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
      <p>
        API: <code>{data.health.status}</code> · <code>{data.health.environment}</code> · db
        <code>{data.health.db}</code>
      </p>
    </aside>
  {/if}
</section>
