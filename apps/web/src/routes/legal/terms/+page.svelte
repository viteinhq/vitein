<script lang="ts">
  import { Banner, Heading, Section, Text } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.legal_terms_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-2xl space-y-6">
  <Heading level="page">{m.legal_terms_title()}</Heading>

  <Banner tone="warn">
    <p class="font-medium">{m.legal_needs_review_title()}</p>
    <p class="mt-1 text-sm">{m.legal_needs_review_body()}</p>
  </Banner>

  <Section>
    <Heading level="panel">{m.terms_intro_heading()}</Heading>
    <Text>
      {@html m.terms_intro_body({
        privacyLink: `<a class="underline" href="/legal/privacy">${m.terms_intro_privacy_link()}</a>`,
      })}
    </Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_service_heading()}</Heading>
    <Text>{m.terms_service_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_account_heading()}</Heading>
    <Text>{m.terms_account_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_use_heading()}</Heading>
    <Text>{m.terms_use_body()}</Text>
    <ul class="list-disc space-y-1 ps-5 text-sm text-slate-700">
      <li>{m.terms_use_item_illegal()}</li>
      <li>{m.terms_use_item_spam()}</li>
      <li>{m.terms_use_item_harass()}</li>
      <li>{m.terms_use_item_abuse()}</li>
      <li>{m.terms_use_item_resell()}</li>
    </ul>
    <Text size="sm">{m.terms_use_consequences()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_premium_heading()}</Heading>
    <Text>
      {@html m.terms_premium_body({
        pricingLink: `<a class="underline" href="/pricing">${m.terms_premium_pricing_link()}</a>`,
      })}
    </Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_refund_heading()}</Heading>
    <Text>{m.terms_refund_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_termination_heading()}</Heading>
    <Text>
      {@html m.terms_termination_body({
        settingsLink: `<a class="underline" href="/account/settings">${m.terms_termination_settings_link()}</a>`,
      })}
    </Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_liability_heading()}</Heading>
    <Text>{m.terms_liability_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_changes_heading()}</Heading>
    <Text>{m.terms_changes_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_law_heading()}</Heading>
    <Text>{m.terms_law_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.terms_contact_heading()}</Heading>
    <Text>{m.terms_contact_body()}</Text>
  </Section>

  <Text tone="subtle" size="sm">
    {m.legal_last_updated({ date: '2026-05-19' })}
  </Text>
</section>
