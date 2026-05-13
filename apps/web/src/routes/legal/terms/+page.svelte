<script lang="ts">
  import { Banner, Heading } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.legal_terms_title()} — vite.in</title></svelte:head>

<section class="mx-auto max-w-2xl space-y-4">
  <Heading>{m.legal_terms_title()}</Heading>
  <Banner tone="warn">{m.legal_draft()}</Banner>
</section>
