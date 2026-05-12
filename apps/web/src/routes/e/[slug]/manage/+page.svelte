<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { Banner, Button, TextField } from '$lib/design';
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
      {m.manage_public_link()}
      <a class="underline" href="/e/{data.event.slug}">/e/{data.event.slug}</a>
    </p>
  </header>

  <section class="space-y-2 rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_upgrade_heading()}</h2>
    <p class="text-sm text-slate-600">{m.manage_upgrade_body()}</p>

    {#if upgraded}
      <Banner tone="success">{m.manage_upgrade_success()}</Banner>
    {/if}
    {#if canceled}
      <Banner tone="warn">{m.manage_upgrade_canceled()}</Banner>
    {/if}
    {#if form?.upgradeError}
      <Banner tone="error">
        {localizeError(form.upgradeError, {
          status: 'upgradeStatus' in form ? form.upgradeStatus : undefined,
        })}
      </Banner>
    {/if}

    {#if data.event.isPaid}
      <Banner tone="success">
        {#if paidTier === 'plus'}
          {m.manage_upgrade_already_tier_plus()}
        {:else if paidTier === 'basic'}
          {m.manage_upgrade_already_tier_basic()}
        {:else}
          {m.manage_upgrade_already_paid()}
        {/if}
      </Banner>
    {:else}
      <div class="space-y-4 pt-2">
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
            <Button type="submit" variant="secondary" class="w-full">
              {m.manage_upgrade_choose_basic()}
            </Button>
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
            <Button type="submit" class="w-full">{m.manage_upgrade_choose_plus()}</Button>
          </form>
        </div>
      </div>
    {/if}
  </section>

  <section class="space-y-2 rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_media_heading()}</h2>
    <p class="text-sm text-slate-600">{m.manage_media_hint()}</p>

    {#if form?.mediaError}
      <Banner tone="error">
        {localizeError(form.mediaError, {
          status: 'mediaStatus' in form ? form.mediaStatus : undefined,
        })}
      </Banner>
    {/if}
    {#if form?.mediaUploaded}
      <Banner tone="success">{m.manage_media_uploaded()}</Banner>
    {/if}
    {#if form?.mediaDeleted}
      <Banner tone="success">{m.manage_media_deleted()}</Banner>
    {/if}

    {#if data.media.length > 0}
      <ul class="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
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
              <Button type="submit" variant="secondary" size="sm" class="w-full">
                {m.manage_media_remove()}
              </Button>
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
      class="flex items-center gap-3 pt-3"
    >
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        required
        class="block w-full text-sm"
      />
      <Button type="submit" size="sm">{m.manage_media_upload()}</Button>
    </form>
  </section>

  <section class="space-y-2 rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_rsvps_heading()}</h2>
    <p class="text-sm text-slate-600">
      {m.manage_rsvps_summary({
        yes: rsvpCounts.yes,
        maybe: rsvpCounts.maybe,
        no: rsvpCounts.no,
        plus: rsvpCounts.plusOnes,
      })}
    </p>

    {#if data.rsvps.length === 0}
      <p class="pt-1 text-sm text-slate-500">{m.manage_rsvps_empty()}</p>
    {:else}
      <ul class="divide-y divide-slate-200 pt-2">
        {#each data.rsvps as r (r.id)}
          <li class="py-2 text-sm">
            <span class="font-medium">{r.name}</span>
            <span class="text-slate-500">— {r.status}{r.plusOnes ? ` (+${r.plusOnes})` : ''}</span>
            {#if r.plusOnesDetails && r.plusOnesDetails.length > 0}
              <ul class="mt-1 ms-4 list-disc text-xs text-slate-500">
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

  <section class="space-y-2 rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_edit_heading()}</h2>

    {#if form?.updateSuccess}
      <Banner tone="success">{m.manage_edit_saved()}</Banner>
    {/if}
    {#if form?.updateError}
      <Banner tone="error">{localizeError(form.updateError)}</Banner>
    {/if}

    <form method="POST" action="?/update&token={data.token}" use:enhance class="space-y-3 pt-2">
      <TextField
        name="title"
        value={data.event.title}
        maxlength={200}
        label={m.manage_edit_title_label()}
      />

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

      <TextField
        type="datetime-local"
        name="startsAt"
        value={startsAtForInput}
        label={m.manage_edit_starts_at_label()}
      />

      <TextField
        name="locationText"
        value={data.event.locationText ?? ''}
        maxlength={500}
        label={m.manage_edit_location_label()}
      />

      <Button type="submit">{m.manage_edit_submit()}</Button>
    </form>
  </section>

  <section class="space-y-2 rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_announcements_heading()}</h2>
    <p class="text-sm text-slate-600">{m.manage_announcements_body()}</p>

    {#if form?.announceError}
      <Banner tone="error">
        {localizeError(form.announceError, {
          status: 'announceStatus' in form ? form.announceStatus : undefined,
        })}
      </Banner>
    {/if}

    {#each data.announcements as ann (ann.id)}
      {#if ann.sentAt}
        <Banner tone="success">
          {#if ann.stage === 'save_the_date'}
            {m.manage_announcements_save_the_date_sent({
              date: new Date(ann.sentAt).toLocaleDateString(),
              count: String(ann.recipientCount),
            })}
          {:else}
            {m.manage_announcements_invitation_sent({
              date: new Date(ann.sentAt).toLocaleDateString(),
              count: String(ann.recipientCount),
            })}
          {/if}
        </Banner>
      {/if}
    {/each}

    {#if paidTier !== 'plus'}
      <Banner tone="warn">{m.manage_announcements_plus_hint()}</Banner>
    {/if}

    <div class="flex flex-wrap gap-2 pt-2">
      {#if paidTier === 'plus' && !data.announcements.some((a) => a.stage === 'save_the_date' && a.sentAt)}
        <form method="POST" action="?/announce&token={data.token}" use:enhance>
          <input type="hidden" name="stage" value="save_the_date" />
          <Button type="submit" variant="secondary" size="sm" class="!border-2 !border-slate-900">
            {m.manage_announcements_save_the_date()}
          </Button>
        </form>
      {/if}
      {#if data.event.isPaid && !data.announcements.some((a) => a.stage === 'invitation' && a.sentAt)}
        <form method="POST" action="?/announce&token={data.token}" use:enhance>
          <input type="hidden" name="stage" value="invitation" />
          <Button type="submit" size="sm">{m.manage_announcements_invitation()}</Button>
        </form>
      {/if}
    </div>
  </section>

  <section class="space-y-2 rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_password_heading()}</h2>
    <p class="text-sm text-slate-600">
      {data.event.hasPassword
        ? m.manage_password_body_locked()
        : m.manage_password_body_unlocked()}
    </p>

    {#if paidTier !== 'plus'}
      <Banner tone="warn">{m.manage_password_plus_required()}</Banner>
    {:else}
      {#if form?.passwordSet}
        <Banner tone="success">{m.manage_password_set_ok()}</Banner>
      {/if}
      {#if form?.passwordCleared}
        <Banner tone="success">{m.manage_password_cleared_ok()}</Banner>
      {/if}
      {#if form?.passwordError}
        <Banner tone="error">{localizeError(form.passwordError)}</Banner>
      {/if}

      <form
        method="POST"
        action="?/setPassword&token={data.token}"
        use:enhance
        class="flex flex-wrap gap-2 pt-2"
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
        <Button type="submit" size="sm">
          {data.event.hasPassword ? m.manage_password_update() : m.manage_password_set()}
        </Button>
      </form>

      {#if data.event.hasPassword}
        <form method="POST" action="?/setPassword&token={data.token}" use:enhance class="pt-2">
          <input type="hidden" name="clear" value="1" />
          <Button type="submit" variant="secondary" size="sm">
            {m.manage_password_clear()}
          </Button>
        </form>
      {/if}
    {/if}
  </section>

  <section class="space-y-2 rounded-lg border border-slate-200 p-4">
    <h2 class="text-lg font-semibold">{m.manage_reminder_heading()}</h2>
    <p class="text-sm text-slate-600">{m.manage_reminder_body()}</p>

    {#if form?.reminderQueued}
      <Banner tone="success">{m.manage_reminder_queued()}</Banner>
    {/if}
    {#if form?.reminderError}
      <Banner tone="error">{localizeError(form.reminderError)}</Banner>
    {/if}

    <form method="POST" action="?/remind&token={data.token}" use:enhance class="pt-2">
      <Button type="submit" variant="secondary" size="sm">{m.manage_reminder_submit()}</Button>
    </form>
  </section>
</section>
