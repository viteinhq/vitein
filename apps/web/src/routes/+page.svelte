<script lang="ts">
  import { Button, Card } from '$lib/design';
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
      <Button href="/create" size="lg">{m.home_cta_primary()}</Button>
      <Button href="/pricing" variant="secondary" size="lg">{m.home_cta_secondary()}</Button>
    </div>
  </header>

  <section class="grid gap-6 sm:grid-cols-3">
    <Card>
      <div class="space-y-2">
        <h2 class="font-semibold">{m.home_features_anonymous_title()}</h2>
        <p class="text-sm text-slate-600">{m.home_features_anonymous_body()}</p>
      </div>
    </Card>
    <Card>
      <div class="space-y-2">
        <h2 class="font-semibold">{m.home_features_global_title()}</h2>
        <p class="text-sm text-slate-600">{m.home_features_global_body()}</p>
      </div>
    </Card>
    <Card>
      <div class="space-y-2">
        <h2 class="font-semibold">{m.home_features_open_title()}</h2>
        <p class="text-sm text-slate-600">{m.home_features_open_body()}</p>
      </div>
    </Card>
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
