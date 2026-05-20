<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { Banner, Button, Heading, Section, Text, TextField, TimezonePicker } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  const upgraded = $derived(page.url.searchParams.get('upgraded') === '1');
  const canceled = $derived(page.url.searchParams.get('canceled') === '1');

  // INR is a Phase-1.5 market — not a launch currency. Until INR Stripe
  // prices exist, the upgrade UI only offers the four launch anchors.
  type Currency = 'EUR' | 'USD' | 'CHF' | 'GBP';
  // svelte-ignore state_referenced_locally
  let currency = $state<Currency>(data.suggestedCurrency);

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
  const endsAtForInput = $derived(data.event.endsAt ? toLocalInputValue(data.event.endsAt) : '');

  function toLocalInputValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Writable `$derived`: seeded from the loaded event, reassignable as
  // the creator edits the timezone field.
  let editTimezone = $derived(data.event.timezone);

  let deleteConfirm = $state('');

  const rsvpCounts = $derived.by(() => {
    const counts = { yes: 0, maybe: 0, no: 0, plusOnes: 0 };
    for (const r of data.rsvps) {
      counts[r.status] += 1;
      counts.plusOnes += r.plusOnes ?? 0;
    }
    return counts;
  });
  const rsvpTotal = $derived(rsvpCounts.yes + rsvpCounts.maybe + rsvpCounts.no);
  const pct = (n: number) => (rsvpTotal > 0 ? (n / rsvpTotal) * 100 : 0);

  const eventWhen = $derived(
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: data.event.timezone,
    }).format(new Date(data.event.startsAt)),
  );

  const shareUrl = $derived(`${page.url.origin}/e/${data.event.slug}`);
  let copied = $state(false);
  async function copyLink() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const avatarColors = ['#ff5436', '#3343ff', '#e3ff3a', '#ffba47', '#7a7670'];
  const lightAvatar = new Set(['#e3ff3a', '#ffba47']);

  const statusLabel = (s: 'yes' | 'maybe' | 'no') =>
    s === 'yes' ? m.event_rsvp_yes() : s === 'maybe' ? m.event_rsvp_maybe() : m.event_rsvp_no();

  const textareaClass =
    'mt-1.5 block w-full rounded-xl border border-rule bg-card px-4 py-3 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-accent';
  const legendClass = 'font-mono text-[10px] font-medium tracking-[0.12em] text-ink-muted uppercase';
</script>

<svelte:head>
  <title>{m.manage_label()}: {data.event.title}</title>
</svelte:head>

