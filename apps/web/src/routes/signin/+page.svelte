<script lang="ts">
  import { enhance } from '$app/forms';
  import { Banner, Button, TextField } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
</script>

<svelte:head>
  <title>{m.signin_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-6">
  <h1 class="text-3xl font-bold tracking-tight">{m.signin_title()}</h1>
  <p class="text-slate-600">{m.signin_blurb()}</p>

  {#if form?.error}
    <Banner tone="error">
      <p>{localizeError(form.error, { status: 'status' in form ? form.status : undefined })}</p>
      {#if 'details' in form && form.details}
        <pre class="mt-2 overflow-x-auto text-xs">{form.details}</pre>
      {/if}
    </Banner>
  {/if}

  <form method="POST" use:enhance class="space-y-3">
    <TextField type="email" name="email" required label={m.signin_email_label()} />
    <Button type="submit" class="w-full">{m.signin_submit()}</Button>
  </form>
</section>
