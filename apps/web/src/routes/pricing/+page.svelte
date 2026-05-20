<script lang="ts">
  import { ArrowRight, Button, Eyebrow } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';

  const tiers = [
    {
      name: m.pricing_free_name(),
      price: m.pricing_free_price(),
      per: '',
      tagline: m.pricing_free_desc(),
      items: [
        m.pricing_free_item_rsvps(),
        m.pricing_free_item_magic(),
        m.pricing_free_item_confirm(),
        m.pricing_free_item_calendar(),
      ],
      accent: false,
    },
    {
      name: m.tier_basic_name(),
      price: m.pricing_basic_price(),
      per: m.pricing_per_event(),
      tagline: m.tier_basic_tagline(),
      items: [
        m.tier_basic_item_branding(),
        m.tier_basic_item_slug(),
        m.tier_basic_item_reminders(),
        m.tier_basic_item_cover(),
      ],
      accent: false,
    },
    {
      name: m.tier_plus_name(),
      price: m.pricing_plus_price(),
      per: m.pricing_per_event(),
      tagline: m.tier_plus_tagline(),
      items: [
        m.tier_plus_item_everything_basic(),
        m.tier_plus_item_plus_ones(),
        m.tier_plus_item_password(),
        m.tier_plus_item_save_the_date(),
      ],
      accent: true,
    },
  ];
</script>

<svelte:head>
  <title>{m.pricing_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-6 py-14">
  <Eyebrow num="$" label={m.pricing_title()} />
  <h1 class="font-display mt-4 text-4xl font-bold tracking-tighter sm:text-5xl">
    {m.pricing_title()}
  </h1>
  <p class="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">{m.pricing_subtitle()}</p>

  <div class="mt-10 grid gap-4 md:grid-cols-3">
    {#each tiers as tier (tier.name)}
      <div
        class="flex flex-col rounded-card border p-6 {tier.accent
          ? 'border-transparent bg-accent text-accent-ink'
          : 'border-rule bg-card text-ink'}"
      >
        <h2 class="font-display text-xl font-bold tracking-tight">{tier.name}</h2>
        <div class="mt-3 flex items-baseline gap-1.5">
          <span class="font-display text-5xl font-bold tracking-tighter">{tier.price}</span>
          {#if tier.per}
            <span
              class="font-mono text-[10px] tracking-wide uppercase {tier.accent
                ? 'text-accent-ink/65'
                : 'text-ink-muted'}"
            >
              {tier.per}
            </span>
          {/if}
        </div>
        <p
          class="mt-3 text-sm leading-relaxed {tier.accent ? 'text-accent-ink/80' : 'text-ink-muted'}"
        >
          {tier.tagline}
        </p>
        <ul class="mt-4 space-y-2 text-sm">
          {#each tier.items as item (item)}
            <li class="flex gap-2">
              <span class={tier.accent ? 'text-accent-ink' : 'text-coral'}>·</span>
              <span>{item}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  <div class="mt-10 flex items-center gap-3">
    <Button href="/create" variant="primary" size="lg">
      {m.home_cta_primary()}
      <ArrowRight size={15} />
    </Button>
    <p class="text-sm text-ink-muted">{m.pricing_per_event()}</p>
  </div>
</section>
