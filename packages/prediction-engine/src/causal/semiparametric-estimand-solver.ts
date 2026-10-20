/**
 * semiparametric-estimand-solver — one-step (efficient-influence-function) estimation of
 * the RATIO functionals that `do-calculus-id.ts` emits for the Tian c-factor reduction
 * (`FormulaClass.TianCFactorRatio`) and the C-component / front-door factorization
 * (`FormulaClass.CComponentFactorization`).
 *
 * WHY THIS EXISTS
 * Identification gives a symbolic ratio of kernels. The tempting thing to do next is to
 * plug fitted regressions straight into that ratio, which inherits the first-order bias of
 * every nuisance estimate and reports a standard error that pretends the nuisances were
 * known. This module instead computes the one-step (a.k.a. "debiased" / EIF) estimator:
 *
 *   psi^+_{x0}(Qhat; p~_z) = psi^pi_{x0}(Qhat; p~_z) + (1/n) * sum_i Phi_{x0}(Qhat; p~_z)(O_i)
 *
 * where psi^pi is the plug-in value of the ratio functional
 *
 *   psi_{x0}(Q; p~_z) = [ integral kappa_{x0,1}(Q; z) p~(z) dz ] / [ integral kappa_{x0,2}(Q; z) p~(z) dz ]
 *
 * and Phi is its influence function. The three additive pieces of Phi are implemented
 * literally as specified (see `computeInfluence`, which carries the derivation).
 *
 * WHAT IS ESTIMATED, CONCRETELY
 * A sample of O_i = (W_i, Z_i, X_i, Y_i) with X binary. The nuisances are parametric:
 *   - pi(x0 | z, w):  logistic regression of 1{X = x0} on [1, z, w];
 *   - mu(x0, z, w):   linear regression of Y on [1, z, w] inside the X = x0 stratum;
 *   - f_Z(z | w):     linear (homoskedastic Gaussian) regression of Z on [1, w], giving a
 *                     conditional density used for the Radon-Nikodym factor p~(Z)/f_Z(Z|W).
 * The kernels are then the W-marginalized (not W|Z) averages
 *   kappa_1(z) = (1/n) sum_i mu(x0, z, W_i) * pi(x0 | z, W_i)
 *   kappa_2(z) = (1/n) sum_i pi(x0 | z, W_i)
 * which is exactly the pair that makes E[Phi] = 0 when the nuisances are right (the W-piece
 * of Phi telescopes against N - psi*D). Using f(w|z) instead would break that identity.
 *
 * THE VERMA CONSTRAINT AND WHY THE WEIGHTING IS FREE
 * kappa_1(z)/kappa_2(z) is a pi-weighted average of mu(x0, z, w). Under the Napkin graph's
 * generalized independence restriction (the post-intervention law of Y given do(Z = z) is
 * invariant to z once W is marginalized) that average does not move with z, so every
 * admissible weighting density p~ targets the SAME scalar. That is what licenses choosing
 * p~ purely for precision: this module sets
 *
 *   p~*(z) ∝ f_Z(z) / Var(Phi_{x0}(Q; z))
 *
 * over the admissible z grid, then projects it onto the simplex with a strictly positive floor.
 *
 * The f_Z(z) factor is load-bearing, not decoration. The estimator reaches the grid through
 * the ratio p~(Z)/f_Z(Z|W), so weighting by 1/Var alone — the Hirano-Imbens rule for a
 * weighted average of INDEPENDENT per-z estimates — upweights z-regions that are rarely
 * observed and pays for it in the density ratio. Measured on the test design, p~ ∝ 1/Var by
 * itself INCREASES the realized variance by roughly 60% over uniform weighting; tempering by
 * the marginal sampling density of z is what makes the rule an actual variance reduction
 * (measured: ~1.8x lower variance than uniform, asserted in the test suite). This deviation
 * from the literal "proportional to Var^-1" statement is deliberate and is the difference
 * between a rule that optimizes a bound and one that optimizes this estimator.
 *
 * Because that licence is conditional, the solver MEASURES the constraint (how far the
 * reweighting moves the pooled estimand away from the unweighted one) and REFUSES to apply
 * the efficiency weighting when that shift exceeds VERMA_SPREAD_TOLERANCE — reporting
 * "VERMA_CONSTRAINT_VIOLATED" rather than returning a number that silently targets a
 * different estimand than the caller asked for.
 *
 * HONEST LIMITATIONS (deliberate, not accidental)
 *  - Nuisances are parametric and fitted once; there is no cross-fitting, so the EIF-based
 *    standard error is optimistic when the models are overfit. It is reported as a standard
 *    error, not as a confidence guarantee.
 *  - Z|W is modelled as Gaussian homoskedastic. If that density is far off, the ratio
 *    p~(Z)/f_Z(Z|W) is the part that degrades first; a near-zero density is refused rather
 *    than divided by.
 *  - The admissible z grid defines the support of p~. Observations outside it receive zero
 *    weight and are counted in `outsideSupportCount` — the estimate is then the
 *    grid-restricted estimand, and the standard error reflects the smaller effective sample.
 *  - The weighting is chosen by the f_Z/Var rule documented above. It is justified by measured
 *    variance on a design whose answer is known, NOT by a proof of optimality for this
 *    estimator. The realized influence values are heavy-tailed in the low-propensity tail and
 *    the reported standard error reflects that instead of smoothing it away.
 *
 * Pure TypeScript, no I/O.
 *
 * References:
 *  - Bickel, Klaassen, Ritov & Wellner, "Efficient and Adaptive Estimation for
 *    Semiparametric Models", Johns Hopkins, 1993 (one-step / EIF construction).
 *  - Hirano & Imbens, "Estimation of Causal Effects using Propensity Score Weighting",
 *    Health Services & Outcomes Research Methodology 2, 2001 (efficiency weights).
 *  - Verma & Pearl, "Equivalence and Synthesis of Causal Models", UAI 1990 (Verma constraint).
 *  - Shpitser & Pearl, AAAI 2006 (the ratio estimands this module consumes).
 */

import { formatSymbolicFactor } from "./do-calculus-id";
import type { SymbolicFactor } from "./do-calculus-id";
import { confoundingReport } from "./e-value";

// ---------------------------------------------------------------------------------------
// Thresholds. Every constant below is a decision gate: it is compared against a computed
// quantity somewhere in this file. None is decorative. The one numerical stabiliser that is
// NOT a gate (LOGISTIC_RIDGE) is named locally and not exported, so nothing here can be
// mistaken for a knob that does nothing.
// ---------------------------------------------------------------------------------------

/** Propensities at or below this are clipped up to it; the observation is counted. */
export const PROPENSITY_CLIP_LOW = 1e-3;

/** Propensities at or above this are clipped down to it; the observation is counted. */
export const PROPENSITY_CLIP_HIGH = 1 - PROPENSITY_CLIP_LOW;

/** A grid point whose local influence variance does not clear this is unusable for weighting. */
export const MIN_EFFICIENCY_VARIANCE = 1e-12;

/** Below this many observations the one-step correction is not estimable; the solver refuses. */
export const MIN_SEMIPARAMETRIC_SAMPLE_SIZE = 30;


