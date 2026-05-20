<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
  import type { Snippet } from 'svelte';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps & { children: Snippet } = $props();

  const navLink = 'rounded-full px-3 py-2 text-sm font-medium text-ink/70 transition hover:text-ink';
</script>

<div class="mx-auto max-w-3xl px-6 py-10">
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-5">
    <div>
      <p class="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
        {m.account_signed_in_as()}
      </p>
      <p class="mt-0.5 font-medium">{data.user.email}</p>
    </div>
    <nav class="flex items-center gap-1">
      <a href="/account/dashboard" class={navLink}>{m.account_nav_dashboard()}</a>
      <a href="/account/settings" class={navLink}>{m.account_nav_settings()}</a>
      <form method="POST" action="/account/signout" use:enhance>
        <Button type="submit" variant="secondary" size="sm" class="ms-1">
          {m.account_signout()}
        </Button>
      </form>
    </nav>
  </header>

  <div class="mt-8">
    {@render children()}
  </div>
</div>
