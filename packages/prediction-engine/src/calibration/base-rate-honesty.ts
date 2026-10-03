
export interface BaseRateCheck {
  readonly n: number;
  readonly predictedBaseRate: number;
  readonly observedBaseRate: number;
  readonly gap: number;
  readonly z: number;
  readonly honest: boolean;
}

/** Mean predicted probability vs observed rate, with a binomial z-score. */
export function baseRateCheck(
  probs: readonly number[],
  outcomes: readonly number[],
  tolerance = 0.02,
): BaseRateCheck {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("base-rate-honesty: aligned non-empty inputs required");
  }
  const n = probs.length;
  const predicted = probs.reduce((s, p) => s + p, 0) / n;
  const observed = outcomes.reduce((s, y) => s + y, 0) / n;
  const gap = predicted - observed;
  const se = Math.sqrt(Math.max(predicted * (1 - predicted), 1e-12) / n);
  const z = gap / se;
  return { n, predictedBaseRate: predicted, observedBaseRate: observed, gap, z, honest: Math.abs(gap) <= tolerance };
}

export interface MarketSlice {
  readonly market: string;
  readonly probs: readonly number[];
  readonly outcomes: readonly number[];
}

/** Run the harness across market slices; returns the failing slices. */
export function honestyHarness(slices: readonly MarketSlice[], tolerance = 0.02): (BaseRateCheck & { market: string })[] {
  return slices
    .map((s) => ({ market: s.market, ...baseRateCheck(s.probs, s.outcomes, tolerance) }))
    .filter((r) => !r.honest);
}
