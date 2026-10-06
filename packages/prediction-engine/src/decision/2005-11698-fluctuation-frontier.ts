// ============================================================
// Fluctuation frontier: Pareto choice of the Kelly fraction (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (realized point within 15% of the predicted frontier at lower realized
 * fluctuation) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2005.11698 — "Phase transitions in optimal strategies for betting"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the paper maps the full (<W>, sigma_W) Pareto frontier
 * of expected log-growth vs growth-rate fluctuation over Kelly fractions:
 * at full Kelly the frontier's slope is vertical (tiny extra growth for
 * huge extra fluctuation — the fractional-Kelly rationale), and a
 * TUR-like bound sigma_W >= <W>/sigma_q constrains admissible
 * (growth, fluctuation) pairs given the outcome entropy.
 *
 * IMPROVEMENT (from ledger): Replace the hard-coded 0.25 Kelly default with
 * a frontier choice: compute the (<W>, sigma_W) Pareto frontier over Kelly
 * fractions on GSE's backtest edge distribution and pick the fraction at a
 * configured fluctuation budget (default: the knee); add the TUR-like bound
 * sigma_W >= <W>/sigma_q as a monitoring invariant (violation =>
 * probability/odds inputs inconsistent => alert); document the
 * vertical-slope-at-Kelly finding as the fractional-Kelly rationale.
 *
 * ACCEPTANCE GATE: ADOPT the frontier-chosen fraction if its realized
 * (<W>, sigma_W) point lies within 15% of the predicted frontier
 * (validating the framework on GSE data) AND it matches or beats baseline
 * realized growth at lower realized fluctuation.
 */

/** One point on the (<W>, sigma_W) frontier. */
export interface FrontierPoint {
  fraction: number;
  meanLogGrowth: number; // <W>: expected log-growth per bet
  sigmaW: number; // sigma_W: std of log-growth per bet
}

/**
 * Compute the (<W>, sigma_W) Pareto frontier over Kelly fractions on the
 * empirical edge distribution (net returns per unit staked).
 */
export function growthFluctuationFrontier(
  edgeReturns: number[],
  fractions: number[],
): FrontierPoint[] {
  const n = edgeReturns.length;
  return fractions.map((f) => {
    let mean = 0;
    let m2 = 0;
    for (const r of edgeReturns) {
      const g = Math.log(Math.max(1 + f * r, 1e-12));
      mean += g;
      m2 += g * g;
    }
    mean /= Math.max(n, 1);
    const variance = Math.max(m2 / Math.max(n, 1) - mean * mean, 0);
    return { fraction: f, meanLogGrowth: mean, sigmaW: Math.sqrt(variance) };
  });
}

/**
 * Pick the Kelly fraction at a configured fluctuation budget: the largest
 * expected growth whose sigma_W stays within budget (default: the knee —
 * the point of max growth-per-fluctuation).
 */
export function frontierFractionChoice(
  frontier: FrontierPoint[],
  fluctuationBudget: number,
): FrontierPoint | null {
  const feasible = frontier.filter((p) => p.sigmaW <= fluctuationBudget);
  if (feasible.length === 0) return null;
  // Knee: maximize growth per unit fluctuation among feasible points.
  let best = feasible[0]!;
  let bestScore = best.sigmaW > 0 ? best.meanLogGrowth / best.sigmaW : best.meanLogGrowth;
  for (const p of feasible) {
    const score = p.sigmaW > 0 ? p.meanLogGrowth / p.sigmaW : p.meanLogGrowth;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/**
 * TUR-like monitoring invariant: sigma_W >= <W> / sigma_q, where sigma_q
 * is the outcome-entropy scale (std of the edge distribution). Violation
 * => probability/odds inputs inconsistent => alert.
 */
export function turInvariantHolds(meanW: number, sigmaW: number, sigmaQ: number): boolean {
  if (sigmaQ <= 0) return true; // vacuous when the scale is degenerate
  if (meanW <= 0) return true; // bound only constrains positive-growth operation
  return sigmaW >= meanW / sigmaQ - 1e-12;
}

/**
 * Vertical-slope-at-Kelly diagnostic: the marginal growth gained per unit
 * of extra fluctuation collapses near full Kelly — the paper's
 * fractional-Kelly rationale. Returns the growth/fluctuation tradeoff
 * slope between consecutive frontier points.
 */
export function frontierSlope(p0: FrontierPoint, p1: FrontierPoint): number {
  const dSigma = p1.sigmaW - p0.sigmaW;
  if (Math.abs(dSigma) < 1e-12) return Infinity;
  return (p1.meanLogGrowth - p0.meanLogGrowth) / dSigma;
}

/** Gate helper: realized point within 15% of predicted AND growth >= baseline at lower fluctuation. */
export function frontierGatePasses(
  realizedMean: number,
  predictedMean: number,
  realizedSigma: number,
  predictedSigma: number,
  baselineMean: number,
  baselineSigma: number,
): boolean {
  const meanClose = Math.abs(realizedMean - predictedMean) <= 0.15 * Math.abs(predictedMean);
  const sigmaClose = Math.abs(realizedSigma - predictedSigma) <= 0.15 * Math.abs(predictedSigma);
  return meanClose && sigmaClose && realizedMean >= baselineMean && realizedSigma < baselineSigma;
}
