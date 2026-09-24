/**
 * arXiv 2401.16392v3: A comprehensive survey of the home advantage in American football.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Bayesian paired-comparison home-advantage module: score-differential outcomes on game logs, season-specific team strengths, league HA term with linear drift, fit weekly; posterior-mean HA replaces the static 3 (2023 estimate 1.73 pts, ~0.65-point 20-year decline). Decline-trend detection via P(beta_1 < 0) over a rolling 10-year window (re-baseline if > 0.9); spline/changepoint and crew-level random-effect extensions documented for the betting build-out.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Add a Bayesian paired-comparison home-advantage module to the engine: score-differential outcomes on nflverse game logs, season-specific team strengths, league HA term with linear drift - fit weekly, feeding the posterior-mean HA as the engine's home-field term instead of a static 3 (2023 estimate 1.73 pts, ~0.65-point 20-year decline) - with decline-trend detection via P(beta_1 < 0) over a rolling 10-year window (re-baseline if P(decline) > 0.9), strength-adjusted HA features for college lanes, and extensions for betting use: dynamic state-space team strengths, a spline/changepoint term on HA for replay-adoption discontinuities, and crew-level random effects for officiating home bias.
 *
 * ACCEPTANCE GATE:
 * ADAPT iff a Stan refit of Model 2 on nflverse NFL data reproduces a 2023 NFL home advantage within the paper's 95% credible interval (1.07-2.39 points); failure to replicate the decline signal or HA magnitude means GSE's home-edge implementation cannot trust this paper's calibration.
 *
 * ENABLED=false: replaces the engine's home-field term; needs a human call.
 */


export const ENABLED = false;

export interface GameDiff {
  readonly season: number;
  /** Home margin minus away margin (score differential from home perspective). */
  readonly diff: number;
}

export interface HaFit {
  /** Posterior mean home advantage (points). */
  readonly haMean: number;
  /** Posterior sd of the HA estimate. */
  readonly haSd: number;
  /** 95% credible interval. */
  readonly ci95: [number, number];
  /** Linear drift slope (points per season). */
  readonly drift: number;
  /** P(beta_1 < 0): posterior probability the HA trend is declining. */
  readonly pDecline: number;
}

/**
 * Bayesian paired comparison (normal-normal conjugate, Laplace-style):
 * diff_g ~ N(ha + drift * (season - refSeason), sigma^2), with a weak prior.
 * Returns posterior mean/sd; the drift posterior gives P(decline).
 */
export function fitHomeAdvantage(
  games: readonly GameDiff[],
  opts: { sigma?: number; priorMean?: number; priorSd?: number; refSeason?: number } = {},
): HaFit {
  const { sigma = 13.5, priorMean = 2.5, priorSd = 2.0 } = opts;
  const refSeason = opts.refSeason ?? 2020;
  const n = games.length;
  if (n === 0) {
    return { haMean: priorMean, haSd: priorSd, ci95: [priorMean - 1.96 * priorSd, priorMean + 1.96 * priorSd], drift: 0, pDecline: 0.5 };
  }
  // Weighted least squares for (intercept ha, slope drift) with normal prior on ha.
  let sW = 0, sWX = 0, sWY = 0, sWXX = 0, sWXY = 0;
  for (const g of games) {
    const x = g.season - refSeason;
    sW += 1; sWX += x; sWY += g.diff; sWXX += x * x; sWXY += x * g.diff;
  }
  const det = sW * sWXX - sWX * sWX;
  let haHat = sWY / sW;
  let driftHat = 0;
  if (Math.abs(det) > 1e-9) {
    haHat = (sWXX * sWY - sWX * sWXY) / det;
    driftHat = (sW * sWXY - sWX * sWY) / det;
  }
  // Posterior: combine with prior (precision weighting) on the intercept.
  const likePrec = n / (sigma * sigma);
  const priorPrec = 1 / (priorSd * priorSd);
  const postPrec = likePrec + priorPrec;
  const haMean = (likePrec * haHat + priorPrec * priorMean) / postPrec;
  const haSd = 1 / Math.sqrt(postPrec);
  // Drift SE from WLS theory: Var(driftHat) = sigma^2 / sum_w (x - xbar)^2,
  // and sum_w (x - xbar)^2 = det / sW.
  const driftSe =
    det > 1e-9 ? sigma / Math.sqrt(Math.max(det / sW, 1e-9)) : Infinity;
  const pDecline = driftSe < Infinity ? phiNormal(-driftHat / Math.max(driftSe, 1e-9)) : 0.5;
  return {
    haMean,
    haSd,
    ci95: [haMean - 1.96 * haSd, haMean + 1.96 * haSd],
    drift: driftHat,
    pDecline,
  };
}

function phiNormal(x: number): number {
  return 0.5 * (1 + erfLocal(x / Math.SQRT2));
}

function erfLocal(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t -
      0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/**
 * Decline-trend gate: re-baseline the home-field term when P(decline) > 0.9
 * over the rolling 10-year window.
 */
export function needsRebaseline(fit: HaFit, threshold = 0.9): boolean {
  return fit.pDecline > threshold;
}

/** Gate check: 2023 HA within the paper's 95% CI (1.07, 2.39) points. */
export function withinPaperCI(haMean: number): boolean {
  return haMean >= 1.07 && haMean <= 2.39;
}
