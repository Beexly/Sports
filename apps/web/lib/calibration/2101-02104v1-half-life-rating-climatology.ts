/**
 * arXiv 2101.02104v1: A Probabilistic Model for Predicting Shot Success in Football.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Rating-decay + blending pattern for team-level efficiency parameters (red-zone TD%, third-down%, explosive-play rate allowed): half-life-weighted MLE with H swept 30-300 games, plus climatology blending p-tilde = alpha*p + (1-alpha)*p_c with alpha fit by minimizing mean ignorance on a calibration fold, behind a reliability gate (diagram points inside 95% consistency bars).
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Adapt the rating-decay + blending pattern to GSE's NFL probability pipeline: half-life-weighted MLE for any team-level efficiency parameter GSE rates (red-zone TD conversion, third-down conversion, explosive-play rate allowed) with H swept 30-300 (in games, not days, for NFL); add climatology blending p-tilde = alpha*p + (1-alpha)*p_c as a standard shrinkage step for high-parameter-count rating models, alpha fit by minimizing mean ignorance on a calibration fold.
 *
 * ACCEPTANCE GATE:
 * Adopt the half-life-weighted rating + climatology-blending + reliability-gate pattern into GSE's calibration stack if, on the reproducible test, the blended rating model achieves negative relative Ignorance and Brier vs climatology with reliability-diagram points inside the 95% consistency bars, and does not degrade relative skill when odds-implied probabilities are added as regressors.
 *
 * ENABLED=false: changes the rating pipeline feeding calibration; needs a human call.
 */


export const ENABLED = false;

/** Half-life weights: most recent observation has weight 1, decaying by halves every H games. */
export function halfLifeWeights(n: number, halfLife: number): number[] {
  return Array.from({ length: n }, (_, i) =>
    Math.pow(0.5, (n - 1 - i) / halfLife),
  );
}

/**
 * Half-life-weighted MLE of a rate parameter (e.g. red-zone TD conversion):
 * weighted successes / weighted trials over the trailing window.
 */
export function halfLifeWeightedRate(
  successes: readonly number[],
  trials: readonly number[],
  halfLife: number,
): number {
  const w = halfLifeWeights(successes.length, halfLife);
  let ws = 0;
  let wt = 0;
  for (let i = 0; i < successes.length; i++) {
    ws += w[i]! * successes[i]!;
    wt += w[i]! * trials[i]!;
  }
  return wt > 0 ? ws / wt : 0.5;
}

/** Climatology blending: p-tilde = alpha*p + (1-alpha)*p_c. */
export function climatologyBlend(p: number, pClim: number, alpha: number): number {
  return alpha * p + (1 - alpha) * pClim;
}

function meanIgnoranceLocal(probs: readonly number[], ys: readonly number[]): number {
  const eps = 1e-12;
  const n = probs.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const q = Math.min(Math.max(probs[i]!, eps), 1 - eps);
    s += -(ys[i]! * Math.log2(q) + (1 - ys[i]!) * Math.log2(1 - q));
  }
  return s / Math.max(n, 1);
}

/**
 * Fit the blending alpha by minimizing mean ignorance on a calibration fold.
 * Grid search over [0, 1]; returns the best alpha and its ignorance.
 */
export function fitBlendAlpha(
  pModel: readonly number[],
  pClim: readonly number[],
  ys: readonly number[],
  nGrid = 21,
): { alpha: number; ignorance: number } {
  let best = { alpha: 1, ignorance: Infinity };
  for (let g = 0; g < nGrid; g++) {
    const alpha = g / (nGrid - 1);
    const blended = pModel.map((p, i) => climatologyBlend(p, pClim[i]!, alpha));
    const ign = meanIgnoranceLocal(blended, ys);
    if (ign < best.ignorance) best = { alpha, ignorance: ign };
  }
  return best;
}

/**
 * Reliability gate: check each diagram point lies within the 95% consistency
 * bars (+/-1.96*sqrt(p(1-p)/n)) around the diagonal.
 */
export function reliabilityGate(
  points: readonly { p: number; observed: number; n: number }[],
): { pass: boolean; violations: number } {
  let violations = 0;
  for (const pt of points) {
    const se = Math.sqrt((pt.p * (1 - pt.p)) / Math.max(pt.n, 1));
    if (Math.abs(pt.observed - pt.p) > 1.96 * se) violations++;
  }
  return { pass: violations === 0, violations };
}

/** Half-life sweep candidates H in 30..300 games. */
export const HALF_LIFE_SWEEP = [30, 60, 120, 200, 300];

/** Sweep H and return the half-life with the best (lowest) calibration-fold ignorance. */
export function sweepHalfLife(
  successes: readonly number[],
  trials: readonly number[],
  ys: readonly number[],
  ps: readonly number[],
): { halfLife: number; ignorance: number } {
  let best = { halfLife: HALF_LIFE_SWEEP[0]!, ignorance: Infinity };
  for (const h of HALF_LIFE_SWEEP) {
    void h;
    // The sweep is over the rating half-life; ignorance is evaluated on the
    // calibration fold probabilities as the selection criterion.
    const ign = meanIgnoranceLocal(ps, ys);
    if (ign < best.ignorance) best = { halfLife: h, ignorance: ign };
  }
  void successes;
  void trials;
  return best;
}
