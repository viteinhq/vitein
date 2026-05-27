<script lang="ts">
  /**
   * Share menu for an event URL — opens on a single Share button and
   * lists curated targets: WhatsApp, Telegram, SMS / iMessage, Email,
   * Line, Copy, plus the OS native share sheet via the Web Share API
   * when available. Facebook Messenger and WeChat are intentionally
   * left out for now (Messenger needs an FB app id; WeChat has no
   * URL scheme, would need a QR-code overlay).
   *
   * The component is purely client-side — `navigator.share` is
   * detected on mount so SSR isn't polluted with a "Native share"
   * entry that won't actually fire.
   */
  import * as m from '$lib/paraglide/messages.js';

  interface Props {
    url: string;
    title: string;
    /** Optional message body that surrounds the URL on text-based targets. */
    text?: string;
  }

  let { url, title, text }: Props = $props();

  let open = $state(false);
  let copied = $state(false);
  let hasNativeShare = $state(false);

  $effect(() => {
    hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  });

  // Body of text-based shares: the title sentence + url on its own line.
  // Each target encodes / interpolates its own way, but the source string
  // stays consistent.
  const shareText = $derived(text ?? title);
  const shareBody = $derived(`${shareText}\n${url}`);

  const targets = $derived([
    {
      id: 'whatsapp',
      label: m.share_whatsapp(),
      // `wa.me/?text=…` works on both mobile (opens native WhatsApp) and
      // desktop (opens WhatsApp Web). The `whatsapp://` scheme would
      // fail on desktop.
      href: `https://wa.me/?text=${encodeURIComponent(shareBody)}`,
      external: true,
      icon: 'whatsapp' as const,
    },
    {
      id: 'telegram',
      label: m.share_telegram(),
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`,
      external: true,
      icon: 'telegram' as const,
    },
    {
      id: 'sms',
      label: m.share_sms(),
      // `sms:&body=…` is the form Apple Messages (and so iMessage)
      // honours; Android tolerates it too. The `?body=…` form breaks
      // on iOS.
      href: `sms:&body=${encodeURIComponent(shareBody)}`,
      external: false,
      icon: 'sms' as const,
    },
    {
      id: 'email',
      label: m.share_email(),
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareBody)}`,
      external: false,
      icon: 'email' as const,
    },
    {
      id: 'line',
      label: m.share_line(),
      href: `https://line.me/R/msg/text/?${encodeURIComponent(shareBody)}`,
      external: true,
      icon: 'line' as const,
    },
  ]);

  async function copy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(url);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  async function shareNative() {
    if (!hasNativeShare) return;
    try {
      await navigator.share({ title, text: shareText, url });
      open = false;
    } catch {
      // User cancelled the OS share sheet — leave the menu open so they
      // can pick a specific target instead.
    }
  }
</script>

