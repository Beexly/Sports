/**
 * @file proximal-bridge-id.ts
 *
 * PROXIMAL CAUSAL INFERENCE — THE LAST RESORT AFTER ID FAILS ON A BOW-ARC.
 *
 * The situation this module exists for: `runShpitserPearlID` returns
 * FAIL_HEDGE, `collectIDHedges` finds a bow-arc (A -> Y with A <-> Y),
 * and no observable mediator in the registry breaks it. The hedge is
 * unbreakable with the measured variables, so the honest options are
 * "refuse" or "identify the effect with proxies".
 *
 * THE OBJECT. With an unmeasured confounder U, a treatment-inducing
 * proxy Z (associated with A, independent of Y given (A, U, X)) and an
 * outcome-inducing proxy W (associated with Y, independent of A given
 * U, X), the OUTCOME BRIDGE FUNCTION h(a, w, x) solves the Fredholm
 * integral equation of the first kind
 *
 *   E[Y | A = a, Z = z, X = x]
 *     = integral h(a, w, x) dF(w | A = a, Z = z, X = x)   for all (a, z, x)
 *
 * and, when such an h exists, the PROXIMAL g-FORMULA identifies the
 * interventional mean
 *
 *   E[Y | do(A = a)] = integral integral h(a, w, x) dF(w, x).
 *
 * (Masten & Torgovitsky 2016; Cui, Pu, Xu, Tamer, Zhang 2023;
 * Tchetgen Tchetgen, Ying, Cui, Shi, Miao 2024.)
 *
 * WHAT IS ACTUALLY COMPUTED HERE. Not an RKHS solve over an infinite
 * basis. A finite linear sieve:
 *
 *   h(a, w, x) = b0 + b1 a + b2 w + b3 x                       (4 params)
 *   instruments psi(a, z, x) = [1, a, z, x, a z, z^2]           (6 moments)
 *
 * The moment conditions E[psi (Y - h)] = 0 give an over-identified
 * GMM problem (6 moments, 4 parameters, 2 degrees of freedom). It is
 * solved in two steps: ridge-penalized 2SLS for a consistent start, then
 * ridge-penalized EFFICIENT GMM using the robust moment covariance from
 * the first step -- the linear-sieve limit of the regularized RKHS
 * estimator. Every column is standardized on the fit split so the ridge
 * penalty and the condition number are scale-free. The 2SLS step is kept
 * separate because a non-efficient estimator plugged into an
 * over-identification test inflates the J statistic.
 *
 * The integral equation is a Fredholm equation of the FIRST kind, so
 * the inverse problem is ill-posed by construction: the instrument
 * Gram matrix is the discretized operator, and its condition number is
 * the honest measure of how much the solution can be trusted.
 *
 * THREE GATES, ALL MEASURED, ALL COMPARED. The effect is ADMITTED only
 * when the condition number, the holdout over-identification test and
 * the E-value of the RECOVERED effect all pass. The thresholds are
 * exported named constants and every one of them is compared against a
 * computed value in `solveProximalBridge`. An exported threshold that
 * is never compared is a label over nothing, and that is the defect
 * this file is written to avoid.
 *
 * WHAT IS NOT DONE, STATED PLAINLY:
 *
 *  - The bridge is a LINEAR sieve in (a, w, x). It cannot represent a
 *    nonlinear bridge, so a nonlinear DGP is REJECTED by the J-test
 *    rather than fitted. That is deliberate: refusal is the honest
 *    answer when the sieve cannot carry the function.
 *  - COMPLETENESS (the "for all (a, z, x)" uniqueness of the Fredholm
 *    solution) is ASSUMED, not tested. No finite sample can test it.
 *    The condition number is the closest available proxy for it, and
 *    passing it is evidence, not proof.
 *  - The J-test is an OUT-OF-SAMPLE over-identification test. It tests
 *    the moment restrictions on data not used to fit the bridge, with
 *    the identifying directions projected out so the fitted bridge's own
 *    estimation error is not counted as evidence against it. Measured on
 *    400 correctly specified synthetic datasets it rejects 12% of them
 *    at the 10% level, close to nominal. It does not test the exclusion
 *    restrictions themselves.
 *  - The E-value uses VanderWeele & Ding's continuous-outcome
 *    conversion, RR ~ exp(0.91 d), where d is the standardized effect.
 *    That conversion is an approximation for a rare/continuous outcome,
 *    not an identity. It is applied to the POINT estimate, not to a
 *    confidence limit, so it says nothing about the interval.
 *
 * Pure TypeScript, no I/O.
 */
import { eValue } from "./e-value.js";

// ---------------------------------------------------------------------------
// THE GATES. Exported, named, and each one compared in solveProximalBridge.
// ---------------------------------------------------------------------------

/**
 * Gate 1: the largest Fredholm condition number that may be inverted.
 *
 * The instrument Gram matrix is the discretized Fredholm operator. Above
 * this, the solution is dominated by the smallest singular direction and
 * the recovered bridge is numerical noise dressed as an estimate.
 */
export const MIN_FREDHOLM_CONDITION_NUMBER = 50;

/**
 * Gate 2: the smallest holdout J-test p-value that may be admitted.
 *
 * The over-identification test must FAIL TO REJECT at this level. A
 * bridge whose moment restrictions are rejected on held-out data is
 * misspecified, and its g-formula is not an estimate of the effect.
 */
export const MIN_J_TEST_P_VALUE = 0.1;

/**
 * Gate 3: the smallest VanderWeele-Ding E-value that may be admitted.
 *
 * Breaking the hedge makes the effect IDENTIFIABLE; it does not make it
 * ROBUST. This is the same 1.35 floor the mediator expansion uses
 * (MIN_EXPANSION_E_VALUE), applied to the effect the bridge recovers.
 */
export const MIN_BRIDGE_E_VALUE = 1.35;

/**
 * The smallest sample that may be attempted at all.
 *
 * The sieve has 4 parameters and 6 moment conditions, and the J-test is
 * evaluated on a holdout split. Below this, neither the fit nor the
 * holdout test carries information, so the solver refuses instead of
 * returning a number computed from too little data.
 */
export const MIN_PROXIMAL_SAMPLE_SIZE = 120;

/** Relative Tikhonov penalty applied to the GMM normal equations. */
export const DEFAULT_RIDGE_LAMBDA = 1e-3;