/**
 * The spec's G4 point-E-value floor: 1.35.
 *
 * THE SPEC'S G4 IS A CONJUNCTION OVER TWO NUMBERS, AND NEITHER WAS
 * ENFORCED HERE. The module computed `ePoint` and `eCi` and REPORTED
 * them, but it had no threshold constant at all -- so an estimand with
 * an E-value of 1.0 (no unmeasured confounding could explain away no
 * effect) was as acceptable as one with an E-value of 10. A reported
 * number that gates nothing is a label.
 *
 * These are the same floors the retrieval path and the proximal bridge
 * use, and they are the spec's.
 */
export const MIN_ESTIMAND_E_VALUE = 1.35;

/**
 * The spec's G4 CI-E-value floor: 1.10.
 *
 * LOWER than the point floor on purpose: it is a floor on a bound, not
 * a central claim.
 */
export const MIN_ESTIMAND_CI_E_VALUE = 1.1;
/** Residual of the density projection (mass defect) above this is a failed projection. */
export const EFFICIENCY_PROJECTION_TOLERANCE = 1e-9;

/** Floor-and-renormalise passes allowed before the efficiency projection is declared failed. */
export const EFFICIENCY_PROJECTION_ITERATIONS = 8;

/** The X = x0 stratum must have at least this many rows to fit mu(x0, ., .). */
export const MIN_TREATMENT_GROUP_SIZE = 10;

/** Residual sd of the Z|W regression at or below this means the conditional density is degenerate. */
export const MIN_RESIDUAL_SD = 1e-8;

/** Evaluated conditional density of Z|W below this is treated as non-estimable (no dividing by ~0). */
export const MIN_CONDITIONAL_DENSITY = 1e-12;

/** Normalizer integral of kappa_2 against p~ must clear this or the ratio is undefined. */
export const MIN_NORMALIZER = 1e-12;

/** If more than this fraction of observations needed propensity clipping, positivity has failed. */
export const MAX_CLIPPED_FRACTION = 0.25;

/** Every grid point retains at least this share of total p~ mass (overlap guard). */
export const MIN_WEIGHT_SHARE = 1e-6;

/**
 * Verma gate, in outcome units: how far the efficiency reweighting is allowed to move the
 * estimand away from the unweighted one before the solver declares the ratio functional
 * weighting-dependent and refuses.
 *
 * The gate is on that SHIFT, not on max_z |localEffect(z) - psi|. A max over grid points
 * amplifies the noise in the fitted mu's z-slope (which is pure nuisance error and is not
 * reflected in the influence-function variance), so it would flag every finite sample; the
 * shift between the two pooled estimates is first-order insensitive to that noise and is
 * exactly the quantity whose being zero licenses the weighting.
 */
export const VERMA_SPREAD_TOLERANCE = 0.1;

/** Minimum number of admissible z grid points for the integral to exist. */
export const Z_GRID_MIN_POINTS = 2;

/** Newton iterations for the propensity model. */
export const LOGISTIC_MAX_ITERATIONS = 100;

/** Newton step norm below which the propensity fit is declared converged. */
export const LOGISTIC_NEWTON_TOLERANCE = 1e-10;

/** |pivot| below which the normal-equation system is treated as rank deficient. */
export const LOGISTIC_PIVOT_FLOOR = 1e-12;

/**
 * Two-sided normal quantile used when a standard error is turned into an interval. Not a
 * decision gate (nothing is accepted or refused on it), so deliberately not exported: every
 * exported constant in this module is compared against a computed value.
 */
const NORMAL_95_QUANTILE = 1.959963984540054;

// ---------------------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------------------

export type SemiparametricWeighting = "efficiency" | "uniform";

/**
 * Every way this solver declines to produce a number. Each one is a distinct, actionable
 * state — they are not interchangeable, and the caller is expected to switch on them.
 */
export type SemiparametricFailureReason =
  /** n < MIN_SEMIPARAMETRIC_SAMPLE_SIZE. */
  | "SAMPLE_TOO_SMALL"
  /** The X = x0 stratum is too small (or too small relative to the design rank) to fit mu. */
  | "INSUFFICIENT_TREATMENT_GROUP"
  /** Fewer than Z_GRID_MIN_POINTS admissible z values: there is no integral over z. */
  | "EMPTY_ADMISSIBLE_Z_SET"
  /** A grid point's local influence variance did not clear MIN_EFFICIENCY_VARIANCE. */
  | "NON_POSITIVE_VARIANCE"
  /** integral kappa_2 p~ dz did not clear MIN_NORMALIZER: the ratio has no denominator. */
  | "DEGENERATE_NORMALIZER"
  /** Z|W is (numerically) deterministic, or its density underflows MIN_CONDITIONAL_DENSITY. */
  | "DEGENERATE_CONDITIONAL_DENSITY"
  /** More than MAX_CLIPPED_FRACTION of observations required propensity clipping. */
  | "EXCESSIVE_PROPENSITY_CLIPPING"
  /** The floor-and-renormalise projection did not reach EFFICIENCY_PROJECTION_TOLERANCE. */
  | "EFFICIENCY_PROJECTION_FAILED"
  /** The per-z local effects disagree by more than VERMA_SPREAD_TOLERANCE, so reweighting would
   *  change the estimand; the efficiency weighting is therefore not licensed. */
  | "VERMA_CONSTRAINT_VIOLATED"
  /** A regression could not be solved (rank-deficient design, non-finite coefficients). */
  | "NUMERICAL_FAILURE";

export interface SemiparametricGridPoint {
  readonly z: number;
  readonly kappa1: number;
  readonly kappa2: number;
  /** kappa1 / kappa2 — the local effect at this z (constant in z exactly when Verma holds). */
  readonly localEffect: number;
  /** Sample variance of the z-local influence function across observations. */
  readonly influenceVariance: number;
  /** Value of the weighting density p~ at this z. */
  readonly weightingDensity: number;
}

export interface SemiparametricRatioEstimate {
  readonly ok: true;
  /** The one-step estimate: plug-in ratio plus the mean influence correction. */
  readonly estimand: number;
  /** The naive plug-in ratio psi^pi, for the receipt. Deliberately not the headline number. */
  readonly plugIn: number;
  /** mean_i Phi_i — how much the bias correction moved the plug-in value. */
  readonly oneStepCorrection: number;
  /** sqrt(varianceEstimate). */
  readonly standardError: number;
  /** Sample variance of the influence values divided by n. */
  readonly varianceEstimate: number;
  /** Projected variance sum_g a_g^2 v_g / n implied by the weighting (diagnostic of the knob). */
  readonly projectedVariance: number;
  readonly sampleSize: number;
  readonly treatmentLevel: number;
  readonly weighting: SemiparametricWeighting;
  /** p~ evaluated on the admissible grid (density scale, integrates to 1 over the grid). */
  readonly weightingDensity: readonly number[];
  /** integral kappa_2 p~ dz — the constant written kappa_{x0,2} in the influence function. */
  readonly normalizer: number;
  /** Observations whose fitted propensity was 0/1 (or outside the clip band) and got clipped. */
  readonly clippedPropensityCount: number;
  /** Grid evaluations that needed the same clip (reported, never silent). */
  readonly clippedGridPointCount: number;
  readonly propensityConverged: boolean;
  readonly propensityIterations: number;
  /** Observations with Z outside the admissible grid; p~ is 0 there, so they carry no weight. */
  readonly outsideSupportCount: number;
  /** Grid points raised to the MIN_WEIGHT_SHARE floor during the projection. */
  readonly truncatedWeightCount: number;
  /** max_z |localEffect(z) - estimand| — how flat the local effects are, in outcome units. */
  readonly vermaSpread: number;
  /** |plugIn - unweighted plugIn|: how far the reweighting moves the estimand. This is gated. */
  readonly vermaShift: number;
  readonly vermaConsistent: boolean;
  readonly grid: readonly SemiparametricGridPoint[];
}

