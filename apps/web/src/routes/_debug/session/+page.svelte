<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Session debug</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto max-w-3xl space-y-6">
  <h1 class="text-2xl font-bold">Session debug</h1>

  <div class="space-y-2 rounded-md border border-slate-200 p-4">
    <p class="text-sm font-medium">Request</p>
    <p class="text-xs text-slate-600">URL: <code>{data.requestUrl}</code></p>
    <p class="text-xs text-slate-600">Origin: <code>{data.origin}</code></p>
  </div>

  <div class="space-y-2 rounded-md border border-slate-200 p-4">
    <p class="text-sm font-medium">Cookies on this request</p>
    <p class="text-xs text-slate-600">
      Raw Cookie header length: <code>{data.cookieHeaderLength}</code>
    </p>
    <p class="text-xs text-slate-600">Cookie names ({data.cookieNames.length}):</p>
    <ul class="ms-4 list-disc text-xs">
      {#each data.cookieNames as name (name)}
        <li><code>{name}</code></li>
      {/each}
    </ul>
  </div>

  <div class="space-y-2 rounded-md border border-slate-200 p-4">
    <p class="text-sm font-medium">/v1/users/me result (our middleware)</p>
    <p class="text-xs text-slate-600">
      HTTP status: <code>{data.meStatus ?? 'error'}</code>
    </p>
    <pre class="overflow-x-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(
        data.meBody,
        null,
        2,
      )}</pre>
  </div>

  <div class="space-y-2 rounded-md border border-slate-200 p-4">
    <p class="text-sm font-medium">/v1/auth/get-session result (Better-Auth direct)</p>
    <p class="text-xs text-slate-600">
      HTTP status: <code>{data.sessionStatus ?? 'error'}</code>
    </p>
    <pre class="overflow-x-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(
        data.sessionBody,
        null,
        2,
      )}</pre>
  </div>
</section>
