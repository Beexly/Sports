/**
 * arXiv:2602.22527v1 — Predicting Tennis Serve Directions with Machine Learning
 *
 * BPRP online recalibration layer: Beta-prior histogram binning over the raw score (a,b pseudo-counts tuned
 * on the last N games) with an online isotonic-recalibration safety check — raw scores must already
 * discriminate (AUC >= 0.55) before calibration ships.
 *
 * Improvement: GSE prices tennis serve/return props with per-player gradient-boosted serve-direction classifiers trained on grouped-chronological splits and calibrated, reusing the paper's match-charting feature recipes.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if grouped-chronological log-loss beats the per-player empirical-frequency baseline by >=5% AND calibration slope on held-out matches is within [0.85, 1.15]; otherwise REJECT the ML layer and use empirical direction frequencies.
 */

/** One bin of the beta-prior histogram. */
export interface BetaBin {
  lo: number;
  hi: number;
  /** Calibrated probability (posterior mean). */
  p: number;
}

/**
 * Fit beta-prior histogram bins on the last N (score, outcome) pairs.
 * Posterior mean = (successes + a) / (n + a + b).
 */
export function fitBetaBins(
  pairs: readonly { score: number; y: 0 | 1 }[],
  binEdges: readonly number[],
  a: number,
  b: number,
): BetaBin[] {
  if (a <= 0 || b <= 0) throw new Error("fitBetaBins: a, b > 0");
  const bins: BetaBin[] = [];
  for (let i = 0; i + 1 < binEdges.length; i++) {
    const lo = binEdges[i]!;
    const hi = binEdges[i + 1]!;
    const inBin = pairs.filter((p) => p.score >= lo && (p.score < hi || (i === binEdges.length - 2 && p.score <= hi)));
    const s = inBin.filter((p) => p.y === 1).length;
    bins.push({ lo, hi, p: (s + a) / (inBin.length + a + b) });
  }
  return bins;
}

/** Apply the histogram: map a raw score to its bin's calibrated prob. */
export function applyBetaBins(bins: readonly BetaBin[], score: number): number {
  for (const bin of bins) {
    if (score >= bin.lo && score <= bin.hi) return bin.p;
  }
  return score; // out of range: pass through
}

/** AUC via the Mann-Whitney rank statistic. */
export function auc(pairs: readonly { score: number; y: 0 | 1 }[]): number {
  const pos = pairs.filter((p) => p.y === 1).map((p) => p.score);
  const neg = pairs.filter((p) => p.y === 0).map((p) => p.score);
  if (pos.length === 0 || neg.length === 0) throw new Error("auc: need both classes");
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

/** Safety check: raw scores must discriminate before calibration ships. */
export function discriminationOk(pairs: readonly { score: number; y: 0 | 1 }[], floor = 0.55): boolean {
  return auc(pairs) >= floor;
}
