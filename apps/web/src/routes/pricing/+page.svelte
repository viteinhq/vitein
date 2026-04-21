<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.pricing_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-3xl space-y-8">
  <h1 class="text-3xl font-bold tracking-tight">{m.pricing_title()}</h1>

  <div class="grid gap-6 sm:grid-cols-2">
    <article class="space-y-3 rounded-lg border border-slate-200 p-6">
      <h2 class="text-xl font-semibold">{m.pricing_free_name()}</h2>
      <p class="text-2xl font-bold">{m.pricing_free_price()}</p>
      <p class="text-sm text-slate-600">{m.pricing_free_desc()}</p>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>{m.pricing_free_item_rsvps()}</li>
        <li>{m.pricing_free_item_magic()}</li>
        <li>{m.pricing_free_item_confirm()}</li>
        <li>{m.pricing_free_item_calendar()}</li>
      </ul>
    </article>

    <article class="space-y-3 rounded-lg border-2 border-slate-900 p-6">
      <h2 class="text-xl font-semibold">{m.pricing_paid_name()}</h2>
      <p class="text-2xl font-bold">{m.pricing_paid_price()}</p>
      <p class="text-sm text-slate-600">{m.pricing_paid_desc()}</p>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>{m.pricing_paid_item_slug()}</li>
        <li>{m.pricing_paid_item_brand()}</li>
        <li>{m.pricing_paid_item_media()}</li>
        <li>{m.pricing_paid_item_reminders()}</li>
        <li>{m.pricing_paid_item_password()}</li>
      </ul>
    </article>
  </div>
</section>
