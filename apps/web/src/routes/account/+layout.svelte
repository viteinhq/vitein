<script lang="ts">
  import { enhance } from '$app/forms';
  import * as m from '$lib/paraglide/messages.js';
  import type { Snippet } from 'svelte';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps & { children: Snippet } = $props();
</script>

<div class="mx-auto max-w-4xl space-y-6">
  <header class="flex items-center justify-between border-b border-slate-200 pb-4">
    <div>
      <p class="text-sm text-slate-500">{m.account_signed_in_as()}</p>
      <p class="font-medium">{data.user.email}</p>
    </div>
    <nav class="flex items-center gap-3 text-sm">
      <a href="/account/dashboard" class="underline">{m.account_nav_dashboard()}</a>
      <form method="POST" action="/account/signout" use:enhance>
        <button
          type="submit"
          class="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
        >
          {m.account_signout()}
        </button>
      </form>
    </nav>
  </header>

  {@render children()}
</div>
