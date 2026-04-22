<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>vite.in — {m.home_title()}</title>
  <meta name="description" content={m.home_sub()} />
</svelte:head>

<section class="mx-auto max-w-3xl space-y-16">
  <header class="space-y-6 text-center">
    <h1 class="text-balance text-5xl font-bold tracking-tight sm:text-6xl">{m.home_title()}</h1>
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
    <article class="space-y-2 rounded-lg border border-slate-200 p-5">
      <h2 class="font-semibold">{m.home_features_anonymous_title()}</h2>
      <p class="text-sm text-slate-600">{m.home_features_anonymous_body()}</p>
    </article>
    <article class="space-y-2 rounded-lg border border-slate-200 p-5">
      <h2 class="font-semibold">{m.home_features_global_title()}</h2>
      <p class="text-sm text-slate-600">{m.home_features_global_body()}</p>
    </article>
    <article class="space-y-2 rounded-lg border border-slate-200 p-5">
      <h2 class="font-semibold">{m.home_features_open_title()}</h2>
      <p class="text-sm text-slate-600">{m.home_features_open_body()}</p>
    </article>
  </section>

  <section class="space-y-6">
    <h2 class="text-center text-2xl font-semibold tracking-tight">{m.home_how_heading()}</h2>
    <ol class="grid gap-6 sm:grid-cols-3">
      <li class="space-y-2 rounded-lg bg-slate-50 p-5">
        <h3 class="font-semibold">{m.home_how_step1_title()}</h3>
        <p class="text-sm text-slate-600">{m.home_how_step1_body()}</p>
      </li>
      <li class="space-y-2 rounded-lg bg-slate-50 p-5">
        <h3 class="font-semibold">{m.home_how_step2_title()}</h3>
        <p class="text-sm text-slate-600">{m.home_how_step2_body()}</p>
      </li>
      <li class="space-y-2 rounded-lg bg-slate-50 p-5">
        <h3 class="font-semibold">{m.home_how_step3_title()}</h3>
        <p class="text-sm text-slate-600">{m.home_how_step3_body()}</p>
      </li>
    </ol>
  </section>

  <aside class="flex justify-center">
    <a
      href="https://github.com/viteinhq/vitein"
      rel="noopener"
      class="text-xs text-slate-500 hover:text-slate-700 hover:underline"
    >
      {m.home_oss_link()} →
    </a>
  </aside>
</section>
