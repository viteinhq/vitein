<script lang="ts">
  /**
   * Live preview of an event's design for the create / manage forms.
   * Renders the *real* hero component for the chosen layout — so the
   * preview can never drift from the event page.
   *
   * The heroes use `sm:` viewport breakpoints, so they must be rendered at
   * the real event-page width to lay out correctly. We render the hero at
   * that full width (`STAGE_WIDTH`) and scale the whole stage down to fit
   * the form's preview slot — real component, real proportions, smaller.
   * The displayed box height is measured from the (unscaled) stage so the
   * preview is never a fixed/cropped square.
   *
   * The layout → hero mapping below mirrors `routes/e/[slug]/+page.svelte`;
   * keep the two in sync when a layout is added.
   */
  import BentoHero from '$lib/event/BentoHero.svelte';
  import CardHero from '$lib/event/CardHero.svelte';
  import EditorialHero from '$lib/event/EditorialHero.svelte';
  import MonoHero from '$lib/event/MonoHero.svelte';
  import PhotoHero from '$lib/event/PhotoHero.svelte';
  import PosterHero from '$lib/event/PosterHero.svelte';
  import StandardHero from '$lib/event/StandardHero.svelte';
  import TicketHero from '$lib/event/TicketHero.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { eventScopeStyle } from '$lib/themes';

  let {
    themeId,
    layout,
    fontPairing = 'bricolage-geist',
    title,
    date = '',
    timezone = '',
    location = '',
  }: {
    themeId: string;
    layout: string;
    fontPairing?: string;
    title: string;
    date?: string;
    timezone?: string;
    location?: string;
  } = $props();

  // The event page renders the hero inside `max-w-2xl` (672px).
  const STAGE_WIDTH = 672;
  const DISPLAY_WIDTH = 280;
  const scale = DISPLAY_WIDTH / STAGE_WIDTH;

  let stageHeight = $state(0);

  const event = $derived({
    title: title || m.create_field_title(),
    startsAt: '',
    endsAt: null,
    timezone,
    locationText: location || null,
  });

  const heroProps = $derived({
    event,
    cover: null,
    startsInEventTz: date,
    endsInEventTz: null,
    showLocalTime: false,
    startsInViewerTz: '',
  });
</script>

<div
  class="overflow-hidden rounded-card shadow-[0_24px_40px_-16px_rgba(0,0,0,0.25)]"
  style="width:{DISPLAY_WIDTH}px;height:{stageHeight * scale}px"
>
  <div
    bind:clientHeight={stageHeight}
    class="bg-paper px-6 py-8 text-ink"
    style="width:{STAGE_WIDTH}px;transform:scale({scale});transform-origin:top left;{eventScopeStyle(
      themeId,
      fontPairing,
    )}"
  >
    {#if layout === 'ticket'}
      <TicketHero {...heroProps} />
    {:else if layout === 'editorial'}
      <EditorialHero {...heroProps} />
    {:else if layout === 'poster'}
      <PosterHero {...heroProps} />
    {:else if layout === 'card'}
      <CardHero {...heroProps} />
    {:else if layout === 'photo'}
      <PhotoHero {...heroProps} />
    {:else if layout === 'bento'}
      <BentoHero {...heroProps} />
    {:else if layout === 'mono'}
      <MonoHero {...heroProps} />
    {:else}
      <StandardHero {...heroProps} />
    {/if}
  </div>
</div>
