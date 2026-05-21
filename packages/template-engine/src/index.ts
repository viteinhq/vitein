import { TemplateRegistry } from './registry.js';
import { communityTemplates } from './templates.js';
import type { Template } from './types.js';

export type { Template, TemplateTokens, TemplateTier, TemplateOrigin } from './types.js';
export { TemplateRegistry, BASELINE_TEMPLATE_ID } from './registry.js';
export { communityTemplates } from './templates.js';

/**
 * Create a registry pre-loaded with the open community templates. The
 * hosted build additionally calls {@link registerExternalTemplates} with
 * the premium designs; the open-source build ships community-only.
 */
export function createTemplateRegistry(): TemplateRegistry {
  const registry = new TemplateRegistry();
  registry.register(...communityTemplates);
  return registry;
}

/**
 * Extension point for the private vitein-premium package: register its
 * premium templates onto an existing registry. The open-source build
 * simply never calls this — only the seam lives in the public repo.
 */
export function registerExternalTemplates(registry: TemplateRegistry, templates: Template[]): void {
  registry.register(...templates);
}
