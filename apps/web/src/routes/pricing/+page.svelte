<script lang="ts">
  import { Card, Heading, Text } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.pricing_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-3xl space-y-8">
  <Heading>{m.pricing_title()}</Heading>

  <div class="grid gap-6 sm:grid-cols-2">
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

    <!--
      Paid tier keeps a heavier border to visually anchor as the upsell.
      Card primitive doesn't carry a "featured" tone yet — when a second
      page wants the same emphasis, that becomes a Card variant.
    -->
    <div class="rounded-lg border-2 border-slate-900 bg-white p-5">
      <div class="space-y-3">
        <Heading level="section" tag="h2">{m.pricing_paid_name()}</Heading>
        <p class="text-2xl font-bold">{m.pricing_paid_price()}</p>
        <Text tone="muted" size="sm">{m.pricing_paid_desc()}</Text>
        <ul class="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
          <li>{m.pricing_paid_item_slug()}</li>
          <li>{m.pricing_paid_item_brand()}</li>
          <li>{m.pricing_paid_item_media()}</li>
          <li>{m.pricing_paid_item_reminders()}</li>
          <li>{m.pricing_paid_item_password()}</li>
        </ul>
      </div>
    </div>
  </div>
</section>
