<script lang="ts">
  import { page } from '$app/state';
  import { endonym } from '$lib/i18n-locales';
  import {
    deLocalizeHref,
    getLocale,
    localizeHref,
    locales,
    type Locale,
  } from '$lib/paraglide/runtime.js';

  /**
   * Language switcher built to scale beyond eight locales — search input
   * always rendered, so the same control works whether we ship 8 or 30
   * languages (per Smashing UX guidance for 10+ locales).
   *
   * Endonyms only, no flags. Full keyboard nav (Arrow/Enter/Escape).
   * `data-sveltekit-reload` forces a fresh load so Paraglide picks up the
   * new locale on server-side render rather than negotiating from cookie
   * after the fact.
   */

  let open = $state(false);
  let query = $state('');
  let triggerEl: HTMLButtonElement | null = $state(null);
  let listEl: HTMLDivElement | null = $state(null);
  let inputEl: HTMLInputElement | null = $state(null);
  let focused = $state(0);

  const current = $derived(getLocale());
  const canonicalPath = $derived(deLocalizeHref(page.url.pathname));

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const tags = [...locales] as Locale[];
    if (!q) return tags;
    return tags.filter((tag) => {
      const name = endonym(tag).toLowerCase();
      return tag.startsWith(q) || name.startsWith(q) || name.includes(q);
    });
  });

  function toggle() {
    open = !open;
    query = '';
    focused = Math.max(0, (locales as readonly Locale[]).indexOf(current));
    if (open) {
      // Defer focus so the input exists.
      void Promise.resolve().then(() => inputEl?.focus());
    }
  }

  function close() {
    open = false;
    query = '';
  }

  function onWindowKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      triggerEl?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focused = Math.min(filtered.length - 1, focused + 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focused = Math.max(0, focused - 1);
      return;
    }
    if (e.key === 'Enter') {
      const tag = filtered[focused];
      if (!tag) return;
      e.preventDefault();
      window.location.href = localizeHref(canonicalPath, { locale: tag });
    }
  }

  function onWindowClick(e: MouseEvent) {
    if (!open) return;
    const target = e.target as Node | null;
    if (
      target &&
      !triggerEl?.contains(target) &&
      !listEl?.contains(target)
    ) {
      close();
    }
  }
</script>

<svelte:window onkeydown={onWindowKey} onclick={onWindowClick} />

<div class="relative inline-block text-left">
  <button
    bind:this={triggerEl}
    type="button"
    onclick={toggle}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls="lang-switcher-list"
    class="inline-flex items-center gap-1.5 rounded-full border border-rule bg-card px-3 py-1.5 text-xs text-ink transition hover:bg-paper-2"
  >
    <span>{endonym(current)}</span>
    <span aria-hidden="true" class="text-ink-muted">▾</span>
  </button>

  {#if open}
    <div
      bind:this={listEl}
      id="lang-switcher-list"
      class="absolute end-0 bottom-full z-20 mb-1 w-52 overflow-hidden rounded-xl border border-rule bg-card shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)]"
    >
      <input
        bind:this={inputEl}
        bind:value={query}
        oninput={() => (focused = 0)}
        type="search"
        autocomplete="off"
        aria-label="Filter languages"
        placeholder="Search…"
        class="block w-full border-b border-rule bg-transparent px-3 py-2.5 text-xs text-ink focus:outline-none"
      />
      {#if filtered.length === 0}
        <p class="px-3 py-2 text-xs text-ink-muted">No matches.</p>
      {:else}
        <ul role="listbox" aria-label="Languages" class="max-h-64 overflow-y-auto py-1">
          {#each filtered as tag, i (tag)}
            {@const href = localizeHref(canonicalPath, { locale: tag })}
            <li>
              <a
                {href}
                hreflang={tag}
                data-sveltekit-reload
                role="option"
                aria-selected={tag === current}
                class:bg-paper-2={i === focused}
                class="block px-3 py-1.5 text-xs hover:bg-paper-2 {tag === current
                  ? 'font-medium text-ink'
                  : 'text-ink-muted'}"
                onclick={close}
              >
                {endonym(tag)}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
