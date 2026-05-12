<script lang="ts">
  import { version } from '$app/environment';
  import { ParaglideJS } from '@inlang/paraglide-sveltekit';
  import LanguageSwitcher from '$lib/design/LanguageSwitcher.svelte';
  import { i18n } from '$lib/i18n';
  import * as m from '$lib/paraglide/messages.js';
  import type { Snippet } from 'svelte';
  import type { LayoutProps } from './$types';
  import '../app.css';

  let { children }: LayoutProps & { children: Snippet } = $props();
</script>

<ParaglideJS {i18n}>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-slate-200 px-6 py-4">
      <div class="mx-auto flex max-w-4xl items-center justify-between">
        <a href="/" class="text-xl font-semibold tracking-tight">vite.in</a>
        <nav class="flex items-center gap-4 text-sm">
          <a href="/create" class="hover:underline">{m.nav_create()}</a>
          <a href="/pricing" class="hover:underline">{m.nav_pricing()}</a>
          <a href="/signin" class="hover:underline">{m.nav_signin()}</a>
        </nav>
      </div>
    </header>

    <main class="flex-1 px-6 py-12">
      {@render children()}
    </main>

    <footer class="border-t border-slate-200 px-6 py-6 text-sm text-slate-500">
      <div
        class="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <nav class="flex gap-4">
          <a href="/legal/impressum" class="hover:underline">{m.footer_impressum()}</a>
          <a href="/legal/privacy" class="hover:underline">{m.footer_privacy()}</a>
          <a href="/legal/terms" class="hover:underline">{m.footer_terms()}</a>
        </nav>
        <LanguageSwitcher />
      </div>
      <div
        class="mx-auto mt-4 max-w-4xl font-mono text-[10px] text-slate-400"
        aria-hidden="true"
        title="build"
      >
        {version}
      </div>
    </footer>
  </div>
</ParaglideJS>