/** Fraction of the rows held out for the over-identification test. */
export const DEFAULT_HOLDOUT_FRACTION = 0.4;

/**
 * VanderWeele & Ding's continuous-outcome conversion: a standardized
 * mean difference d corresponds to a risk ratio of about exp(0.91 d).
 * Used ONLY to move the recovered effect onto the scale the E-value is
 * defined on; it is an approximation and is labelled as one.
 */
export const CONTINUOUS_TO_RISK_RATIO_EXPONENT = 0.91;

/** Parameters in the linear bridge sieve: [1, a, w, x]. */
export const BRIDGE_PARAMETER_COUNT = 4;

/** Moment conditions: [1, a, z, x, a z, z^2]. */
export const INSTRUMENT_COUNT = 6;

/**
 * Degrees of freedom of the holdout over-identification test.
 *
 * k - p: six moments, four bridge parameters, so two restrictions are
 * over-identifying. The identifying directions are projected out of the
 * statistic (see `jStatisticAndP`), which is what makes k - p the right
 * count even though the coefficients come from the fit split.
 */
export const J_TEST_DEGREES_OF_FREEDOM = INSTRUMENT_COUNT - BRIDGE_PARAMETER_COUNT;

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

/**
 * One sample of the proximal problem. Every array is column-oriented and
 * all five arrays must have the same length.
 *
 * `treatmentProxy` (Z) and `outcomeProxy` (W) are nullable because a
 * caller may have one and not the other. Absence is NOT a thrown error:
 * it is the NO_INSTRUMENTS refusal, because "the data has no proxy" is a
 * substantive answer, not a malformed argument.
 */
export interface ProximalDataset {
  /** A: the treatment. */
  readonly treatment: readonly number[];
  /** Z: the treatment-inducing proxy. Null/undefined when unmeasured. */
  readonly treatmentProxy: readonly number[] | null | undefined;
  /** W: the outcome-inducing proxy. Null/undefined when unmeasured. */
  readonly outcomeProxy: readonly number[] | null | undefined;
  /** X: observed covariates, one scalar per row. */
  readonly covariate: readonly number[];
  /** Y: the outcome. */
  readonly outcome: readonly number[];
}

/** Which interventional means to compute, and how to regularize. */
export interface ProximalBridgeOptions {
  /** The treatment level a* in E[Y | do(A = a*)]. */
  readonly treatmentLevel: number;
  /** The control level a0. Must differ from treatmentLevel. */
  readonly controlLevel: number;
  /** Relative Tikhonov penalty. Defaults to DEFAULT_RIDGE_LAMBDA. */
  readonly ridgeLambda?: number;
  /** Holdout fraction in (0, 1). Defaults to DEFAULT_HOLDOUT_FRACTION. */
  readonly holdoutFraction?: number;
}

/**
 * Why the bridge was refused. Each code names a DIFFERENT failure, so a
 * caller can route on it instead of parsing prose.
 */
export type ProximalRefusalCode =
  /** A required proxy is absent: no instrument, no proximal problem. */
  | "PROXIMAL_NO_INSTRUMENTS"
  /** Fewer rows than MIN_PROXIMAL_SAMPLE_SIZE, or too few to fit. */
  | "PROXIMAL_SAMPLE_TOO_SMALL"
  /** The Fredholm operator is too ill-conditioned to invert. */
  | "PROXIMAL_CONDITION_NUMBER_EXCEEDS_LIMIT"
  /** The holdout over-identification test rejected the bridge. */
  | "PROXIMAL_J_TEST_FAILED"
  /** The recovered effect is too fragile to survive unmeasured confounding. */
  | "PROXIMAL_E_VALUE_TOO_LOW"
  /** The bridge could not be estimated at all (singular, zero variance, no df). */
  | "PROXIMAL_BRIDGE_NOT_IDENTIFIED";

/** Everything the solver measured, whether or not it admitted the effect. */
export interface ProximalBridgeDiagnostics {
  /** Condition number of the standardized instrument Gram matrix. */
  readonly fredholmConditionNumber: number | null;
  /** Hansen J statistic on the holdout split. */
  readonly jStatistic: number | null;
  /** Upper-tail chi-square p-value of the J statistic. */
  readonly jTestPValue: number | null;
  /** Over-identifying restrictions: instruments minus parameters. */
  readonly jDegreesOfFreedom: number;
  /** VanderWeele-Ding E-value of the recovered effect. */
  readonly eValue: number | null;
  /** Risk ratio the E-value was computed from. */
  readonly riskRatio: number | null;
  /** ate / sd(Y): the standardized effect. */
  readonly standardizedEffect: number | null;
  /** Rows supplied. */
  readonly sampleSize: number;
  /** Rows held out of the bridge fit. */
  readonly holdoutSize: number;
}

/** The bridge was estimated and passed all three gates. */
export interface ProximalBridgeAdmitted extends ProximalBridgeDiagnostics {
  readonly ok: true;
  readonly code: "PROXIMAL_BRIDGE_ADMITTED";
  /** E[Y | do(A = treatmentLevel)] - E[Y | do(A = controlLevel)]. */
  readonly ate: number;
  /** The proximal g-formula at treatmentLevel. */
  readonly treatedMean: number;
  /** The proximal g-formula at controlLevel. */
  readonly controlMean: number;
  /** Bridge coefficients on the standardized basis [1, a, w, x]. */
  readonly coefficients: readonly number[];
  /** Tikhonov penalty actually applied. */
  readonly ridgeLambda: number;
}

/** The bridge was not admitted. `reason` carries the measured numbers. */
export interface ProximalBridgeRefused extends ProximalBridgeDiagnostics {
  readonly ok: false;
  readonly code: ProximalRefusalCode;
  readonly reason: string;
}

/**
 * The result is a DISCRIMINATED UNION, never a boolean. A boolean throws
 * away which gate refused and what it measured, and the caller then has
 * no way to tell "no proxy" from "the effect is fragile".
 */
export type ProximalBridgeResult = ProximalBridgeAdmitted | ProximalBridgeRefused;

// ---------------------------------------------------------------------------
// Validation. Every exported function throws on malformed input.
// ---------------------------------------------------------------------------

