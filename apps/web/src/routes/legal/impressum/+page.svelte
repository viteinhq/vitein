<script lang="ts">
  import { Banner, Heading, Section, Text } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.legal_impressum_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-2xl space-y-6 px-6 py-12">
  <Heading level="page">{m.legal_impressum_title()}</Heading>

  <Banner tone="warn">
    <p class="font-medium">{m.legal_needs_review_title()}</p>
    <p class="mt-1 text-sm">{m.legal_needs_review_body()}</p>
  </Banner>

  <Text tone="muted" size="sm">{m.impressum_intro()}</Text>

  <Section>
    <Heading level="panel">{m.impressum_operator_heading()}</Heading>
    <dl class="space-y-2 text-sm">
      <div class="grid grid-cols-3 gap-2">
        <dt class="font-medium text-ink-muted">{m.impressum_operator_name_label()}</dt>
        <dd class="col-span-2 text-ink">{m.impressum_operator_name_value()}</dd>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <dt class="font-medium text-ink-muted">{m.impressum_operator_address_label()}</dt>
        <dd class="col-span-2 whitespace-pre-line text-ink">
          {m.impressum_operator_address_value()}
        </dd>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <dt class="font-medium text-ink-muted">Country</dt>
        <dd class="col-span-2 text-ink">{m.impressum_operator_country_value()}</dd>
      </div>
    </dl>
  </Section>

  <Section>
    <Heading level="panel">{m.impressum_contact_heading()}</Heading>
    <dl class="space-y-2 text-sm">
      <div class="grid grid-cols-3 gap-2">
        <dt class="font-medium text-ink-muted">{m.impressum_contact_email_label()}</dt>
        <dd class="col-span-2">
          <a class="underline" href="mailto:{m.impressum_contact_email_value()}">
            {m.impressum_contact_email_value()}
          </a>
        </dd>
      </div>
    </dl>
    <Text tone="subtle" size="sm">{m.impressum_contact_response_note()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.impressum_responsible_heading()}</Heading>
    <Text size="sm">{m.impressum_responsible_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.impressum_vat_heading()}</Heading>
    <Text size="sm">{m.impressum_vat_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.impressum_dispute_heading()}</Heading>
    <Text size="sm">
      <!-- Message contains an <a>; render as HTML so the link is clickable. -->
      {@html m.impressum_dispute_body()}
    </Text>
  </Section>

  <Text tone="subtle" size="sm">
    {m.legal_last_updated({ date: '2026-05-19' })}
  </Text>
</section>
