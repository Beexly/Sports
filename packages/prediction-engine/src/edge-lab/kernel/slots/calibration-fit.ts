/**
 * SLOT `calibration-fit` — Cox logistic recalibration (calibration slope and
 * intercept) fitted by iteratively reweighted least squares.
 *
 * WHAT IT MEASURES
 * Given forecasts p_i and binary outcomes y_i, fit the one-covariate logistic
 * regression
 *
 *     logit( P(Y = 1) ) = intercept + slope · logit(p)
 *
 * by maximum likelihood. The pair (intercept, slope) is the classical Cox
 * calibration test:
 *
 *   - slope = 1 and intercept = 0  → the forecasts are calibrated-in-the-large
 *     AND calibrated-in-the-small on the log-odds scale (this is the null; it is
 *     what a perfect forecaster produces).
 *   - slope < 1 → OVER-confident. The forecasts are spread too far towards 0 and
 *     1; the true log-odds move less than the forecast log-odds do, so the fit
 *     has to shrink them back in.
 *   - slope > 1 → UNDER-confident. The forecasts are too timid, huddled near the
 *     base rate; the true log-odds move more than the forecast log-odds do.
 *   - intercept ≠ 0 → a systematic bias on the log-odds scale: positive means the
 *     forecasts are too low across the board, negative means too high.
 *
 * Slope and intercept answer different questions than the Brier/Murphy split:
 * Murphy's `reliability` says HOW MUCH calibration error there is, this slot says
 * WHAT SHAPE it has, and only the shape tells you how to fix it (rescale the
 * log-odds vs. shift them).
 *
 * WHY IRLS AND NOT A CLOSED FORM
 * The logistic likelihood has no closed-form maximiser. IRLS is Newton–Raphson
 * on the log-likelihood; because the logistic log-likelihood is concave in the
 * coefficients and the Hessian is exactly −XᵀWX, the Newton step is the solution
 * of a weighted least-squares problem and converges quadratically near the
 * optimum. With two coefficients the normal equations are a 2×2 system solved in
 * closed form (no matrix library, no pivoting heuristics).
 *
 * Per iteration, with x_i = logit(p_i) centred (see NUMERICAL NOTES):
 *
 *     η_i = b0 + b1·x_i
 *     μ_i = sigmoid(η_i)
 *     w_i = μ_i (1 − μ_i)
 *     [ Σw      Σw·x  ] [ Δb0 ]   [ Σ (y_i − μ_i)      ]
 *     [ Σw·x    Σw·x² ] [ Δb1 ] = [ Σ x_i (y_i − μ_i)  ]
 *
 * and b ← b + Δb. At the optimum the right-hand side (the score) is zero, which
 * is the property the test suite checks against instead of re-running this code.
 *
 * NUMERICAL NOTES
 *  - CLAMP: predictions are clamped to [1e-12, 1 − 1e-12] before the logit,
 *    exactly as the contract mandates. logit(0) = −∞ and logit(1) = +∞ would make
 *    every downstream quantity non-finite, and a forecast of literally 0 or 1 is
 *    a legitimate (if reckless) forecast that must still be scoreable. The clamp
 *    maps them to log-odds of ∓27.631021115928547, i.e. "as extreme as this slot
 *    is willing to read". Two consequences are deliberate and documented rather
 *    than hidden: any prediction at or beyond the clamp is indistinguishable from
 *    any other (0 and 1e-13 produce identical fits), and the resulting |x| ≈ 27.6
 *    is a high-leverage point that will dominate the fit.
 *  - CENTRING: the fit is run on x_i − x̄ and the intercept is transformed back at
 *    the end (η = b0 + b1(x − x̄) = (b0 − b1·x̄) + b1·x). This is an exact
 *    reparameterisation — not an approximation — and it makes the off-diagonal of
 *    the 2×2 information matrix small, which keeps the determinant away from
 *    catastrophic cancellation when the log-odds are far from centred (precisely
 *    the situation the clamp above creates).
 *  - SINGULARITY: the 2×2 solve is guarded by the scale-free ratio
 *    det / (Σw · Σw·x²), which lies in [0, 1] by Cauchy–Schwarz. A ratio at or
 *    below 1e-12 means the weighted design is numerically rank-deficient and the
 *    step would be Infinity, so the routine throws instead of returning garbage.
 *
 * FAILURE MODES (fail closed — this function never returns NaN or Infinity)
 *  - MISMATCHED_LENGTH — `predicted` and `outcomes` differ in length.
 *  - EMPTY             — no observations.
 *  - NOT_FINITE        — a prediction or outcome is NaN/±Infinity.
 *  - DOMAIN            — a prediction is outside [0, 1], or an outcome is not
 *                        exactly 0 or 1.
 *  - UNSUPPORTED       — the maximum-likelihood fit does not EXIST for this data:
 *                        (a) the outcomes are all 0 or all 1, so the likelihood
 *                            increases without bound as the intercept runs off to
 *                            ∓∞ and no finite fit is the MLE; or
 *                        (b) every prediction is identical, so logit(p) is
 *                            constant, the design matrix has rank 1 and the slope
 *                            is not identifiable at all (any slope can be traded
 *                            against the intercept for the same likelihood).
 *                        These are properties of the DATA, detected before the
 *                        first iteration — reporting them as non-convergence
 *                        would misdescribe them, since no amount of iterating
 *                        would help.
 *  - NO_CONVERGENCE    — the iteration did not settle within 100 steps, or the
 *                        weighted information matrix collapsed mid-iteration.
 *                        The dominant real-world cause is (quasi-)complete
 *                        separation: some threshold on logit(p) perfectly splits
 *                        the outcomes, the MLE slope is +∞, and the weights decay
 *                        towards zero as the coefficients run away. That is a
 *                        genuine "no finite answer" verdict and is surfaced as
 *                        such rather than as an arbitrary truncated iterate.
 */

