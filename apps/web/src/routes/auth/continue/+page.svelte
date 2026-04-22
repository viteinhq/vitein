<script lang="ts">
  import { enhance } from '$app/forms';
</script>

<svelte:head>
  <title>Sign in — vite.in</title>
</svelte:head>

<section class="mx-auto max-w-sm space-y-4 text-center">
  <h1 class="text-2xl font-bold tracking-tight">Almost there.</h1>
  <p class="text-sm text-slate-600">
    One more tap to finish signing in to vite.in.
  </p>
  <form method="POST" use:enhance>
    <button
      type="submit"
      class="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
    >
      Continue
    </button>
  </form>
  <p class="text-xs text-slate-400">
    This extra tap exists so that link-safety scanners (like Gmail's) can't
    accidentally consume your single-use sign-in link before you click it.
  </p>
</section>
