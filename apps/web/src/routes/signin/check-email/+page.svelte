<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.signin_check_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-md space-y-4 text-center">
  <h1 class="text-3xl font-bold tracking-tight">{m.signin_check_title()}</h1>
  <p class="text-slate-600">{m.signin_check_body()}</p>
  <p class="text-sm text-slate-500">
    {m.signin_check_wrong_email()} <a href="/signin" class="underline">{m.signin_check_try_again()}</a>.
  </p>
</section>
