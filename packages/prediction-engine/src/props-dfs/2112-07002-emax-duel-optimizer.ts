/**
 * arXiv 2112.07002: Optimizing the Expected Maximum of Two Linear Functions Defined on a Multivariate Gaussian Distribution
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Add an E[max] duel optimizer for 2-entry Showdown: closed-form E[max] objective over (mu1, mu2, sigma1, sigma2, rho) from GSE projections/variances/game-script stacking correlations, solved via cutting-plane/MINLP; then extend to n-entry portfolios via greedy sequential optimization with moment-matched Gaussian conditioning of the running max -- benchmarked against the SAA approach on 20-entry Showdown portfolios.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add an E[max] duel optimizer for 2-entry Showdown: closed-form E[max] objective over (mu1, mu2, sigma1, sigma2, rho) from GSE projections/variances/game-script stacking correlations, solved via cutting-plane/MINLP; then extend to n-entry portfolios via greedy sequential optimization with moment-matched Gaussian conditioning of the running max — benchmarked against the SAA approach on 20-entry Showdown portfolios.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt iff on 2024 Showdown backtests the exact 2-entry method's realized best-entry score beats the top-2-EV baseline by >=2.0 points on average across >=20 contests AND simulated E[max] improvement is >=4.0 points; reject if the Gaussian assumption systematically misses high-variance captain plays.
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
