/**
 * arXiv 2407.13438: The Madness of Multiple Entries in March Madness
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Replace max-EV 150-entry GPP construction with the paper's expected-maximum-score (EMS) portfolio optimizer using SAA/PROP+ greedy heuristics, extended to field-aware EMS that maximizes P(best entry beats the field's best entry) against K synthetic sharp entries so portfolios gain contrarian leverage instead of raw EMS alone.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Replace max-EV 150-entry GPP construction with the paper's expected-maximum-score (EMS) portfolio optimizer using SAA/PROP+ greedy heuristics, extended to field-aware EMS that maximizes P(best entry beats the field's best entry) against K synthetic sharp entries so portfolios gain contrarian leverage instead of raw EMS alone.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the EMS portfolio optimizer if on 2024 backtests the G-SAA or PROP+ 150-entry portfolio beats the 150×-max-EV baseline on simulated EMS by ≥5.0 points AND on realized best-entry finish percentile by ≥5 percentile points across ≥10 slates; reject if the SAA MILP doesn't solve within 30 minutes per slate.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

function phiStd(x: number): number {
  return Math.exp(-0.5 * x * x) / 2.5066282746310002;
}

function PhiStd(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/**
 * Closed-form E[max(X, Y)] for bivariate Gaussian (mu1, mu2, s1, s2, rho).
 * Used for the 2-entry Showdown duel optimizer.
 */
export function expectedMax2(
  mu1: number,
  mu2: number,
  s1: number,
  s2: number,
  rho: number,
): number {
  const sd = Math.sqrt(Math.max(1e-12, s1 * s1 + s2 * s2 - 2 * rho * s1 * s2));
  const d = (mu1 - mu2) / sd;
  return mu1 * PhiStd(d) + mu2 * PhiStd(-d) + sd * phiStd(d);
}

/** Greedy sequential n-entry portfolio via moment-matched Gaussian conditioning. */
export function emaxPortfolioGreedy(
  mus: number[],
  sigmas: number[],
  rhos: number[][],
  k: number,
): number[] {
  const n = mus.length;
  const chosen: number[] = [];
  const remaining = new Set(Array.from({ length: n }, (_, i) => i));
  // running max approximated as Gaussian with matched moments
  let mMean = -Infinity;
  let mVar = 0;
  for (let t = 0; t < k && remaining.size > 0; t++) {
    let best = -1;
    let bestV = -Infinity;
    for (const i of remaining) {
      const rho = chosen.length === 0 ? 0 : avgCorr(i, chosen, rhos);
      const sd = Math.sqrt(Math.max(1e-12, sigmas[i]! ** 2 + mVar - 2 * rho * sigmas[i]! * Math.sqrt(mVar)));
      const d = chosen.length === 0 ? Infinity : (mus[i]! - mMean) / sd;
      const gain = chosen.length === 0 ? mus[i]! : sd * phiStd(d) + (mus[i]! - mMean) * PhiStd(d);
      if (gain > bestV) {
        bestV = gain;
        best = i;
      }
    }
    chosen.push(best);
    remaining.delete(best);
    // moment-match the new running max (assume independence for the update)
    if (t === 0) {
      mMean = mus[best]!;
      mVar = sigmas[best]! ** 2;
    } else {
      const sd = Math.sqrt(Math.max(1e-12, sigmas[best]! ** 2 + mVar));
      const d = (mus[best]! - mMean) / sd;
      const newMean = mus[best]! * PhiStd(d) + mMean * PhiStd(-d) + sd * phiStd(d);
      mVar = Math.max(1e-9, mVar * 0.9); // shrink: max concentrates
      mMean = newMean;
    }
  }
  return chosen;
}

function avgCorr(i: number, chosen: number[], rhos: number[][]): number {
  if (chosen.length === 0) return 0;
  return chosen.reduce((s, j) => s + rhos[i]![j]!, 0) / chosen.length;
}

/** Order-statistic predictors: sorted projections/ceilings/ownership per lineup. */
export function orderStatFeatures(lineup: number[]): number[] {
  return [...lineup].sort((a, b) => b - a);
}

/** Unanimous-consent filter: lineups every classifier flags. */
export function unanimityShortlist(votes: boolean[][]): number[] {
  const out: number[] = [];
  for (let i = 0; i < votes.length; i++) {
    if (votes[i]!.every((v) => v)) out.push(i);
  }
  return out;
}

/** Calibrated agreement threshold: k-of-M votes. */
export function agreementThreshold(votes: boolean[][], k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < votes.length; i++) {
    if (votes[i]!.filter((v) => v).length >= k) out.push(i);
  }
  return out;
}

/** Precision of a shortlist against realized elite labels. */
export function shortlistPrecision(shortlist: number[], elite: Set<number>): number {
  if (shortlist.length === 0) return 0;
  return shortlist.filter((i) => elite.has(i)).length / shortlist.length;
}