export interface SemiparametricRatioFailure {
  readonly ok: false;
  readonly reason: SemiparametricFailureReason;
  /** Human-readable specifics: which z, which count, which quantity was out of range. */
  readonly detail: string;
  readonly sampleSize: number;
  readonly clippedPropensityCount: number;
}

export type SemiparametricRatioResult = SemiparametricRatioEstimate | SemiparametricRatioFailure;

export interface SemiparametricRatioSample {
  /** Y_i, one per observation. */
  readonly outcome: readonly number[];
  /** X_i, must be exactly 0 or 1. */
  readonly treatment: readonly number[];
  /** Z_i, the variable the ratio functional integrates over. */
  readonly confounder: readonly number[];
  /** W_i rows, one per observation; may be zero-width, but every row must be the same width. */
  readonly covariates: ReadonlyArray<readonly number[]>;
  /** The intervened level x0 (0 or 1). */
  readonly treatmentLevel: number;
  /** Admissible z values, strictly increasing. Defines the support of p~. */
  readonly admissibleZ: readonly number[];
  /** "efficiency" (default) weights by inverse local variance; "uniform" does not. */
  readonly weighting?: SemiparametricWeighting;
}

// ---------------------------------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------------------------------

/** Numerical ridge on the logistic Hessian. Not a decision gate; it keeps Newton solvable. */
const LOGISTIC_RIDGE = 1e-6;

function fail(
  reason: SemiparametricFailureReason,
  detail: string,
  sampleSize: number,
  clippedPropensityCount: number,
): SemiparametricRatioFailure {
  return { ok: false, reason, detail, sampleSize, clippedPropensityCount };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

function dot(a: readonly number[], b: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) total += a[i]! * b[i]!;
  return total;
}

function mean(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

function sampleVariance(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) throw new Error("semiparametric: a sample variance needs at least two values");
  const centre = mean(values);
  let ss = 0;
  for (const value of values) {
    const deviation = value - centre;
    ss += deviation * deviation;
  }
  return ss / (n - 1);
}

function normalDensity(x: number, location: number, scale: number): number {
  const z = (x - location) / scale;
  return Math.exp(-0.5 * z * z) / (scale * Math.sqrt(2 * Math.PI));
}

/**
 * Solve A x = b by Gauss-Jordan elimination with partial pivoting.
 * Throws when the matrix is rank deficient (pivot below LOGISTIC_PIVOT_FLOOR) — the caller
 * turns that into a NUMERICAL_FAILURE rather than returning a plausible-looking vector.
 */
function solveLinearSystem(matrix: ReadonlyArray<readonly number[]>, rhs: readonly number[]): number[] {
  const size = rhs.length;
  if (size === 0) throw new Error("semiparametric: cannot solve an empty linear system");
  if (matrix.length !== size) {
    throw new Error(`semiparametric: linear system is ${matrix.length}x? but the right-hand side has ${size} entries`);
  }
  const a: number[][] = matrix.map((row) => {
    if (row.length !== size) throw new Error("semiparametric: linear system matrix is not square");
    return [...row];
  });
  const b = [...rhs];

  for (let col = 0; col < size; col += 1) {
    let pivotRow = col;
    let pivotAbs = Math.abs(a[col]![col]!);
    for (let row = col + 1; row < size; row += 1) {
      const candidate = Math.abs(a[row]![col]!);
      if (candidate > pivotAbs) {
        pivotAbs = candidate;
        pivotRow = row;
      }
    }
    if (!(pivotAbs > LOGISTIC_PIVOT_FLOOR)) {
      throw new Error("semiparametric: normal-equation system is rank deficient (design has collinear columns)");
    }
    if (pivotRow !== col) {
      const swapRow = a[col]!;
      a[col] = a[pivotRow]!;
      a[pivotRow] = swapRow;
      const swapRhs = b[col]!;
      b[col] = b[pivotRow]!;
      b[pivotRow] = swapRhs;
    }
    const pivotRowValues = a[col]!;
    const pivot = pivotRowValues[col]!;
    for (let row = col + 1; row < size; row += 1) {
      const factor = a[row]![col]! / pivot;
      if (factor === 0) continue;
      const target = a[row]!;
      for (let k = col; k < size; k += 1) target[k] = target[k]! - factor * pivotRowValues[k]!;
      b[row] = b[row]! - factor * b[col]!;
    }
  }

  const solution = new Array<number>(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let acc = b[row]!;
    for (let col = row + 1; col < size; col += 1) acc -= a[row]![col]! * solution[col]!;
    solution[row] = acc / a[row]![row]!;
  }
  for (const value of solution) {
    if (!Number.isFinite(value)) throw new Error("semiparametric: linear solve produced a non-finite coefficient");
  }
  return solution;
}

// ---------------------------------------------------------------------------------------
// Parametric nuisance fits
// ---------------------------------------------------------------------------------------

interface LogisticFit {
  readonly coefficients: readonly number[];
  readonly converged: boolean;
  readonly iterations: number;
}

/** Newton-Raphson (IRLS) logistic regression. Returns the last iterate even if unconverged. */
function fitLogistic(
  design: ReadonlyArray<readonly number[]>,
  target: readonly number[],
): LogisticFit {
  const rows = design.length;
  const dim = design[0]?.length ?? 0;
  if (dim === 0) throw new Error("semiparametric: logistic design has no columns");
  if (rows <= dim) {
    throw new Error(`semiparametric: logistic design has ${rows} rows for ${dim} coefficients`);
  }

  const coefficients = new Array<number>(dim).fill(0);
  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < LOGISTIC_MAX_ITERATIONS; iter += 1) {
    iterations = iter + 1;
    const hessian: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
    const gradient = new Array<number>(dim).fill(0);

    for (let i = 0; i < rows; i += 1) {
      const row = design[i]!;
      const p = sigmoid(dot(row, coefficients));
      const weight = p * (1 - p);
      const residual = target[i]! - p;
      for (let a = 0; a < dim; a += 1) {
        const ra = row[a]!;
        gradient[a] = gradient[a]! + ra * residual;
        const hessianRow = hessian[a]!;
        for (let b = a; b < dim; b += 1) hessianRow[b] = hessianRow[b]! + weight * ra * row[b]!;
      }
    }

    for (let a = 0; a < dim; a += 1) {
      const hessianRow = hessian[a]!;
      for (let b = 0; b < a; b += 1) hessianRow[b] = hessian[b]![a]!;
      hessianRow[a] = hessianRow[a]! + LOGISTIC_RIDGE;
    }

    const step = solveLinearSystem(hessian, gradient);
    let stepNorm = 0;
    for (const value of step) stepNorm += value * value;
    stepNorm = Math.sqrt(stepNorm);

    for (let a = 0; a < dim; a += 1) coefficients[a] = coefficients[a]! + step[a]!;
    for (const value of coefficients) {
      if (!Number.isFinite(value)) {
        throw new Error("semiparametric: logistic regression diverged to non-finite coefficients");
      }
    }
    if (stepNorm < LOGISTIC_NEWTON_TOLERANCE) {
      converged = true;
      break;
    }
  }

  return { coefficients, converged, iterations };
}

