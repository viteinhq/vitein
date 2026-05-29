<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';

  // Directions row shared by the event-page layouts. Google Maps and Apple
  // Maps both geocode a plain address string, so no coordinates are needed.
  let { locationText }: { locationText: string } = $props();

  const q = $derived(encodeURIComponent(locationText));
  const link = 'underline underline-offset-2 opacity-75 hover:opacity-100';
</script>

<div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px]">
  <span class="text-ink-muted">{m.event_directions()}</span>
  <a
    href="https://www.google.com/maps/dir/?api=1&destination={q}"
    target="_blank"
    rel="noopener noreferrer"
    class={link}
  >
    Google Maps
  </a>
  <a href="https://maps.apple.com/?daddr={q}" target="_blank" rel="noopener noreferrer" class={link}>
    Apple Maps
  </a>
  <a
    href="https://www.openstreetmap.org/search?query={q}"
    target="_blank"
    rel="noopener noreferrer"
    class={link}
  >
    OpenStreetMap
  </a>
</div>
