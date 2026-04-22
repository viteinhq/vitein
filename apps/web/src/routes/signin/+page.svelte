<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
</script>

<svelte:head>
  <title>Sign in — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-6">
  <h1 class="text-3xl font-bold tracking-tight">Sign in</h1>
  <p class="text-slate-600">
    Enter your email and we'll send you a one-time magic link. No password needed.
  </p>

  {#if form?.error}
    <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <p>{form.error}</p>
      {#if form.details}
        <pre class="mt-2 overflow-x-auto text-xs">{form.details}</pre>
      {/if}
    </div>
  {/if}

  <form method="POST" use:enhance class="space-y-3">
    <label class="block">
      <span class="text-sm font-medium">Email</span>
      <input
        type="email"
        name="email"
        required
        class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
    <button
      type="submit"
      class="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
    >
      Send magic link
    </button>
  </form>
</section>
