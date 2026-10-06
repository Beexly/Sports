/**
 * Two-Gate promotion policy for discovery-loop candidates — arXiv 2510.04399v3
 * ("On The Statistical Limits of Self-Improving Agents").
 *
 * ADDITIVE invention module (packages/prediction-engine/src/invention).
 * Promotion policy for the discovery loop; not wired into any production
 * path (wiring changes which signals reach production and is a NEEDS HUMAN
 * CALL — see tracking report).
 *
 * Paper mechanism: Gate 1 requires the LOWER BOUND of the bootstrap CI of
 * delta-Brier to exceed 0.001 (margin, not a point estimate); Gate 2 caps
 * a complexity proxy B (free params + engineered features + rule count) by
 * a training-size-scaled K(m). Both gates must pass for promotion.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT if arm B's locked-season
 * degradation rate is <=50% of arm A's AND arm B retains >=70% of arm A's
 * total locked-season delta-Brier, and the complexity proxy B correlates
 * negatively with degradation.
 */

export interface ComplexityBreakdown {
  readonly freeParams: number;
  readonly engineeredFeatures: number;
  readonly ruleCount: number;
}

/** Complexity proxy B = free params + engineered features + rule count. */
export function complexityProxy(b: ComplexityBreakdown): number {
  return b.freeParams + b.engineeredFeatures + b.ruleCount;
}

/**
 * Training-size-scaled complexity cap K(m) = k0 * sqrt(m).
 * Larger training sets admit more complex candidates.
 */
export function complexityCap(trainingSize: number, k0 = 1): number {
  if (!(trainingSize > 0)) return 0;
  return k0 * Math.sqrt(trainingSize);
}

/**
 * Bootstrap lower bound of the delta-Brier CI: resample the per-fold (or
 * per-week) delta-Brier values, take the mean each resample, return the
 * alpha-quantile of resample means.
 */
export function bootstrapCILowerBound(
  deltas: readonly number[],
  alpha: number,
  resamples = 2000,
  rand: () => number = Math.random,
): number {
  const n = deltas.length;
  if (n === 0) return Number.NEGATIVE_INFINITY;
  const means: number[] = [];
  for (let r = 0; r < resamples; r++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += deltas[Math.floor(rand() * n)]!;
    means.push(s / n);
  }
  means.sort((a, b) => a - b);
  const pos = alpha * (means.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return means[lo]! + (means[hi]! - means[lo]!) * (pos - lo);
}

export interface TwoGateResult {
  readonly gate1LowerBound: number;
  readonly gate1Pass: boolean;
  readonly gate2Complexity: number;
  readonly gate2Cap: number;
  readonly gate2Pass: boolean;
  readonly pass: boolean;
}

/**
 * Two-Gate promotion decision. Gate 1: bootstrap CI lower bound of
 * delta-Brier > margin (default 0.001). Gate 2: B <= K(m).
 */
export function twoGatePass(
  deltas: readonly number[],
  complexity: ComplexityBreakdown,
  trainingSize: number,
  margin = 0.001,
  alpha = 0.05,
  resamples = 2000,
  rand: () => number = Math.random,
): TwoGateResult {
  const lb = bootstrapCILowerBound(deltas, alpha, resamples, rand);
  const b = complexityProxy(complexity);
  const cap = complexityCap(trainingSize);
  const gate1Pass = lb > margin;
  const gate2Pass = b <= cap;
  return {
    gate1LowerBound: lb,
    gate1Pass,
    gate2Complexity: b,
    gate2Cap: cap,
    gate2Pass,
    pass: gate1Pass && gate2Pass,
  };
}
