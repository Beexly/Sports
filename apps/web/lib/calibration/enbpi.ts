/**
 * EnbPI: Ensemble Batch Prediction Intervals for time series — arXiv 2010.09107
 * ("Conformal Prediction for Time Series (EnbPI)").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: B=25 bootstrap fits of the margin model on trailing
 * seasons with leave-one-out ensemble predictions per game; residuals
 * windowed over the trailing ~100 games (T' in {50, 100, 200}); asymmetric
 * beta-optimized intervals at alpha in {0.1, 0.2}; early-season mode seeds
 * the window with prior-season residuals; retrain triggers when
 * trailing-20-game coverage < 1-alpha-0.05 for 2 consecutive weeks.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT if full-season empirical
 * coverage is within +/-2pp of nominal AND mean width <= split-conformal
 * baseline; early-season (weeks 1-4) coverage must beat ICP by >=3pp.
 * REJECT the bootstrap-ensemble component if B=25 refits exceed the weekly
 * compute budget — fall back to a single-model sliding-window variant.
 */

/** Empirical quantile with finite-sample rank ceil(q*(n+1)) - 1. */
export function empiricalQuantile(values: readonly number[], q: number): number {
  const n = values.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  const s = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(q * (n + 1)) - 1;
  if (rank >= n) return Number.POSITIVE_INFINITY;
  return s[Math.max(rank, 0)]!;
}

/**
 * LOO ensemble prediction per game: mean of the bootstrap fits that did not
 * see the game. bootstrapPreds[b][i] = fit b's prediction for game i;
 * inBag[b][i] = whether game i trained fit b.
 */
export function looEnsemblePredictions(
  bootstrapPreds: ReadonlyArray<readonly number[]>,
  inBag: ReadonlyArray<readonly boolean[]>,
): number[] {
  const n = bootstrapPreds[0]?.length ?? 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let b = 0; b < bootstrapPreds.length; b++) {
      if (!inBag[b]?.[i]) {
        sum += bootstrapPreds[b]![i]!;
        count++;
      }
    }
    out.push(count > 0 ? sum / count : Number.NaN);
  }
  return out;
}

/** Residuals y - yhat on the games where LOO predictions exist. */
export function looResiduals(
  outcomes: readonly number[],
  looPreds: readonly number[],
): number[] {
  const out: number[] = [];
  for (let i = 0; i < outcomes.length && i < looPreds.length; i++) {
    if (Number.isFinite(looPreds[i])) out.push(outcomes[i]! - looPreds[i]!);
  }
  return out;
}

/** Trailing window of residuals (last windowSize). */
export function residualWindow(
  residuals: readonly number[],
  windowSize: number,
): number[] {
  if (residuals.length === 0) return [];
  return residuals.slice(Math.max(0, residuals.length - windowSize));
}

/**
 * Early-season seeding: prior-season residuals seed the window, then current
 * season residuals append; take the trailing windowSize.
 */
export function seedEarlySeasonWindow(
  priorSeasonResiduals: readonly number[],
  currentResiduals: readonly number[],
  windowSize: number,
): number[] {
  return residualWindow([...priorSeasonResiduals, ...currentResiduals], windowSize);
}

/**
 * Asymmetric EnbPI interval: [f - Q_{1-(1-beta)*alpha}(resid),
 * f + Q_{1-beta*alpha}(resid)] on signed residuals y - f. beta in [0,1];
 * beta=0.5 recovers the symmetric interval.
 */
export function enbpiInterval(
  pointForecast: number,
  residuals: readonly number[],
  alpha: number,
  beta = 0.5,
): { readonly lo: number; readonly hi: number } {
  if (residuals.length === 0) {
    return { lo: Number.NEGATIVE_INFINITY, hi: Number.POSITIVE_INFINITY };
  }
  const b = Math.min(Math.max(beta, 0), 1);
  const loQ = empiricalQuantile(residuals, b * alpha);
  const hiQ = empiricalQuantile(residuals, 1 - (1 - b) * alpha);
  return { lo: pointForecast + loQ, hi: pointForecast + hiQ };
}

/**
 * Beta-optimization: grid-search beta in [0,1] minimizing mean interval
 * width over a set of point forecasts (paper's width-minimizing beta-hat).
 */
export function optimizeBeta(
  pointForecasts: readonly number[],
  residuals: readonly number[],
  alpha: number,
  step = 0.05,
): number {
  let bestBeta = 0.5;
  let bestWidth = Number.POSITIVE_INFINITY;
  for (let b = 0; b <= 1 + 1e-9; b += step) {
    const beta = Math.min(b, 1);
    let width = 0;
    let count = 0;
    for (const f of pointForecasts) {
      const { lo, hi } = enbpiInterval(f, residuals, alpha, beta);
      if (Number.isFinite(lo) && Number.isFinite(hi)) {
        width += hi - lo;
        count++;
      }
    }
    const mean = count > 0 ? width / count : Number.POSITIVE_INFINITY;
    if (mean < bestWidth) {
      bestWidth = mean;
      bestBeta = beta;
    }
  }
  return bestBeta;
}

/** Empirical coverage of intervals against outcomes. */
export function intervalCoverage(
  intervals: ReadonlyArray<{ readonly lo: number; readonly hi: number }>,
  outcomes: readonly number[],
): number {
  if (intervals.length === 0 || intervals.length !== outcomes.length) return 0;
  let hits = 0;
  for (let i = 0; i < intervals.length; i++) {
    const y = outcomes[i]!;
    if (y >= intervals[i]!.lo && y <= intervals[i]!.hi) hits++;
  }
  return hits / intervals.length;
}

/**
 * Retrain trigger: trailing-20-game coverage below 1-alpha-0.05 for 2
 * consecutive weeks. weeklyCoverages ordered oldest to newest.
 */
export function retrainTrigger(
  weeklyCoverages: readonly number[],
  alpha: number,
): boolean {
  if (weeklyCoverages.length < 2) return false;
  const floor = 1 - alpha - 0.05;
  const n = weeklyCoverages.length;
  return weeklyCoverages[n - 1]! < floor && weeklyCoverages[n - 2]! < floor;
}
