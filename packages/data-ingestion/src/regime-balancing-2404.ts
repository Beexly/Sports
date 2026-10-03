/**
 * Regime-oversampling balancing module for the synthetic backbone
 *
 * Research port: arXiv:2404.08254
 * Normalized lane: synthetic_data | Doctrine: INFRA
 *
 * Balancing module on top of the chosen synthetic backbone: regime attributes (weather severity, rest-days bin, primetime flag, divisional flag) are included as columns, and sampling weights oversample tail regimes. Pure weight math; the generator itself is untouched.
 *
 * ACCEPTANCE GATE: ADOPT only if (a) tail-slice log-loss improves by >=0.01 at intensity i=10 vs i=0, AND (b) overall 2024 log-loss does not degrade by more than 0.001 vs i=0. Live-data gate -> GSE_REGIME_BALANCING_ENABLED flag (default false).
 */

export interface RegimeAttributes {
  weatherSeverity: number; // 0..1
  restDaysBin: number; // 0..3
  primetime: boolean;
  divisional: boolean;
}

export const TAIL_WEATHER_SEVERITY = 0.7;

/** A row is a tail-regime row if weather is severe or rest is extreme. */
export function isTailRegime(r: RegimeAttributes): boolean {
  return r.weatherSeverity >= TAIL_WEATHER_SEVERITY || r.restDaysBin === 0 || r.restDaysBin === 3;
}

/**
 * Oversampling weights: tail rows get weight (1 + intensity), base rows weight 1.
 * intensity i=0 reproduces the natural distribution.
 */
export function balancingWeights(rows: RegimeAttributes[], intensity: number): number[] {
  const w = Math.max(0, intensity);
  return rows.map((r) => (isTailRegime(r) ? 1 + w : 1));
}

/** Normalize weights to a probability distribution. */
export function toSamplingDistribution(weights: number[]): number[] {
  const s = weights.reduce((a, b) => a + b, 0);
  if (s === 0) return weights.map(() => 0);
  return weights.map((x) => x / s);
}

/** Effective tail share under the sampling distribution. */
export function tailShare(rows: RegimeAttributes[], intensity: number): number {
  const dist = toSamplingDistribution(balancingWeights(rows, intensity));
  return rows.reduce((a, r, i) => a + (isTailRegime(r) ? dist[i] ?? 0 : 0), 0);
}

/** Live-data gate: tail-slice +0.01 log-loss at i=10 with overall degradation <= 0.001. */
export const GSE_REGIME_BALANCING_ENABLED = false;