interface LinearFit {
  readonly coefficients: readonly number[];
  readonly residualSd: number;
}

function fitLinear(design: ReadonlyArray<readonly number[]>, target: readonly number[]): LinearFit {
  const rows = design.length;
  const dim = design[0]?.length ?? 0;
  if (dim === 0) throw new Error("semiparametric: linear design has no columns");
  if (rows <= dim) {
    throw new Error(`semiparametric: linear design has ${rows} rows for ${dim} coefficients`);
  }

  const gram: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
  const rhs = new Array<number>(dim).fill(0);
  for (let i = 0; i < rows; i += 1) {
    const row = design[i]!;
    const y = target[i]!;
    for (let a = 0; a < dim; a += 1) {
      const value = row[a]!;
      rhs[a] = rhs[a]! + value * y;
      const gramRow = gram[a]!;
      for (let b = a; b < dim; b += 1) gramRow[b] = gramRow[b]! + value * row[b]!;
    }
  }
  for (let a = 0; a < dim; a += 1) {
    for (let b = 0; b < a; b += 1) gram[a]![b] = gram[b]![a]!;
  }

  const coefficients = solveLinearSystem(gram, rhs);
  let sse = 0;
  for (let i = 0; i < rows; i += 1) {
    const residual = target[i]! - dot(design[i]!, coefficients);
    sse += residual * residual;
  }
  return { coefficients, residualSd: Math.sqrt(sse / (rows - dim)) };
}

// ---------------------------------------------------------------------------------------
// Grid plumbing
// ---------------------------------------------------------------------------------------

/**
 * Trapezoid quadrature weights. Every weight is positive and they sum to the width of the
 * admissible interval, because the grid is validated strictly increasing.
 */
function trapezoidWeights(grid: readonly number[]): number[] {
  const points = grid.length;
  const weights = new Array<number>(points).fill(0);
  for (let g = 0; g < points; g += 1) {
    const left = g === 0 ? grid[0]! : grid[g - 1]!;
    const right = g === points - 1 ? grid[points - 1]! : grid[g + 1]!;
    weights[g] = (right - left) / 2;
  }
  return weights;
}

/**
 * p~ as a function of an arbitrary z: piecewise linear over the grid, zero outside it.
 * Zero outside is deliberate — the admissible set is the support of the estimand — and the
 * number of observations that fall there is reported back to the caller.
 */
function makeGridDensity(grid: readonly number[], density: readonly number[]): (z: number) => number {
  const points = grid.length;
  const first = grid[0]!;
  const last = grid[points - 1]!;
  return (z: number): number => {
    if (!(z >= first) || !(z <= last)) return 0;
    let upper = 1;
    while (upper < points - 1 && grid[upper]! < z) upper += 1;
    const lower = upper - 1;
    const zLower = grid[lower]!;
    const zUpper = grid[upper]!;
    const dLower = density[lower]!;
    const dUpper = density[upper]!;
    if (zUpper === zLower) return dLower;
    const t = (z - zLower) / (zUpper - zLower);
    return dLower + t * (dUpper - dLower);
  };
}

// ---------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------

interface NormalizedSample {
  readonly n: number;
  readonly outcome: readonly number[];
  readonly treatment: readonly number[];
  readonly confounder: readonly number[];
  readonly covariates: ReadonlyArray<readonly number[]>;
  readonly treatmentLevel: number;
  readonly grid: readonly number[];
  readonly weighting: SemiparametricWeighting;
}

function assertFiniteArray(values: readonly number[], label: string): void {
  if (!Array.isArray(values)) throw new Error(`semiparametric: ${label} must be an array`);
  if (values.length === 0) throw new Error(`semiparametric: ${label} must be non-empty`);
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === undefined || !Number.isFinite(value)) {
      throw new Error(`semiparametric: ${label}[${i}] must be a finite number, got ${String(value)}`);
    }
  }
}

/**
 * Validate and normalise. Every malformed shape throws (this is the "garbage in must not
 * become a number" boundary); states that are well-formed but not estimable are returned as
 * failures by the solver instead.
 */
function normalizeSample(sample: SemiparametricRatioSample): NormalizedSample {
  if (sample === null || typeof sample !== "object") {
    throw new Error("semiparametric: sample must be an object");
  }
  const { outcome, treatment, confounder, covariates } = sample;
  assertFiniteArray(outcome, "outcome");
  assertFiniteArray(treatment, "treatment");
  assertFiniteArray(confounder, "confounder");

  const n = outcome.length;
  if (treatment.length !== n) {
    throw new Error(`semiparametric: treatment has ${treatment.length} entries but outcome has ${n}`);
  }
  if (confounder.length !== n) {
    throw new Error(`semiparametric: confounder has ${confounder.length} entries but outcome has ${n}`);
  }
  if (!Array.isArray(covariates)) throw new Error("semiparametric: covariates must be an array of rows");
  if (covariates.length !== n) {
    throw new Error(`semiparametric: covariates has ${covariates.length} rows but outcome has ${n}`);
  }

  const width = covariates[0]?.length ?? 0;
  const rows: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    const row = covariates[i];
    if (!Array.isArray(row)) throw new Error(`semiparametric: covariates[${i}] must be an array`);
    if (row.length !== width) {
      throw new Error(`semiparametric: covariates[${i}] has width ${row.length}, expected ${width}`);
    }
    for (let k = 0; k < width; k += 1) {
      const value = row[k];
      if (value === undefined || !Number.isFinite(value)) {
        throw new Error(`semiparametric: covariates[${i}][${k}] must be a finite number`);
      }
    }
    rows.push([...row]);
  }

  for (let i = 0; i < n; i += 1) {
    const level = treatment[i];
    if (level !== 0 && level !== 1) {
      throw new Error(`semiparametric: treatment[${i}] must be 0 or 1, got ${String(level)}`);
    }
  }

  const treatmentLevel = sample.treatmentLevel;
  if (treatmentLevel !== 0 && treatmentLevel !== 1) {
    throw new Error(`semiparametric: treatmentLevel must be 0 or 1, got ${String(treatmentLevel)}`);
  }

  const weighting = sample.weighting ?? "efficiency";
  if (weighting !== "efficiency" && weighting !== "uniform") {
    throw new Error(`semiparametric: weighting must be "efficiency" or "uniform", got ${String(weighting)}`);
  }

  const grid = [...sample.admissibleZ];
  for (let g = 0; g < grid.length; g += 1) {
    const value = grid[g];
    if (value === undefined || !Number.isFinite(value)) {
      throw new Error(`semiparametric: admissibleZ[${g}] must be a finite number`);
    }
    if (g > 0 && !(value > grid[g - 1]!)) {
      throw new Error(`semiparametric: admissibleZ must be strictly increasing (failed at index ${g})`);
    }
  }

  return {
    n,
    outcome: [...outcome],
    treatment: [...treatment],
    confounder: [...confounder],
    covariates: rows,
    treatmentLevel,
    grid,
    weighting,
  };
}

// ---------------------------------------------------------------------------------------
// Symbolic-factor bridge
// ---------------------------------------------------------------------------------------

