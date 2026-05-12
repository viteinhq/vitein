<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.signin_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-4 text-center">
  <h1 class="text-2xl font-bold tracking-tight">{m.auth_continue_title()}</h1>
  <p class="text-sm text-slate-600">{m.auth_continue_body()}</p>
  <form method="POST" use:enhance>
    <Button type="submit" class="w-full">{m.auth_continue_submit()}</Button>
  </form>
  <p class="text-xs text-slate-400">{m.auth_continue_note()}</p>
</section>
