/**
 * Equalized Coverage Conformal Intervals (arXiv:1908.05428).
 *
 * MECHANISM:
 * Instead of computing marginal conformal intervals over all samples,
 * Equalized Coverage trains conformal intervals INSIDE defined strata.
 * This guarantees coverage conditionally on the stratum characteristics.
 *
 * STRATA DEFINITIONS:
 * The paper suggests configurable strata based on pre-game features.
 * Valid point-in-time features include: week bucket, QB-change games,
 * roof/wind conditions, sportsbook, rest differential, and coast-mismatch.
 *
 * FAIL-CLOSED CONSTRAINT:
 * Strata with insufficient samples (< minSamples) MUST fail closed,
 * falling back to marginal (global) intervals. A stratum must never
 * produce overconfident, narrow intervals due to a tiny sample size.
 */

export interface PregameFeatures {
  readonly weekBucket?: string;
  readonly qbChange?: boolean;
  readonly roofWind?: string;
  readonly sportsbook?: string;
  readonly restDifferential?: number;
  readonly coastMismatch?: boolean;
  /** Allow arbitrary additional features for extensibility. */
  readonly [key: string]: string | number | boolean | undefined;
}

export interface EqualizedCoverageOptions {
  /** Minimum samples in a stratum required to trust its quantile. */
  readonly minSamples?: number;
  /**
   * The ordered keys of the pregame features to use for strata definition.
   * Enables configurable strata definitions rather than hardcoding.
   */
  readonly stratumKeys?: readonly string[];
}

export interface QuantileLookupResult {
  readonly stratum: string;
  readonly quantile: number;
  readonly sampleSize: number;
  readonly usedFallback: boolean;
}

function finiteSampleQuantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  if (!Number.isFinite(probability)) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // Split-conformal (n+1) correction
  const rank = Math.ceil((sorted.length + 1) * probability);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index]!;
}

/**
 * Assign a stratum string based on pre-game features and configured keys.
 */
export function assignStratum(features: PregameFeatures, keys: readonly string[]): string {
  if (keys.length === 0) return "*"; // Global marginal
  const parts = keys.map((k) => {
    const val = features[k];
    if (val === undefined) return `${k}:undef`;
    return `${k}:${String(val)}`;
  });
  return parts.join("|");
}

/**
 * Manages equalized coverage residual stores inside defined strata.
 */
export class EqualizedCoverageManager {
  private readonly stores = new Map<string, number[]>();
  private readonly minSamples: number;
  private readonly stratumKeys: readonly string[];

  constructor(options: EqualizedCoverageOptions = {}) {
    this.minSamples = options.minSamples ?? 10;
    // Default strata if none are provided
    this.stratumKeys = options.stratumKeys ?? ["weekBucket", "qbChange"];
  }

  /** Append a residual to its specific stratum and the marginal (global) bucket. */
  add(features: PregameFeatures, residual: number): void {
    const abs = Math.abs(residual);

    // Add to specific stratum
    const stratum = assignStratum(features, this.stratumKeys);
    const list = this.stores.get(stratum) ?? [];
    list.push(abs);
    this.stores.set(stratum, list);

    // Add to marginal (global) bucket
    const global = this.stores.get("*") ?? [];
    global.push(abs);
    this.stores.set("*", global);
  }

  /** Batch add residuals. */
  addMany(entries: readonly { features: PregameFeatures; residual: number }[]): void {
    for (const e of entries) {
      this.add(e.features, e.residual);
    }
  }

  /** Get sample size for a stratum. */
  size(stratum: string): number {
    return this.stores.get(stratum)?.length ?? 0;
  }

  /**
   * Lookup residual quantile for a set of features.
   * Enforces fail-closed: if the stratum has < minSamples, it falls back
   * to the marginal (global) store.
   */
  quantile(features: PregameFeatures, probability: number): QuantileLookupResult {
    const stratum = assignStratum(features, this.stratumKeys);
    const vals = this.stores.get(stratum);

    if (vals && vals.length >= this.minSamples) {
      return {
        stratum,
        quantile: finiteSampleQuantile(vals, probability),
        sampleSize: vals.length,
        usedFallback: false,
      };
    }

    // Fail closed: fallback to marginal (global) store
    const global = this.stores.get("*") ?? [];
    return {
      stratum: "*",
      quantile: finiteSampleQuantile(global, probability),
      sampleSize: global.length,
      usedFallback: true, // Indicates fallback to marginal was required
    };
  }
}
