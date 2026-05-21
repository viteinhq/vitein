import { createTemplateRegistry, type TemplateRegistry } from '@vitein/template-engine';
import { DomainError, ValidationError } from '../errors.js';

/**
 * Community-only template registry for the open-source API build. The
 * hosted build registers premium templates on top via the extension hook
 * (ADR 0009) — so in this repo only free templates ever resolve.
 */
export const templateRegistry: TemplateRegistry = createTemplateRegistry();

/**
 * Assert that a chosen template id may be applied to an event. The id must
 * resolve to a known template; a premium (non-`free`) template additionally
 * requires the event to be on a paid tier. `registry` is injectable so the
 * gate can be unit-tested with a premium template present.
 */
export function assertTemplateAllowed(
  templateId: string,
  isPaidEvent: boolean,
  registry: TemplateRegistry = templateRegistry,
): void {
  const template = registry.get(templateId);
  if (!template) {
    throw new ValidationError(`Unknown template "${templateId}"`);
  }
  if (template.tier !== 'free' && !isPaidEvent) {
    throw new DomainError(
      'event.feature_gated',
      'This template requires a paid tier — upgrade the event first',
      403,
    );
  }
}
