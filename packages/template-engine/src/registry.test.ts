import { describe, expect, it } from 'vitest';
import { BASELINE_TEMPLATE_ID, createTemplateRegistry } from './index.js';

describe('TemplateRegistry', () => {
  it('loads the four community templates', () => {
    const registry = createTemplateRegistry();
    expect(registry.list()).toHaveLength(4);
    expect(registry.has(BASELINE_TEMPLATE_ID)).toBe(true);
  });

  it('resolves a known id to its template', () => {
    expect(createTemplateRegistry().resolve('noir').id).toBe('noir');
  });

  it('falls back to the baseline for an unknown id', () => {
    // A premium id on a build without the premium package must degrade.
    expect(createTemplateRegistry().resolve('does-not-exist').id).toBe(BASELINE_TEMPLATE_ID);
  });

  it('filters by tier', () => {
    const registry = createTemplateRegistry();
    expect(registry.list({ tier: 'free' })).toHaveLength(4);
    expect(registry.list({ tier: 'basic' })).toHaveLength(0);
  });
});
