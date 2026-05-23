<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { Button } from '$lib/design';
  import type { Snippet } from 'svelte';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps & { children: Snippet } = $props();

  const navLink = 'rounded-full px-3 py-2 text-sm font-medium text-ink/70 transition hover:text-ink';
  const isActive = (path: string) =>
    page.url.pathname === path ? 'text-ink underline underline-offset-4' : '';
</script>

<div class="mx-auto max-w-4xl px-6 py-10">
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-5">
    <div>
      <p class="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">Admin</p>
      <p class="mt-0.5 font-medium">{data.user.email}</p>
    </div>
    <nav class="flex items-center gap-1">
      <a href="/admin" class="{navLink} {isActive('/admin')}">Dashboard</a>
      <a href="/admin/grants" class="{navLink} {isActive('/admin/grants')}">Grants</a>
      <a href="/account/dashboard" class={navLink}>My events</a>
      <form method="POST" action="/account/signout" use:enhance>
        <Button type="submit" variant="secondary" size="sm" class="ms-1">Sign out</Button>
      </form>
    </nav>
  </header>

  <div class="mt-8">
    {@render children()}
  </div>
</div>
