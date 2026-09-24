/**
 * Martingale-posterior uncertainty for sports forecasts — arXiv 2401.17743v1
 * ("A Martingale Posterior-based Uncertainty Quantification...").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: replace the Gaussian/bootstrap uncertainty envelope
 * with the martingale posterior: predictive resampling of the error
 * process produces the posterior predictive distribution, whose
 * uncertainty set B_tau (the paper's martingale uncertainty ball) yields
 * the published band. Extension: a scorecaster predicts next-step
 * predictive residuals (weather bucket, QB-change flag, rest differential,
 * December flag, trailing error), shifting B_tau before the interval is
 * formed; market-aware features (line movement) documented as a follow-up.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff martingale bands hit
 * nominal coverage within +/-2pp on the 2025 walk-forward with mean width
 * <= 105% of the current stack's (coverage parity at equal-or-better
 * sharpness), AND the martingale uncertainty responds to regime changes
 * faster than the static envelope (half-life <= 3 weeks on the
 * shock-injection test).
 */

/** Empirical quantile of samples (linear interpolation). */
export function empiricalQuantile(samples: readonly number[], q: number): number {
  const qc = Math.min(Math.max(q, 0), 1);
  if (samples.length === 0) return Number.NaN;
  const s = [...samples].sort((a, b) => a - b);
  const pos = qc * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/**
 * Predictive-resampling interval: the martingale posterior's predictive
 * distribution for the next error is the empirical residual distribution;
 * the (1-alpha) band is its central interval.
 */
export function predictiveResampleInterval(
  residuals: readonly number[],
  alpha: number,
): { readonly lo: number; readonly hi: number } {
  return {
    lo: empiricalQuantile(residuals, alpha / 2),
    hi: empiricalQuantile(residuals, 1 - alpha / 2),
  };
}

/**
 * Uncertainty inflation for longer horizons: the martingale error envelope
 * grows as sqrt(1 + (h-1)*decay) — documented decay fitted on trailing
 * multi-week error autocorrelation.
 */
export function horizonInflationFactor(horizonWeeks: number, decay: number): number {
  if (horizonWeeks <= 1) return 1;
  return Math.sqrt(1 + (horizonWeeks - 1) * Math.max(decay, 0));
}

/** Fraction of errors inside the uncertainty ball radius tau. */
export function coverageWithinBall(errors: readonly number[], tau: number): number {
  if (errors.length === 0) return Number.NaN;
  const inside = errors.filter((e) => Math.abs(e) <= tau).length;
  return inside / errors.length;
}

/** Coverage gate: within tolerance of the nominal target. */
export function coversTarget(
  coverage: number,
  target: number,
  tolerancePp: number,
): boolean {
  if (!Number.isFinite(coverage)) return false;
  return Math.abs(coverage - target) <= tolerancePp / 100;
}

/**
 * Scorecaster shift for the next-step predictive residuals: linear model
 * on game-context features, evaluated at serving time (coefs fit offline).
 */
export function residualScorecaster(
  features: readonly number[],
  coefs: readonly number[],
  intercept = 0,
): number {
  let s = intercept;
  for (let i = 0; i < features.length && i < coefs.length; i++) {
    s += features[i]! * coefs[i]!;
  }
  return s;
}
