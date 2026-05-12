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

<section class="mx-auto max-w-md space-y-4 py-8 text-center">
  <p class="text-sm text-slate-500">{status}</p>
  <h1 class="text-2xl font-bold tracking-tight">{m.err_page_title()}</h1>
  {#if message}
    <p class="text-slate-600">{message}</p>
  {/if}
  <Button href="/" variant="secondary">{m.err_page_back_home()}</Button>
</section>