export interface ExtractedRatioFunctional {
  readonly numerator: SymbolicFactor;
  readonly denominator: SymbolicFactor;
}

/**
 * Pull the (numerator, denominator) pair out of a ratio functional produced by
 * `runShpitserPearlID`. A Tian c-factor reduction and a front-door factorization both arrive
 * as `RATIO` nodes, sometimes wrapped in `MARGINAL_SUM` by the outer recursion, so the
 * wrapper is stripped here. Anything that is not a ratio throws: feeding a product or a bare
 * conditional to a ratio solver is a caller bug, and failing loudly beats estimating a
 * different functional than the one identification returned.
 */
export function extractRatioFunctional(factor: SymbolicFactor): ExtractedRatioFunctional {
  if (factor === null || typeof factor !== "object") {
    throw new Error("semiparametric: expected a SymbolicFactor, got a non-object");
  }
  let current: SymbolicFactor = factor;
  while (current.kind === "MARGINAL_SUM") {
    if (current.body === undefined) {
      throw new Error("semiparametric: malformed MARGINAL_SUM node with no body");
    }
    current = current.body;
  }
  if (current.kind !== "RATIO") {
    throw new Error(
      `semiparametric: expected a RATIO functional, got ${formatSymbolicFactor(factor)} ` +
        `(kind "${current.kind}") — a non-ratio estimand has no kappa_1/kappa_2 decomposition`,
    );
  }
  return { numerator: current.numerator, denominator: current.denominator };
}

// ---------------------------------------------------------------------------------------
// The solver
// ---------------------------------------------------------------------------------------

/**
 * One-step estimate of psi_{x0}(Q; p~_z) from a finite sample.
 *
 * Order of operations matters for the receipt: refuse on sample/grid, fit the propensity and
 * report clipping, fit the outcome model, fit the Z|W density, build the kernels, choose p~,
 * compute the influence values, then apply the Verma gate before returning a number.
 */
