<script lang="ts">
  import { browser } from '$app/environment';
  import { Button } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
  import { decodeVapidKey } from '$lib/pwa/vapid';

  // Creator token from the magic-link URL; null for signed-in owners
  // (the session cookie carries their auth instead).
  let { creatorToken = null }: { creatorToken?: string | null } = $props();

  type Status = 'idle' | 'subscribed' | 'denied' | 'working';
  let status = $state<Status>('idle');
  let supported = $state(false);
  let iosTabHint = $state(false);

  $effect(() => {
    if (!browser) return;
    supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) {
      // iOS Safari in a tab exposes `navigator.standalone === false` but no
      // PushManager — push only works in the installed PWA. Surface that
      // instead of leaving an empty space.
      const nav = navigator as Navigator & { standalone?: boolean };
      iosTabHint = nav.standalone === false;
      return;
    }
    if (Notification.permission === 'denied') {
      status = 'denied';
      return;
    }
    void syncStatus();
  });

  async function syncStatus(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.ready;
      status = (await reg.pushManager.getSubscription()) ? 'subscribed' : 'idle';
    } catch {
      status = 'idle';
    }
  }

  async function enable(): Promise<void> {
    status = 'working';
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        status = permission === 'denied' ? 'denied' : 'idle';
        return;
      }
      const keyRes = await fetch('/api/push');
      if (!keyRes.ok) throw new Error('vapid key unavailable');
      const { key } = (await keyRes.json()) as { key: string };

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(key),
      });

      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: creatorToken, subscription: subscription.toJSON() }),
      });
      if (!res.ok) throw new Error('registration failed');
      status = 'subscribed';
    } catch {
      status = 'idle';
    }
  }

  async function disable(): Promise<void> {
    status = 'working';
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: creatorToken, endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      status = 'idle';
    } catch {
      void syncStatus();
    }
  }
</script>

{#if supported}
  <div class="rounded-card border border-rule bg-card p-4">
    {#if status === 'denied'}
      <p class="text-xs leading-relaxed text-ink-muted">{m.push_denied()}</p>
    {:else}
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold">{m.push_title()}</p>
          <p class="mt-0.5 text-xs leading-relaxed text-ink-muted">{m.push_subtitle()}</p>
        </div>
        {#if status === 'subscribed'}
          <Button variant="secondary" size="sm" onclick={disable}>{m.push_disable()}</Button>
        {:else}
          <Button variant="accent" size="sm" disabled={status === 'working'} onclick={enable}>
            {status === 'working' ? m.push_working() : m.push_enable()}
          </Button>
        {/if}
      </div>
    {/if}
  </div>
{:else if iosTabHint}
  <div class="rounded-card border border-rule bg-card p-4">
    <p class="text-sm font-semibold">{m.push_title()}</p>
    <p class="mt-0.5 text-xs leading-relaxed text-ink-muted">{m.push_ios_hint()}</p>
  </div>
{/if}
