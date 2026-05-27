<script lang="ts">
  import { version } from '$app/environment';
  import { page } from '$app/state';
  import { ArrowRight, Button, CookieConsent, LanguageSwitcher, Wordmark } from '$lib/design';
  import InstallPrompt from '$lib/pwa/InstallPrompt.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { localizeHref } from '$lib/paraglide/runtime';
  import type { Snippet } from 'svelte';
  import type { LayoutProps } from './$types';
  import '../app.css';

  let { data, children }: LayoutProps & { children: Snippet } = $props();

  const showCookieBanner = $derived(
    data.consent.isConsentRegion && data.consent.choice === null,
  );

  // A paid event's public page drops vite.in chrome — the Basic-tier
  // `no_branding` feature. The event page's load sets `noBranding`.
  const hideBranding = $derived(page.data.noBranding === true);

  const navLink = 'rounded-full px-3 py-2 text-sm font-medium text-ink/70 transition hover:text-ink';
</script>

<div class="flex min-h-screen flex-col">
  {#if !hideBranding}
    <header class="border-b border-rule">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-6">
        <Wordmark href={localizeHref('/')} size={23} />
        <nav class="flex items-center gap-1">
          <a href={localizeHref('/pricing')} class="{navLink} hidden sm:inline-block">
            {m.nav_pricing()}
          </a>
          {#if data.signedIn}
            <a
              href={localizeHref('/account/dashboard')}
              class="{navLink} hidden sm:inline-block"
            >
              {m.nav_dashboard()}
            </a>
          {:else}
            <a href={localizeHref('/signin')} class="{navLink} hidden sm:inline-block">
              {m.nav_signin()}
            </a>
          {/if}
          <Button href={localizeHref('/create')} variant="accent" size="sm" class="ms-1">
            {m.nav_create()}
            <ArrowRight size={12} />
          </Button>
        </nav>
      </div>
    </header>
  {/if}

    <main class="flex-1">
      {@render children()}
    </main>

    {#if hideBranding}
      <!-- No-branding event page: a quiet legal-only footer — the GDPR
           links must stay reachable, but the vite.in brand/marketing goes. -->
      <footer class="border-t border-rule">
        <div
          class="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-5 gap-y-1 px-6 py-5 text-center font-mono text-[10px] tracking-wide text-ink-muted"
        >
          <a href={localizeHref('/legal/impressum')} class="hover:text-ink">
            {m.footer_impressum()}
          </a>
          <a href={localizeHref('/legal/privacy')} class="hover:text-ink">{m.footer_privacy()}</a>
          <a href={localizeHref('/legal/terms')} class="hover:text-ink">{m.footer_terms()}</a>
        </div>
      </footer>
    {:else}
      <footer class="bg-ink text-paper">
        <div class="mx-auto max-w-5xl px-6 py-12">
        <div class="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div class="max-w-xs">
            <Wordmark href={localizeHref('/')} size={26} onDark class="text-paper" />
            <p class="mt-3 text-sm leading-relaxed text-paper/55">{m.footer_tagline()}</p>
          </div>
          <nav class="flex gap-12 text-sm">
            <div class="flex flex-col gap-2.5">
              <span class="font-mono text-[10px] tracking-[0.12em] text-paper/55 uppercase">
                vite.in
              </span>
              <a href={localizeHref('/create')} class="text-paper/75 hover:text-paper">
                {m.nav_create()}
              </a>
              <a href={localizeHref('/pricing')} class="text-paper/75 hover:text-paper">
                {m.nav_pricing()}
              </a>
              <a
                href="https://github.com/viteinhq/vitein"
                class="text-paper/75 hover:text-paper"
                rel="noopener"
              >
                {m.home_oss_link()}
              </a>
            </div>
            <div class="flex flex-col gap-2.5">
              <span class="font-mono text-[10px] tracking-[0.12em] text-paper/55 uppercase">
                Legal
              </span>
              <a href={localizeHref('/legal/impressum')} class="text-paper/75 hover:text-paper">
                {m.footer_impressum()}
              </a>
              <a href={localizeHref('/legal/privacy')} class="text-paper/75 hover:text-paper">
                {m.footer_privacy()}
              </a>
              <a href={localizeHref('/legal/terms')} class="text-paper/75 hover:text-paper">
                {m.footer_terms()}
              </a>
            </div>
          </nav>
        </div>

        <div
          class="mt-10 flex flex-col gap-4 border-t border-paper/15 pt-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <LanguageSwitcher />
            <span class="font-mono text-[10px] text-paper/55">AGPL-3.0 · open source</span>
          </div>
          <span class="font-mono text-[10px] text-paper/55" aria-hidden="true" title="build">
            {version}
          </span>
        </div>
        </div>
      </footer>
    {/if}
  </div>
<CookieConsent initialShown={showCookieBanner} />
<InstallPrompt suppressed={showCookieBanner || hideBranding} />
