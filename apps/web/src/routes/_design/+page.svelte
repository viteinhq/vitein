<script lang="ts">
  import { Banner, Button, Card, Heading, Text, TextField } from '$lib/design';

  let fieldValue = $state('');
</script>

<svelte:head>
  <title>Design system — vite.in</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto max-w-3xl space-y-12">
  <header class="space-y-2">
    <Heading>Design system</Heading>
    <Text tone="muted" size="sm">
      Live preview of every primitive exported from <code>$lib/design</code>. Add a new component
      here when you add one to the barrel — otherwise the catalog drifts.
    </Text>
  </header>

  <section class="space-y-4">
    <Heading level="section">Heading</Heading>
    <Heading level="page">Page heading (h1)</Heading>
    <Heading level="section">Section heading (h2)</Heading>
    <Heading level="subsection">Subsection heading (h3)</Heading>
  </section>

  <section class="space-y-4">
    <Heading level="section">Text</Heading>
    <Text>Default paragraph (slate-700).</Text>
    <Text tone="muted">Muted paragraph (slate-600).</Text>
    <Text tone="subtle" size="sm">Subtle small caption (slate-500).</Text>
  </section>

  <section class="space-y-4">
    <Heading level="section">Button</Heading>
    <div class="flex flex-wrap gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button size="sm">Primary sm</Button>
      <Button size="sm" variant="secondary">Secondary sm</Button>
      <Button size="sm" variant="danger">Danger sm</Button>
      <Button disabled>Disabled</Button>
    </div>
  </section>

  <section class="space-y-4">
    <Heading level="section">Card</Heading>
    <div class="grid gap-3 sm:grid-cols-2">
      <Card>
        <p class="text-sm">Default card. Hairline border, white background.</p>
      </Card>
      <Card tone="info">
        <p class="text-sm">Info — soft sky tint.</p>
      </Card>
      <Card tone="success">
        <p class="text-sm">Success — emerald tint. Used by the create-event success panel.</p>
      </Card>
      <Card tone="warn">
        <p class="text-sm">Warn — amber tint. Use sparingly.</p>
      </Card>
    </div>
  </section>

  <section class="space-y-4">
    <Heading level="section">Banner</Heading>
    <Banner>Info banner — neutral message.</Banner>
    <Banner tone="success">Success — saved, queued, completed.</Banner>
    <Banner tone="warn">Warn — partial success, soft failure.</Banner>
    <Banner tone="error">Error — request failed, blocking.</Banner>
  </section>

  <section class="space-y-4">
    <Heading level="section">TextField</Heading>
    <div class="grid gap-4 sm:grid-cols-2">
      <TextField bind:value={fieldValue} label="Title" placeholder="My event" />
      <TextField label="With hint" hint="Optional helper text below the input." />
      <TextField label="With error" error="Please enter at least 3 characters." />
      <TextField label="Disabled" disabled value="cannot edit me" />
    </div>
  </section>

  <section class="space-y-4">
    <Heading level="section">Tokens</Heading>
    <p class="text-sm text-slate-600">
      Colors come from Tailwind's slate / emerald / amber / red / sky scales. Logical-property
      spacing classes (<code>ps-*</code>, <code>pe-*</code>) are preferred over physical (<code
        >pl-*</code
      >, <code>pr-*</code>) so RTL languages flip cleanly when we ship them in Phase 3.
    </p>
  </section>
</section>