import {
  KernelError,
  assertFinite,
  assertNonEmpty,
  assertProbability,
  assertSameLength,
  type CalibrationFit,
  type CalibrationFitFn,
} from "../contract.js";

/**
 * Contract-mandated clamp on predictions before taking the logit.
 * See NUMERICAL NOTES above for why it exists and what it costs.
 */
const P_CLAMP_LO = 1e-12;
const P_CLAMP_HI = 1 - 1e-12;

/** Contract-mandated iteration budget for IRLS. */
const MAX_ITERATIONS = 100;

/**
 * Contract-mandated convergence tolerance, applied to the Newton step as
 * |Δb_j| <= TOLERANCE · (1 + |b_j|). The (1 + |b_j|) factor makes the test
 * absolute for coefficients of order 1 (where 1e-10 is the stated bar) and
 * relative for large coefficients, where an absolute 1e-10 would sit below
 * double-precision resolution and would report a spurious NO_CONVERGENCE on a
 * fit that has in fact stopped moving.
 */
const TOLERANCE = 1e-10;

/**
 * Relative floor on det / (Σw · Σw·x²). The ratio is in [0, 1] by
 * Cauchy–Schwarz; at or below this the 2×2 system is numerically singular.
 */
const SINGULARITY_RATIO = 1e-12;

/** log(p / (1 − p)) with the contract clamp applied. */
function clampedLogit(p: number): number {
  const q = p < P_CLAMP_LO ? P_CLAMP_LO : p > P_CLAMP_HI ? P_CLAMP_HI : p;
  return Math.log(q / (1 - q));
}

/**
 * Numerically stable logistic function: the branch on the sign of z keeps the
 * exponential argument non-positive, so it underflows to 0 instead of
 * overflowing to Infinity and producing NaN in the ratio.
 */
