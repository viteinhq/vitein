import type { Tier } from './types.js';

/** Minimum shape the registry needs from anything it stores. */
interface RegistryEntry {
  id: string;
  tier: Tier;
}

/**
 * In-memory id→entry lookup with a guaranteed baseline fallback. Used for
 * both themes and layouts — these are code, not data (ADR 0009 / 0011).
 * The registry is populated at startup from the community set plus, on the
 * hosted build, premium themes via the extension hook.
 */
export class Registry<T extends RegistryEntry> {
  readonly #entries = new Map<string, T>();

  /**
   * @param baselineId id of the entry every registry must contain — the
   * fallback when a requested id cannot be resolved.
   */
  constructor(private readonly baselineId: string) {}

  /** Add entries. A later registration with the same id wins. */
  register(...entries: T[]): void {
    for (const entry of entries) {
      this.#entries.set(entry.id, entry);
    }
  }

  get(id: string): T | undefined {
    return this.#entries.get(id);
  }

  has(id: string): boolean {
    return this.#entries.has(id);
  }

  /**
   * Resolve an id to a concrete entry, falling back to the baseline when
   * the id is unknown. A premium id on a build without the premium package
   * must degrade gracefully here, never throw.
   */
  resolve(id: string): T {
    const entry = this.#entries.get(id) ?? this.#entries.get(this.baselineId);
    if (!entry) {
      throw new Error(`Registry: baseline entry "${this.baselineId}" is not registered`);
    }
    return entry;
  }

  /** All registered entries, optionally filtered by tier. */
  list(filter?: { tier?: Tier }): T[] {
    const all = [...this.#entries.values()];
    return filter?.tier ? all.filter((entry) => entry.tier === filter.tier) : all;
  }
}
