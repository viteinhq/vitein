<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  const upgraded = $derived(page.url.searchParams.get('upgraded') === '1');
  const canceled = $derived(page.url.searchParams.get('canceled') === '1');

  type Currency = 'EUR' | 'USD' | 'CHF' | 'GBP';
  let currency = $state<Currency>('EUR');

  const basicPrice = $derived.by(() => {
    switch (currency) {
      case 'EUR':
        return m.tier_basic_price_eur();
      case 'USD':
        return m.tier_basic_price_usd();
      case 'CHF':
        return m.tier_basic_price_chf();
      case 'GBP':
        return m.tier_basic_price_gbp();
    }
  });
  const plusPrice = $derived.by(() => {
    switch (currency) {
      case 'EUR':
        return m.tier_plus_price_eur();
      case 'USD':
        return m.tier_plus_price_usd();
      case 'CHF':
        return m.tier_plus_price_chf();
      case 'GBP':
        return m.tier_plus_price_gbp();
    }
  });

  const paidTier = $derived.by<'basic' | 'plus' | null>(() => {
    if (!data.event.isPaid) return null;
    const pf = data.event.paidFeatures;
    if (pf && typeof pf === 'object' && 'tier' in pf) {
      const t = (pf as { tier?: unknown }).tier;
      if (t === 'basic' || t === 'plus') return t;
    }
    return null;
  });

  const startsAtForInput = $derived(toLocalInputValue(data.event.startsAt));

  function toLocalInputValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const rsvpCounts = $derived.by(() => {
    const counts = { yes: 0, maybe: 0, no: 0, plusOnes: 0 };
    for (const r of data.rsvps) {
      counts[r.status] += 1;
      counts.plusOnes += r.plusOnes ?? 0;
    }
    return counts;
  });
</script>

<svelte:head>
  <title>{m.manage_label()}: {data.event.title}</title>
</svelte:head>

