<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button, Eyebrow } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageData } from './$types';

  const { data }: { data: PageData } = $props();

  // Scope → localized description. Unknown scopes fall back to their
  // raw key so an MCP client requesting a new scope still renders
  // something instead of vanishing.
  const scopeLabels: Record<string, () => string> = {
    openid: m.oauth_scope_openid,
    profile: m.oauth_scope_profile,
    email: m.oauth_scope_email,
    offline_access: m.oauth_scope_offline_access,
    'events:read': m.oauth_scope_events_read,
    'events:write': m.oauth_scope_events_write,
    'guests:read': m.oauth_scope_guests_read,
    'guests:write': m.oauth_scope_guests_write,
    'rsvps:read': m.oauth_scope_rsvps_read,
    'rsvps:write': m.oauth_scope_rsvps_write,
  };

  function describe(scope: string): string {
    const fn = scopeLabels[scope];
    return fn ? fn() : scope;
  }
</script>

<svelte:head>
  <title>{m.oauth_consent_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-md px-6 py-16">
  <Eyebrow num="◇" label="OAuth" />
  <h1 class="font-display mt-4 text-3xl font-bold tracking-tighter">
    {m.oauth_consent_title()}
  </h1>

  {#if data.invalid}
    <p class="mt-3 leading-relaxed text-ink-muted">{m.oauth_consent_invalid_request()}</p>
  {:else}
    <p class="mt-3 leading-relaxed text-ink-muted">
      {m.oauth_consent_intro({ appName: data.clientName })}
    </p>

    <div class="mt-6 rounded-card border border-rule bg-card p-5">
      <span class="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
        {m.oauth_consent_scopes_heading()}
      </span>
      <ul class="mt-3 space-y-2">
        {#each data.scopes as scope (scope)}
          <li class="flex gap-2 text-sm">
            <span class="text-coral">·</span>
            <span>{describe(scope)}</span>
          </li>
        {/each}
      </ul>
    </div>

    <form method="POST" use:enhance class="mt-6 flex gap-2">
      <input type="hidden" name="oauth_query" value={data.oauthQuery} />
      <input type="hidden" name="scope" value={data.scopes.join(' ')} />
      <Button type="submit" name="decision" value="accept" variant="accent" class="flex-1">
        {m.oauth_consent_approve()}
      </Button>
      <Button
        type="submit"
        name="decision"
        value="deny"
        variant="secondary"
        class="flex-1"
      >
        {m.oauth_consent_deny()}
      </Button>
    </form>

    <p class="mt-4 text-xs leading-relaxed text-ink-muted/70">{m.oauth_consent_note()}</p>
  {/if}
</section>
