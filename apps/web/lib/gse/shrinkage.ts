/**
 * GSE Shrinkage Estimators — regress noisy estimates toward a prior so small
 * samples don't masquerade as signal. Closes two registry gaps:
 *   - empirical-Bayes / James-Stein mean shrinkage (hierarchical-Bayes gap):
 *     stable player projections early in a season.
 *   - Ledoit-Wolf-style covariance shrinkage (shrinkage_cov gap): better-
 *     conditioned correlation for DFS portfolio math under few samples.
 *
 * Pure, dependency-free, tested. Companion doc: docs/research/GSE_2026_REMAINING_MODELS.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Empirical-Bayes mean shrinkage (regression to the mean)
// ─────────────────────────────────────────────────────────────────────────────

export interface NoisyEstimate {
  readonly id: string;
  /** The observed rate/value (e.g. a per-game average). */
  readonly value: number;
  /** Sample size behind it (games, attempts…). More → trust it more. */
  readonly sampleSize: number;
}

export interface ShrunkEstimate {
  readonly id: string;
  readonly raw: number;
  readonly shrunk: number;
  /** 0..1 weight placed on the prior (1 = fully regressed to prior). */
  readonly shrinkageWeight: number;
}

/**
 * Empirical-Bayes shrinkage: each estimate is pulled toward `priorMean` with
 * weight `priorStrength / (priorStrength + sampleSize)`. This is the
 * regression-to-the-mean used in Marcel/sabermetric projections — a 2-game hot
 * streak barely moves off the prior; a full season barely moves off the data.
 * `priorMean` defaults to the sample-size-weighted grand mean.
 */
export function empiricalBayesShrink(
  estimates: readonly NoisyEstimate[],
  priorStrength: number,
  priorMean?: number,
): ShrunkEstimate[] {
  if (estimates.length === 0) return [];
  const k = Math.max(0, priorStrength);
  let mean = priorMean;
  if (mean === undefined) {
    let wsum = 0;
    let total = 0;
    for (const e of estimates) {
      wsum += e.sampleSize * e.value;
      total += e.sampleSize;
    }
    mean = total > 0 ? wsum / total : estimates.reduce((s, e) => s + e.value, 0) / estimates.length;
  }
  return estimates.map((e) => {
    const denom = e.sampleSize + k;
    const w = denom > 0 ? k / denom : 1; // weight on the prior
    return { id: e.id, raw: e.value, shrunk: (e.sampleSize * e.value + k * mean!) / (denom > 0 ? denom : 1), shrinkageWeight: w };
  });
}

/**
 * Textbook James-Stein estimator for k≥3 means with known observation variance
 * `sigma2`. Shrinks each value toward the grand mean by a factor that vanishes
 * when the spread is large (the data dominates) and grows when it is small
 * (noise dominates). Dominates the naive estimator in total squared error.
 */
export function jamesSteinEstimate(values: readonly number[], sigma2: number): number[] {
  const k = values.length;
  if (k < 3) return values.slice();
  const mean = values.reduce((s, v) => s + v, 0) / k;
  let ss = 0;
  for (const v of values) ss += (v - mean) * (v - mean);
  if (ss <= 0) return values.map(() => mean);
  const c = Math.max(0, 1 - ((k - 2) * sigma2) / ss); // shrinkage factor in [0,1]
  return values.map((v) => mean + c * (v - mean));
}

// ─────────────────────────────────────────────────────────────────────────────
// Covariance shrinkage (Ledoit-Wolf style)
// ─────────────────────────────────────────────────────────────────────────────

export type ShrinkTarget = "identity" | "diagonal";

/**
 * Convex shrinkage of a sample covariance toward a structured target, the core
 * idea behind Ledoit-Wolf: Σ̂ = δ·F + (1−δ)·S. The "identity" target is the
 * average-variance-scaled identity (shrinks every off-diagonal AND equalises
 * variances); the "diagonal" target keeps each variance but shrinks correlations
 * toward 0. Better-conditioned than the raw sample covariance when samples are
 * few — feeds `riskParityWeights` more reliably. `delta` is the intensity in
 * [0,1] (0 = sample cov, 1 = pure target).
 */
export function shrinkCovariance(
  sampleCov: readonly (readonly number[])[],
  delta: number,
  target: ShrinkTarget = "diagonal",
): number[][] {
  const n = sampleCov.length;
  const d = Math.max(0, Math.min(1, delta));
  // Average variance for the identity target.
  let avgVar = 0;
  for (let i = 0; i < n; i++) avgVar += sampleCov[i]![i] ?? 0;
  avgVar = n > 0 ? avgVar / n : 0;

  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const s = sampleCov[i]![j] ?? 0;
      let f: number; // target entry
      if (target === "identity") f = i === j ? avgVar : 0;
      else f = i === j ? (sampleCov[i]![i] ?? 0) : 0; // diagonal target keeps variances
      row.push(d * f + (1 - d) * s);
    }
    out.push(row);
  }
  return out;
}
