<script lang="ts">
  import { browser } from '$app/environment';
  import { Button } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';

  // `beforeinstallprompt` is Chromium-only (Android, desktop). iOS never
  // fires it — there a manual "Add to Home Screen" hint is the only path,
  // and on iOS that install is also a hard requirement for Web Push.
  interface InstallEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  const DISMISS_KEY = 'vitein-install-dismissed';

  let deferred = $state<InstallEvent | null>(null);
  let iosHint = $state(false);
  let dismissed = $state(false);

  $effect(() => {
    if (!browser) return;
    if (localStorage.getItem(DISMISS_KEY)) {
      dismissed = true;
      return;
    }
    // iOS Safari exposes the non-standard `navigator.standalone`: `false`
    // in a normal tab, `true` once added to the Home Screen. It is
    // `undefined` everywhere else — so a strict boolean check that is
    // false isolates "iOS, not yet installed".
    const nav = navigator as Navigator & { standalone?: boolean };
    if (typeof nav.standalone === 'boolean' && !nav.standalone) {
      iosHint = true;
    }
    const onPrompt = (event: Event): void => {
      event.preventDefault();
      deferred = event as InstallEvent;
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  });

  async function install(): Promise<void> {
    const event = deferred;
    if (!event) return;
    deferred = null;
    await event.prompt();
  }

  function dismiss(): void {
    dismissed = true;
    deferred = null;
    iosHint = false;
    if (browser) localStorage.setItem(DISMISS_KEY, '1');
  }
</script>

{#if !dismissed && deferred}
  <div
    class="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-card border border-rule bg-card p-3 shadow-lg"
  >
    <p class="flex-1 text-sm leading-snug">{m.install_prompt()}</p>
    <Button variant="accent" size="sm" onclick={install}>{m.install_action()}</Button>
    <button
      type="button"
      onclick={dismiss}
      aria-label={m.install_dismiss()}
      class="text-ink-muted hover:text-ink"
    >
      ✕
    </button>
  </div>
{:else if !dismissed && iosHint}
  <div
    class="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-card border border-rule bg-card p-3 shadow-lg"
  >
    <p class="flex-1 text-sm leading-snug">{m.ios_install_hint()}</p>
    <button
      type="button"
      onclick={dismiss}
      aria-label={m.install_dismiss()}
      class="text-ink-muted hover:text-ink"
    >
      ✕
    </button>
  </div>
{/if}
