/**
 * Recency-weighted aggregation — exponential-decay weighting over a time-ordered
 * forecast stream (Metaculus-style).
 *
 * EDGE THESIS: Metaculus' Community Prediction uses recency-weighted statistics
 * over the forecast history, not flat averages: a forecaster's latest quote
 * carries more information than their stale one. The repo's referees update on
 * news (injury, line move, weather) but `consensus.ts` treats every snapshot
 * equally. This module turns a stream of (timestamp, prob) observations per
 * source into decay-weighted pooled values: weighted mean AND weighted median,
 * so callers can pick the robust central estimate.
 *
 * Decay semantics: weight_i ∝ λ^(age of observation), λ ∈ (0,1] where age is
 * measured in the caller's units (ms, hours, games — agnostic). λ=1 disables
 * decay; λ=0.5 halves the weight per unit of age. Half-life h relates by
 * λ = 0.5^(1/h).
 *
 * Honesty rules: fail closed on empty input, non-finite timestamps/probs, or
 * negative ages; out-of-order timestamps are rejected (caller must sort);
 * single-observation streams return that observation unchanged. Thresholds and
 * half-lives are caller-supplied and never inferred here.
 *
 * References:
 * - Metaculus notebooks: Community Prediction as recency-weighted median of
 *   forecast history; extremization applied downstream (see log-odds-pool.ts).
 */

const EPS = 1e-12;

export interface TimedObservation {
  readonly source: string;
  /** Observation timestamp in any monotonically consistent unit. */
  readonly t: number;
  /** Forecast probability in [0,1]. */
  readonly prob: number;
  /** Optional base weight ≥ 0 (e.g. earned-weight); default 1. */
  readonly weight?: number;
}

export interface RecencyWeightedResult {
  /** Decay-weighted arithmetic mean of probabilities. */
  readonly mean: number;
  /** Decay-weighted median (weighted order statistic at cumulative 0.5). */
  readonly median: number;
  /** Sum of effective weights after decay (information content of the stream). */
  readonly totalWeight: number;
  /** Observations actually pooled. */
  readonly n: number;
  /** Sources excluded for invalid entries (never silently imputed). */
  readonly dropped: readonly string[];
}

export interface RecencyOptions {
  /**
   * Per-unit decay factor λ ∈ (0,1]; 1 = no decay. Default 1 (flat).
   * Mutually exclusive with halfLife.
   */
  readonly lambda?: number;
  /** Alternative parametrization: age at which weight halves (> 0). */
  readonly halfLife?: number;
}

function resolveLambda(options: RecencyOptions): number {
  const { lambda, halfLife } = options;
  if (lambda !== undefined && halfLife !== undefined) {
    throw new Error("pass lambda or halfLife, not both");
  }
  if (halfLife !== undefined) {
    if (!Number.isFinite(halfLife) || halfLife <= 0) {
      throw new Error("halfLife must be a positive finite number");
    }
    return Math.pow(0.5, 1 / halfLife);
  }
  if (lambda !== undefined) {
    if (!Number.isFinite(lambda) || lambda <= 0 || lambda > 1) {
      throw new Error("lambda must be in (0,1]");
    }
    return lambda;
  }
  return 1;
}

/**
 * Pool a time-ordered observation stream with exponential recency decay.
 * Observations MUST be sorted ascending by t (out-of-order → error).
 * Pure; no I/O.
 */
export function recencyWeighted(
  observations: readonly TimedObservation[],
  options: RecencyOptions = {},
): RecencyWeightedResult {
  const lambda = resolveLambda(options);
  if (observations.length === 0) {
    throw new Error("observations must contain at least one entry");
  }

  const kept: Array<{ source: string; t: number; prob: number; w: number }> = [];
  const dropped: string[] = [];

  for (let i = 0; i < observations.length; i++) {
    const o = observations[i]!;
    const baseW = o.weight ?? 1;
    if (
      !Number.isFinite(o.t) ||
      !Number.isFinite(o.prob) ||
      o.prob < 0 ||
      o.prob > 1 ||
      !Number.isFinite(baseW) ||
      baseW <= 0
    ) {
      dropped.push(o.source);
      continue;
    }
    if (i > 0) {
      const prevT = observations[i - 1]?.t ?? NaN;
      // Compare against the last KEPT timestamp so dropped rows don't fake order.
      const refT =
        kept.length > 0 ? (kept[kept.length - 1]?.t ?? prevT) : prevT;
      if (!Number.isFinite(refT) || o.t < refT) {
        throw new Error(`observations must be sorted by t (index ${i}: ${o.t} < ${refT})`);
      }
    }
    if (baseW > 0) {
      kept.push({ source: o.source, t: o.t, prob: o.prob, w: baseW });
    }
  }

  if (kept.length === 0) {
    throw new Error("no valid observations with positive weight");
  }

  const tNewest = kept[kept.length - 1]?.t ?? 0;
  let totalWeight = 0;
  let acc = 0;
  const weighted: Array<{ prob: number; w: number }> = [];

  for (const k of kept) {
    const age = tNewest - k.t;
    if (age < 0) {
      throw new Error("negative age after sorting — internal invariant violated");
    }
    const eff = k.w * Math.pow(lambda, age);
    totalWeight += eff;
    acc += eff * k.prob;
    weighted.push({ prob: k.prob, w: eff });
  }

  const mean = acc / Math.max(totalWeight, EPS);

  // Weighted median: sort by prob, walk cumulative weights to 50% of total.
  const sorted = [...weighted].sort((a, b) => a.prob - b.prob);
  const mid = totalWeight / 2;
  let cum = 0;
  let median = sorted[sorted.length - 1]?.prob ?? mean;
  for (const s of sorted) {
    cum += s.w;
    if (cum >= mid) {
      median = s.prob;
      break;
    }
  }

  return { mean, median, totalWeight, n: kept.length, dropped };
}
