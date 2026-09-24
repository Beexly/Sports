/**
 * Probabilistic Prediction for Binary Treatment Choice
 *
 * arXiv:2110.00864v1 · lane:calibration · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Binned reliability analysis plus isotonic (PAVA) recalibration: group predicted probabilities into
 * bins, measure expected calibration error as the count-weighted |observed - predicted| gap, and refit
 * a monotone non-decreasing correction so recalibrated probabilities match empirical frequencies.
 *
 * Improvement (wiring record): Frame the publish/bet decision as Manski's binary treatment choice: 'bet' (aggressive) vs 'pass'
 * (surveillance) with utility = expected Kelly growth (or realized CLV); compute the maximum regret of
 * the current as-if rule (bet iff edge > threshold) over a plausible interval [p_m, p_M] for the true
 * probability calibrated from historical engine-vs-market disagreement; derive the MMR-optimal
 * randomized threshold (the paper's q formula adapted) and the regret-optimal blended-probability rule
 * (weighted-estimator logic, Table 1 style) — then extend past the paper's binary limit into GSE's
 * real problem: portfolio regret — simultaneous correlated bets (spread + total + moneyline on the
 * same game) formulated as a multi-decision minimax-regret problem with Kelly-growth utility, solved
 * for the small-n case (2-3 simultaneous markets) by grid search over the joint disagreement region.
 * Engine-honesty infrastructure for robust publish decisions, not an edge objective.
 *
 * ACCEPTANCE GATE: Adopt the MMR threshold policy iff, on the 2024 holdout season, it achieves realized P&L >= 90% of
 * the current policy's P&L AND its worst-decile (by pre-game disagreement) regret is <= 0.7x the
 * current policy's — i.e., it buys robustness without giving up the edge.
 *
 * Ingest role: probability calibration (reliability bins, ECE, isotonic recalibration).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2110.00864v1" as const;
export const LANE = "calibration" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the MMR threshold policy iff, on the 2024 holdout season, it achieves realized P&L >= 90% of the current policy's P&L AND its worst-decile (by pre-game disagreement) regret is <= 0.7x the current policy's — i.e., it buys robustness without giving up the edge.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "binned reliability + PAVA isotonic recalibration",
  bins: 10,
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface ReliabilityBin {
  lo: number;
  hi: number;
  meanPred: number;
  meanObs: number;
  count: number;
}

function validPair(pr: { p: number; y: number }): boolean {
  return isFiniteNumber(pr.p) && pr.p >= 0 && pr.p <= 1 && (pr.y === 0 || pr.y === 1);
}

/** Group (p, y) pairs into nBins reliability bins over [0, 1]. */
export function binPredictions(
  pairs: ReadonlyArray<{ p: number; y: number }>,
  nBins: number,
): ReliabilityBin[] | null {
  if (!Number.isInteger(nBins) || nBins <= 0) return null;
  if (pairs.length === 0 || !pairs.every(validPair)) return null;
  const bins: ReliabilityBin[] = [];
  for (let b = 0; b < nBins; b++) {
    const lo = b / nBins;
    const hi = (b + 1) / nBins;
    const inBin = pairs.filter((pr) =>
      b === nBins - 1 ? pr.p >= lo && pr.p <= hi : pr.p >= lo && pr.p < hi,
    );
    bins.push({
      lo,
      hi,
      meanPred: inBin.length > 0 ? inBin.reduce((a, pr) => a + pr.p, 0) / inBin.length : (lo + hi) / 2,
      meanObs: inBin.length > 0 ? inBin.reduce((a, pr) => a + pr.y, 0) / inBin.length : 0,
      count: inBin.length,
    });
  }
  return bins;
}

/** Expected calibration error: count-weighted mean |observed - predicted| over bins. */
export function expectedCalibrationError(bins: ReadonlyArray<ReliabilityBin>): number | null {
  const total = bins.reduce((a, b) => a + b.count, 0);
  if (total <= 0) return null;
  return bins.reduce((a, b) => a + (b.count / total) * Math.abs(b.meanObs - b.meanPred), 0);
}

/**
 * Isotonic recalibration via pool-adjacent-violators (PAVA) on sorted predicted probabilities.
 * Returns fitted monotone non-decreasing values aligned with the sorted input order.
 */
export function isotonicCalibrate(pairs: ReadonlyArray<{ p: number; y: number }>): number[] | null {
  if (pairs.length === 0 || !pairs.every(validPair)) return null;
  const sorted = [...pairs].sort((a, b) => a.p - b.p);
  const blocks: Array<{ sum: number; count: number }> = [];
  for (const pr of sorted) {
    blocks.push({ sum: pr.y, count: 1 });
    while (blocks.length >= 2) {
      const n = blocks.length;
      const last = blocks[n - 1]!;
      const prev = blocks[n - 2]!;
      if (prev.sum / prev.count <= last.sum / last.count) break;
      blocks.pop();
      blocks.pop();
      blocks.push({ sum: prev.sum + last.sum, count: prev.count + last.count });
    }
  }
  const fitted: number[] = [];
  for (const b of blocks) {
    const v = b.sum / b.count;
    for (let i = 0; i < b.count; i++) fitted.push(v);
  }
  return fitted;
}
