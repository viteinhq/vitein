<script lang="ts">
  /**
   * Location field with address autocomplete (ADR 0010).
   *
   * A `TextField` plus a `<datalist>` whose options are fetched, debounced,
   * from the same-origin `/api/geocode` proxy as the user types. Same
   * native-autocomplete approach as `TimezonePicker` — no custom dropdown.
   *
   * Degrades cleanly: with no geocoder key configured the proxy returns no
   * suggestions, leaving an ordinary free-text location input.
   */
  import { browser } from '$app/environment';
  import TextField from './TextField.svelte';

  interface Props {
    name?: string;
    label: string;
    value?: string;
    hint?: string;
    maxlength?: number;
    listId?: string;
  }

  let {
    name = 'locationText',
    label,
    value = $bindable(''),
    hint,
    maxlength = 500,
    listId = 'location-list',
  }: Props = $props();

  let suggestions = $state<string[]>([]);

  // Debounced lookup: each keystroke schedules a fetch and the cleanup
  // cancels the previous one, so only a 300ms-quiet query goes out.
  $effect(() => {
    const q = value.trim();
    if (!browser || q.length < 3) {
      suggestions = [];
      return;
    }
    const timer = setTimeout(() => void lookup(q), 300);
    return () => clearTimeout(timer);
  });

  async function lookup(q: string): Promise<void> {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { suggestions?: string[] };
      suggestions = data.suggestions ?? [];
    } catch {
      /* offline or geocoder down — keep the last suggestions */
    }
  }
</script>

<datalist id={listId}>
  {#each suggestions as s (s)}
    <option value={s}></option>
  {/each}
</datalist>

<TextField {name} {label} {hint} {maxlength} bind:value list={listId} />
