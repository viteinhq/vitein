<script lang="ts">
  import { enhance } from '$app/forms';
  import { Banner, Button, TextField } from '$lib/design';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }
</script>

<svelte:head>
  <title>Grants — Admin — vite.in</title>
</svelte:head>

<section class="space-y-6">
  <div>
    <h1 class="font-display text-3xl font-bold tracking-tighter sm:text-4xl">Premium grants</h1>
    <p class="mt-1 text-sm text-ink-muted">
      Email addresses on this list create events that are automatically upgraded to premium. Only
      newly created events are upgraded; existing events are not touched. Always tier&nbsp;<span
        class="font-mono">plus</span
      >.
    </p>
  </div>

  {#if form && 'added' in form && form.added}
    <Banner tone="success"><p>Granted premium to <strong>{form.added}</strong>.</p></Banner>
  {/if}
  {#if form && 'revoked' in form && form.revoked}
    <Banner tone="success"><p>Grant revoked.</p></Banner>
  {/if}
  {#if form && 'addError' in form && form.addError}
    <Banner tone="error"><p>Could not add grant: <code>{form.addError}</code></p></Banner>
  {/if}
  {#if form && 'revokeError' in form && form.revokeError}
    <Banner tone="error"><p>Could not revoke: <code>{form.revokeError}</code></p></Banner>
  {/if}

  <form
    method="POST"
    action="?/add"
    use:enhance
    class="grid grid-cols-1 gap-3 rounded-card border border-rule bg-paper-2/40 p-4 sm:grid-cols-[2fr_1fr_auto]"
  >
    <TextField
      label="Email"
      name="email"
      type="email"
      required
      placeholder="friend@example.com"
      value={form && 'email' in form ? (form.email as string) : ''}
    />
    <TextField
      label="Note (optional)"
      name="note"
      placeholder="family / friend"
      value={form && 'note' in form ? (form.note as string) : ''}
    />
    <div class="flex items-end">
      <input type="hidden" name="tier" value="plus" />
      <Button type="submit" variant="accent" size="sm" class="w-full sm:w-auto">Add grant</Button>
    </div>
  </form>

  {#if data.grants.length === 0}
    <div class="rounded-card border border-rule bg-paper-2/40 p-6">
      <p class="text-sm text-ink-muted">No grants yet.</p>
    </div>
  {:else}
    <ul class="overflow-hidden rounded-card border border-rule">
      {#each data.grants as g, i (g.id)}
        <li
          class="flex items-center justify-between gap-3 bg-card p-4 {i > 0
            ? 'border-t border-rule'
            : ''} {g.revokedAt ? 'opacity-60' : ''}"
        >
          <div class="min-w-0">
            <p class="font-medium">{g.email}</p>
            <p class="mt-0.5 truncate font-mono text-[11px] text-ink-muted">
              {g.tier} · added {formatDate(g.createdAt)}
              {#if g.note}· {g.note}{/if}
              {#if g.revokedAt}· revoked {formatDate(g.revokedAt)}{/if}
            </p>
          </div>
          {#if !g.revokedAt}
            <form method="POST" action="?/revoke" use:enhance>
              <input type="hidden" name="id" value={g.id} />
              <Button type="submit" variant="secondary" size="sm">Revoke</Button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
