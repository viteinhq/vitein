import { communityTemplates, TemplateRegistry } from '@vitein/template-engine';
import { describe, expect, it } from 'vitest';
import { assertTemplateAllowed } from '../src/domain/events/templates.js';

/**
 * A registry that also carries a premium (`basic`-tier) template, so the
 * paid-gate path can be exercised — the open-source registry is free-only.
 */
function registryWithPremium(): TemplateRegistry {
  const base = communityTemplates[0];
  if (!base) throw new Error('expected community templates to exist');
  const registry = new TemplateRegistry();
  registry.register(...communityTemplates);
  registry.register({ ...base, id: 'premium-one', tier: 'basic', origin: 'premium' });
  return registry;
}

describe('assertTemplateAllowed', () => {
  it('accepts a free template regardless of paid state', () => {
    expect(() => assertTemplateAllowed('classic', false)).not.toThrow();
    expect(() => assertTemplateAllowed('noir', true)).not.toThrow();
  });

  it('rejects an unknown template id', () => {
    expect(() => assertTemplateAllowed('does-not-exist', true)).toThrow(/unknown template/i);
  });

  it('rejects a premium template on an unpaid event', () => {
    expect(() => assertTemplateAllowed('premium-one', false, registryWithPremium())).toThrow(
      /paid tier/i,
    );
  });

  it('accepts a premium template on a paid event', () => {
    expect(() => assertTemplateAllowed('premium-one', true, registryWithPremium())).not.toThrow();
  });
});
