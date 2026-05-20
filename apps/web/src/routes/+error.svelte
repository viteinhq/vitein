<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';

  const status = $derived(page.status);
  const message = $derived(
    page.error?.code ? localizeError(page.error.code) : (page.error?.message ?? ''),
  );
</script>

<svelte:head>
  <title>{status} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-md px-6 py-24 text-center">
  <p class="font-display text-7xl leading-none font-bold tracking-tighter text-coral-deep">
    {status}
  </p>
  <h1 class="font-display mt-4 text-2xl font-bold tracking-tight">{m.err_page_title()}</h1>
  {#if message}
    <p class="mt-2 leading-relaxed text-ink-muted">{message}</p>
  {/if}
  <div class="mt-7 flex justify-center">
    <Button href="/" variant="secondary">{m.err_page_back_home()}</Button>
  </div>
</section>
