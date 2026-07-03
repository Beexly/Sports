/**
 * Calibration maps — parametric recalibrators (Platt, Beta) and an honest,
 * cross-validated selector across calibrator families. R&D, NOT wired into live
 * scoring (same dark posture as probability-calibration.ts / calibration-apply.ts).
 *
 * WHY THIS EXISTS (the gap it fills):
 *   probability-calibration.ts ships ONE calibrator — isotonic (PAVA) — and
 *   calibration-apply.ts's buildCalibrator picks it by fiat, only checking that it
 *   beats the raw ECE on the SAME sample it was fit on (an in-sample check that can
 *   flatter an overfit map). Isotonic is non-parametric and is known to OVERFIT at
 *   small n; a smooth parametric map (Platt, Beta) is often better when settled
 *   picks are few — exactly GSE's pre-launch regime. This module adds those two
 *   maps AND a k-fold, out-of-sample ECE selection so "which calibrator" becomes a
 *   measured decision (winner on held-out ECE), not a default.
 *
 * All deterministic: the fold shuffle is seeded (mulberry32); the map fits use
 * Newton/IRLS with no randomness. No I/O. Operates on the same CalibrationSample
 * {p in [0,1], y in {0,1}} type as the rest of the calibration toolkit.
 *
 * Sources: Platt (1999) probabilistic outputs; Kull, Silva Filho & Flach (2017)
 * "Beta calibration". Both re-derived here from first principles (logistic fit),
 * not copied — the only constants are the Platt target-smoothing counts, which are
 * Platt's exact prescription and are sourced in-line.
 */

import {
  isotonicCalibration,
  expectedCalibrationError,
  type CalibrationSample,
} from "./probability-calibration.js";

const EPS = 1e-6;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function clampUnit(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}
function round(value: number, digits = 6): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}
function sigmoid(z: number): number {
  // Numerically stable.
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}
function logit(p: number): number {
  const c = clampUnit(p);
  return Math.log(c / (1 - c));
}

/** Deterministic PRNG (mulberry32) — matches the package's other seeded modules. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher–Yates permutation of [0..n). */
function seededPermutation(n: number, seed: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = tmp;
  }
  return idx;
}

// ============================================================
// Small dense linear solver (Gaussian elimination, partial pivot)
// ============================================================

/** Solve A x = b for small square A (d up to a handful). Returns null if singular. */
function solveLinear(A: readonly (readonly number[])[], b: readonly number[]): number[] | null {
  const d = b.length;
  // Augmented matrix copy.
  const m: number[][] = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < d; col++) {
    // Partial pivot.
    let pivot = col;
    let best = Math.abs(m[col]![col]!);
    for (let r = col + 1; r < d; r++) {
      const v = Math.abs(m[r]![col]!);
      if (v > best) {
        best = v;
        pivot = r;
      }
    }
    if (best < 1e-14) return null; // singular
    if (pivot !== col) {
      const tmp = m[col]!;
      m[col] = m[pivot]!;
      m[pivot] = tmp;
    }
    const pivRow = m[col]!;
    const pivVal = pivRow[col]!;
    for (let r = 0; r < d; r++) {
      if (r === col) continue;
      const factor = m[r]![col]! / pivVal;
      if (factor === 0) continue;
      const row = m[r]!;
      for (let c = col; c <= d; c++) row[c] = row[c]! - factor * pivRow[c]!;
    }
  }
  const x = new Array<number>(d);
  for (let i = 0; i < d; i++) x[i] = m[i]![d]! / m[i]![i]!;
  return x;
}

// ============================================================
// Generic ridge-regularized logistic regression (Newton / IRLS)
// ============================================================

/**
 * Fit weights w minimizing regularized cross-entropy for design rows `X` and
 * soft targets `t` in [0,1]. Ridge (lambda) on all but the last (intercept)
 * coefficient stabilizes fits under separation. Deterministic; no RNG.
 * Returns null if the normal equations are singular at every step.
 */
