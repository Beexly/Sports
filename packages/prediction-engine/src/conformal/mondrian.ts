/**
 * Mondrian Conformal Residual Manager
 *
 * Taxonomy interface, per-category residual stores, quantile lookup,
 * hierarchical fallback to parent categories when a leaf is too sparse.
 *
 * Pure data structures + methods; designed to feed selective-gate and
 * the existing rolling Mondrian conformal path.
 */

import {
  type TaxonomyCategory,
  parentCategory,
} from "./sports-taxonomy.js";

export interface MondrianResidualStoreOptions {
  /** Minimum residuals required before trusting a category quantile (default 10). */
  readonly minSamples?: number;
  /** Fallback to global ("*") store when hierarchy exhausted. Default true. */
  readonly useGlobalFallback?: boolean;
}

export interface QuantileLookupResult {
  readonly category: TaxonomyCategory;
  readonly quantile: number;
  readonly sampleSize: number;
  readonly usedFallback: boolean;
  readonly fallbackChain: readonly TaxonomyCategory[];
}

function finiteSampleQuantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  // A non-finite probability must be rejected BEFORE it reaches the index
  // arithmetic. NaN propagates through Math.ceil and survives both Math.max
  // and Math.min (every comparison against NaN is false), so `index` becomes
  // NaN, `sorted[NaN]` is `undefined`, and this function returns `undefined`
  // through a signature that promises `number` — the non-obvious failure the
  // rest of this module's guards exist to prevent. Finite-but-out-of-range
  // probabilities are fine: the clamp below already handles them.
  if (!Number.isFinite(probability)) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // Split-conformal (n+1) correction for honesty on small samples
  const rank = Math.ceil((sorted.length + 1) * probability);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index]!;
}

/**
 * Mutable residual manager keyed by taxonomy category.
 * Callers should treat it as the calibration residual ledger for a window.
 */
export class MondrianResidualManager {
  private readonly stores = new Map<TaxonomyCategory, number[]>();
  private readonly minSamples: number;
  private readonly useGlobalFallback: boolean;

  constructor(options: MondrianResidualStoreOptions = {}) {
    this.minSamples = options.minSamples ?? 10;
    this.useGlobalFallback = options.useGlobalFallback ?? true;
  }

  /** Append a residual to a category (and optionally maintain a global bucket). */
  add(category: TaxonomyCategory, residual: number): void {
    const abs = Math.abs(residual);
    const list = this.stores.get(category) ?? [];
    list.push(abs);
    this.stores.set(category, list);

    if (this.useGlobalFallback) {
      const global = this.stores.get("*") ?? [];
      global.push(abs);
      this.stores.set("*", global);
    }
  }

  /** Batch add. */
  addMany(category: TaxonomyCategory, residuals: readonly number[]): void {
    for (const r of residuals) this.add(category, r);
  }

  size(category: TaxonomyCategory): number {
    return this.stores.get(category)?.length ?? 0;
  }

  categories(): readonly TaxonomyCategory[] {
    return Array.from(this.stores.keys()).sort();
  }

  /**
   * Lookup residual quantile for a category with hierarchical parent fallback.
   * probability is typically 1 - alpha (e.g. 0.9 for 90% interval).
   */
  quantile(
    category: TaxonomyCategory,
    probability: number,
  ): QuantileLookupResult {
    const chain: TaxonomyCategory[] = [];
    let current: TaxonomyCategory | null = category;

    while (current !== null) {
      chain.push(current);
      const vals = this.stores.get(current);
      if (vals && vals.length >= this.minSamples) {
        return {
          category: current,
          quantile: finiteSampleQuantile(vals, probability),
          sampleSize: vals.length,
          usedFallback: current !== category,
          fallbackChain: chain,
        };
      }
      current = parentCategory(current);
    }

    // Global fallback
    if (this.useGlobalFallback) {
      const global = this.stores.get("*") ?? [];
      chain.push("*");
      return {
        category: "*",
        quantile: finiteSampleQuantile(global, probability),
        sampleSize: global.length,
        usedFallback: true,
        fallbackChain: chain,
      };
    }

    return {
      category,
      quantile: 0,
      sampleSize: 0,
      usedFallback: false,
      fallbackChain: chain,
    };
  }

  /** Snapshot of residual counts per category (for diagnostics / Glass Ledger). */
  snapshot(): ReadonlyMap<TaxonomyCategory, number> {
    const out = new Map<TaxonomyCategory, number>();
    for (const [k, v] of this.stores) {
      out.set(k, v.length);
    }
    return out;
  }
}
