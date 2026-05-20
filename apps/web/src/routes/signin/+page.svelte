<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowRight, Banner, Button, Eyebrow, TextField } from '$lib/design';
  import { localizeError } from '$lib/errors';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
</script>

<svelte:head>
  <title>{m.signin_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-sm px-6 py-16">
  <Eyebrow num="→" label="vite.in" />
  <h1 class="font-display mt-4 text-4xl font-bold tracking-tighter">{m.signin_title()}</h1>
  <p class="mt-3 text-base leading-relaxed text-ink-muted">{m.signin_blurb()}</p>

  {#if form?.error}
    <div class="mt-5">
      <Banner tone="error">
        <p>{localizeError(form.error, { status: 'status' in form ? form.status : undefined })}</p>
        {#if 'details' in form && form.details}
          <pre class="mt-2 overflow-x-auto text-xs">{form.details}</pre>
        {/if}
      </Banner>
    </div>
  {/if}

  <form method="POST" use:enhance class="mt-6 space-y-3">
    <TextField type="email" name="email" required label={m.signin_email_label()} />
    <Button type="submit" variant="accent" size="lg" class="w-full">
      {m.signin_submit()}
      <ArrowRight size={15} />
    </Button>
  </form>
</section>