function fitLogisticIRLS(
  X: readonly (readonly number[])[],
  t: readonly number[],
  lambda = 1e-6,
  maxIter = 100,
  tol = 1e-9,
): number[] | null {
  const n = X.length;
  if (n === 0) return null;
  const d = X[0]!.length;
  let w = new Array<number>(d).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    // Gradient g (d) and Hessian H (d×d).
    const g = new Array<number>(d).fill(0);
    const H: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
    for (let i = 0; i < n; i++) {
      const xi = X[i]!;
      let z = 0;
      for (let k = 0; k < d; k++) z += w[k]! * xi[k]!;
      const p = sigmoid(z);
      const err = p - t[i]!;
      const wgt = Math.max(p * (1 - p), 1e-9); // floor keeps H invertible under separation
      for (let a = 0; a < d; a++) {
        g[a] = g[a]! + err * xi[a]!;
        for (let bcol = 0; bcol < d; bcol++) H[a]![bcol] = H[a]![bcol]! + wgt * xi[a]! * xi[bcol]!;
      }
    }
    // Ridge on non-intercept coefficients (intercept = last column, all-ones).
    for (let a = 0; a < d - 1; a++) {
      g[a] = g[a]! + lambda * w[a]!;
      H[a]![a] = H[a]![a]! + lambda;
    }
    const step = solveLinear(H, g);
    if (!step) return w.every((v) => Number.isFinite(v)) ? w : null;
    let maxDelta = 0;
    for (let a = 0; a < d; a++) {
      w[a] = w[a]! - step[a]!;
      maxDelta = Math.max(maxDelta, Math.abs(step[a]!));
    }
    if (!w.every((v) => Number.isFinite(v))) return null;
    if (maxDelta < tol) break;
  }
  return w;
}

// ============================================================
// Common calibrator-fit shape (so the selector can compare families)
// ============================================================

export type CalibrationMethod = "isotonic" | "platt" | "beta";

export interface CalibratorFit {
  readonly method: CalibrationMethod;
  /** Map a forecast probability in [0,1] to a calibrated probability in [0,1]. */
  readonly predict: (p: number) => number;
  /**
   * Canonical, stable serialization of THIS map's parameters — the honest input
   * to a calibration-commitment (two fits with the same params serialize
   * identically; a changed map changes the string, hence the commitment).
   */
  readonly paramsCanonical: string;
}

// ============================================================
// Platt scaling  —  sigmoid(A·logit(p) + B)
// ============================================================

export interface PlattModel extends CalibratorFit {
  readonly method: "platt";
  readonly a: number;
  readonly b: number;
}

/**
 * Platt scaling on the forecast log-odds. Uses Platt's (1999) target smoothing —
 * y+ = (N+ +1)/(N+ +2), y- = 1/(N- +2) — to prevent the fit from chasing 0/1
 * targets under separation. A 2-parameter, smooth, monotone-when-A≥0 recalibrator;
 * the low-variance alternative to isotonic when settled samples are few.
 */
export function plattScaling(samples: readonly CalibrationSample[]): PlattModel | null {
  const n = samples.length;
  if (n < 2) return null;
  let nPos = 0;
  for (const s of samples) if (s.y === 1) nPos += 1;
  const nNeg = n - nPos;
  if (nPos === 0 || nNeg === 0) return null; // degenerate: cannot fit a slope
  const tPos = (nPos + 1) / (nPos + 2);
  const tNeg = 1 / (nNeg + 2);
  const X: number[][] = samples.map((s) => [logit(s.p), 1]);
  const t: number[] = samples.map((s) => (s.y === 1 ? tPos : tNeg));
  const w = fitLogisticIRLS(X, t);
  if (!w || !Number.isFinite(w[0]!) || !Number.isFinite(w[1]!)) return null;
  const a = w[0]!;
  const b = w[1]!;
  const predict = (p: number): number => clamp01(sigmoid(a * logit(p) + b));
  return {
    method: "platt",
    a: round(a),
    b: round(b),
    predict,
    paramsCanonical: `platt:a=${round(a)}|b=${round(b)}`,
  };
}

// ============================================================
// Beta calibration  —  sigmoid(a·ln p − b·ln(1−p) + c),  a,b ≥ 0
// ============================================================

