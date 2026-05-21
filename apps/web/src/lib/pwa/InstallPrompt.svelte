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

  // Suppressed while the cookie-consent banner is up — both are bottom-fixed,
  // so showing them together would overlap. The consent gate wins; the
  // install prompt reappears once consent is resolved. The
  // `beforeinstallprompt` listener still attaches, so the event isn't missed.
  const { suppressed = false }: { suppressed?: boolean } = $props();

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
    // Show the "Add to Home Screen" hint only on real iOS (iPhone/iPad).
    // `navigator.standalone` is NOT enough — macOS Safari exposes it too,
    // so it false-positives on desktop. Detect the device by UA instead;
    // iPadOS reports as "Macintosh", so also accept a touch-capable Mac.
    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isIOS && !installed) {
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

{#if !suppressed && !dismissed && deferred}
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
{:else if !suppressed && !dismissed && iosHint}
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
