/**
 * arXiv:2602.17043 — Quantifying the Limits of Human Athletic Performance: A Bayesian Analysis of Elite Decathletes
 *
 * Weather-covariate layer for player performance: per-game-phase posterior weather coefficients
 * (wind/temp/precip/dome) in a Bayesian compositional framework; posterior predictive intervals must cover
 * at 88-93%.
 *
 * Improvement: GSE adds a weather-covariate layer to its player-performance model: per-game-phase posterior weather coefficients (wind/temp/precip/dome) fit in a Bayesian compositional framework, so totals and props price phase-specific weather effects.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if tail-CV RMSE improves >=2% over the no-weather baseline, posterior predictive 90% intervals achieve 88-93% empirical coverage, and at least one weather coefficient has a 95% credible interval excluding zero with stable sign across seasons.
 */

/** Weather covariates for one game phase. */
export interface WeatherCov {
  windMph: number;
  tempF: number;
  precipIn: number;
  dome: boolean;
}

/** Posterior summary for one weather coefficient. */
export interface WeatherCoef {
  name: string;
  mean: number;
  sd: number;
}

/** Standardized design row from raw weather covariates. */
export function weatherDesign(w: WeatherCov): number[] {
  return [
    w.windMph / 20,
    (w.tempF - 60) / 30,
    Math.min(2, w.precipIn) / 2,
    w.dome ? 1 : 0,
  ];
}

/**
 * Posterior predictive mean adjustment for expected points given posterior
 * coefficient draws (mean +/- 1.96*sd bands via the delta method).
 */
export function weatherAdjustment(
  coefs: readonly WeatherCoef[],
  w: WeatherCov,
): { mean: number; lo: number; hi: number } {
  const x = weatherDesign(w);
  let mean = 0;
  let varSum = 0;
  coefs.forEach((c, i) => {
    mean += c.mean * (x[i] ?? 0);
    varSum += (c.sd * (x[i] ?? 0)) ** 2;
  });
  const sd = Math.sqrt(varSum);
  return { mean, lo: mean - 1.96 * sd, hi: mean + 1.96 * sd };
}

/** 95% credible interval excludes zero with a stable sign? */
export function coefSignificant(c: WeatherCoef): boolean {
  return Math.abs(c.mean) > 1.96 * c.sd;
}
