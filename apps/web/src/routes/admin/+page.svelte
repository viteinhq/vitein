<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const cards = $derived([
    { label: 'Users', value: data.stats.users.total, sub: `+${data.stats.users.last30d} last 30d` },
    {
      label: 'Events',
      value: data.stats.events.total,
      sub: `+${data.stats.events.last30d} last 30d`,
    },
    {
      label: 'Paid events',
      value: data.stats.events.paid,
      sub: `${data.stats.events.basic} basic · ${data.stats.events.plus} plus`,
    },
    {
      label: 'Free events',
      value: data.stats.events.free,
      sub: 'no payment / grant',
    },
    {
      label: 'RSVPs',
      value: data.stats.rsvps.total,
      sub: `+${data.stats.rsvps.plusOnes} plus-ones`,
    },
    {
      label: 'Payments (30d)',
      value: data.stats.payments.last30dCount,
      sub: 'audit log payment.completed',
    },
    {
      label: 'Active grants',
      value: data.stats.grants.active,
      sub: `${data.stats.grants.revoked} revoked`,
    },
  ]);
</script>

<svelte:head>
  <title>Admin — vite.in</title>
</svelte:head>

<section class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-display text-3xl font-bold tracking-tighter sm:text-4xl">Dashboard</h1>
  </div>

  <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {#each cards as c (c.label)}
      <div class="rounded-card border border-rule bg-card p-4">
        <dt class="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">{c.label}</dt>
        <dd class="font-display mt-1 text-3xl font-bold tracking-tighter tabular-nums">
          {c.value}
        </dd>
        <p class="mt-1 font-mono text-[10px] tracking-wide text-ink-muted">{c.sub}</p>
      </div>
    {/each}
  </dl>
</section>