export function solveSemiparametricRatioFunctional(
  sample: SemiparametricRatioSample,
): SemiparametricRatioResult {
  const normalized = normalizeSample(sample);
  const { n, outcome, treatment, confounder, covariates, treatmentLevel, grid, weighting } = normalized;
  const wDim = covariates[0]?.length ?? 0;

  // --- Gate 1: sample size ---------------------------------------------------------------
  if (n < MIN_SEMIPARAMETRIC_SAMPLE_SIZE) {
    return fail(
      "SAMPLE_TOO_SMALL",
      `need at least ${MIN_SEMIPARAMETRIC_SAMPLE_SIZE} observations for a one-step correction, got ${n}`,
      n,
      0,
    );
  }

  // --- Gate 2: admissible z set ----------------------------------------------------------
  if (grid.length < Z_GRID_MIN_POINTS) {
    return fail(
      "EMPTY_ADMISSIBLE_Z_SET",
      `need at least ${Z_GRID_MIN_POINTS} admissible z values to integrate over, got ${grid.length}`,
      n,
      0,
    );
  }

  const outcomeByLevel: number[] = [];
  let treatedCount = 0;
  for (let i = 0; i < n; i += 1) {
    if (treatment[i] === treatmentLevel) {
      treatedCount += 1;
      outcomeByLevel.push(outcome[i]!);
    }
  }
  const logisticDim = 2 + wDim;
  if (treatedCount < MIN_TREATMENT_GROUP_SIZE || treatedCount <= logisticDim) {
    return fail(
      "INSUFFICIENT_TREATMENT_GROUP",
      `the X = ${treatmentLevel} stratum has ${treatedCount} observations; ` +
        `need at least ${MIN_TREATMENT_GROUP_SIZE} and more rows than the ${logisticDim} model columns`,
      n,
      0,
    );
  }

  // --- Propensity: pi(x0 | z, w) ---------------------------------------------------------
  const propensityDesign: number[][] = [];
  const propensityTarget: number[] = [];
  for (let i = 0; i < n; i += 1) {
    propensityDesign.push([1, confounder[i]!, ...covariates[i]!]);
    propensityTarget.push(treatment[i] === treatmentLevel ? 1 : 0);
  }

  let propensityFit: LogisticFit;
  try {
    propensityFit = fitLogistic(propensityDesign, propensityTarget);
  } catch (error) {
    return fail("NUMERICAL_FAILURE", `propensity model could not be fitted: ${messageOf(error)}`, n, 0);
  }

  let clippedPropensityCount = 0;
  const clipObservation = (raw: number): number => {
    if (raw < PROPENSITY_CLIP_LOW) {
      clippedPropensityCount += 1;
      return PROPENSITY_CLIP_LOW;
    }
    if (raw > PROPENSITY_CLIP_HIGH) {
      clippedPropensityCount += 1;
      return PROPENSITY_CLIP_HIGH;
    }
    return raw;
  };

  const piObserved = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const p = sigmoid(dot(propensityDesign[i]!, propensityFit.coefficients));
    piObserved[i] = clipObservation(p);
  }

  if (clippedPropensityCount / n > MAX_CLIPPED_FRACTION) {
    return fail(
      "EXCESSIVE_PROPENSITY_CLIPPING",
      `${clippedPropensityCount} of ${n} fitted propensities were clipped at ` +
        `[${PROPENSITY_CLIP_LOW}, ${PROPENSITY_CLIP_HIGH}], which exceeds the allowed fraction ` +
        `${MAX_CLIPPED_FRACTION} — the overlap assumption has failed, so the ratio functional is not estimable`,
      n,
      clippedPropensityCount,
    );
  }

  // --- Outcome regression inside the X = x0 stratum --------------------------------------
  const outcomeDesign: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    if (treatment[i] === treatmentLevel) {
      outcomeDesign.push([1, confounder[i]!, ...covariates[i]!]);
    }
  }

  let outcomeFit: LinearFit;
  try {
    outcomeFit = fitLinear(outcomeDesign, outcomeByLevel);
  } catch (error) {
    return fail(
      "NUMERICAL_FAILURE",
      `outcome regression mu(x0 = ${treatmentLevel}, z, w) could not be fitted: ${messageOf(error)}`,
      n,
      clippedPropensityCount,
    );
  }
  const muCoefficients = outcomeFit.coefficients;

  // --- Conditional density f_Z(z | w) ----------------------------------------------------
  const densityDesign: number[][] = [];
  for (let i = 0; i < n; i += 1) densityDesign.push([1, ...covariates[i]!]);

  let densityFit: LinearFit;
  try {
    densityFit = fitLinear(densityDesign, confounder);
  } catch (error) {
    return fail(
      "DEGENERATE_CONDITIONAL_DENSITY",
      `the Z|W density model could not be fitted: ${messageOf(error)}`,
      n,
      clippedPropensityCount,
    );
  }
  if (!(densityFit.residualSd > MIN_RESIDUAL_SD)) {
    return fail(
      "DEGENERATE_CONDITIONAL_DENSITY",
      `the Z|W regression residual sd (${densityFit.residualSd}) does not clear MIN_RESIDUAL_SD ` +
        `(${MIN_RESIDUAL_SD}); the density ratio p~(Z)/f_Z(Z|W) is not defined`,
      n,
      clippedPropensityCount,
    );
  }

  const conditionalDensity = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const location = dot(densityDesign[i]!, densityFit.coefficients);
    const density = normalDensity(confounder[i]!, location, densityFit.residualSd);
    if (!(density > MIN_CONDITIONAL_DENSITY)) {
      return fail(
        "DEGENERATE_CONDITIONAL_DENSITY",
        `f_Z(Z_${i} = ${confounder[i]} | W_${i}) = ${density} does not clear MIN_CONDITIONAL_DENSITY ` +
          `(${MIN_CONDITIONAL_DENSITY}); the Radon-Nikodym factor would be infinite`,
        n,
        clippedPropensityCount,
      );
    }
    conditionalDensity[i] = density;
  }

  // --- Kernels on the admissible grid ----------------------------------------------------
  const gridPoints = grid.length;
  const delta = trapezoidWeights(grid);
  const gridPi: number[][] = [];
  const gridMu: number[][] = [];
  let clippedGridPointCount = 0;

  for (let g = 0; g < gridPoints; g += 1) {
    const z = grid[g]!;
    const piRow = new Array<number>(n).fill(0);
    const muRow = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      const rawPi = sigmoid(dot(propensityFit.coefficients, [1, z, ...covariates[i]!]));
      if (rawPi < PROPENSITY_CLIP_LOW || rawPi > PROPENSITY_CLIP_HIGH) clippedGridPointCount += 1;
      piRow[i] = Math.min(Math.max(rawPi, PROPENSITY_CLIP_LOW), PROPENSITY_CLIP_HIGH);
      muRow[i] = dot(muCoefficients, [1, z, ...covariates[i]!]);
    }
    gridPi.push(piRow);
    gridMu.push(muRow);
  }

  const kappa1 = new Array<number>(gridPoints).fill(0);
  const kappa2 = new Array<number>(gridPoints).fill(0);
  const localEffect = new Array<number>(gridPoints).fill(0);
  for (let g = 0; g < gridPoints; g += 1) {
    let numerator = 0;
    let denominator = 0;
    const piRow = gridPi[g]!;
    const muRow = gridMu[g]!;
    for (let i = 0; i < n; i += 1) {
      numerator += muRow[i]! * piRow[i]!;
      denominator += piRow[i]!;
    }
    kappa1[g] = numerator / n;
    kappa2[g] = denominator / n;
    if (!(kappa2[g]! > 0)) {
      return fail(
        "DEGENERATE_NORMALIZER",
        `kappa_2(z = ${grid[g]}) collapsed to ${kappa2[g]}; the local effect is undefined`,
        n,
        clippedPropensityCount,
      );
    }
    localEffect[g] = kappa1[g]! / kappa2[g]!;
  }

  // --- Choose the weighting density p~ ---------------------------------------------------
  // v(z) = Var_i[Phi_{x0}(Q; z)(O_i)], the z-local influence variance. It is computed for
  // BOTH weightings because it also feeds `projectedVariance`, which is how the two runs are
  // compared; only the efficiency rule refuses when it is non-positive.
  const influenceVariance = new Array<number>(gridPoints).fill(0);
  {
    for (let g = 0; g < gridPoints; g += 1) {
      const piRow = gridPi[g]!;
      const muRow = gridMu[g]!;
      const psiZ = localEffect[g]!;
      const local: number[] = new Array<number>(n).fill(0);
      for (let i = 0; i < n; i += 1) {
        const indicator = treatment[i] === treatmentLevel ? 1 : 0;
        const pi = piRow[i]!;
        const mu = muRow[i]!;
        local[i] =
          (indicator * (outcome[i]! - mu) + (mu - psiZ) * (indicator - pi) + pi * (mu - psiZ)) /
          kappa2[g]!;
      }
      const variance = sampleVariance(local);
      if (!(variance > MIN_EFFICIENCY_VARIANCE) && weighting === "efficiency") {
        return fail(
          "NON_POSITIVE_VARIANCE",
          `the z-local influence variance at z = ${grid[g]} is ${variance}, which does not clear ` +
            `MIN_EFFICIENCY_VARIANCE (${MIN_EFFICIENCY_VARIANCE}); inverse-variance weighting is undefined`,
          n,
          clippedPropensityCount,
        );
      }
      influenceVariance[g] = variance;
    }
  }

  // Marginal sampling density of Z. The efficiency weight needs it: the estimator reaches the
  // grid through the density ratio p~(Z)/f_Z(Z|W), so a region of z that is rarely observed
  // costs variance in proportion to 1/f_Z(z) and must not be upweighted just because its local
  // influence variance is small.
  const marginalLocation = mean(confounder);
  const marginalScale = Math.sqrt(sampleVariance(confounder));

  // Raw mass on the simplex:
  //   efficiency -> f_Z(z) / Var(Phi(z))  (inverse variance, tempered by how often z is seen)
  //   uniform    -> 1
  const rawMass = new Array<number>(gridPoints).fill(0);
  for (let g = 0; g < gridPoints; g += 1) {
    if (weighting === "efficiency") {
      const marginal = normalDensity(grid[g]!, marginalLocation, marginalScale);
      if (!(marginal > MIN_CONDITIONAL_DENSITY)) {
        return fail(
          "DEGENERATE_CONDITIONAL_DENSITY",
          `the marginal density of Z at the admissible grid point z = ${grid[g]} is ${marginal}, ` +
            `below MIN_CONDITIONAL_DENSITY (${MIN_CONDITIONAL_DENSITY}); that grid point is unreachable`,
          n,
          clippedPropensityCount,
        );
      }
      rawMass[g] = marginal / influenceVariance[g]!;
    } else {
      rawMass[g] = 1;
    }
  }

  let truncatedWeightCount = 0;
  const shares = new Array<number>(gridPoints).fill(0);
  const totalMass = rawMass.reduce((acc, value, g) => acc + value * delta[g]!, 0);
  if (!(totalMass > MIN_NORMALIZER)) {
    return fail(
      "DEGENERATE_NORMALIZER",
      `the raw weighting mass integrated to ${totalMass}, below MIN_NORMALIZER (${MIN_NORMALIZER})`,
      n,
      clippedPropensityCount,
    );
  }
  for (let g = 0; g < gridPoints; g += 1) shares[g] = (rawMass[g]! * delta[g]!) / totalMass;

  if (weighting === "efficiency") {
    if (MIN_WEIGHT_SHARE * gridPoints >= 1) {
      return fail(
        "EFFICIENCY_PROJECTION_FAILED",
        `MIN_WEIGHT_SHARE (${MIN_WEIGHT_SHARE}) times ${gridPoints} grid points exceeds one; ` +
          "the overlap floor cannot be satisfied by any density",
        n,
        clippedPropensityCount,
      );
    }
    let residual = Number.POSITIVE_INFINITY;
    let convergedProjection = false;
    for (let iter = 0; iter < EFFICIENCY_PROJECTION_ITERATIONS; iter += 1) {
      let floored = false;
      let mass = 0;
      for (let g = 0; g < gridPoints; g += 1) {
        if (shares[g]! < MIN_WEIGHT_SHARE) {
          shares[g] = MIN_WEIGHT_SHARE;
          floored = true;
        }
        mass += shares[g]!;
      }
      for (let g = 0; g < gridPoints; g += 1) shares[g] = shares[g]! / mass;
      let worst = 0;
      for (let g = 0; g < gridPoints; g += 1) {
        const deficit = (MIN_WEIGHT_SHARE - shares[g]!) / MIN_WEIGHT_SHARE;
        if (deficit > worst) worst = deficit;
      }
      residual = worst;
      if (floored) truncatedWeightCount += 1;
      if (residual <= EFFICIENCY_PROJECTION_TOLERANCE) {
        convergedProjection = true;
        break;
      }
    }
    if (!convergedProjection) {
      return fail(
        "EFFICIENCY_PROJECTION_FAILED",
        `the floor-and-renormalise projection left a mass defect of ${residual}, above ` +
          `EFFICIENCY_PROJECTION_TOLERANCE (${EFFICIENCY_PROJECTION_TOLERANCE})`,
        n,
        clippedPropensityCount,
      );
    }
  }

  const weightingDensity = new Array<number>(gridPoints).fill(0);
  let massCheck = 0;
  for (let g = 0; g < gridPoints; g += 1) {
    weightingDensity[g] = shares[g]! / delta[g]!;
    massCheck += weightingDensity[g]! * delta[g]!;
  }
  const massDefect = Math.abs(massCheck - 1);
  if (!(massDefect <= EFFICIENCY_PROJECTION_TOLERANCE)) {
    return fail(
      "EFFICIENCY_PROJECTION_FAILED",
      `the weighting density integrates to ${massCheck} instead of 1 (defect ${massDefect} > ` +
        `EFFICIENCY_PROJECTION_TOLERANCE ${EFFICIENCY_PROJECTION_TOLERANCE})`,
      n,
      clippedPropensityCount,
    );
  }

  const densityAt = makeGridDensity(grid, weightingDensity);

  // --- Plug-in value of the ratio functional ---------------------------------------------
  let numeratorIntegral = 0;
  let normalizer = 0;
  for (let g = 0; g < gridPoints; g += 1) {
    numeratorIntegral += kappa1[g]! * weightingDensity[g]! * delta[g]!;
    normalizer += kappa2[g]! * weightingDensity[g]! * delta[g]!;
  }
  if (!(normalizer > MIN_NORMALIZER)) {
    return fail(
      "DEGENERATE_NORMALIZER",
      `integral kappa_2 p~ dz = ${normalizer}, below MIN_NORMALIZER (${MIN_NORMALIZER}); ` +
        "the ratio functional has no denominator on this grid",
      n,
      clippedPropensityCount,
    );
  }
  const plugIn = numeratorIntegral / normalizer;

  // Unweighted benchmark built from the same kernels. kappa_2 >= PROPENSITY_CLIP_LOW > 0 at
  // every grid point and the trapezoid weights are positive, so this normalizer cannot vanish.
  let uniformWidth = 0;
  for (let g = 0; g < gridPoints; g += 1) uniformWidth += delta[g]!;
  const uniformDensity = 1 / uniformWidth;
  let uniformNumerator = 0;
  let uniformNormalizer = 0;
  for (let g = 0; g < gridPoints; g += 1) {
    uniformNumerator += kappa1[g]! * uniformDensity * delta[g]!;
    uniformNormalizer += kappa2[g]! * uniformDensity * delta[g]!;
  }
  const plugInUniform = uniformNumerator / uniformNormalizer;
  const vermaShift = Math.abs(plugIn - plugInUniform);

  // --- Influence function: the three terms of Phi_{x0} -----------------------------------
  const influence = new Array<number>(n).fill(0);
  let outsideSupportCount = 0;
  for (let i = 0; i < n; i += 1) {
    const z = confounder[i]!;
    const y = outcome[i]!;
    const w = covariates[i]!;
    const indicator = treatment[i] === treatmentLevel ? 1 : 0;
    const pi = piObserved[i]!;
    const mu = dot(muCoefficients, [1, z, ...w]);
    const ratio = densityAt(z) / conditionalDensity[i]!;
    if (ratio === 0) outsideSupportCount += 1;

    // Phi_Y: residual of the outcome model, reweighted from f_Z(.|W) to p~.
    const phiY = ((indicator / normalizer) * ratio) * (y - mu);
    // Phi_X: the treatment-mechanism term — corrects for having estimated pi.
    const phiX = ((1 / normalizer) * ratio) * (mu - plugIn) * (indicator - pi);
    // Phi_W: the W-marginalization term — no density ratio, it integrates over z directly.
    let phiW = 0;
    for (let g = 0; g < gridPoints; g += 1) {
      phiW += gridPi[g]![i]! * (gridMu[g]![i]! - plugIn) * weightingDensity[g]! * delta[g]!;
    }
    phiW /= normalizer;

    influence[i] = phiY + phiX + phiW;
  }

  const oneStepCorrection = mean(influence);
  const estimand = plugIn + oneStepCorrection;
  if (!Number.isFinite(estimand)) {
    return fail(
      "NUMERICAL_FAILURE",
      `the one-step estimate is not finite (plug-in ${plugIn}, correction ${oneStepCorrection})`,
      n,
      clippedPropensityCount,
    );
  }
  const varianceEstimate = sampleVariance(influence) / n;
  const standardError = Math.sqrt(varianceEstimate);

  // --- Projected variance implied by the chosen p~ (diagnostic of the weighting knob) -----
  let projectedVariance = 0;
  for (let g = 0; g < gridPoints; g += 1) {
    const weight = (kappa2[g]! * weightingDensity[g]! * delta[g]!) / normalizer;
    projectedVariance += weight * weight * influenceVariance[g]!;
  }
  projectedVariance /= n;

  // --- Verma gate ------------------------------------------------------------------------
  // Reweighting z is only free if it does not move the estimand, so that is what is checked.
  // Uniform weighting makes no invariance claim and is therefore not gated.
  let vermaSpread = 0;
  for (let g = 0; g < gridPoints; g += 1) {
    const deviation = Math.abs(localEffect[g]! - estimand);
    if (deviation > vermaSpread) vermaSpread = deviation;
  }
  const vermaConsistent = vermaShift <= VERMA_SPREAD_TOLERANCE;
  if (!vermaConsistent && weighting === "efficiency") {
    return fail(
      "VERMA_CONSTRAINT_VIOLATED",
      `the efficiency reweighting moves the estimand by ${vermaShift} (local effects span ` +
        `${vermaSpread} around the pooled value), above VERMA_SPREAD_TOLERANCE ` +
        `(${VERMA_SPREAD_TOLERANCE}); the ratio functional is not weighting-invariant here, ` +
        "so inverse-variance weighting would silently change the estimand",
      n,
      clippedPropensityCount,
    );
  }

  const gridDiagnostics: SemiparametricGridPoint[] = [];
  for (let g = 0; g < gridPoints; g += 1) {
    gridDiagnostics.push({
      z: grid[g]!,
      kappa1: kappa1[g]!,
      kappa2: kappa2[g]!,
      localEffect: localEffect[g]!,
      influenceVariance: influenceVariance[g]!,
      weightingDensity: weightingDensity[g]!,
    });
  }

  return {
    ok: true,
    estimand,
    plugIn,
    oneStepCorrection,
    standardError,
    varianceEstimate,
    projectedVariance,
    sampleSize: n,
    treatmentLevel,
    weighting,
    weightingDensity,
    normalizer,
    clippedPropensityCount,
    clippedGridPointCount,
    propensityConverged: propensityFit.converged,
    propensityIterations: propensityFit.iterations,
    outsideSupportCount,
    truncatedWeightCount,
    vermaSpread,
    vermaShift,
    vermaConsistent,
    grid: gridDiagnostics,
  };
}

