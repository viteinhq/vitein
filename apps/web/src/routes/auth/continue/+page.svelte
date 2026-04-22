<script lang="ts">
  import { enhance } from '$app/forms';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.signin_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-4 text-center">
  <h1 class="text-2xl font-bold tracking-tight">{m.auth_continue_title()}</h1>
  <p class="text-sm text-slate-600">{m.auth_continue_body()}</p>
  <form method="POST" use:enhance>
    <button
      type="submit"
      class="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
    >
      {m.auth_continue_submit()}
    </button>
  </form>
  <p class="text-xs text-slate-400">{m.auth_continue_note()}</p>
</section>
