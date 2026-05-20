<script lang="ts">
  import { browser } from '$app/environment';
  import * as m from '$lib/paraglide/messages.js';
  import Button from './Button.svelte';

  /**
   * Bottom-of-viewport, non-modal cookie consent banner. Shown only
   * when the visitor is in a GDPR jurisdiction (server-side detection
   * via cf-ipcountry) and hasn't made a choice yet.
   *
   * The choice persists as a first-party cookie (`vitein_consent`):
   * `accepted` opts in to all non-essential cookies / trackers,
   * `essential` keeps only what's strictly required (auth, language).
   * Year-long Max-Age so we don't re-prompt on every visit.
   *
   * No DB row, no API call — DSGVO consent records aren't required to
   * be server-side as long as the cookie is auditable. Phase 2 can add
   * a server-side record table if regulators expect that, but for
   * launch the cookie + privacy page disclosure are sufficient.
   */
  const { initialShown = false }: { initialShown?: boolean } = $props();

  // `dismissed` is local UI state; once the user clicks, hide the banner
  // immediately even though the server-rendered `initialShown` is still
  // true for this page-load. The cookie write makes the next SSR pass
  // return `initialShown=false`.
  let dismissed = $state(false);
  const visible = $derived(initialShown && !dismissed);

  function setChoice(value: 'accepted' | 'essential') {
    if (!browser) return;
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `vitein_consent=${value}; Path=/; Max-Age=${oneYear}; SameSite=Lax; Secure`;
    dismissed = true;
  }
</script>

{#if visible}
  <div
    role="region"
    aria-label={m.cookie_consent_title()}
    class="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-card shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.25)]"
  >
    <div
      class="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="space-y-1 text-sm">
        <p class="font-display font-bold tracking-tight text-ink">{m.cookie_consent_title()}</p>
        <p class="text-ink-muted">
          {m.cookie_consent_body()}
          <a href="/legal/privacy" class="underline">{m.cookie_consent_link_privacy()}</a>
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <Button variant="secondary" onclick={() => setChoice('essential')}>
          {m.cookie_consent_essential_only()}
        </Button>
        <Button onclick={() => setChoice('accepted')}>
          {m.cookie_consent_accept_all()}
        </Button>
      </div>
    </div>
  </div>
{/if}