// ---------------------------------------------------------------------------------------
// E-value bridge (reuses e-value.ts; no second implementation of the formula here)
// ---------------------------------------------------------------------------------------

export interface RatioEstimandSensitivity {
  /** Risk ratio implied by treating `estimand` as a risk difference over `baselineRisk`. */
  readonly riskRatio: number;
  readonly ePoint: number;
  readonly eCi: number;
  readonly ciExcludesNull: boolean;
}

/**
 * THE E-VALUE GATE ON AN ESTIMAND.
 *
 * The spec's G4 is a CONJUNCTION over two numbers:
 *
 *     E-value(RR*)  >= 1.35   the point estimate
 *     E-value(LL)   >= 1.10   the confidence-interval lower limit
 *
 * The module computed both and reported them, but had NO threshold --
 * so nothing gated. This function is the gate.
 *
 * WHY A SEPARATE FUNCTION RATHER THAN A CHECK INSIDE THE ESTIMATOR.
 * The estimator is about the estimand; the E-value is about how much
 * unmeasured confounding could explain it away. They are different
 * questions, and the caller may want the estimand WITHOUT the
 * robustness verdict (to report a sensitivity) as well as with it
 * (to publish). So the gate is a separate call on a result the
 * estimator already produced.
 *
 * The refusal is a discriminated result, not a boolean, and it names
 * WHICH of the two conditions failed.
 */