<section class="mx-auto max-w-3xl space-y-8">
  <header class="space-y-1">
    <p class="text-sm text-slate-500">{m.manage_label()}</p>
    <h1 class="text-3xl font-bold tracking-tight">{data.event.title}</h1>
    <p class="text-sm text-slate-500">
      {m.manage_public_link()} <a class="underline" href="/e/{data.event.slug}">/e/{data.event.slug}</a>
    </p>
  </header>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_upgrade_heading()}</h2>
    <p class="mt-1 text-sm text-slate-600">{m.manage_upgrade_body()}</p>

    {#if upgraded}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        {m.manage_upgrade_success()}
      </p>
    {/if}
    {#if canceled}
      <p class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
        {m.manage_upgrade_canceled()}
      </p>
    {/if}
    {#if form?.upgradeError}
      <p class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {localizeError(form.upgradeError, {
          status: 'upgradeStatus' in form ? form.upgradeStatus : undefined,
        })}
      </p>
    {/if}

    {#if data.event.isPaid}
      <p class="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        {#if paidTier === 'plus'}
          {m.manage_upgrade_already_tier_plus()}
        {:else if paidTier === 'basic'}
          {m.manage_upgrade_already_tier_basic()}
        {:else}
          {m.manage_upgrade_already_paid()}
        {/if}
      </p>
    {:else}
      <div class="mt-3 space-y-4">
        <label class="flex items-center gap-2 text-xs font-medium text-slate-600">
          {m.manage_upgrade_currency_label()}
          <select
            bind:value={currency}
            class="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="EUR">€ EUR</option>
            <option value="USD">$ USD</option>
            <option value="CHF">CHF</option>
            <option value="GBP">£ GBP</option>
          </select>
        </label>

        <div class="grid gap-3 sm:grid-cols-2">
          <form
            method="POST"
            action="?/upgrade&token={data.token}"
            class="space-y-3 rounded-lg border border-slate-200 p-4"
          >
            <input type="hidden" name="tier" value="basic" />
            <input type="hidden" name="currency" value={currency} />
            <div>
              <p class="text-sm font-semibold">{m.tier_basic_name()}</p>
              <p class="text-xs text-slate-500">{m.tier_basic_tagline()}</p>
            </div>
            <p class="text-2xl font-bold">{basicPrice}</p>
            <ul class="space-y-1 text-xs text-slate-700">
              <li>· {m.tier_basic_item_branding()}</li>
              <li>· {m.tier_basic_item_slug()}</li>
              <li>· {m.tier_basic_item_reminders()}</li>
            </ul>
            <button
              type="submit"
              class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {m.manage_upgrade_choose_basic()}
            </button>
          </form>

          <form
            method="POST"
            action="?/upgrade&token={data.token}"
            class="space-y-3 rounded-lg border-2 border-slate-900 p-4"
          >
            <input type="hidden" name="tier" value="plus" />
            <input type="hidden" name="currency" value={currency} />
            <div>
              <p class="text-sm font-semibold">{m.tier_plus_name()}</p>
              <p class="text-xs text-slate-500">{m.tier_plus_tagline()}</p>
            </div>
            <p class="text-2xl font-bold">{plusPrice}</p>
            <ul class="space-y-1 text-xs text-slate-700">
              <li>· {m.tier_plus_item_everything_basic()}</li>
              <li>· {m.tier_plus_item_plus_ones()}</li>
              <li>· {m.tier_plus_item_password()}</li>
              <li>· {m.tier_plus_item_save_the_date()}</li>
            </ul>
            <button
              type="submit"
              class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {m.manage_upgrade_choose_plus()}
            </button>
          </form>
        </div>
      </div>
    {/if}
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_media_heading()}</h2>
    <p class="mt-1 text-sm text-slate-600">{m.manage_media_hint()}</p>

    {#if form?.mediaError}
      <p class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {localizeError(form.mediaError, {
          status: 'mediaStatus' in form ? form.mediaStatus : undefined,
        })}
      </p>
    {/if}
    {#if form?.mediaUploaded}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        {m.manage_media_uploaded()}
      </p>
    {/if}
    {#if form?.mediaDeleted}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        {m.manage_media_deleted()}
      </p>
    {/if}

    {#if data.media.length > 0}
      <ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {#each data.media as mediaItem (mediaItem.id)}
          <li class="space-y-2">
            {#if mediaItem.url}
              <img
                src={mediaItem.url}
                alt=""
                width="200"
                height="200"
                class="h-32 w-full rounded-md object-cover"
              />
            {:else}
              <div
                class="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400"
              >
                {m.manage_media_no_url()}
              </div>
            {/if}
            <form method="POST" action="?/deleteMedia&token={data.token}" use:enhance>
              <input type="hidden" name="mediaId" value={mediaItem.id} />
              <button
                type="submit"
                class="w-full rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
              >
                {m.manage_media_remove()}
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}

    <form
      method="POST"
      action="?/uploadMedia&token={data.token}"
      enctype="multipart/form-data"
      use:enhance
      class="mt-4 flex items-center gap-3"
    >
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        required
        class="block w-full text-sm"
      />
      <button
        type="submit"
        class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        {m.manage_media_upload()}
      </button>
    </form>
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_rsvps_heading()}</h2>
    <p class="mt-1 text-sm text-slate-600">
      {m.manage_rsvps_summary({
        yes: rsvpCounts.yes,
        maybe: rsvpCounts.maybe,
        no: rsvpCounts.no,
        plus: rsvpCounts.plusOnes,
      })}
    </p>

    {#if data.rsvps.length === 0}
      <p class="mt-3 text-sm text-slate-500">{m.manage_rsvps_empty()}</p>
    {:else}
      <ul class="mt-3 divide-y divide-slate-200">
        {#each data.rsvps as r (r.id)}
          <li class="py-2 text-sm">
            <span class="font-medium">{r.name}</span>
            <span class="text-slate-500">— {r.status}{r.plusOnes ? ` (+${r.plusOnes})` : ''}</span>
            {#if r.plusOnesDetails && r.plusOnesDetails.length > 0}
              <ul class="mt-1 ml-4 list-disc text-xs text-slate-500">
                {#each r.plusOnesDetails as p, i (i)}
                  <li>{p.name}</li>
                {/each}
              </ul>
            {/if}
            {#if r.message}
              <p class="mt-1 text-slate-600">{r.message}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_edit_heading()}</h2>

    {#if form?.updateSuccess}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        {m.manage_edit_saved()}
      </p>
    {/if}
    {#if form?.updateError}
      <p class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {localizeError(form.updateError)}
      </p>
    {/if}

    <form method="POST" action="?/update&token={data.token}" use:enhance class="mt-4 space-y-3">
      <label class="block">
        <span class="text-sm font-medium">{m.manage_edit_title_label()}</span>
        <input
          name="title"
          value={data.event.title}
          maxlength="200"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <label class="block">
        <span class="text-sm font-medium">{m.manage_edit_description_label()}</span>
        <textarea
          name="description"
          rows="3"
          maxlength="5000"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          >{data.event.description ?? ''}</textarea
        >
      </label>

      <label class="block">
        <span class="text-sm font-medium">{m.manage_edit_starts_at_label()}</span>
        <input
          type="datetime-local"
          name="startsAt"
          value={startsAtForInput}
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <label class="block">
        <span class="text-sm font-medium">{m.manage_edit_location_label()}</span>
        <input
          name="locationText"
          value={data.event.locationText ?? ''}
          maxlength="500"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        class="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
      >
        {m.manage_edit_submit()}
      </button>
    </form>
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_password_heading()}</h2>
    <p class="mt-1 text-sm text-slate-600">
      {data.event.hasPassword
        ? m.manage_password_body_locked()
        : m.manage_password_body_unlocked()}
    </p>

    {#if paidTier !== 'plus'}
      <p class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
        {m.manage_password_plus_required()}
      </p>
    {:else}
      {#if form?.passwordSet}
        <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
          {m.manage_password_set_ok()}
        </p>
      {/if}
      {#if form?.passwordCleared}
        <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
          {m.manage_password_cleared_ok()}
        </p>
      {/if}
      {#if form?.passwordError}
        <p class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localizeError(form.passwordError)}
        </p>
      {/if}

      <form
        method="POST"
        action="?/setPassword&token={data.token}"
        use:enhance
        class="mt-3 flex flex-wrap gap-2"
      >
        <input
          type="password"
          name="password"
          minlength="4"
          maxlength="200"
          autocomplete="new-password"
          placeholder={m.manage_password_placeholder()}
          class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {data.event.hasPassword ? m.manage_password_update() : m.manage_password_set()}
        </button>
      </form>

      {#if data.event.hasPassword}
        <form
          method="POST"
          action="?/setPassword&token={data.token}"
          use:enhance
          class="mt-2"
        >
          <input type="hidden" name="clear" value="1" />
          <button
            type="submit"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            {m.manage_password_clear()}
          </button>
        </form>
      {/if}
    {/if}
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_reminder_heading()}</h2>
    <p class="mt-1 text-sm text-slate-600">{m.manage_reminder_body()}</p>

    {#if form?.reminderQueued}
      <p class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        {m.manage_reminder_queued()}
      </p>
    {/if}
    {#if form?.reminderError}
      <p class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {localizeError(form.reminderError)}
      </p>
    {/if}

    <form method="POST" action="?/remind&token={data.token}" use:enhance class="mt-3">
      <button
        type="submit"
        class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
      >
        {m.manage_reminder_submit()}
      </button>
    </form>
  </section>
</section>
