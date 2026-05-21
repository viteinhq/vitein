<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.recover_check_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-md px-6 py-20 text-center">
  <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-accent">
    <span class="font-display text-2xl font-bold text-accent-ink">✦</span>
  </div>
  <h1 class="font-display mt-6 text-3xl font-bold tracking-tighter">{m.recover_check_title()}</h1>
  <p class="mt-3 leading-relaxed text-ink-muted">{m.recover_check_body()}</p>
  <p class="mt-5 text-sm text-ink-muted">
    {m.recover_check_wrong_email()}
    <a href="/recover" class="font-medium text-ink underline">{m.recover_check_try_again()}</a>.
  </p>
</section>
