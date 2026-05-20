<script lang="ts">
  import { Card, Heading, Text } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.pricing_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-4xl space-y-8">
  <header class="space-y-2">
    <Heading level="page">{m.pricing_title()}</Heading>
    <Text tone="muted">{m.pricing_subtitle()}</Text>
  </header>

  <div class="grid gap-6 md:grid-cols-3">
    <!-- Free -->
    <Card>
      <div class="space-y-3">
        <Heading level="section" tag="h2">{m.pricing_free_name()}</Heading>
        <p class="text-2xl font-bold">{m.pricing_free_price()}</p>
        <Text tone="muted" size="sm">{m.pricing_free_desc()}</Text>
        <ul class="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
          <li>{m.pricing_free_item_rsvps()}</li>
          <li>{m.pricing_free_item_magic()}</li>
          <li>{m.pricing_free_item_confirm()}</li>
          <li>{m.pricing_free_item_calendar()}</li>
        </ul>
      </div>
    </Card>

    <!-- Basic -->
    <Card>
      <div class="space-y-3">
        <Heading level="section" tag="h2">{m.tier_basic_name()}</Heading>
        <p class="text-2xl font-bold">{m.pricing_basic_price()}</p>
        <Text tone="subtle" size="sm">{m.pricing_per_event()}</Text>
        <Text tone="muted" size="sm">{m.tier_basic_tagline()}</Text>
        <ul class="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
          <li>{m.tier_basic_item_branding()}</li>
          <li>{m.tier_basic_item_slug()}</li>
          <li>{m.tier_basic_item_reminders()}</li>
          <li>{m.tier_basic_item_cover()}</li>
        </ul>
      </div>
    </Card>

    <!--
      Plus is the upsell anchor — heavier border for emphasis. The Card
      primitive has no "featured" tone yet; when a second page needs the
      same treatment, that becomes a Card variant.
    -->
    <div class="rounded-lg border-2 border-slate-900 bg-white p-5">
      <div class="space-y-3">
        <Heading level="section" tag="h2">{m.tier_plus_name()}</Heading>
        <p class="text-2xl font-bold">{m.pricing_plus_price()}</p>
        <Text tone="subtle" size="sm">{m.pricing_per_event()}</Text>
        <Text tone="muted" size="sm">{m.tier_plus_tagline()}</Text>
        <ul class="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
          <li>{m.tier_plus_item_everything_basic()}</li>
          <li>{m.tier_plus_item_plus_ones()}</li>
          <li>{m.tier_plus_item_password()}</li>
          <li>{m.tier_plus_item_save_the_date()}</li>
        </ul>
      </div>
    </div>
  </div>
</section>
