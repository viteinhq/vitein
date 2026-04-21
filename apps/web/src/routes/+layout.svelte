<script lang="ts">
  import { page } from '$app/state';
  import { i18n } from '$lib/i18n';
  import { languageTag, availableLanguageTags } from '$lib/paraglide/runtime.js';
  import * as m from '$lib/paraglide/messages.js';
  import type { Snippet } from 'svelte';
  import type { LayoutProps } from './$types';
  import '../app.css';

  let { children }: LayoutProps & { children: Snippet } = $props();

  const canonicalPath = $derived(i18n.route(page.url.pathname));
  const other = $derived(availableLanguageTags.find((l) => l !== languageTag()) ?? 'en');
  const switchHref = $derived(i18n.resolveRoute(canonicalPath, other));
</script>

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
      <a
        href={switchHref}
        hreflang={other}
        data-sveltekit-reload
        class="text-xs text-slate-500 hover:underline"
      >
        {other === 'de' ? m.footer_switch_to_de() : m.footer_switch_to_en()}
      </a>
    </div>
  </footer>
</div>
