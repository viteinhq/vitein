<script lang="ts">
  /**
   * Theme template chooser. Renders the registry's templates as radio
   * tiles — each tile previews the template through its own design tokens.
   * The radio inputs share a `name` (native group) and carry the chosen id
   * as a `templateId` form field, so the picker drops straight into the
   * create and manage forms with no client state.
   */
  import * as m from '$lib/paraglide/messages.js';
  import { templateRegistry, templateStyle } from '$lib/templates';

  let { selected = 'classic', name = 'templateId' }: { selected?: string; name?: string } =
    $props();

  const templates = templateRegistry.list();

  // Static map — a dynamic `m[key]` would defeat message tree-shaking.
  const labels: Record<string, () => string> = {
    classic: m.template_classic_name,
    noir: m.template_noir_name,
    paper: m.template_paper_name,
    serif: m.template_serif_name,
  };
  function label(id: string): string {
    return (labels[id] ?? (() => id))();
  }
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
  {#each templates as t (t.id)}
    <label
      class="cursor-pointer rounded-xl border-[1.5px] border-rule p-2 transition has-[:checked]:border-ink has-[:checked]:bg-paper-2"
    >
      <input
        type="radio"
        {name}
        value={t.id}
        checked={t.id === selected}
        class="sr-only"
      />
      <div style={templateStyle(t.id)} class="overflow-hidden rounded-lg border border-rule">
        <div class="bg-accent px-2.5 py-3 font-display text-base font-bold text-accent-ink">Aa</div>
        <div class="space-y-1.5 bg-paper px-2.5 py-2.5">
          <div class="h-1.5 w-3/4 rounded-full bg-ink/25"></div>
          <div class="h-1.5 w-1/2 rounded-full bg-ink/15"></div>
        </div>
      </div>
      <span class="mt-1.5 block text-center text-xs font-semibold text-ink">{label(t.id)}</span>
    </label>
  {/each}
</div>
