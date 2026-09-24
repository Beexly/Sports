
export function brierScore(probs: readonly number[], outcomes: readonly number[]): number {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("online-metric-suite: probs/outcomes must align and be non-empty");
  }
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = Math.min(Math.max(probs[i] ?? 0, 0), 1);
    s += (p - (outcomes[i] ?? 0)) ** 2;
  }
  return s / probs.length;
}

function pooled(weeks: ReadonlyArray<readonly number[]>, idx: readonly number[]): number[] {
  const out: number[] = [];
  for (const i of idx) for (const v of weeks[i] ?? []) out.push(v);
  return out;
}

export interface OnlineMetrics {
  readonly finalBrier: number;
  readonly worstWeekBrier: number;
  readonly anytimeBrier: number;
  readonly forgettingBrier: number;
}

/**
 * The four-metric suite. weeklyProbs[w] / weeklyOutcomes[w] are week w's forecast
 * probabilities and binary outcomes. endModelEarlyProbs optionally carries the
 * end-of-season model's probabilities for the first `forgetWeeks` weeks (the
 * forgetting probe); without it, forgettingBrier is reported as NaN and documented.
 */
export function onlineMetricSuite(
  weeklyProbs: ReadonlyArray<readonly number[]>,
  weeklyOutcomes: ReadonlyArray<readonly number[]>,
  endModelEarlyProbs?: ReadonlyArray<readonly number[]>,
  forgetWeeks = 4,
): OnlineMetrics {
  const W = weeklyProbs.length;
  if (W === 0 || weeklyOutcomes.length !== W) {
    throw new Error("online-metric-suite: need >= 1 aligned week");
  }
  const allIdx = weeklyProbs.map((_, i) => i);
  const finalBrier = brierScore(pooled(weeklyProbs, allIdx), pooled(weeklyOutcomes, allIdx));
  const window = Math.min(4, W);
  let worst = 0;
  for (let w = 0; w + window <= W; w++) {
    const idx = Array.from({ length: window }, (_, k) => w + k);
    worst = Math.max(worst, brierScore(pooled(weeklyProbs, idx), pooled(weeklyOutcomes, idx)));
  }
  const weeklyBriers = weeklyProbs.map((p, w) => brierScore(p, weeklyOutcomes[w] ?? []));
  const anytimeBrier = weeklyBriers.reduce((s, v) => s + v, 0) / W;
  let forgettingBrier = NaN;
  if (endModelEarlyProbs) {
    const fw = Math.min(forgetWeeks, W);
    const idx = Array.from({ length: fw }, (_, k) => k);
    forgettingBrier = brierScore(pooled(endModelEarlyProbs, idx), pooled(weeklyOutcomes, idx));
  }
  return { finalBrier, worstWeekBrier: worst, anytimeBrier, forgettingBrier };
}
