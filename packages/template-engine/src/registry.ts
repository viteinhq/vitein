import type { Template, TemplateTier } from './types.js';

/**
 * Id of the baseline template every registry must contain. It is the
 * default for events with no explicit template and the fallback when an
 * id cannot be resolved.
 */
export const BASELINE_TEMPLATE_ID = 'classic';

/**
 * In-memory template lookup. Templates are code, not data — the registry
 * is populated at startup from the community set plus, on the hosted
 * build, the premium set (see ADR 0009).
 */
export class TemplateRegistry {
  readonly #templates = new Map<string, Template>();

  /** Add templates. A later registration with the same id wins. */
  register(...templates: Template[]): void {
    for (const template of templates) {
      this.#templates.set(template.id, template);
    }
  }

  get(id: string): Template | undefined {
    return this.#templates.get(id);
  }

  has(id: string): boolean {
    return this.#templates.has(id);
  }

  /**
   * Resolve an id to a concrete template, falling back to the baseline
   * when the id is unknown. A premium template id on a build without the
   * premium package must degrade gracefully here, never throw.
   */
  resolve(id: string): Template {
    const template = this.#templates.get(id) ?? this.#templates.get(BASELINE_TEMPLATE_ID);
    if (!template) {
      throw new Error(
        `TemplateRegistry: baseline template "${BASELINE_TEMPLATE_ID}" is not registered`,
      );
    }
    return template;
  }

  /** All registered templates, optionally filtered by tier. */
  list(filter?: { tier?: TemplateTier }): Template[] {
    const all = [...this.#templates.values()];
    return filter?.tier ? all.filter((template) => template.tier === filter.tier) : all;
  }
}
