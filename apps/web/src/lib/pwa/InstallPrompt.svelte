<script lang="ts">
  import { browser } from '$app/environment';
  import { Button } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';

  // `beforeinstallprompt` is Chromium-only; iOS has no equivalent event.
  interface InstallEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  const DISMISS_KEY = 'vitein-install-dismissed';

  let deferred = $state<InstallEvent | null>(null);
  let dismissed = $state(false);

  $effect(() => {
    if (!browser) return;
    if (localStorage.getItem(DISMISS_KEY)) {
      dismissed = true;
      return;
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
    if (browser) localStorage.setItem(DISMISS_KEY, '1');
  }
</script>

{#if deferred && !dismissed}
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
{/if}