export type EstimandEValueVerdict =
  | {
      readonly ok: true;
      readonly status: "ROBUST";
      readonly ePoint: number;
      readonly eCi: number;
      readonly minEValue: number;
      readonly minCiEValue: number;
      readonly reason: string;
    }
  | {
      readonly ok: false;
      readonly status: "FRAGILE";
      readonly code: "ESTIMAND_E_VALUE_TOO_LOW" | "ESTIMAND_CI_E_VALUE_TOO_LOW";
      readonly ePoint: number;
      readonly eCi: number;
      readonly minEValue: number;
      readonly minCiEValue: number;
      readonly reason: string;
    };

/**
 * Judge an estimand's robustness to unmeasured confounding.
 *
 * `sensitivity` comes from `ratioEstimandSensitivity`, which is where
 * the E-values are COMPUTED (it reuses the shared `e-value.ts`, so
 * there is no second implementation of the formula).
 */
export function judgeEstimandEValue(
  sensitivity: RatioEstimandSensitivity,
  options?: { readonly minEValue?: number; readonly minCiEValue?: number },
): EstimandEValueVerdict {
  if (sensitivity === null || typeof sensitivity !== "object") {
    throw new TypeError("semiparametric: judgeEstimandEValue needs a sensitivity report");
  }
  for (const [name, value] of [
    ["ePoint", sensitivity.ePoint],
    ["eCi", sensitivity.eCi],
  ] as const) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`semiparametric: sensitivity.${name} must be finite, got ${String(value)}`);
    }
  }
  const minEValue = options?.minEValue ?? MIN_ESTIMAND_E_VALUE;
  const minCiEValue = options?.minCiEValue ?? MIN_ESTIMAND_CI_E_VALUE;
  if (!Number.isFinite(minEValue) || minEValue < 1) {
    throw new RangeError(`semiparametric: minEValue must be a finite number >= 1, got ${String(minEValue)}`);
  }
  if (!Number.isFinite(minCiEValue) || minCiEValue < 1) {
    throw new RangeError(`semiparametric: minCiEValue must be a finite number >= 1, got ${String(minCiEValue)}`);
  }

  // THE POINT CONDITION.
  if (sensitivity.ePoint < minEValue) {
    return {
      ok: false,
      status: "FRAGILE",
      code: "ESTIMAND_E_VALUE_TOO_LOW",
      ePoint: sensitivity.ePoint,
      eCi: sensitivity.eCi,
      minEValue,
      minCiEValue,
      reason:
        `the estimand's E-value is ${sensitivity.ePoint.toFixed(4)}, below the required ` +
        `${minEValue}; a confounder of that strength could explain the effect away`,
    };
  }
  // THE CI CONDITION, with its OWN threshold.
  if (sensitivity.eCi < minCiEValue) {
    return {
      ok: false,
      status: "FRAGILE",
      code: "ESTIMAND_CI_E_VALUE_TOO_LOW",
      ePoint: sensitivity.ePoint,
      eCi: sensitivity.eCi,
      minEValue,
      minCiEValue,
      reason:
        `the estimand's confidence-interval E-value is ${sensitivity.eCi.toFixed(4)}, below ` +
        `the required ${minCiEValue}; the effect is not robust at the bound a reader would ` +
        "have to believe",
    };
  }
  return {
    ok: true,
    status: "ROBUST",
    ePoint: sensitivity.ePoint,
    eCi: sensitivity.eCi,
    minEValue,
    minCiEValue,
    reason:
      `the estimand's E-value is ${sensitivity.ePoint.toFixed(4)} (>= ${minEValue}) and its ` +
      `confidence-interval E-value is ${sensitivity.eCi.toFixed(4)} (>= ${minCiEValue})`,
  };
}

/**
 * Attach an unmeasured-confounding sensitivity report to a binary-outcome estimate.
 *
 * `estimand` is on the risk-difference scale, so the risk ratio is (baseline + psi)/baseline.
 * This throws rather than inventing a baseline: an E-value without a stated baseline risk is
 * a number about nothing.
 */
export function ratioEstimandSensitivity(
  estimate: SemiparametricRatioEstimate,
  baselineRisk: number,
): RatioEstimandSensitivity {
  if (estimate === null || typeof estimate !== "object" || estimate.ok !== true) {
    throw new Error("semiparametric: sensitivity needs a successful estimate, not a failure result");
  }
  if (!Number.isFinite(baselineRisk) || !(baselineRisk > 0) || !(baselineRisk < 1)) {
    throw new Error(`semiparametric: baselineRisk must be a finite number in (0, 1), got ${baselineRisk}`);
  }
  if (!Number.isFinite(estimate.estimand) || !(estimate.estimand > 0)) {
    throw new Error(
      `semiparametric: the estimate (${estimate.estimand}) is not a positive risk difference, so it has no risk-ratio reading`,
    );
  }
  if (!Number.isFinite(estimate.standardError) || estimate.standardError < 0) {
    throw new Error("semiparametric: standardError must be finite and non-negative");
  }

  const riskRatio = (baselineRisk + estimate.estimand) / baselineRisk;
  const lowerDifference = estimate.estimand - NORMAL_95_QUANTILE * estimate.standardError;
  const upperDifference = estimate.estimand + NORMAL_95_QUANTILE * estimate.standardError;
  const lowerRisk = baselineRisk + lowerDifference;
  const upperRisk = baselineRisk + upperDifference;
  if (!(lowerRisk > 0)) {
    throw new Error(
      `semiparametric: the 95% interval on the risk difference reaches ${lowerDifference}, ` +
        `which makes the lower risk (${lowerRisk}) non-positive; an E-value on the ratio scale is undefined`,
    );
  }

  const report = confoundingReport(riskRatio, lowerRisk / baselineRisk, upperRisk / baselineRisk);
  return {
    riskRatio,
    ePoint: report.ePoint,
    eCi: report.eCi,
    ciExcludesNull: report.ciExcludesNull,
  };
}
