/**
 * Quantifying Uncertainty in Deep Spatiotemporal Forecasting
 *
 * arXiv:2105.11982v2 · lane:calibration · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Binned reliability analysis plus isotonic (PAVA) recalibration: group predicted probabilities into
 * bins, measure expected calibration error as the count-weighted |observed - predicted| gap, and refit
 * a monotone non-decreasing correction so recalibrated probabilities match empirical frequencies.
 *
 * Improvement (wiring record): Adopt MIS as GSE's standard interval score and a quantile/MIS-regression head as GSE's interval
 * engine for total-line and prop intervals: per the paper's Table 1 mapping (thousands of games,
 * limited compute), rule out MC dropout (worst MIS in all three tasks) and naive bootstrap (25
 * retrains), train quantile-regression (pinball, 0.025/0.5/0.975) and MIS-regression (eq. 7) heads on
 * the existing engine, plus a DeepGLEAM-style residual model on (engine projection - closing line) —
 * then extend with a DCRNN-style graph convolution over an NFL team graph (nodes = teams, edges =
 * games played, recency weights) so the interval head conditions on opponent-adjusted residuals, and
 * combine SG-MCMC's posterior-mean point forecast with the MIS-regression interval head.
 *
 * ACCEPTANCE GATE: Adopt MIS as the standard interval score and the quantile/MIS-regression head as GSE's interval
 * engine if: on the 2025 test season, the MIS-regression (or quantile) interval beats the current
 * fixed-band practice by >=10% in MIS with coverage in [0.93, 0.97].
 *
 * Ingest role: probability calibration (reliability bins, ECE, isotonic recalibration).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2105.11982v2" as const;
export const LANE = "calibration" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt MIS as the standard interval score and the quantile/MIS-regression head as GSE's interval engine if: on the 2025 test season, the MIS-regression (or quantile) interval beats the current fixed-band practice by >=10% in MIS with coverage in [0.93, 0.97].`;

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