function sigmoid(z: number): number {
  if (z >= 0) {
    return 1 / (1 + Math.exp(-z));
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * Logistic recalibration (Cox) by IRLS. See the file header for the model, the
 * documented clamp, and the full list of failure modes.
 */
export const calibrationFit: CalibrationFitFn = (predicted, outcomes): CalibrationFit => {
  assertSameLength(predicted, outcomes, "predicted", "outcomes");
  assertNonEmpty(predicted, "predicted");

  const n = predicted.length;
  const x = new Array<number>(n);
  const y = new Array<number>(n);

  let sawZero = false;
  let sawOne = false;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let sumX = 0;

  for (let i = 0; i < n; i += 1) {
    const p = predicted[i]!;
    assertProbability(p, `predicted[${i}]`);

    const outcome: number = outcomes[i]!;
    assertFinite(outcome, `outcomes[${i}]`);
    if (outcome !== 0 && outcome !== 1) {
      throw new KernelError(
        "DOMAIN",
        `outcomes[${i}] must be exactly 0 or 1, received ${outcome}`,
      );
    }
    if (outcome === 1) sawOne = true;
    else sawZero = true;

    const xi = clampedLogit(p);
    // The clamp bounds |xi| by ~27.63, so this is unreachable for in-domain
    // input; it is kept because a silent non-finite covariate would poison the
    // whole fit and this slot must fail closed rather than propagate it.
    assertFinite(xi, `logit(predicted[${i}])`);

    x[i] = xi;
    y[i] = outcome;
    sumX += xi;
    if (xi < minX) minX = xi;
    if (xi > maxX) maxX = xi;
  }

  if (!sawZero || !sawOne) {
    throw new KernelError(
      "UNSUPPORTED",
      `outcomes are all ${sawOne ? 1 : 0}; the logistic maximum-likelihood fit does not exist ` +
        "(the likelihood increases without bound as the intercept diverges)",
    );
  }
  if (!(maxX > minX)) {
    throw new KernelError(
      "UNSUPPORTED",
      "all predictions are identical, so logit(predicted) is constant and the " +
        "calibration slope is not identifiable",
    );
  }

  // Exact reparameterisation on centred log-odds; undone before returning.
  const meanX = sumX / n;
  for (let i = 0; i < n; i += 1) {
    x[i] = x[i]! - meanX;
  }

  let b0 = 0;
  let b1 = 0;
  let converged = false;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let a11 = 0; // Σ w
    let a12 = 0; // Σ w·x
    let a22 = 0; // Σ w·x²
    let g0 = 0; // Σ (y − μ)
    let g1 = 0; // Σ x·(y − μ)

    for (let i = 0; i < n; i += 1) {
      const xi = x[i]!;
      const mu = sigmoid(b0 + b1 * xi);
      const w = mu * (1 - mu);
      const r = y[i]! - mu;
      a11 += w;
      a12 += w * xi;
      a22 += w * xi * xi;
      g0 += r;
      g1 += xi * r;
    }

    const det = a11 * a22 - a12 * a12;
    // Scale-free rank test: det / (a11·a22) ∈ [0, 1] by Cauchy–Schwarz.
    const scale = a11 * a22;
    if (!Number.isFinite(det) || !(det > SINGULARITY_RATIO * scale)) {
      if (iteration === 0) {
        // Singular at the starting point (b = 0, every weight = 1/4): the design
        // itself is rank-deficient, not the iteration. That is a property of the
        // data, so it is UNSUPPORTED rather than NO_CONVERGENCE.
        throw new KernelError(
          "UNSUPPORTED",
          "the weighted information matrix is singular at the initial fit; " +
            "logit(predicted) carries no usable spread, so the slope is not identifiable",
        );
      }
      throw new KernelError(
        "NO_CONVERGENCE",
        `IRLS information matrix became singular at iteration ${iteration} ` +
          "(determinant collapsed); the outcomes are likely separable by " +
          "logit(predicted), in which case the maximum-likelihood slope is infinite",
      );
    }

    const d0 = (a22 * g0 - a12 * g1) / det;
    const d1 = (a11 * g1 - a12 * g0) / det;
    if (!Number.isFinite(d0) || !Number.isFinite(d1)) {
      throw new KernelError(
        "NO_CONVERGENCE",
        `IRLS produced a non-finite Newton step at iteration ${iteration}`,
      );
    }

    b0 += d0;
    b1 += d1;
    if (!Number.isFinite(b0) || !Number.isFinite(b1)) {
      throw new KernelError(
        "NO_CONVERGENCE",
        `IRLS coefficients diverged to a non-finite value at iteration ${iteration}`,
      );
    }

    if (
      Math.abs(d0) <= TOLERANCE * (1 + Math.abs(b0)) &&
      Math.abs(d1) <= TOLERANCE * (1 + Math.abs(b1))
    ) {
      converged = true;
      break;
    }
  }

  if (!converged) {
    throw new KernelError(
      "NO_CONVERGENCE",
      `IRLS did not converge to tolerance ${TOLERANCE} within ${MAX_ITERATIONS} iterations; ` +
        "the outcomes are likely (quasi-)separable by logit(predicted)",
    );
  }

  const slope = b1;
  const intercept = b0 - b1 * meanX;
  assertFinite(slope, "slope");
  assertFinite(intercept, "intercept");

  return { slope, intercept };
};