export interface BetaModel extends CalibratorFit {
  readonly method: "beta";
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

/**
 * Beta calibration (Kull et al. 2017): a 3-parameter map that subsumes the
 * identity and is more flexible than Platt for binary forecasts (it can bend the
 * curve near both 0 and 1 independently). Fit as logistic regression on features
 * [ln p, −ln(1−p), 1]; monotonicity requires a,b ≥ 0, enforced by Kull's refit
 * rule (drop a violating feature and refit) rather than by clamping a fitted line.
 */
export function betaCalibration(samples: readonly CalibrationSample[]): BetaModel | null {
  const n = samples.length;
  if (n < 3) return null;
  let nPos = 0;
  for (const s of samples) if (s.y === 1) nPos += 1;
  if (nPos === 0 || nPos === n) return null;
  const t: number[] = samples.map((s) => s.y);
  const s1 = samples.map((s) => Math.log(clampUnit(s.p))); // ln p
  const s2 = samples.map((s) => -Math.log(1 - clampUnit(s.p))); // −ln(1−p)

  // Full 3-feature fit: coeffs [a, b, c].
  const Xfull: number[][] = samples.map((_, i) => [s1[i]!, s2[i]!, 1]);
  const wf = fitLogisticIRLS(Xfull, t);
  if (!wf) return null;
  let a = wf[0]!;
  let b = wf[1]!;
  let c = wf[2]!;

  // Enforce a,b ≥ 0 via Kull's refit rule.
  if (a < 0 && b < 0) {
    a = 0;
    b = 0;
    // Intercept-only logistic: c = logit(base rate).
    const base = clampUnit(nPos / n);
    c = Math.log(base / (1 - base));
  } else if (a < 0) {
    a = 0;
    const Xr: number[][] = samples.map((_, i) => [s2[i]!, 1]);
    const wr = fitLogisticIRLS(Xr, t);
    if (!wr) return null;
    b = wr[0]!;
    c = wr[1]!;
  } else if (b < 0) {
    b = 0;
    const Xr: number[][] = samples.map((_, i) => [s1[i]!, 1]);
    const wr = fitLogisticIRLS(Xr, t);
    if (!wr) return null;
    a = wr[0]!;
    c = wr[1]!;
  }
  if (![a, b, c].every(Number.isFinite)) return null;

  const predict = (p: number): number => {
    const cp = clampUnit(p);
    return clamp01(sigmoid(a * Math.log(cp) + b * -Math.log(1 - cp) + c));
  };
  return {
    method: "beta",
    a: round(a),
    b: round(b),
    c: round(c),
    predict,
    paramsCanonical: `beta:a=${round(a)}|b=${round(b)}|c=${round(c)}`,
  };
}

// ============================================================
// Isotonic wrapped in the common fit shape (composes existing tested code)
// ============================================================

function isotonicFit(samples: readonly CalibrationSample[]): CalibratorFit | null {
  if (samples.length < 2) return null;
  const model = isotonicCalibration(samples);
  if (model.points.length === 0) return null;
  const params = model.points.map((pt) => `${round(pt.x)}:${round(pt.calibrated)}`).join(",");
  return {
    method: "isotonic",
    predict: model.predict,
    paramsCanonical: `isotonic:${params}`,
  };
}

// ============================================================
// Equal-mass ECE (robust on small held-out folds)
// ============================================================

/**
 * ECE over `bins` EQUAL-MASS bins (each bin holds ≈ n/bins samples), the more
 * stable partner to the equal-width ECE in probability-calibration.ts when data is
 * sparse or clustered — an equal-width bin can be empty or hold a single point in
 * the tails and inject noise. Used for out-of-sample model selection below, and
 * exported because it is independently useful.
 */
export function equalMassEce(samples: readonly CalibrationSample[], bins = 10): number {
  const n = samples.length;
  if (n === 0) return 0;
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  const k = Math.max(1, Math.min(bins, n));
  let ece = 0;
  for (let bin = 0; bin < k; bin++) {
    const start = Math.floor((bin * n) / k);
    const end = Math.floor(((bin + 1) * n) / k);
    const count = end - start;
    if (count <= 0) continue;
    let fSum = 0;
    let ySum = 0;
    for (let i = start; i < end; i++) {
      fSum += sorted[i]!.p;
      ySum += sorted[i]!.y;
    }
    ece += (count / n) * Math.abs(fSum / count - ySum / count);
  }
  return round(ece, 6);
}

// ============================================================
// Cross-validated calibrator selection (the honest "which map")
// ============================================================

export interface CalibratorScore {
  readonly method: CalibrationMethod;
  /** Mean out-of-fold equal-mass ECE (lower is better). null if the family could not fit. */
  readonly oofEce: number | null;
}

export interface CalibratorSelection {
  /** The family with the lowest OOF ECE, or "identity" when none beats the raw forecasts. */
  readonly recommended: CalibrationMethod | "identity";
  /** Per-family out-of-fold ECE table (the evidence behind the choice). */
  readonly scores: readonly CalibratorScore[];
  /** OOF equal-mass ECE of the RAW (uncalibrated) forecasts — the bar to beat. */
  readonly rawOofEce: number;
  /** The recommended family, refit on ALL data (null when recommended === "identity"). */
  readonly model: CalibratorFit | null;
  readonly sampleSize: number;
  readonly folds: number;
  readonly seed: number;
}

const FAMILIES: readonly CalibrationMethod[] = ["isotonic", "platt", "beta"];

function fitFamily(method: CalibrationMethod, samples: readonly CalibrationSample[]): CalibratorFit | null {
  switch (method) {
    case "isotonic":
      return isotonicFit(samples);
    case "platt":
      return plattScaling(samples);
    case "beta":
      return betaCalibration(samples);
  }
}

/**
 * Choose a calibrator family by k-fold, OUT-OF-SAMPLE ECE — the honest fix for
 * "isotonic by fiat". For each family we fit on the training folds and score the
 * held-out fold, so an overfit map is penalized where it actually matters (data it
 * did not see). The winner is refit on all data. If no family beats the raw
 * forecasts' OOF ECE, we recommend "identity" (apply nothing) rather than ship a
 * map that does not earn its place.
 *
 * Returns null below a floor where CV is not meaningful. Fully deterministic given
 * `seed` (fold shuffle) — the same ledger always selects the same calibrator.
 */
export function selectCalibrator(
  samples: readonly CalibrationSample[],
  opts: {
    readonly folds?: number;
    readonly seed?: number;
    readonly bins?: number;
    readonly minSample?: number;
    /**
     * Absolute OOF-ECE improvement over raw a family must clear to be recommended
     * (else "identity"). Default 0 = "any improvement wins". Finite-sample ECE is
     * biased upward, so on near-calibrated data a map can win by noise; a
     * production policy should set this to a margin measured from fold-to-fold ECE
     * variance rather than a guessed constant (which is why the default is 0, not
     * an invented threshold).
     */
    readonly minEceGain?: number;
  } = {},
): CalibratorSelection | null {
  const folds = opts.folds ?? 5;
  const seed = opts.seed ?? 0x5eed;
  const bins = opts.bins ?? 10;
  const minSample = opts.minSample ?? 40;
  const minEceGain = opts.minEceGain ?? 0;
  const n = samples.length;
  if (n < Math.max(minSample, 2 * folds)) return null;
  if (!samples.every((s) => Number.isFinite(s.p) && (s.y === 0 || s.y === 1))) return null;

  const perm = seededPermutation(n, seed);
  const foldOf = new Array<number>(n);
  for (let rank = 0; rank < n; rank++) foldOf[perm[rank]!] = rank % folds;

  // Raw (identity) out-of-fold ECE: pool the held-out RAW samples across folds.
  // For the identity map the held-out prediction IS the raw forecast, so pooling
  // all folds equals scoring the whole sample once — computed that way here.
  const rawOofEce = equalMassEce(samples, bins);

  const scores: CalibratorScore[] = FAMILIES.map((method) => {
    const pooled: CalibrationSample[] = [];
    let anyFoldFailed = false;
    for (let f = 0; f < folds; f++) {
      const train: CalibrationSample[] = [];
      const test: CalibrationSample[] = [];
      for (let i = 0; i < n; i++) (foldOf[i] === f ? test : train).push(samples[i]!);
      if (test.length === 0) continue;
      const fit = fitFamily(method, train);
      if (!fit) {
        anyFoldFailed = true;
        break;
      }
      for (const s of test) pooled.push({ p: clamp01(fit.predict(s.p)), y: s.y });
    }
    if (anyFoldFailed || pooled.length === 0) return { method, oofEce: null };
    return { method, oofEce: equalMassEce(pooled, bins) };
  });

  // Winner = lowest OOF ECE that also beats raw; else identity.
  let best: CalibratorScore | null = null;
  for (const s of scores) {
    if (s.oofEce === null) continue;
    if (best === null || s.oofEce < best.oofEce!) best = s;
  }
  const beatsRaw = best !== null && best.oofEce! < rawOofEce - minEceGain;
  const recommended: CalibrationMethod | "identity" = beatsRaw ? best!.method : "identity";
  const model = beatsRaw ? fitFamily(best!.method, samples) : null;

  return { recommended, scores, rawOofEce, model, sampleSize: n, folds, seed };
}
