<script lang="ts">
  import { Heading, Text } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.signin_check_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-md space-y-4 text-center">
  <Heading>{m.signin_check_title()}</Heading>
  <Text tone="muted">{m.signin_check_body()}</Text>
  <Text tone="subtle" size="sm">
    {m.signin_check_wrong_email()} <a href="/signin" class="underline">{m.signin_check_try_again()}</a>.
  </Text>
</section>
