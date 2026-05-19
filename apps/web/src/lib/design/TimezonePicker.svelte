<script lang="ts">
  /**
   * IANA timezone picker.
   *
   * Renders a TextField with an attached `<datalist>` driven by
   * `Intl.supportedValuesOf('timeZone')` (~600 entries on every modern
   * browser; iOS 15.4+, Chrome 99+, FF 93+ all ship it). The datalist
   * gives the user native autocomplete without a custom dropdown
   * component — type "Berl", get "Europe/Berlin"; type "Asia/", scan
   * the list.
   *
   * Falls back to a hand-picked short list when the API isn't
   * available (older runtimes or weird sandboxes). The text input
   * itself accepts any string — server validates against the IANA
   * database — so a missing datalist degrades gracefully.
   *
   * Why datalist over a custom combobox: native a11y (axe-clean),
   * native keyboard nav, native mobile UX. The cost is no styling
   * over the dropdown, which we don't need at this size.
   */
  import TextField from './TextField.svelte';

  interface Props {
    name?: string;
    label: string;
    value?: string;
    hint?: string;
    /** DOM id for the datalist; allows multiple pickers on one page. */
    listId?: string;
  }

  let {
    name = 'timezone',
    label,
    value = $bindable(''),
    hint,
    listId = 'tz-list',
  }: Props = $props();

  const timezoneOptions = $derived.by<string[]>(() => {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      try {
        return (
          Intl as unknown as { supportedValuesOf: (k: string) => string[] }
        ).supportedValuesOf('timeZone');
      } catch {
        /* fall through */
      }
    }
    return ['UTC', 'Europe/Zurich', 'Europe/Berlin', 'Europe/London', 'America/New_York'];
  });
</script>

<datalist id={listId}>
  {#each timezoneOptions as tz (tz)}
    <option value={tz}></option>
  {/each}
</datalist>

<TextField {name} {label} {hint} bind:value list={listId} />
