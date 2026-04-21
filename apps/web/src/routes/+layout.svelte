<script lang="ts">
  import { page } from '$app/state';
  import { t } from '$lib/i18n';
  import type { Snippet } from 'svelte';
  import type { LayoutProps } from './$types';
  import '../app.css';

  let { data, children }: LayoutProps & { children: Snippet } = $props();

  const locale = $derived(data.locale);
  const currentPath = $derived(page.url.pathname);
  const otherLocale = $derived(locale === 'de' ? 'en' : 'de');
</script>

<div class="flex min-h-screen flex-col">
  <header class="border-b border-slate-200 px-6 py-4">
    <div class="mx-auto flex max-w-4xl items-center justify-between">
      <a href="/" class="text-xl font-semibold tracking-tight">vite.in</a>
      <nav class="flex items-center gap-4 text-sm">
        <a href="/create" class="hover:underline">{t('nav.create', locale)}</a>
        <a href="/pricing" class="hover:underline">{t('nav.pricing', locale)}</a>
        <a href="/signin" class="hover:underline">{t('nav.signin', locale)}</a>
      </nav>
    </div>
  </header>

  <main class="flex-1 px-6 py-12">
    {@render children()}
  </main>

  <footer class="border-t border-slate-200 px-6 py-6 text-sm text-slate-500">
    <div class="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav class="flex gap-4">
        <a href="/legal/impressum" class="hover:underline">{t('footer.impressum', locale)}</a>
        <a href="/legal/privacy" class="hover:underline">{t('footer.privacy', locale)}</a>
        <a href="/legal/terms" class="hover:underline">{t('footer.terms', locale)}</a>
      </nav>
      <a
        href="/locale?set={otherLocale}&to={currentPath}"
        data-sveltekit-preload-data="off"
        class="text-xs text-slate-500 hover:underline"
      >
        {locale === 'de' ? 'English' : 'Deutsch'}
      </a>
    </div>
  </footer>
</div>
