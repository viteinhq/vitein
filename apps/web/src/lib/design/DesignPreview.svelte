<script lang="ts">
  /**
   * Live preview of an event's design for the create form. Renders the
   * *real* hero component for the chosen `layout`, themed by `themeId` —
   * narrow, so it shows the layout's mobile rendering. Using the actual
   * component (not a schematic) means the preview can never drift from
   * what the event page renders.
   */
  import StandardHero from '$lib/event/StandardHero.svelte';
  import TicketHero from '$lib/event/TicketHero.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { themeStyle } from '$lib/themes';

  let {
    themeId,
    layout,
    title,
    date = '',
    timezone = '',
    location = '',
  }: {
    themeId: string;
    layout: string;
    title: string;
    date?: string;
    timezone?: string;
    location?: string;
  } = $props();

  const event = $derived({
    title: title || m.create_field_title(),
    startsAt: '',
    endsAt: null,
    timezone,
    locationText: location || null,
  });
</script>

<div
  style={themeStyle(themeId)}
  class="w-72 overflow-hidden rounded-card bg-paper p-3 text-ink shadow-[0_24px_40px_-16px_rgba(0,0,0,0.25)]"
>
  {#if layout === 'ticket'}
    <TicketHero
      {event}
      cover={null}
      startsInEventTz={date}
      endsInEventTz={null}
      showLocalTime={false}
      startsInViewerTz=""
    />
  {:else}
    <StandardHero
      {event}
      cover={null}
      startsInEventTz={date}
      endsInEventTz={null}
      showLocalTime={false}
      startsInViewerTz=""
    />
  {/if}
</div>
