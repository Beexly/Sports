// @ts-nocheck
/**
 * arXiv 1302.5681v1: Weighted Sets of Probabilities and Minimax Weighted Expected Regret.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Weighted sets of probabilities P+ = {(v, alpha_v)} over engine variants; weekly likelihood updates of the weights; the decision rule picks the slate minimizing max_v alpha_v * E_v[regret]. Resolute choice guards the season plan against flip-flopping.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Install minimax weighted expected regret (MWER) as the challenger-management layer: maintain a weighted set P+ = {(engine variant v, alpha_v)} over 4-6 variants (production v5.2.7, recalibrated variants, market-following, conservative-prior), likelihood-update alpha_v weekly on a rolling 8-week window (prune alpha < 0.05), and for each candidate weekly slate choose the action minimizing max_v alpha_v * E_v[regret] as a final slate audit before posting, with resolute choice guarding the season plan.
 *
 * ACCEPTANCE GATE:
 * ACCEPT if walk-forward: season profit >= 1.05 x best single-variant baseline AND max drawdown <= best baseline's AND the weight of the ex-post best variant exceeds 0.5 within 8 weeks of a regime change.
 *
 * ENABLED=false: slate-audit layer is computed offline; wiring it as a posting gate needs a human call.
 */


export const ENABLED = false;

export interface VariantWeight {
  readonly variantId: string;
  alpha: number;
}

export interface RegretEstimate {
  readonly variantId: string;
  readonly expectedRegret: number;
}

/** Likelihood update: alpha_v <- alpha_v * exp(logLik_v), then renormalize. */
export function likelihoodUpdate(
  current: readonly VariantWeight[],
  logLikByVariant: Readonly<Record<string, number>>,
): VariantWeight[] {
  const upd = current.map((w) => ({
    variantId: w.variantId,
    alpha: w.alpha * Math.exp(logLikByVariant[w.variantId] ?? 0),
  }));
  const s = upd.reduce((a, w) => a + w.alpha, 0);
  if (s <= 0) return current.map((w) => ({ ...w }));
  return upd.map((w) => ({ variantId: w.variantId, alpha: w.alpha / s }));
}

/** Prune variants with alpha < minAlpha (default 0.05) and renormalize. */
export function pruneWeights(
  weights: readonly VariantWeight[],
  minAlpha = 0.05,
): VariantWeight[] {
  const kept = weights.filter((w) => w.alpha >= minAlpha);
  if (kept.length === 0) return weights.map((w) => ({ ...w }));
  const s = kept.reduce((a, w) => a + w.alpha, 0);
  return kept.map((w) => ({ variantId: w.variantId, alpha: w.alpha / s }));
}

/** Weekly roll: likelihood-update on a rolling window of log-likelihoods, then prune. */
export function weeklyRoll(
  current: readonly VariantWeight[],
  weeklyLogLikByVariant: Readonly<Record<string, number>>,
  minAlpha = 0.05,
): VariantWeight[] {
  return pruneWeights(likelihoodUpdate(current, weeklyLogLikByVariant), minAlpha);
}

export interface SlateCandidate {
  readonly slateId: string;
  readonly regrets: readonly RegretEstimate[];
}

/**
 * MWER slate audit: choose the slate minimizing max_v alpha_v * E_v[regret(a)].
 * Returns null when there are no candidates.
 */
export function chooseSlateMWER(
  candidates: readonly SlateCandidate[],
  weights: readonly VariantWeight[],
): { slateId: string; worstWeightedRegret: number } | null {
  const alpha = new Map(weights.map((w) => [w.variantId, w.alpha]));
  let best: { slateId: string; worstWeightedRegret: number } | null = null;
  for (const c of candidates) {
    let worst = 0;
    for (const r of c.regrets) {
      worst = Math.max(worst, (alpha.get(r.variantId) ?? 0) * r.expectedRegret);
    }
    if (best === null || worst < best.worstWeightedRegret) {
      best = { slateId: c.slateId, worstWeightedRegret: worst };
    }
  }
  return best;
}

/** Ex-post best variant weight share (gate: > 0.5 within 8 weeks of a regime change). */
export function bestVariantShare(
  weights: readonly VariantWeight[],
  bestVariantId: string,
): number {
  const w = weights.find((x) => x.variantId === bestVariantId);
  return w ? w.alpha : 0;
}