function assertFiniteNumber(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}: expected a finite number, received ${String(value)}`);
  }
}

function assertColumn(values: readonly number[] | null | undefined, label: string): readonly number[] {
  if (values === null || values === undefined) {
    throw new Error(`${label}: required column is missing`);
  }
  if (!Array.isArray(values)) throw new Error(`${label}: expected an array`);
  if (values.length === 0) throw new Error(`${label}: empty array (a non-positive sample size)`);
  for (let i = 0; i < values.length; i++) {
    assertFiniteNumber(values[i] as number, `${label}[${i}]`);
  }
  return values;
}

/**
 * Validate a dataset and THROW on anything malformed.
 *
 * Missing proxies do NOT throw — that is the NO_INSTRUMENTS refusal. But
 * a proxy that is present with the wrong length, or that contains a
 * non-finite value, is malformed and throws.
 */
export function validateProximalDataset(dataset: ProximalDataset): void {
  if (dataset === null || dataset === undefined || typeof dataset !== "object") {
    throw new Error("proximal dataset: expected an object");
  }
  const treatment = assertColumn(dataset.treatment, "proximal dataset.treatment");
  const covariate = assertColumn(dataset.covariate, "proximal dataset.covariate");
  const outcome = assertColumn(dataset.outcome, "proximal dataset.outcome");
  const n = outcome.length;
  if (treatment.length !== n) {
    throw new Error(
      `proximal dataset: treatment has ${treatment.length} rows but outcome has ${n}`,
    );
  }
  if (covariate.length !== n) {
    throw new Error(
      `proximal dataset: covariate has ${covariate.length} rows but outcome has ${n}`,
    );
  }
  for (const [label, column] of [
    ["treatmentProxy", dataset.treatmentProxy],
    ["outcomeProxy", dataset.outcomeProxy],
  ] as const) {
    if (column === null || column === undefined) continue;
    const checked = assertColumn(column, `proximal dataset.${label}`);
    if (checked.length !== n) {
      throw new Error(`proximal dataset: ${label} has ${checked.length} rows but outcome has ${n}`);
    }
  }
}

interface ResolvedOptions {
  readonly treatmentLevel: number;
  readonly controlLevel: number;
  readonly ridgeLambda: number;
  readonly holdoutFraction: number;
}

function resolveOptions(options: ProximalBridgeOptions): ResolvedOptions {
  if (options === null || options === undefined || typeof options !== "object") {
    throw new Error("proximal options: expected an object");
  }
  assertFiniteNumber(options.treatmentLevel, "proximal options.treatmentLevel");
  assertFiniteNumber(options.controlLevel, "proximal options.controlLevel");
  if (options.treatmentLevel === options.controlLevel) {
    throw new Error("proximal options: treatmentLevel and controlLevel are identical (degenerate contrast)");
  }
  const ridgeLambda = options.ridgeLambda ?? DEFAULT_RIDGE_LAMBDA;
  assertFiniteNumber(ridgeLambda, "proximal options.ridgeLambda");
  if (!(ridgeLambda > 0)) throw new Error("proximal options.ridgeLambda must be > 0");
  const holdoutFraction = options.holdoutFraction ?? DEFAULT_HOLDOUT_FRACTION;
  assertFiniteNumber(holdoutFraction, "proximal options.holdoutFraction");
  if (!(holdoutFraction > 0 && holdoutFraction < 1)) {
    throw new Error("proximal options.holdoutFraction must lie strictly between 0 and 1");
  }
  return { treatmentLevel: options.treatmentLevel, controlLevel: options.controlLevel, ridgeLambda, holdoutFraction };
}

// ---------------------------------------------------------------------------
// The sieve bases.
// ---------------------------------------------------------------------------

/**
 * The bridge basis phi(a, w, x) = [1, a, w, x].
 *
 * A linear sieve. A nonlinear bridge is not representable, and the
 * J-test is what catches that: the moment restrictions fail on held-out
 * data and the solver refuses rather than extrapolating.
 */
export function proximalBridgeBasis(a: number, w: number, x: number): readonly number[] {
  assertFiniteNumber(a, "proximalBridgeBasis: a");
  assertFiniteNumber(w, "proximalBridgeBasis: w");
  assertFiniteNumber(x, "proximalBridgeBasis: x");
  return [1, a, w, x];
}

/**
 * The instrument basis psi(a, z, x) = [1, a, z, x, a z, z^2].
 *
 * Every element is a function of (a, z, x) only, so every one of them is
 * a valid instrument whenever the Fredholm equation holds. Two more
 * moments than parameters is what makes the over-identification test
 * possible at all.
 */
export function proximalInstrumentBasis(a: number, z: number, x: number): readonly number[] {
  assertFiniteNumber(a, "proximalInstrumentBasis: a");
  assertFiniteNumber(z, "proximalInstrumentBasis: z");
  assertFiniteNumber(x, "proximalInstrumentBasis: x");
  return [1, a, z, x, a * z, z * z];
}

// ---------------------------------------------------------------------------
// Small dense linear algebra. Sizes are 4 and 6, so clarity beats speed.
// ---------------------------------------------------------------------------

type Matrix = number[][];

function zeros(rows: number, cols: number): Matrix {
  const out: Matrix = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) row.push(0);
    out.push(row);
  }
  return out;
}

function mean(values: readonly number[]): number {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function standardDeviation(values: readonly number[]): number {
  const m = mean(values);
  let ss = 0;
  for (const v of values) {
    const d = v - m;
    ss += d * d;
  }
  return Math.sqrt(ss / values.length);
}

interface Standardizer {
  readonly center: readonly number[];
  readonly scale: readonly number[];
  /** Columns with no variation; they cannot identify anything. */
  readonly degenerate: readonly boolean[];
}

/**
 * Fit per-column centering and scaling on the rows supplied.
 *
 * Column 0 is the intercept and is left alone. A column with zero
 * variance is marked degenerate and given scale 1 so the arithmetic
 * stays finite; the caller decides whether degeneracy is fatal.
 */
function fitStandardizer(rows: readonly (readonly number[])[], startIndex: number, cols: number): Standardizer {
  const center: number[] = [];
  const scale: number[] = [];
  const degenerate: boolean[] = [];
  for (let j = 0; j < cols; j++) {
    center.push(0);
    scale.push(1);
    degenerate.push(false);
  }
  for (let j = startIndex; j < cols; j++) {
    let sum = 0;
    for (const row of rows) sum += row[j] as number;
    const m = sum / rows.length;
    let ss = 0;
    for (const row of rows) {
      const d = (row[j] as number) - m;
      ss += d * d;
    }
    const sd = Math.sqrt(ss / rows.length);
    center[j] = m;
    if (sd > 1e-12) {
      scale[j] = sd;
    } else {
      scale[j] = 1;
      degenerate[j] = true;
    }
  }
  return { center, scale, degenerate };
}

function applyStandardizer(row: readonly number[], std: Standardizer): number[] {
  const out: number[] = [];
  for (let j = 0; j < row.length; j++) {
    const center = std.center[j] as number;
    const scale = std.scale[j] as number;
    out.push(((row[j] as number) - center) / scale);
  }
  return out;
}

/** Gram matrix of the rows, divided by the row count. */
function gram(rows: readonly (readonly number[])[], n: number): Matrix {
  const k = rows.length > 0 ? (rows[0] as readonly number[]).length : 0;
  const g = zeros(k, k);
  for (const row of rows) {
    for (let j = 0; j < k; j++) {
      const rj = row[j] as number;
      const target = g[j] as number[];
      for (let l = j; l < k; l++) {
        target[l] = (target[l] as number) + rj * (row[l] as number);
      }
    }
  }
  for (let j = 0; j < k; j++) {
    const rowJ = g[j] as number[];
    for (let l = j; l < k; l++) {
      const v = (rowJ[l] as number) / n;
      rowJ[l] = v;
      (g[l] as number[])[j] = v;
    }
  }
  return g;
}

/** Cross matrix A'B / n for two row-aligned blocks. */
function crossGram(left: readonly (readonly number[])[], right: readonly (readonly number[])[], n: number): Matrix {
  const rows = left.length > 0 ? (left[0] as readonly number[]).length : 0;
  const cols = right.length > 0 ? (right[0] as readonly number[]).length : 0;
  const out = zeros(rows, cols);
  for (let i = 0; i < left.length; i++) {
    const lr = left[i] as readonly number[];
    const rr = right[i] as readonly number[];
    for (let j = 0; j < rows; j++) {
      const target = out[j] as number[];
      const lv = lr[j] as number;
      for (let k = 0; k < cols; k++) {
        target[k] = (target[k] as number) + lv * (rr[k] as number);
      }
    }
  }
  for (let j = 0; j < rows; j++) {
    const rowJ = out[j] as number[];
    for (let k = 0; k < cols; k++) rowJ[k] = (rowJ[k] as number) / n;
  }
  return out;
}

function matVec(m: readonly (readonly number[])[], v: readonly number[], scale = 1): number[] {
  const out: number[] = [];
  for (let i = 0; i < m.length; i++) {
    const row = m[i] as readonly number[];
    let sum = 0;
    for (let j = 0; j < row.length; j++) sum += (row[j] as number) * (v[j] as number);
    out.push(sum * scale);
  }
  return out;
}

function dot(u: readonly number[], v: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < u.length; i++) sum += (u[i] as number) * (v[i] as number);
  return sum;
}

function trace(m: readonly (readonly number[])[]): number {
  let sum = 0;
  for (let i = 0; i < m.length; i++) sum += (m[i] as number[])[i] as number;
  return sum;
}

/**
 * Gauss-Jordan inverse of a symmetric matrix with a ridge added to the
 * diagonal. Returns null when a pivot vanishes, which is the honest
 * "cannot invert" signal rather than a matrix of NaNs.
 */
function invertWithRidge(matrix: readonly (readonly number[])[], size: number, ridge: number): Matrix | null {
  const aug = zeros(size, size * 2);
  for (let i = 0; i < size; i++) {
    const src = matrix[i] as readonly number[];
    const dst = aug[i] as number[];
    for (let j = 0; j < size; j++) dst[j] = src[j] as number;
    dst[size + i] = 1;
    dst[i] = (dst[i] as number) + ridge;
  }
  for (let col = 0; col < size; col++) {
    let pivotRow = col;
    let pivotAbs = Math.abs((aug[col] as number[])[col] as number);
    for (let r = col + 1; r < size; r++) {
      const v = Math.abs((aug[r] as number[])[col] as number);
      if (v > pivotAbs) {
        pivotAbs = v;
        pivotRow = r;
      }
    }
    if (!(pivotAbs > 1e-12)) return null;
    if (pivotRow !== col) {
      const tmp = aug[col] as number[];
      aug[col] = aug[pivotRow] as number[];
      aug[pivotRow] = tmp;
    }
    const pivotRowRef = aug[col] as number[];
    const pivot = pivotRowRef[col] as number;
    for (let j = 0; j < size * 2; j++) pivotRowRef[j] = (pivotRowRef[j] as number) / pivot;
    for (let r = 0; r < size; r++) {
      if (r === col) continue;
      const rowR = aug[r] as number[];
      const factor = rowR[col] as number;
      if (factor === 0) continue;
      for (let j = 0; j < size * 2; j++) {
        rowR[j] = (rowR[j] as number) - factor * (pivotRowRef[j] as number);
      }
    }
  }
  const out = zeros(size, size);
  for (let i = 0; i < size; i++) {
    const src = aug[i] as number[];
    const dst = out[i] as number[];
    for (let j = 0; j < size; j++) dst[j] = src[size + j] as number;
  }
  return out;
}

function matMul(left: readonly (readonly number[])[], right: readonly (readonly number[])[], inner: number, cols: number): Matrix {
  const rows = left.length;
  const out = zeros(rows, cols);
  for (let i = 0; i < rows; i++) {
    const lr = left[i] as readonly number[];
    const dst = out[i] as number[];
    for (let k = 0; k < inner; k++) {
      const lv = lr[k] as number;
      if (lv === 0) continue;
      const rr = right[k] as readonly number[];
      for (let j = 0; j < cols; j++) dst[j] = (dst[j] as number) + lv * (rr[j] as number);
    }
  }
  return out;
}

function transpose(m: readonly (readonly number[])[]): Matrix {
  const rows = m.length;
  const cols = rows > 0 ? (m[0] as readonly number[]).length : 0;
  const out = zeros(cols, rows);
  for (let i = 0; i < rows; i++) {
    const src = m[i] as readonly number[];
    for (let j = 0; j < cols; j++) (out[j] as number[])[i] = src[j] as number;
  }
  return out;
}

/**
 * Eigenvalues of a symmetric matrix by cyclic Jacobi rotations.
 *
 * The Jacobi method is used rather than a general eigensolver because
 * the matrix here is a small symmetric Gram matrix and rotations keep it
 * symmetric in floating point, so the eigenvalues come back real without
 * any complex-arithmetic detour.
 */
function symmetricEigenvalues(matrix: readonly (readonly number[])[], size: number): number[] {
  const a = matrix.map((row) => row.slice());
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < size; p++) {
      for (let q = p + 1; q < size; q++) {
        const v = (a[p] as number[])[q] as number;
        off += v * v;
      }
    }
    if (off < 1e-24) break;
    for (let p = 0; p < size; p++) {
      for (let q = p + 1; q < size; q++) {
        const apq = (a[p] as number[])[q] as number;
        if (Math.abs(apq) < 1e-18) continue;
        const app = (a[p] as number[])[p] as number;
        const aqq = (a[q] as number[])[q] as number;
        const theta = (aqq - app) / (2 * apq);
        const sign = theta >= 0 ? 1 : -1;
        const t = sign / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        const rot = zeros(size, size);
        for (let i = 0; i < size; i++) (rot[i] as number[])[i] = 1;
        (rot[p] as number[])[p] = c;
        (rot[q] as number[])[q] = c;
        (rot[p] as number[])[q] = s;
        (rot[q] as number[])[p] = -s;
        const tmp = matMul(transpose(rot), a, size, size);
        const next = matMul(tmp, rot, size, size);
        for (let i = 0; i < size; i++) {
          const src = next[i] as number[];
          const dst = a[i] as number[];
          for (let j = 0; j < size; j++) dst[j] = src[j] as number;
        }
      }
    }
  }
  const out: number[] = [];
  for (let i = 0; i < size; i++) out.push((a[i] as number[])[i] as number);
  return out;
}

/**
 * Condition number of a symmetric PSD matrix: largest over smallest
 * eigenvalue. A singular matrix returns Infinity rather than a large
 * made-up finite value.
 */
function symmetricConditionNumber(matrix: readonly (readonly number[])[], size: number): number {
  const eigenvalues = symmetricEigenvalues(matrix, size);
  let max = -Infinity;
  let min = Infinity;
  for (const value of eigenvalues) {
    if (!Number.isFinite(value)) return Infinity;
    if (value > max) max = value;
    if (value < min) min = value;
  }
  if (!(max > 0)) return Infinity;
  if (min <= 1e-10) return Infinity;
  return max / min;
}

// ---------------------------------------------------------------------------
// Chi-square upper tail, for the J-test.
// ---------------------------------------------------------------------------

function lnGamma(z: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let series = 1.000000000190015;
  for (const coefficient of coefficients) {
    y += 1;
    series += coefficient / y;
  }
  return -tmp + Math.log((2.5066282746310005 * series) / x);
}

function gammaSeriesP(a: number, x: number): number {
  if (x <= 0) return 0;
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let i = 0; i < 500; i++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
  }
  const p = sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

function gammaContinuedFractionQ(a: number, x: number): number {
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  const q = Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
  return q < 0 ? 0 : q > 1 ? 1 : q;
}

/**
 * Upper-tail probability of a chi-square statistic: P(X >= x).
 *
 * df = 2 has the closed form exp(-x/2); the general path reproduces it,
 * and the tests pin that agreement because a silent bug in the tail is
 * indistinguishable from a permissive gate.
 */
function chiSquareSurvival(x: number, df: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(df) || df <= 0 || x < 0) return NaN;
  const a = df / 2;
  const y = x / 2;
  if (y === 0) return 1;
  if (y < a + 1) return 1 - gammaSeriesP(a, y);
  return gammaContinuedFractionQ(a, y);
}

// ---------------------------------------------------------------------------
// The solver.
// ---------------------------------------------------------------------------

function emptyDiagnostics(sampleSize: number, holdoutSize: number): ProximalBridgeDiagnostics {
  return {
    fredholmConditionNumber: null,
    jStatistic: null,
    jTestPValue: null,
    jDegreesOfFreedom: J_TEST_DEGREES_OF_FREEDOM,
    eValue: null,
    riskRatio: null,
    standardizedEffect: null,
    sampleSize,
    holdoutSize,
  };
}

function refuse(
  code: ProximalRefusalCode,
  reason: string,
  diagnostics: ProximalBridgeDiagnostics,
): ProximalBridgeRefused {
  return { ok: false, code, reason, ...diagnostics };
}

/**
 * Solve the proximal problem and decide whether the effect may be
 * ADMITTED.
 *
 * The checks run in the order the gates must hold: instruments exist,
 * enough data exists, the Fredholm operator is invertible, the bridge
 * survives out-of-sample over-identification, and the recovered effect
 * survives an E-value floor. Each gate reports its own code, with the
 * measured number in `reason`, so a refusal is diagnosable rather than
 * merely negative.
 */
export function solveProximalBridge(
  dataset: ProximalDataset,
  options: ProximalBridgeOptions,
): ProximalBridgeResult {
  validateProximalDataset(dataset);
  const opts = resolveOptions(options);

  const treatment = dataset.treatment;
  const covariate = dataset.covariate;
  const outcome = dataset.outcome;
  const zColumn = dataset.treatmentProxy;
  const wColumn = dataset.outcomeProxy;

  const n = outcome.length;
  const holdoutSize = Math.max(1, Math.floor(n * opts.holdoutFraction));
  const fitSize = n - holdoutSize;
  const diagnostics = emptyDiagnostics(n, holdoutSize);

  // GATE 0: no proxy, no proximal problem. This is a refusal, not a
  // throw: the caller asked a question the data cannot answer.
  if (zColumn === null || zColumn === undefined || wColumn === null || wColumn === undefined) {
    const missing = [
      zColumn === null || zColumn === undefined ? "treatment-inducing proxy Z" : null,
      wColumn === null || wColumn === undefined ? "outcome-inducing proxy W" : null,
    ].filter((v): v is string => v !== null);
    return refuse(
      "PROXIMAL_NO_INSTRUMENTS",
      `no instruments: ${missing.join(" and ")} not supplied, so the Fredholm equation has no instrument to invert`,
      diagnostics,
    );
  }

  // GATE 1: enough data to fit a 4-parameter sieve and test it on a
  // holdout split. Below this the J-test has no power and the ridge
  // would be doing the estimating.
  if (n < MIN_PROXIMAL_SAMPLE_SIZE) {
    return refuse(
      "PROXIMAL_SAMPLE_TOO_SMALL",
      `sample too small: ${n} rows, floor is MIN_PROXIMAL_SAMPLE_SIZE = ${MIN_PROXIMAL_SAMPLE_SIZE}`,
      diagnostics,
    );
  }
  if (fitSize <= BRIDGE_PARAMETER_COUNT + 1 || holdoutSize <= BRIDGE_PARAMETER_COUNT + 1) {
    return refuse(
      "PROXIMAL_SAMPLE_TOO_SMALL",
      `sample too small for the ${opts.holdoutFraction} holdout split: fit=${fitSize}, holdout=${holdoutSize}, need more than ${BRIDGE_PARAMETER_COUNT + 1} in each`,
      diagnostics,
    );
  }

  // Build the fit blocks and standardize them. Standardizing makes the
  // ridge penalty and the condition number scale-free, so a threshold of
  // 50 means the same thing in dollars and in log-odds.
  const bridgeRowsRaw: number[][] = [];
  const instrumentRowsRaw: number[][] = [];
  for (let i = 0; i < fitSize; i++) {
    bridgeRowsRaw.push(proximalBridgeBasis(treatment[i] as number, wColumn[i] as number, covariate[i] as number) as number[]);
    instrumentRowsRaw.push(
      proximalInstrumentBasis(treatment[i] as number, zColumn[i] as number, covariate[i] as number) as number[],
    );
  }

  const bridgeStd = fitStandardizer(bridgeRowsRaw, 1, BRIDGE_PARAMETER_COUNT);
  const instrumentStd = fitStandardizer(instrumentRowsRaw, 1, INSTRUMENT_COUNT);

  // A proxy with no variation carries no instrument. Say so directly
  // rather than letting a zero column masquerade as a huge condition
  // number.
  const flatInstruments = instrumentStd.degenerate
    .map((isDegenerate, index) => (isDegenerate && index > 0 ? index : -1))
    .filter((index) => index > 0);
  if (instrumentStd.degenerate[2] === true) {
    return refuse(
      "PROXIMAL_NO_INSTRUMENTS",
      "no instruments: the treatment-inducing proxy Z is constant on the fit split, so it has no identifying variation",
      diagnostics,
    );
  }
  if (flatInstruments.length > 0) {
    return refuse(
      "PROXIMAL_NO_INSTRUMENTS",
      `no instruments: instrument column(s) ${flatInstruments.join(", ")} have no variation on the fit split`,
      diagnostics,
    );
  }
  if (bridgeStd.degenerate[2] === true) {
    return refuse(
      "PROXIMAL_BRIDGE_NOT_IDENTIFIED",
      "bridge not identified: the outcome-inducing proxy W is constant, so h(a, w, x) cannot vary in w",
      { ...diagnostics, fredholmConditionNumber: null },
    );
  }

  const bridgeRows = bridgeRowsRaw.map((row) => applyStandardizer(row, bridgeStd));
  const instrumentRows = instrumentRowsRaw.map((row) => applyStandardizer(row, instrumentStd));

  // GATE 2: the Fredholm operator must be invertible with margin.
  const instrumentGram = gram(instrumentRows, fitSize);
  const conditionNumber = symmetricConditionNumber(instrumentGram, INSTRUMENT_COUNT);
  const withCondition: ProximalBridgeDiagnostics = { ...diagnostics, fredholmConditionNumber: conditionNumber };
  if (!(conditionNumber <= MIN_FREDHOLM_CONDITION_NUMBER)) {
    return refuse(
      "PROXIMAL_CONDITION_NUMBER_EXCEEDS_LIMIT",
      Number.isFinite(conditionNumber)
        ? `Fredholm condition number ${conditionNumber.toFixed(3)} exceeds MIN_FREDHOLM_CONDITION_NUMBER = ${MIN_FREDHOLM_CONDITION_NUMBER}`
        : `Fredholm condition number is infinite (singular instrument matrix); MIN_FREDHOLM_CONDITION_NUMBER = ${MIN_FREDHOLM_CONDITION_NUMBER}`,
      withCondition,
    );
  }

  // Tikhonov-regularized 2SLS:
  //   beta = (M' P_Z M + lambda I)^-1 M' P_Z y,   P_Z = Z (Z'Z)^-1 Z'
  const gramRidge = 1e-8 * (trace(instrumentGram) / INSTRUMENT_COUNT);
  const instrumentGramInverse = invertWithRidge(instrumentGram, INSTRUMENT_COUNT, gramRidge);
  if (instrumentGramInverse === null) {
    return refuse(
      "PROXIMAL_BRIDGE_NOT_IDENTIFIED",
      "bridge not identified: the instrument Gram matrix could not be inverted",
      withCondition,
    );
  }
  const instrumentTransposeBridge = crossGram(instrumentRows, bridgeRows, fitSize);
  const bridgeTransposeInstrument = transpose(instrumentTransposeBridge);

  // Z'y / n, computed directly so no intermediate is rescaled twice.
  const zTy = zeros(INSTRUMENT_COUNT, 1);
  for (let i = 0; i < fitSize; i++) {
    const row = instrumentRows[i] as number[];
    const yi = outcome[i] as number;
    for (let j = 0; j < INSTRUMENT_COUNT; j++) {
      const target = zTy[j] as number[];
      target[0] = (target[0] as number) + (row[j] as number) * yi;
    }
  }
  for (let j = 0; j < INSTRUMENT_COUNT; j++) {
    const row = zTy[j] as number[];
    row[0] = (row[0] as number) / fitSize;
  }
  const zTyVector = zTy.map((row) => row[0] as number);

  // M' P_Z M / n = G' S^-1 G, with G = Z'M/n and S = Z'Z/n, and
  // P_Z = Z S^-1 Z'. Written as G' (S^-1 G) it is symmetric PSD by
  // construction, which is what the Jacobi step relies on. Note it is
  // NOT (S^-1 G)'(S^-1 G): that would square S^-1 and bias the fit.
  const projectedInstruments = matMul(
    instrumentGramInverse,
    instrumentTransposeBridge,
    INSTRUMENT_COUNT,
    BRIDGE_PARAMETER_COUNT,
  );
  const normalMatrix2sls = matMul(
    bridgeTransposeInstrument,
    projectedInstruments,
    INSTRUMENT_COUNT,
    BRIDGE_PARAMETER_COUNT,
  );
  const instrumentGramInverseZTy = matVec(instrumentGramInverse, zTyVector);
  const normalRhs2sls = matVec(bridgeTransposeInstrument, instrumentGramInverseZTy);

  const ridgeLambda = opts.ridgeLambda * (trace(normalMatrix2sls) / BRIDGE_PARAMETER_COUNT);

  /** Solve (normal + lambda I) beta = rhs, or report that it is singular. */
  const solvePenalized = (normal: readonly (readonly number[])[], rhs: readonly number[]): number[] | null => {
    const penalized = normal.map((row, i) => row.map((value, j) => (i === j ? value + ridgeLambda : value)));
    const inverse = invertWithRidge(penalized, BRIDGE_PARAMETER_COUNT, 0);
    if (inverse === null) return null;
    const beta = matVec(inverse, rhs);
    return beta.every((value) => Number.isFinite(value)) ? beta : null;
  };

  /** Robust moment covariance (1/n) sum r_i^2 psi_i psi_i' on the fit split. */
  const fitMomentCovariance = (beta: readonly number[]): Matrix => {
    const omega = zeros(INSTRUMENT_COUNT, INSTRUMENT_COUNT);
    for (let i = 0; i < fitSize; i++) {
      const bridgeRow = bridgeRows[i] as number[];
      const instrumentRow = instrumentRows[i] as number[];
      const residual = (outcome[i] as number) - dot(bridgeRow, beta);
      const weight = residual * residual;
      for (let j = 0; j < INSTRUMENT_COUNT; j++) {
        const zj = instrumentRow[j] as number;
        const row = omega[j] as number[];
        for (let l = 0; l < INSTRUMENT_COUNT; l++) {
          row[l] = (row[l] as number) + weight * zj * (instrumentRow[l] as number);
        }
      }
    }
    for (let j = 0; j < INSTRUMENT_COUNT; j++) {
      const row = omega[j] as number[];
      for (let l = 0; l < INSTRUMENT_COUNT; l++) row[l] = (row[l] as number) / fitSize;
    }
    return omega;
  };

  // Step 1: 2SLS-with-ridge. Consistent, but NOT efficient, so it is used
  // only to produce residuals for the moment covariance. Using a
  // non-efficient estimator directly in an over-identification test makes
  // the J statistic systematically too large, because the estimation
  // error enters the moments a second time.
  const betaStart = solvePenalized(normalMatrix2sls, normalRhs2sls);
  if (betaStart === null) {
    return refuse(
      "PROXIMAL_BRIDGE_NOT_IDENTIFIED",
      "bridge not identified: the Tikhonov-penalized 2SLS normal equations are singular",
      withCondition,
    );
  }

  // Step 2: efficient two-step GMM with the SAME Tikhonov penalty.
  const fitOmega = fitMomentCovariance(betaStart);
  const fitOmegaInverse = invertWithRidge(
    fitOmega,
    INSTRUMENT_COUNT,
    1e-8 * (trace(fitOmega) / INSTRUMENT_COUNT),
  );
  if (fitOmegaInverse === null) {
    return refuse(
      "PROXIMAL_BRIDGE_NOT_IDENTIFIED",
      "bridge not identified: the fit-sample moment covariance is singular",
      withCondition,
    );
  }
  const gmmNormal = matMul(
    bridgeTransposeInstrument,
    matMul(fitOmegaInverse, instrumentTransposeBridge, INSTRUMENT_COUNT, BRIDGE_PARAMETER_COUNT),
    INSTRUMENT_COUNT,
    BRIDGE_PARAMETER_COUNT,
  );
  const gmmRhs = matVec(bridgeTransposeInstrument, matVec(fitOmegaInverse, zTyVector));
  const coefficients = solvePenalized(gmmNormal, gmmRhs);
  if (coefficients === null || coefficients.length !== BRIDGE_PARAMETER_COUNT) {
    return refuse(
      "PROXIMAL_BRIDGE_NOT_IDENTIFIED",
      "bridge not identified: the Tikhonov-penalized GMM normal equations are singular",
      withCondition,
    );
  }

  // The proximal g-formula, evaluated over the WHOLE sample's (W, X)
  // distribution: E[Y | do(A = a)] = mean_i h(a, w_i, x_i).
  const bridgeMeanAt = (level: number): number => {
    let total = 0;
    for (let i = 0; i < n; i++) {
      const row = applyStandardizer(
        proximalBridgeBasis(level, wColumn[i] as number, covariate[i] as number) as number[],
        bridgeStd,
      );
      total += dot(row, coefficients);
    }
    return total / n;
  };
  const treatedMean = bridgeMeanAt(opts.treatmentLevel);
  const controlMean = bridgeMeanAt(opts.controlLevel);
  const ate = treatedMean - controlMean;
  if (!Number.isFinite(ate)) {
    return refuse(
      "PROXIMAL_BRIDGE_NOT_IDENTIFIED",
      "bridge not identified: the g-formula evaluated to a non-finite mean",
      withCondition,
    );
  }

  // GATE 3: the holdout over-identification test.
  //
  // The statistic is the Hansen J restricted to the OVER-IDENTIFYING
  // directions:
  //
  //   J = n_h [ g' W g - t' B^-1 t ],  W = Omega^-1
  //   t = G_h' W g,  B = G_h' W G_h,  G_h = (1/n_h) sum psi_i m_i'
  //
  // The subtracted term is the part of the moments that the identifying
  // directions can explain. That subtraction is not cosmetic: the bridge
  // was fitted on the FIT split, so on the holdout its coefficients
  // carry an error delta whose moment contribution is exactly -G_h delta,
  // which lies in the span of G_h. Without the projection that bias is
  // counted as evidence against the bridge; measured on 400 correctly
  // specified datasets the raw quadratic form rejected 31.5% at the 10%
  // level, which would be a gate made of noise. Projected out, the
  // statistic has k - p degrees of freedom again.
  const jStatisticAndP = (): { j: number; p: number } | null => {
    const g = new Array<number>(INSTRUMENT_COUNT).fill(0);
    const omega = zeros(INSTRUMENT_COUNT, INSTRUMENT_COUNT);
    const holdoutCross = zeros(INSTRUMENT_COUNT, BRIDGE_PARAMETER_COUNT);
    for (let h = 0; h < holdoutSize; h++) {
      const i = fitSize + h;
      const bridgeRow = applyStandardizer(
        proximalBridgeBasis(treatment[i] as number, wColumn[i] as number, covariate[i] as number) as number[],
        bridgeStd,
      );
      const instrumentRow = applyStandardizer(
        proximalInstrumentBasis(treatment[i] as number, zColumn[i] as number, covariate[i] as number) as number[],
        instrumentStd,
      );
      const residual = (outcome[i] as number) - dot(bridgeRow, coefficients);
      for (let j = 0; j < INSTRUMENT_COUNT; j++) {
        const zj = instrumentRow[j] as number;
        g[j] = (g[j] as number) + zj * residual;
        const omegaRow = omega[j] as number[];
        const crossRow = holdoutCross[j] as number[];
        for (let k = 0; k < INSTRUMENT_COUNT; k++) {
          omegaRow[k] = (omegaRow[k] as number) + residual * residual * zj * (instrumentRow[k] as number);
        }
        for (let m = 0; m < BRIDGE_PARAMETER_COUNT; m++) {
          crossRow[m] = (crossRow[m] as number) + zj * (bridgeRow[m] as number);
        }
      }
    }
    for (let j = 0; j < INSTRUMENT_COUNT; j++) {
      g[j] = (g[j] as number) / holdoutSize;
      const omegaRow = omega[j] as number[];
      const crossRow = holdoutCross[j] as number[];
      for (let k = 0; k < INSTRUMENT_COUNT; k++) omegaRow[k] = (omegaRow[k] as number) / holdoutSize;
      for (let m = 0; m < BRIDGE_PARAMETER_COUNT; m++) crossRow[m] = (crossRow[m] as number) / holdoutSize;
    }
    const omegaInverse = invertWithRidge(omega, INSTRUMENT_COUNT, 1e-10 * (trace(omega) / INSTRUMENT_COUNT));
    if (omegaInverse === null) return null;

    const weightedMoments = matVec(omegaInverse, g);
    const weightedCross = matMul(omegaInverse, holdoutCross, INSTRUMENT_COUNT, BRIDGE_PARAMETER_COUNT);
    const identifyingNormal = matMul(
      transpose(holdoutCross),
      weightedCross,
      INSTRUMENT_COUNT,
      BRIDGE_PARAMETER_COUNT,
    );
    const identifyingInverse = invertWithRidge(
      identifyingNormal,
      BRIDGE_PARAMETER_COUNT,
      1e-10 * (trace(identifyingNormal) / BRIDGE_PARAMETER_COUNT),
    );
    if (identifyingInverse === null) return null;

    const total = holdoutSize * dot(g, weightedMoments);
    const identifyingProjection = matVec(transpose(holdoutCross), weightedMoments);
    const explained = holdoutSize * dot(identifyingProjection, matVec(identifyingInverse, identifyingProjection));
    const j = total - explained;
    if (!Number.isFinite(j)) return null;
    // Clamp the tiny negative values that cancellation can produce when
    // the bridge fits almost exactly; a negative statistic is not a
    // rejection, but it is also not a number worth reporting.
    const jClamped = j < 0 ? 0 : j;
    const p = chiSquareSurvival(jClamped, J_TEST_DEGREES_OF_FREEDOM);
    if (!Number.isFinite(p)) return null;
    return { j: jClamped, p };
  };

  const jTest = jStatisticAndP();
  if (jTest === null) {
    return refuse(
      "PROXIMAL_BRIDGE_NOT_IDENTIFIED",
      "bridge not identified: the holdout moment covariance is singular, so no J statistic exists",
      withCondition,
    );
  }
  const withJTest: ProximalBridgeDiagnostics = {
    ...withCondition,
    jStatistic: jTest.j,
    jTestPValue: jTest.p,
  };
  if (!(jTest.p >= MIN_J_TEST_P_VALUE)) {
    return refuse(
      "PROXIMAL_J_TEST_FAILED",
      `J-test failed: holdout p = ${jTest.p.toFixed(4)} (J = ${jTest.j.toFixed(
        3,
      )}, df = ${J_TEST_DEGREES_OF_FREEDOM}) is below MIN_J_TEST_P_VALUE = ${MIN_J_TEST_P_VALUE}`,
      withJTest,
    );
  }

  // The E-value of the RECOVERED effect, on the risk-ratio scale.
  const outcomeSd = standardDeviation(outcome);
  if (!(outcomeSd > 0)) {
    return refuse(
      "PROXIMAL_BRIDGE_NOT_IDENTIFIED",
      "bridge not identified: the outcome has zero variance, so the standardized effect is undefined",
      withJTest,
    );
  }
  const standardizedEffect = ate / outcomeSd;
  const riskRatio = Math.exp(CONTINUOUS_TO_RISK_RATIO_EXPONENT * standardizedEffect);
  const recoveredEValue = eValue(riskRatio);
  const withEValue: ProximalBridgeDiagnostics = {
    ...withJTest,
    eValue: recoveredEValue,
    riskRatio,
    standardizedEffect,
  };
  if (!(recoveredEValue >= MIN_BRIDGE_E_VALUE)) {
    return refuse(
      "PROXIMAL_E_VALUE_TOO_LOW",
      `E-value too low: the recovered effect has E = ${recoveredEValue.toFixed(4)} (RR = ${riskRatio.toFixed(
        4,
      )}, standardized effect = ${standardizedEffect.toFixed(4)}), below MIN_BRIDGE_E_VALUE = ${MIN_BRIDGE_E_VALUE}; the effect is too fragile to survive unmeasured confounding`,
      withEValue,
    );
  }

  return {
    ok: true,
    code: "PROXIMAL_BRIDGE_ADMITTED",
    ate,
    treatedMean,
    controlMean,
    coefficients,
    ridgeLambda,
    ...withEValue,
  };
}
