<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button, Heading, Section, Text } from '$lib/design';
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

<section class="mx-auto max-w-md space-y-6">
  <Heading level="page">{m.oauth_consent_title()}</Heading>

  {#if data.invalid}
    <Text>{m.oauth_consent_invalid_request()}</Text>
  {:else}
    <Text>{m.oauth_consent_intro({ appName: data.clientName })}</Text>

    <Section>
      <Heading level="panel">{m.oauth_consent_scopes_heading()}</Heading>
      <ul class="space-y-1 list-disc ps-5">
        {#each data.scopes as scope (scope)}
          <li><Text size="sm">{describe(scope)}</Text></li>
        {/each}
      </ul>
    </Section>

    <form method="POST" use:enhance class="flex gap-2">
      <input type="hidden" name="oauth_query" value={data.oauthQuery} />
      <input type="hidden" name="scope" value={data.scopes.join(' ')} />
      <Button type="submit" name="decision" value="accept" class="flex-1">
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

    <Text tone="subtle" size="sm">{m.oauth_consent_note()}</Text>
  {/if}
</section>
