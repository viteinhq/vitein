<script lang="ts">
  import { Banner } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.legal_terms_title()} — vite.in</title></svelte:head>

<section class="mx-auto max-w-2xl space-y-4">
  <h1 class="text-3xl font-bold tracking-tight">{m.legal_terms_title()}</h1>
  <Banner tone="warn">{m.legal_draft()}</Banner>
</section>
