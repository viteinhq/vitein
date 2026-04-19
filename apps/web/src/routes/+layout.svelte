<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';

  let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-screen flex flex-col">
  <header class="border-b border-slate-200 px-6 py-4">
    <a href="/" class="text-xl font-semibold tracking-tight">vite.in</a>
  </header>

  <main class="flex-1 px-6 py-12">
    {@render children()}
  </main>

  <footer class="border-t border-slate-200 px-6 py-4 text-sm text-slate-500">
    <p>vite.in v2 — <span class="text-slate-400">in development</span></p>
  </footer>
</div>
