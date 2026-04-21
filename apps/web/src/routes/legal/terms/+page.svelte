<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.legal_terms_title()} — vite.in</title></svelte:head>

<section class="mx-auto max-w-2xl space-y-4">
  <h1 class="text-3xl font-bold tracking-tight">{m.legal_terms_title()}</h1>
  <p class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
    {m.legal_draft()}
  </p>
</section>
