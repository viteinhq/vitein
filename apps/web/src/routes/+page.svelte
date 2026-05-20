<script lang="ts">
  import { ArrowRight, Button, Eyebrow, InviteCard } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';

  const features = [
    { title: m.home_features_anonymous_title(), body: m.home_features_anonymous_body(), accent: true },
    { title: m.home_features_global_title(), body: m.home_features_global_body(), accent: false },
    { title: m.home_features_open_title(), body: m.home_features_open_body(), accent: false },
  ];

  const steps = [
    { title: m.home_how_step1_title(), body: m.home_how_step1_body() },
    { title: m.home_how_step2_title(), body: m.home_how_step2_body() },
    { title: m.home_how_step3_title(), body: m.home_how_step3_body() },
  ];

  const trust = [
    m.home_trust_no_account(),
    m.home_trust_open_source(),
    m.home_trust_languages(),
    m.home_trust_free(),
  ];
</script>

<svelte:head>
  <title>vite.in — {m.home_title()}</title>
  <meta name="description" content={m.home_sub()} />
</svelte:head>

<!-- ─── Hero ─────────────────────────────────────────────── -->
<section class="border-b border-rule">
  <div
    class="mx-auto grid max-w-5xl gap-12 px-6 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8 lg:py-20"
  >
    <div class="flex flex-col">
      <span
        class="inline-flex items-center gap-2 self-start rounded-full border border-rule bg-card px-3 py-1.5 font-mono text-[10px] tracking-[0.06em] whitespace-nowrap"
      >
        <span class="size-1.5 rounded-full bg-coral"></span>
        {m.home_hero_pill()}
      </span>

      <h1
        class="font-display mt-5 text-[3.25rem] leading-[0.9] font-bold tracking-tighter text-balance sm:text-7xl lg:text-[5.25rem]"
      >
        {m.home_title()}
      </h1>

      <p class="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">{m.home_sub()}</p>

      <div class="mt-8 flex flex-wrap gap-3">
        <Button href="/create" variant="primary" size="lg">
          {m.home_cta_primary()}
          <ArrowRight size={15} />
        </Button>
        <Button href="/pricing" variant="secondary" size="lg">{m.home_cta_secondary()}</Button>
      </div>

      <ul
        class="mt-7 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-muted"
      >
        {#each trust as item (item)}
          <li class="flex items-center gap-1.5">
            <span class="size-1 rounded-full bg-coral"></span>
            {item}
          </li>
        {/each}
      </ul>
    </div>

    <!-- card stack -->
    <div class="relative mx-auto h-[360px] w-full max-w-sm sm:h-[420px]">
      <div class="absolute left-[10%] top-[4%] aspect-[3/4] w-[54%] rotate-[-8deg]">
        <InviteCard variant="paper" title="Sunday roast" date="Sun · Mar 9 · 1pm" place="our place, with the dog" />
      </div>
      <div class="absolute right-[8%] top-[15%] aspect-[3/4] w-[54%] rotate-[7deg]">
        <InviteCard
          variant="noir"
          eyebrow={m.invite_eyebrow()}
          title="Studio launch"
          date="Thu · Apr 18 · 7pm"
          place="Mile End, London"
        />
      </div>
      <div
        class="absolute left-1/2 top-[34%] aspect-[3/4] w-[58%] -translate-x-1/2 rotate-[-2deg]"
      >
        <InviteCard
          variant="lime"
          eyebrow={m.invite_eyebrow()}
          title="Maya turns 30"
          date="Sat · Aug 17 · 8pm"
          place="rooftop · Brooklyn"
        />
      </div>
    </div>
  </div>
</section>

<!-- ─── Features ─────────────────────────────────────────── -->
<section class="mx-auto max-w-5xl px-6 py-16 sm:py-20">
  <Eyebrow num="01" label={m.home_features_eyebrow()} />
  <h2
    class="font-display mt-4 max-w-xl text-3xl leading-[0.95] font-bold tracking-tighter sm:text-5xl"
  >
    {m.home_features_heading()}
  </h2>

  <div class="mt-10 grid gap-4 sm:grid-cols-3">
    {#each features as f, i (f.title)}
      <div
        class="rounded-card border p-6 {f.accent
          ? 'border-transparent bg-accent text-accent-ink'
          : 'border-rule bg-card text-ink'}"
      >
        <span
          class="font-mono text-[10px] tracking-[0.12em] uppercase {f.accent
            ? 'text-accent-ink/70'
            : 'text-ink-muted'}"
        >
          {String(i + 1).padStart(2, '0')} — feature
        </span>
        <h3 class="font-display mt-3 text-2xl leading-none font-bold tracking-tight">
          {f.title}
        </h3>
        <p
          class="mt-2 text-sm leading-relaxed {f.accent ? 'text-accent-ink/75' : 'text-ink-muted'}"
        >
          {f.body}
        </p>
      </div>
    {/each}
  </div>
</section>

<!-- ─── How it works ─────────────────────────────────────── -->
<section class="border-y border-rule bg-paper-2/50">
  <div class="mx-auto max-w-5xl px-6 py-16 sm:py-20">
    <Eyebrow num="02" label={m.home_how_eyebrow()} />
    <h2
      class="font-display mt-4 text-3xl leading-[0.95] font-bold tracking-tighter sm:text-5xl"
    >
      {m.home_how_heading()}
    </h2>

    <ol class="mt-10 grid gap-4 sm:grid-cols-3">
      {#each steps as step, i (step.title)}
        <li class="rounded-card border border-rule bg-card p-6">
          <span
            class="font-display block text-5xl leading-none font-bold tracking-tighter text-coral"
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 class="font-display mt-4 text-xl font-bold tracking-tight">{step.title}</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
        </li>
      {/each}
    </ol>
  </div>
</section>

<!-- ─── Open source ──────────────────────────────────────── -->
<section class="bg-ink text-paper">
  <div class="mx-auto max-w-5xl px-6 py-16 sm:py-20">
    <div class="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div
          class="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-paper/55 uppercase"
        >
          <span class="font-semibold text-coral">03</span>
          <span class="h-px w-10 bg-paper/30"></span>
          <span>{m.home_oss_eyebrow()}</span>
        </div>
        <h2
          class="font-display mt-4 max-w-xl text-4xl leading-[0.92] font-bold tracking-tighter sm:text-6xl"
        >
          {m.home_oss_heading()}
        </h2>
        <p class="mt-5 max-w-lg text-base leading-relaxed text-paper/65">{m.home_oss_body()}</p>
      </div>
      <Button
        href="https://github.com/viteinhq/vitein"
        variant="accent"
        size="lg"
        class="shrink-0"
      >
        {m.home_oss_link()}
        <ArrowRight size={15} />
      </Button>
    </div>
  </div>
</section>

<!-- ─── Final CTA ────────────────────────────────────────── -->
<section class="mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
  <h2
    class="font-display mx-auto max-w-2xl text-4xl leading-[0.95] font-bold tracking-tighter sm:text-6xl"
  >
    {m.home_cta_final_heading()}
  </h2>
  <p class="mx-auto mt-4 max-w-md text-lg leading-relaxed text-ink-muted">
    {m.home_cta_final_body()}
  </p>
  <div class="mt-8 flex justify-center">
    <Button href="/create" variant="accent" size="lg">
      {m.home_cta_primary()}
      <ArrowRight size={15} />
    </Button>
  </div>
</section>
