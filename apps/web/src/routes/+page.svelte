<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>vite.in — coming soon</title>
</svelte:head>

<section class="mx-auto max-w-2xl space-y-6">
  <h1 class="text-4xl font-bold tracking-tight">vite.in v2 — coming soon</h1>

  <p class="text-lg text-slate-600">
    The global invitation platform, rebuilt from scratch. Web, iOS, Android, MCP — one API behind them all.
  </p>

  <div class="rounded-lg border border-slate-200 p-4">
    <p class="text-sm font-medium text-slate-500">API health</p>
    {#if data.health}
      <ul class="mt-2 space-y-1 text-sm">
        <li><span class="text-slate-500">status:</span> {data.health.status}</li>
        <li><span class="text-slate-500">environment:</span> {data.health.environment}</li>
        <li><span class="text-slate-500">db:</span> {data.health.db}</li>
        <li><span class="text-slate-500">ts:</span> {data.health.ts}</li>
      </ul>
    {:else}
      <p class="mt-2 text-sm text-slate-500">API unreachable from this environment.</p>
    {/if}
  </div>
</section>
