/**
 * NFL margin-multiplier matrix (arXiv 2212.08116v1).
 *
 * Historical exact-margin frequencies (nflverse 2000-2024, ~6,000
 * games) converted to cover probabilities: for a projected spread s
 * and book spread b, P(cover) comes from the empirical margin
 * distribution — pushes count as half-wins. The matrix here is
 * estimated from a supplied margin sample; the zero-mean-normal
 * reference (conditional SD ~= 13.5-13.86) is included for comparison.
 * State-dependent extensions (divisional, totals, late-season) and
 * heteroscedastic sigma(spread) are noted as follow-ups.
 *
 * ACCEPTANCE GATE: adopt iff cover probabilities are well-calibrated
 * (reliability slope in [0.9, 1.1]) AND the edge>2% backtest shows
 * positive ROI with CI excluding zero or mean CLV >= +0.5 points;
 * reject if slope < 0.8 or ROI CI includes zero with negative CLV.
 *
 * Research-only module. Not wired into the live engine.
 */

export interface MarginModel {
  /** Sorted unique margins. */
  margins: number[];
  /** P(exact margin), sums to 1. */
  probs: number[];
}

/** Fit the empirical margin distribution from a sample of final margins. */
export function fitMarginModel(margins: readonly number[]): MarginModel {
  if (margins.length === 0) throw new Error("fitMarginModel: no margins");
  const counts = new Map<number, number>();
  for (const m of margins) counts.set(m, (counts.get(m) ?? 0) + 1);
  const sorted = [...counts.keys()].sort((a, b) => a - b);
  const n = margins.length;
  return {
    margins: sorted,
    probs: sorted.map((m) => (counts.get(m) as number) / n),
  };
}

/**
 * P(home covers spread s): P(margin > s) + 0.5 * P(margin == s)
 * (push = half-win). s is the home spread (negative = home favored).
 */
export function coverProbability(model: MarginModel, spread: number): number {
  let cover = 0;
  for (let i = 0; i < model.margins.length; i++) {
    const m = model.margins[i] as number;
    const p = model.probs[i] as number;
    if (m > spread) cover += p;
    else if (m === spread) cover += 0.5 * p;
  }
  return cover;
}

/** Normal-reference cover probability (zero-mean, sd ~= 13.5). */
export function normalCoverProbability(spread: number, sd = 13.5): number {
  if (sd <= 0) throw new Error("normalCoverProbability: sd > 0");
  // P(margin > spread) under N(0, sd^2), push mass ignored.
  return 0.5 * (1 - erf(spread / (sd * Math.SQRT2)));
}

/**
 * Edge of a model projection vs the book: recenter the margin model on
 * the model's projected home margin, then take the cover probability
 * at the BOOK spread (the number actually bet into).
 */
export function spreadEdge(
  model: MarginModel,
  projectedMargin: number,
  bookSpread: number,
): { coverProb: number; edge: number } {
  const recentered = recenterModel(model, projectedMargin);
  const coverProb = coverProbability(recentered, bookSpread);
  return { coverProb, edge: coverProb - 0.5 };
}

/**
 * Recenter the margin model by a projected spread: shifts the margin
 * distribution so its mean equals the model's projected home margin.
 */
export function recenterModel(model: MarginModel, projectedMargin: number): MarginModel {
  const mean = model.margins.reduce((s, m, i) => s + m * (model.probs[i] as number), 0);
  const shift = projectedMargin - mean;
  // Shift on a 0.5 grid to keep push semantics on integers.
  const rounded = Math.round(shift * 2) / 2;
  return {
    margins: model.margins.map((m) => m + rounded),
    probs: [...model.probs],
  };
}

/** Reliability slope of cover probabilities (OLS of cover on prob). */
export function reliabilitySlope(
  probs: readonly number[],
  covered: readonly number[], // 1 cover, 0.5 push, 0 no-cover
): number {
  if (probs.length !== covered.length || probs.length < 2) {
    throw new Error("reliabilitySlope: need >= 2 pairs");
  }
  const n = probs.length;
  const mx = probs.reduce((s, x) => s + x, 0) / n;
  const my = covered.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += ((probs[i] as number) - mx) * ((covered[i] as number) - my);
    sxx += ((probs[i] as number) - mx) ** 2;
  }
  return sxy / Math.max(1e-12, sxx);
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