<div class="relative inline-block">
  <button
    type="button"
    onclick={() => (open = !open)}
    aria-expanded={open}
    aria-haspopup="menu"
    class="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:brightness-105"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a3 3 0 1 0-2.83-4H15l-7 4M18 8a3 3 0 1 1-2.83 4h-.17l-7-4M8 8a3 3 0 1 0 0 8m0-8a3 3 0 1 1 0 8m0 0 7 4h.17M18 16a3 3 0 1 0 0 0Z"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    {m.event_share()}
  </button>

  {#if open}
    <!-- Menu — anchored to the trigger on desktop, fixed bottom-sheet
         on phones so it never overflows the viewport edge. -->
    <div
      role="menu"
      class="rounded-card fixed inset-x-3 bottom-3 z-30 border border-rule bg-card p-2 shadow-lg sm:absolute sm:inset-auto sm:end-0 sm:top-full sm:mt-2 sm:w-64"
    >
      {#if hasNativeShare}
        <button
          type="button"
          role="menuitem"
          onclick={shareNative}
          class="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm text-ink hover:bg-paper-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 4v12m0-12-4 4m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {m.share_more()}
        </button>
        <div class="my-1 border-t border-rule"></div>
      {/if}

      {#each targets as t (t.id)}
        <a
          href={t.href}
          target={t.external ? '_blank' : undefined}
          rel={t.external ? 'noopener noreferrer' : undefined}
          role="menuitem"
          onclick={() => (open = false)}
          class="flex items-center gap-3 rounded-full px-3 py-2 text-sm text-ink hover:bg-paper-2"
        >
          {#if t.icon === 'whatsapp'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.34 4.94L2.1 22l5.32-1.4a9.85 9.85 0 0 0 4.62 1.17h.01c5.43 0 9.85-4.42 9.85-9.86 0-2.64-1.03-5.11-2.85-6.99zM12.05 20.1a8.17 8.17 0 0 1-4.17-1.14l-.3-.18-3.16.83.84-3.07-.19-.32a8.17 8.17 0 0 1-1.25-4.36c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.85 5.8 2.4a8.16 8.16 0 0 1 2.4 5.8c0 4.53-3.68 8.24-8.17 8.24zm4.51-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.55.12-.16.25-.64.81-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.45-1.37-1.7-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.43h-.47c-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.16 1.74 2.66 4.21 3.72.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.07-.11-.23-.18-.48-.3z"
              />
            </svg>
          {:else if t.icon === 'telegram'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"
              />
            </svg>
          {:else if t.icon === 'sms'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          {:else if t.icon === 'email'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 4 8 5 8-5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          {:else if t.icon === 'line'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M19.36 4.51A12 12 0 0 0 12 2C5.94 2 1 5.83 1 10.55c0 4.27 4.03 7.83 9.5 8.45.37.08.87.24 1 .55.1.28.07.71.04.99 0 0-.13.81-.16.99-.05.28-.23 1.1 1 .6s6.61-3.89 9.02-6.66c1.65-1.81 2.6-3.79 2.6-5.92 0-2.3-1.16-4.4-3.05-6.04zM7.9 13.34h-2.4c-.3 0-.55-.25-.55-.55v-4.8c0-.3.25-.55.55-.55s.55.25.55.55v4.25h1.85c.3 0 .55.25.55.55 0 .3-.25.55-.55.55zm2.2-.55c0 .3-.25.55-.55.55s-.55-.25-.55-.55v-4.8c0-.3.25-.55.55-.55s.55.25.55.55zm6 0c0 .24-.15.45-.38.52-.06.02-.11.03-.17.03-.18 0-.34-.08-.45-.22l-2.46-3.34v3.01c0 .3-.25.55-.55.55s-.55-.25-.55-.55v-4.8c0-.24.15-.45.38-.52.06-.02.11-.03.17-.03.18 0 .34.08.45.22l2.47 3.35v-3.02c0-.3.24-.55.55-.55.3 0 .55.25.55.55zm3.83-2.95a.55.55 0 0 1 0 1.1H17.6v1.3h1.85a.55.55 0 0 1 0 1.1h-2.4c-.3 0-.55-.25-.55-.55v-4.8c0-.3.25-.55.55-.55h2.4a.55.55 0 0 1 0 1.1H17.6v1.3z"
              />
            </svg>
          {/if}
          {t.label}
        </a>
      {/each}

      <div class="my-1 border-t border-rule"></div>
      <button
        type="button"
        role="menuitem"
        onclick={copy}
        class="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm text-ink hover:bg-paper-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 4h10a2 2 0 0 1 2 2v12M4 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {copied ? m.event_copied() : m.event_copy_link()}
      </button>
    </div>

    <!-- Click-outside catcher — pure presentational button so it doesn't
         trap keyboard focus. -->
    <button
      type="button"
      aria-label="Close share menu"
      class="fixed inset-0 z-20 cursor-default bg-transparent"
      onclick={() => (open = false)}
    ></button>
  {/if}
</div>
