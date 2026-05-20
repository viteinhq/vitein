<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowRight, Button } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.signin_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-sm px-6 py-20 text-center">
  <h1 class="font-display text-3xl font-bold tracking-tighter">{m.auth_continue_title()}</h1>
  <p class="mt-3 text-sm leading-relaxed text-ink-muted">{m.auth_continue_body()}</p>
  <form method="POST" use:enhance class="mt-6">
    <Button type="submit" variant="accent" size="lg" class="w-full">
      {m.auth_continue_submit()}
      <ArrowRight size={15} />
    </Button>
  </form>
  <p class="mt-4 text-xs leading-relaxed text-ink-muted">{m.auth_continue_note()}</p>
</section>
