<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { addHoursToWall, utcToZonedWallTime } from '$lib/datetime';
  import {
    Banner,
    Button,
    DesignPreview,
    Heading,
    LayoutPicker,
    PresetPicker,
    Section,
    Text,
    TextField,
    ThemePicker,
    TimezonePicker,
    TypePicker,
  } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import { downsizeImageFile } from '$lib/image/downsize';
  import PushNotifications from '$lib/pwa/PushNotifications.svelte';
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
  // Wrap-in-block usage of `paidTier !== 'plus'` narrows the inner
  // type to `'basic' | null`, which then breaks the inner `=== 'plus'`
  // comparisons. The boolean alias keeps the markup short without
  // dragging the type narrowing into the block.
  const isAtTopTier = $derived(paidTier === 'plus');

  // Pre-fill the datetime-local inputs with the event's wall-clock time in
  // its own timezone — not the browser's — so the value the creator sees
  // and edits matches the event page, and the save round-trip is stable.
  let editStartsAt = $derived(utcToZonedWallTime(data.event.startsAt, data.event.timezone));
  let editEndsAt = $derived(
    data.event.endsAt ? utcToZonedWallTime(data.event.endsAt, data.event.timezone) : '',
  );

  // Live-sanitise the slug input: lowercase everything and strip out
  // anything outside [a-z0-9-]. Mobile keyboards autocapitalise the
  // first character by default; the corresponding `autocapitalize="off"`
  // hint on the input handles most of it, but a paste or a misbehaving
  // keyboard can still slip uppercase through, so we coerce on input.
  let slugValue = $state(data.event.slug);
  function sanitiseSlug(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const cleaned = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (cleaned !== target.value) target.value = cleaned;
    slugValue = cleaned;
  }

  // Focusing the empty end field suggests a 2-hour event (start + 2h).
  function suggestEndsAt() {
    if (!editEndsAt) editEndsAt = addHoursToWall(editStartsAt, 2);
  }

  // Writable `$derived`: seeded from the loaded event, reassignable as
  // the creator edits the timezone field.
  let editTimezone = $derived(data.event.timezone);

  let deleteConfirm = $state('');

  // The three design axes — local state seeded from the loaded event,
  // bound into the pickers so each tap updates the live preview
  // without a round-trip. The pickers' own radio `name`s submit on
  // form save (Preset isn't form-backed; it just rewrites all three).
  // svelte-ignore state_referenced_locally
  let designThemeId = $state(data.event.themeId);
  // svelte-ignore state_referenced_locally
  let designLayout = $state(data.event.layout);
  // svelte-ignore state_referenced_locally
  let designFontPairing = $state(data.event.fontPairing);
  let designTab = $state<'preset' | 'layout' | 'palette' | 'type'>('preset');

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
      <a href="/e/{data.event.slug}" class="hover:text-coral-deep">{data.event.title}</a>
    </h1>
    <p class="mt-2 font-mono text-[11px] text-ink-muted">
      {eventWhen}{#if data.event.locationText} · {data.event.locationText}{/if}
    </p>
  </header>

  <!-- share row — the URL itself is now a live link to the public
       event view; copy stays as the secondary action for sharing. -->
  <div class="rounded-card flex items-center gap-3 bg-ink p-3.5 ps-5 text-paper">
    <a
      href="/e/{data.event.slug}"
      class="min-w-0 flex-1 truncate font-mono text-sm text-paper hover:text-accent"
    >
      {page.url.host}/e/<span class="text-accent">{data.event.slug}</span>
    </a>
    <button
      type="button"
      onclick={copyLink}
      class="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink"
    >
      {copied ? m.event_copied() : m.event_copy_link()}
    </button>
  </div>

  <!-- push opt-in -->
  <PushNotifications creatorToken={data.token} />

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

  <!-- Upgrade — hidden once the event is on the highest tier (Plus). -->
  {#if !isAtTopTier}
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
  {/if}

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
        use:enhance={async ({ formData, cancel: _cancel }) => {
          // Downsize huge phone photos in the browser before they cross the
          // network — Workers can't safely decode > ~5 MP into RGBA.
          const original = formData.get('file');
          if (original instanceof File && original.size > 0) {
            try {
              const compact = await downsizeImageFile(original);
              if (compact !== original) formData.set('file', compact);
            } catch {
              // Stay permissive — submit the original on any failure.
            }
          }
        }}
        class="flex items-center gap-3"
      >
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
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

    {#if form?.detailsSuccess}
      <Banner tone="success">{m.manage_edit_saved()}</Banner>
    {/if}
    {#if form?.detailsError}
      <Banner tone="error">
        {localizeError(form.detailsError)}
        {#if 'updateStatus' in form && form.updateStatus}
          <code class="ms-2 text-xs opacity-70">HTTP {form.updateStatus}</code>
        {/if}
      </Banner>
    {/if}

    <form method="POST" action="?/update&token={data.token}" use:enhance class="space-y-3">
      <input type="hidden" name="formScope" value="details" />
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
        bind:value={editStartsAt}
        label={m.manage_edit_starts_at_label()}
      />

      <TextField
        type="datetime-local"
        name="endsAt"
        bind:value={editEndsAt}
        min={editStartsAt}
        onfocus={suggestEndsAt}
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

  <!-- Design — layout + colour palette + type pairing (ADR 0011 + 0013).
       A single Style section organised as: large live preview at the top,
       tab strip below, one picker visible at a time. All three pickers
       stay mounted so their radio inputs participate in the form submit
       regardless of which tab is open — visibility is purely CSS.
       Preset is a curated shortcut and writes to all three axes via
       two-way bindings. -->
  <Section>
    <Heading level="panel">{m.manage_theme_heading()}</Heading>
    {#if form?.designSuccess}
      <Banner tone="success">{m.manage_edit_saved()}</Banner>
    {/if}
    {#if form?.designError}
      <Banner tone="error">
        {localizeError(form.designError)}
        {#if 'updateStatus' in form && form.updateStatus}
          <code class="ms-2 text-xs opacity-70">HTTP {form.updateStatus}</code>
        {/if}
      </Banner>
    {/if}
    <form method="POST" action="?/update&token={data.token}" use:enhance class="space-y-5">
      <input type="hidden" name="formScope" value="design" />

      <div class="flex justify-center">
        <DesignPreview
          themeId={designThemeId}
          layout={designLayout}
          title={data.event.title}
          date={data.event.startsAt}
          timezone={data.event.timezone}
          location={data.event.locationText ?? ''}
        />
      </div>

      <div
        role="tablist"
        aria-label={m.manage_theme_heading()}
        class="grid grid-cols-4 gap-1 rounded-full border border-line bg-surface p-1"
      >
        {#each [{ id: 'preset', label: m.create_preset_label() }, { id: 'layout', label: m.create_layout_label() }, { id: 'palette', label: m.create_theme_label() }, { id: 'type', label: m.create_typography_label() }] as tab (tab.id)}
          {@const active = designTab === tab.id}
          <button
            type="button"
            role="tab"
            aria-selected={active}
            class={[
              'rounded-full px-3 py-2 text-xs font-medium transition',
              active ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink',
            ]}
            onclick={() => (designTab = tab.id as typeof designTab)}
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <!-- Preset is a writer over the three axes; no form field of its
           own. Wrapping in a hidden div keeps the bindings live so a
           preset tap updates the preview, layout, palette and type
           pickers simultaneously. -->
      <div class={designTab === 'preset' ? 'block' : 'hidden'}>
        <PresetPicker
          bind:layout={designLayout}
          bind:themeId={designThemeId}
          bind:fontPairing={designFontPairing}
        />
      </div>
      <div class={designTab === 'layout' ? 'block' : 'hidden'}>
        <LayoutPicker bind:value={designLayout} />
      </div>
      <div class={designTab === 'palette' ? 'block' : 'hidden'}>
        <ThemePicker bind:value={designThemeId} />
      </div>
      <div class={designTab === 'type' ? 'block' : 'hidden'}>
        <TypePicker bind:value={designFontPairing} />
      </div>

      <Button type="submit">{m.manage_edit_submit()}</Button>
    </form>
  </Section>

  <!-- Event URL — custom slug (paid tiers) -->
  {#if data.event.tier}
    <Section>
      <Heading level="panel">{m.manage_event_url_heading()}</Heading>
      {#if form?.slugSuccess}
        <Banner tone="success">{m.manage_edit_saved()}</Banner>
      {/if}
      {#if form?.slugError}
        <Banner tone="error">
          {localizeError(form.slugError)}
          {#if 'updateStatus' in form && form.updateStatus}
            <code class="ms-2 text-xs opacity-70">HTTP {form.updateStatus}</code>
          {/if}
        </Banner>
      {/if}
      <form method="POST" action="?/update&token={data.token}" use:enhance class="space-y-4">
        <input type="hidden" name="formScope" value="slug" />
        <TextField
          name="slug"
          bind:value={slugValue}
          oninput={sanitiseSlug}
          label={m.manage_event_url_label()}
          hint={m.manage_event_url_hint()}
          pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
          minlength={3}
          maxlength={64}
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          inputmode="url"
          required
        />
        <Button type="submit">{m.manage_edit_submit()}</Button>
      </form>
    </Section>
  {/if}

  <!-- Announcements — ADR 0012: personal accounts don't bulk-email. We keep
       any historical send rows visible (events that were sent before the
       decision still show their record) and otherwise nudge to the
       share-link affordance already at the top of the page. -->
  <Section>
    <Heading level="panel">{m.manage_announcements_heading()}</Heading>

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

    <Banner tone="info">{m.manage_announcements_share_instead()}</Banner>

    {#if data.stdUrl}
      <div class="mt-2 rounded-card border border-rule bg-paper-2/40 p-5">
        <h3 class="font-display text-lg font-bold tracking-tight">{m.manage_std_heading()}</h3>
        <p class="mt-1 text-sm text-ink-muted">{m.manage_std_body()}</p>

        <div class="mt-4 grid gap-5 sm:grid-cols-[auto_1fr]">
          <div
            class="flex h-32 w-32 items-center justify-center rounded-xl border border-rule bg-white p-2 sm:h-40 sm:w-40"
          >
            {#if data.stdQrSvg}
              <!-- QR SVG is produced by the `qrcode` lib server-side from the
                   Save-the-Date URL we just built — no user content lands in
                   this string, so the @html sink is sound. -->
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html data.stdQrSvg}
            {/if}
          </div>

          <div class="flex flex-col gap-3">
            <div class="break-all rounded-lg bg-ink/95 px-3 py-2 font-mono text-xs text-paper">
              {data.stdUrl}
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                onclick={() => navigator.clipboard?.writeText(data.stdUrl ?? '')}
                variant="secondary"
                size="sm"
              >
                {m.manage_std_copy_link()}
              </Button>
              <Button href={data.stdUrl} target="_blank" variant="secondary" size="sm">
                {m.manage_std_preview()}
              </Button>
            </div>
            <p class="text-xs text-ink-muted">{m.manage_std_qr_hint()}</p>
          </div>
        </div>
      </div>
    {/if}
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