<section class="mx-auto max-w-3xl space-y-6 px-6 py-10">
  <!-- header -->
  <header>
    <span class="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
      {m.manage_label()}
    </span>
    <h1 class="font-display mt-1 text-3xl leading-none font-bold tracking-tighter sm:text-4xl">
      {data.event.title}
    </h1>
    <p class="mt-2 font-mono text-[11px] text-ink-muted">
      {eventWhen}{#if data.event.locationText} · {data.event.locationText}{/if}
    </p>
  </header>

  <!-- share row -->
  <div class="rounded-card flex items-center gap-3 bg-ink p-3.5 ps-5 text-paper">
    <span class="min-w-0 flex-1 truncate font-mono text-sm">
      {page.url.host}/e/<span class="text-accent">{data.event.slug}</span>
    </span>
    <button
      type="button"
      onclick={copyLink}
      class="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink"
    >
      {copied ? m.event_copied() : m.event_copy_link()}
    </button>
  </div>

  <!-- RSVP overview -->
  <Section>
    <Heading level="panel">{m.manage_rsvps_heading()}</Heading>

    <div class="flex items-baseline gap-2">
      <span class="font-display text-6xl leading-none font-bold tracking-tighter">
        {rsvpCounts.yes}
      </span>
      <span class="font-display text-2xl font-medium text-ink-muted">/ {rsvpTotal}</span>
    </div>
    <Text tone="muted" size="sm">
      {m.manage_rsvps_summary({
        yes: rsvpCounts.yes,
        maybe: rsvpCounts.maybe,
        no: rsvpCounts.no,
        plus: rsvpCounts.plusOnes,
      })}
    </Text>

    {#if rsvpTotal > 0}
      <div class="flex h-2.5 overflow-hidden rounded-full bg-paper-2">
        <div class="bg-accent" style="width: {pct(rsvpCounts.yes)}%"></div>
        <div style="width: {pct(rsvpCounts.maybe)}%; background:#ffba47"></div>
        <div style="width: {pct(rsvpCounts.no)}%; background:#7a7670"></div>
      </div>
    {/if}

    {#if data.rsvps.length === 0}
      <Text tone="subtle" size="sm">{m.manage_rsvps_empty()}</Text>
    {:else}
      <ul class="divide-y divide-rule">
        {#each data.rsvps as r, i (r.id)}
          {@const color = avatarColors[i % avatarColors.length]}
          <li class="flex items-center gap-3 py-3">
            <span
              class="font-display flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style="background: {color}; color: {lightAvatar.has(color) ? '#0a0a0a' : '#fff'}"
            >
              {r.name.slice(0, 1).toUpperCase()}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">{r.name}</p>
              {#if r.plusOnes || r.message}
                <p class="truncate font-mono text-[10px] text-ink-muted">
                  {#if r.plusOnes}+{r.plusOnes}{/if}
                  {#if r.plusOnes && r.message} · {/if}
                  {#if r.message}{r.message}{/if}
                </p>
              {/if}
            </div>
            <span
              class="shrink-0 rounded-md px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase {r.status ===
              'yes'
                ? 'bg-accent text-accent-ink'
                : r.status === 'maybe'
                  ? 'bg-amber-300 text-ink'
                  : 'border border-rule text-ink-muted'}"
            >
              {statusLabel(r.status)}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </Section>

  <!-- Upgrade -->
  <Section>
    <Heading level="panel">{m.manage_upgrade_heading()}</Heading>
    <Text tone="muted" size="sm">{m.manage_upgrade_body()}</Text>

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
      <div class="space-y-4">
        <label class="flex items-center gap-2 text-xs font-medium text-ink-muted">
          {m.manage_upgrade_currency_label()}
          <select
            bind:value={currency}
            class="rounded-lg border border-rule bg-card px-2.5 py-1.5 text-sm text-ink"
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
            class="space-y-3 rounded-xl border border-rule p-4"
          >
            <input type="hidden" name="tier" value="basic" />
            <input type="hidden" name="currency" value={currency} />
            <div>
              <p class="font-display text-base font-bold tracking-tight">{m.tier_basic_name()}</p>
              <p class="text-xs text-ink-muted">{m.tier_basic_tagline()}</p>
            </div>
            <p class="font-display text-3xl font-bold tracking-tighter">{basicPrice}</p>
            <ul class="space-y-1 text-xs text-ink-muted">
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
            class="space-y-3 rounded-xl border-2 border-ink p-4"
          >
            <input type="hidden" name="tier" value="plus" />
            <input type="hidden" name="currency" value={currency} />
            <div>
              <p class="font-display text-base font-bold tracking-tight">{m.tier_plus_name()}</p>
              <p class="text-xs text-ink-muted">{m.tier_plus_tagline()}</p>
            </div>
            <p class="font-display text-3xl font-bold tracking-tighter">{plusPrice}</p>
            <ul class="space-y-1 text-xs text-ink-muted">
              <li>· {m.tier_plus_item_everything_basic()}</li>
              <li>· {m.tier_plus_item_plus_ones()}</li>
              <li>· {m.tier_plus_item_password()}</li>
              <li>· {m.tier_plus_item_save_the_date()}</li>
            </ul>
            <Button type="submit" variant="accent" class="w-full">
              {m.manage_upgrade_choose_plus()}
            </Button>
          </form>
        </div>
      </div>
    {/if}
  </Section>

  <!-- Media -->
  <Section>
    <Heading level="panel">{m.manage_media_heading()}</Heading>
    <Text tone="muted" size="sm">{m.manage_media_hint()}</Text>

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
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {#each data.media as mediaItem (mediaItem.id)}
          <li class="space-y-2">
            {#if mediaItem.url}
              <img
                src={mediaItem.url}
                alt=""
                width="200"
                height="200"
                class="h-32 w-full rounded-xl object-cover"
              />
            {:else}
              <div
                class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-rule text-xs text-ink-muted"
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

    {#if data.event.isPaid}
      <form
        method="POST"
        action="?/uploadMedia&token={data.token}"
        enctype="multipart/form-data"
        use:enhance
        class="flex items-center gap-3"
      >
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          required
          class="block w-full text-sm text-ink-muted file:me-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-paper"
        />
        <Button type="submit" size="sm">{m.manage_media_upload()}</Button>
      </form>
    {:else}
      <Banner tone="info">{m.manage_media_premium_locked()}</Banner>
    {/if}
  </Section>

  <!-- Edit -->
  <Section>
    <Heading level="panel">{m.manage_edit_heading()}</Heading>

    {#if form?.updateSuccess}
      <Banner tone="success">{m.manage_edit_saved()}</Banner>
    {/if}
    {#if form?.updateError}
      <Banner tone="error">{localizeError(form.updateError)}</Banner>
    {/if}

    <form method="POST" action="?/update&token={data.token}" use:enhance class="space-y-3">
      <TextField
        name="title"
        value={data.event.title}
        maxlength={200}
        label={m.manage_edit_title_label()}
      />

      <label class="block">
        <span class={legendClass}>{m.manage_edit_description_label()}</span>
        <textarea name="description" rows="3" maxlength="5000" class={textareaClass}
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
        type="datetime-local"
        name="endsAt"
        value={endsAtForInput}
        label={m.manage_edit_ends_at_label()}
        hint={m.manage_edit_ends_at_hint()}
      />

      <TimezonePicker
        name="timezone"
        bind:value={editTimezone}
        label={m.manage_edit_timezone_label()}
        hint={m.manage_edit_timezone_hint()}
        listId="manage-edit-tz-list"
      />

      <TextField
        name="locationText"
        value={data.event.locationText ?? ''}
        maxlength={500}
        label={m.manage_edit_location_label()}
      />

      <Button type="submit">{m.manage_edit_submit()}</Button>
    </form>
  </Section>

  <!-- Announcements -->
  <Section>
    <Heading level="panel">{m.manage_announcements_heading()}</Heading>
    <Text tone="muted" size="sm">{m.manage_announcements_body()}</Text>

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

    <div class="flex flex-wrap gap-2">
      {#if paidTier === 'plus' && !data.announcements.some((a) => a.stage === 'save_the_date' && a.sentAt)}
        <form method="POST" action="?/announce&token={data.token}" use:enhance>
          <input type="hidden" name="stage" value="save_the_date" />
          <Button type="submit" variant="secondary" size="sm">
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
  </Section>

  <!-- Password -->
  <Section>
    <Heading level="panel">{m.manage_password_heading()}</Heading>
    <Text tone="muted" size="sm">
      {data.event.hasPassword
        ? m.manage_password_body_locked()
        : m.manage_password_body_unlocked()}
    </Text>

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
        class="flex flex-wrap gap-2"
      >
        <input
          type="password"
          name="password"
          minlength="4"
          maxlength="200"
          autocomplete="new-password"
          placeholder={m.manage_password_placeholder()}
          class="flex-1 rounded-xl border border-rule bg-card px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <Button type="submit" size="sm">
          {data.event.hasPassword ? m.manage_password_update() : m.manage_password_set()}
        </Button>
      </form>

      {#if data.event.hasPassword}
        <form method="POST" action="?/setPassword&token={data.token}" use:enhance>
          <input type="hidden" name="clear" value="1" />
          <Button type="submit" variant="secondary" size="sm">{m.manage_password_clear()}</Button>
        </form>
      {/if}
    {/if}
  </Section>

  <!-- Reminders -->
  <Section>
    <Heading level="panel">{m.manage_reminder_heading()}</Heading>
    <Text tone="muted" size="sm">{m.manage_reminder_body()}</Text>

    {#if form?.reminderQueued}
      <Banner tone="success">{m.manage_reminder_queued()}</Banner>
    {/if}
    {#if form?.reminderError}
      <Banner tone="error">{localizeError(form.reminderError)}</Banner>
    {/if}

    <form method="POST" action="?/remind&token={data.token}" use:enhance>
      <Button type="submit" variant="secondary" size="sm">{m.manage_reminder_submit()}</Button>
    </form>
  </Section>

  <!-- Danger zone -->
  <section class="rounded-card border border-coral/40 bg-coral/5 space-y-3 p-5">
    <Heading level="panel">{m.manage_delete_heading()}</Heading>
    <Text tone="muted" size="sm">{m.manage_delete_body()}</Text>

    {#if form && 'deleteError' in form && form.deleteError === 'manage_delete_confirm_required'}
      <Banner tone="warn">{m.manage_delete_confirm_required()}</Banner>
    {:else if form && 'deleteError' in form && form.deleteError}
      <Banner tone="error">{m.manage_delete_failed()}</Banner>
    {/if}

    <form method="POST" action="?/deleteEvent&token={data.token}" use:enhance class="space-y-3">
      <TextField
        label={m.manage_delete_confirm_label()}
        name="confirm"
        bind:value={deleteConfirm}
        placeholder="DELETE"
        hint={m.manage_delete_confirm_hint()}
      />
      <Button type="submit" variant="danger">{m.manage_delete_button()}</Button>
    </form>
  </section>
</section>
