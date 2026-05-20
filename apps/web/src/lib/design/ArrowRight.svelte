<script lang="ts">
  /** Small right-arrow glyph for buttons and links. Inherits currentColor. */
  interface Props {
    size?: number;
    class?: string;
  }

  let { size = 14, class: classes = '' }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 14 14"
  fill="none"
  aria-hidden="true"
  class={classes}
>
  <path
    d="M2 7h10M8 3l4 4-4 4"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
