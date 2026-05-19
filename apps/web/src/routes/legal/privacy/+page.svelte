<script lang="ts">
  import { Banner, Heading, Section, Text } from '$lib/design';
  import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
  <title>{m.legal_privacy_title()} — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-2xl space-y-6">
  <Heading level="page">{m.legal_privacy_title()}</Heading>

  <Banner tone="warn">
    <p class="font-medium">{m.legal_needs_review_title()}</p>
    <p class="mt-1 text-sm">{m.legal_needs_review_body()}</p>
  </Banner>

  <Section>
    <Heading level="panel">{m.privacy_intro_heading()}</Heading>
    <Text>{m.privacy_intro_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_controller_heading()}</Heading>
    <Text>
      {@html m.privacy_controller_body({
        impressumLink: `<a class="underline" href="/legal/impressum">${m.privacy_controller_link_label()}</a>`,
      })}
    </Text>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_data_heading()}</Heading>
    <div class="space-y-3 text-sm">
      <div>
        <p class="font-medium">{m.privacy_data_anonymous_label()}</p>
        <p class="text-slate-700">{m.privacy_data_anonymous_body()}</p>
      </div>
      <div>
        <p class="font-medium">{m.privacy_data_rsvps_label()}</p>
        <p class="text-slate-700">{m.privacy_data_rsvps_body()}</p>
      </div>
      <div>
        <p class="font-medium">{m.privacy_data_account_label()}</p>
        <p class="text-slate-700">{m.privacy_data_account_body()}</p>
      </div>
      <div>
        <p class="font-medium">{m.privacy_data_payment_label()}</p>
        <p class="text-slate-700">{m.privacy_data_payment_body()}</p>
      </div>
      <div>
        <p class="font-medium">{m.privacy_data_logs_label()}</p>
        <p class="text-slate-700">{m.privacy_data_logs_body()}</p>
      </div>
    </div>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_basis_heading()}</Heading>
    <Text>{m.privacy_basis_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_subprocessors_heading()}</Heading>
    <Text>{m.privacy_subprocessors_body()}</Text>
    <ul class="list-disc space-y-1 ps-5 text-sm text-slate-700">
      <li>{m.privacy_subprocessor_cloudflare()}</li>
      <li>{m.privacy_subprocessor_neon()}</li>
      <li>{m.privacy_subprocessor_resend()}</li>
      <li>{m.privacy_subprocessor_stripe()}</li>
      <li>{m.privacy_subprocessor_sentry()}</li>
    </ul>
    <Text tone="subtle" size="sm">{m.privacy_subprocessor_note()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_cookies_heading()}</Heading>
    <Text>{m.privacy_cookies_body()}</Text>
    <ul class="list-disc space-y-1 ps-5 text-sm text-slate-700">
      <li>{@html m.privacy_cookie_consent()}</li>
      <li>{@html m.privacy_cookie_lang()}</li>
      <li>{@html m.privacy_cookie_session()}</li>
    </ul>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_retention_heading()}</Heading>
    <Text>{m.privacy_retention_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_rights_heading()}</Heading>
    <Text>{m.privacy_rights_body()}</Text>
    <ul class="list-disc space-y-2 ps-5 text-sm text-slate-700">
      <li>{@html m.privacy_rights_self()}</li>
      <li>{@html m.privacy_rights_contact()}</li>
    </ul>
    <Text size="sm" tone="subtle">{m.privacy_rights_complaint()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_transfers_heading()}</Heading>
    <Text>{m.privacy_transfers_body()}</Text>
  </Section>

  <Section>
    <Heading level="panel">{m.privacy_changes_heading()}</Heading>
    <Text>{m.privacy_changes_body()}</Text>
  </Section>

  <Text tone="subtle" size="sm">
    {m.legal_last_updated({ date: '2026-05-19' })}
  </Text>
</section>
