/**
 * Disagreement-scheduled market blending (arXiv 2008.10423).
 *
 * Per-game adaptive market blend. Compute disagreement
 *   d = |logit(mean model prob) - logit(market prob)|
 * and map it onto historical disagreement terciles:
 *   top tercile    -> heavy market blend,  w_m ~= 0.5
 *   middle tercile -> moderate blend,      w_m ~= 0.25-0.3
 *   bottom tercile -> light blend,         w_m ~= 0.1-0.15 (avoid distortion)
 * Plus a per-model conviction term: shrink each model toward its own
 * pre-market estimate proportionally to its trailing-8-week skill before
 * blending with the market.
 *
 * ACCEPTANCE GATE: ADOPT the disagreement-scheduled blend if, on 2025
 * data, it beats the fixed blend on full-season Brier AND the direction
 * test confirms the asymmetry (blending helps in correctable games, hurts
 * in distortion-risk games).
 *
 * Research-only module. Not wired into any live blending path.
 */

export function logit(p: number): number {
  const c = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return Math.log(c / (1 - c));
}

export function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function quantile(sorted: readonly number[], q: number): number {
  const n = sorted.length;
  if (n === 0) throw new Error("quantile: no data");
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] as number) + (pos - lo) * ((sorted[hi] as number) - (sorted[lo] as number));
}

export interface BlendSchedule {
  /** Disagreement cutoffs [t1, t2]: d <= t1 light, d <= t2 moderate, else heavy. */
  cutoffs: [number, number];
  /** Market weights [light, moderate, heavy]. */
  weights: [number, number, number];
}

/** Fit the disagreement schedule from historical disagreements. */
export function fitBlendSchedule(
  historicalD: readonly number[],
  weights: [number, number, number] = [0.125, 0.275, 0.5],
): BlendSchedule {
  if (historicalD.length < 3) throw new Error("fitBlendSchedule: need >= 3 observations");
  const sorted = [...historicalD].sort((a, b) => a - b);
  return { cutoffs: [quantile(sorted, 1 / 3), quantile(sorted, 2 / 3)], weights };
}

/** Disagreement between the model consensus and the market for one game. */
export function disagreement(modelProbs: readonly number[], marketProb: number): number {
  if (modelProbs.length === 0) throw new Error("disagreement: no model probs");
  const meanP = modelProbs.reduce((a, p) => a + p, 0) / modelProbs.length;
  return Math.abs(logit(meanP) - logit(marketProb));
}

/** Market blend weight for a disagreement value under the schedule. */
export function blendWeight(d: number, schedule: BlendSchedule): number {
  const [t1, t2] = schedule.cutoffs;
  const [wl, wm, wh] = schedule.weights;
  if (d <= t1) return wl;
  if (d <= t2) return wm;
  return wh;
}

/**
 * Conviction shrinkage: pull each model's forecast toward its own
 * pre-market estimate, proportionally to trailing skill in [0, 1].
 * conviction = 1 -> keep the model; conviction = 0 -> full shrinkage to
 * the pre-market estimate.
 */
export function convictionShrink(
  modelProb: number,
  preMarketProb: number,
  conviction: number,
): number {
  if (conviction < 0 || conviction > 1) throw new Error("convictionShrink: conviction in [0,1]");
  return conviction * modelProb + (1 - conviction) * preMarketProb;
}

/**
 * Full per-game blend: conviction-shrink each model, average to a
 * consensus, then blend the consensus with the market on the logit scale.
 */
export function disagreementBlend(
  modelProbs: readonly number[],
  preMarketProbs: readonly number[],
  convictions: readonly number[],
  marketProb: number,
  schedule: BlendSchedule,
): { blended: number; d: number; wMarket: number } {
  if (
    modelProbs.length !== preMarketProbs.length ||
    modelProbs.length !== convictions.length
  ) {
    throw new Error("disagreementBlend: length mismatch");
  }
  const shrunk = modelProbs.map((p, i) =>
    convictionShrink(p, preMarketProbs[i] as number, convictions[i] as number),
  );
  const consensus = shrunk.reduce((a, p) => a + p, 0) / Math.max(1, shrunk.length);
  const d = Math.abs(logit(consensus) - logit(marketProb));
  const wMarket = blendWeight(d, schedule);
  const blended = logistic((1 - wMarket) * logit(consensus) + wMarket * logit(marketProb));
  return { blended, d, wMarket };
}
