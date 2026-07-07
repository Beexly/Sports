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
 *
 * REFUSES non-convergence: on (near-)separated data with hard 0/1 targets the
 * optimum is at infinity — without this guard the loop exhausts maxIter and
 * hands back divergent garbage-magnitude weights with no signal (found by
 * hostile review: a one-outlier separated fixture returned coefficients of
 * magnitude ~1e7 as a "successful" fit). Steps are damped to a max-norm of
 * MAX_STEP per iteration so recoverable fits still converge; if the final
 * iteration's step is still above CONVERGED_TOL, the fit did not converge and
 * we return null — an honest refusal instead of a fabricated map.
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
  const MAX_STEP = 10; // per-iteration max |step| component (damping, not a bound on w)
  const CONVERGED_TOL = 1e-4; // a final step larger than this = did not converge
  const d = X[0]!.length;
  let w = new Array<number>(d).fill(0);
  let lastMaxDelta = Infinity;
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
    if (!step) return null; // singular normal equations — refuse rather than guess
    // Damping: scale the whole step down when its largest component exceeds MAX_STEP.
    let stepMax = 0;
    for (let a = 0; a < d; a++) stepMax = Math.max(stepMax, Math.abs(step[a]!));
    const damp = stepMax > MAX_STEP ? MAX_STEP / stepMax : 1;
    for (let a = 0; a < d; a++) w[a] = w[a]! - damp * step[a]!;
    if (!w.every((v) => Number.isFinite(v))) return null;
    lastMaxDelta = stepMax * damp;
    if (lastMaxDelta < tol) break;
  }
  if (lastMaxDelta > CONVERGED_TOL) return null; // unconverged (e.g. separation) — refuse
  // Saturation refusal: on (near-)separated data the damped walk can "converge"
  // numerically at a huge-coefficient step function (the gradient dies into the
  // 1e-9 Hessian floor). No genuine probability-calibration relationship needs
  // slopes anywhere near this scale — |w| beyond MAX_COEF is separation, not fit.
  const MAX_COEF = 50;
  for (const v of w) if (Math.abs(v) > MAX_COEF) return null;
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
 * [ln p, −ln(1−p), 1]. Monotonicity requires a,b ≥ 0: a single violating
 * coefficient triggers a drop-that-feature refit (per Kull 2017 / the betacal
 * reference implementation); if the REFIT coefficient is itself negative — a
 * genuinely non-monotone forecast/outcome relationship, e.g. a flat-then-
 * decreasing truth (hostile-review construction) — we fall back to the
 * intercept-only base-rate map instead of returning a decreasing "calibration".
 * (The both-negative and refit-negative fallbacks are OUR conservative
 * extension, not part of Kull's prescription.)
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

  // Intercept-only fallback: the base-rate map (monotone-trivially, never wrong-signed).
  const interceptOnly = (): [number, number, number] => {
    const baseRate = clampUnit(nPos / n);
    return [0, 0, Math.log(baseRate / (1 - baseRate))];
  };

  // Full 3-feature fit: coeffs [a, b, c].
  const Xfull: number[][] = samples.map((_, i) => [s1[i]!, s2[i]!, 1]);
  const wf = fitLogisticIRLS(Xfull, t);
  if (!wf) return null;
  let a = wf[0]!;
  let b = wf[1]!;
  let c = wf[2]!;

  // Enforce a,b ≥ 0. Any refit whose surviving coefficient is ALSO negative
  // collapses to the intercept-only map (never return a decreasing map).
  if (a < 0 && b < 0) {
    [a, b, c] = interceptOnly();
  } else if (a < 0) {
    const wr = fitLogisticIRLS(samples.map((_, i) => [s2[i]!, 1]), t);
    if (!wr) return null;
    [a, b, c] = wr[0]! < 0 ? interceptOnly() : [0, wr[0]!, wr[1]!];
  } else if (b < 0) {
    const wr = fitLogisticIRLS(samples.map((_, i) => [s1[i]!, 1]), t);
    if (!wr) return null;
    [a, b, c] = wr[0]! < 0 ? interceptOnly() : [wr[0]!, 0, wr[1]!];
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
 *
 * ORDER-INVARIANT BY CONSTRUCTION (hostile-review fix): identical forecasts are
 * pre-pooled into one weighted group (same phase-1 as isotonicCalibration) and a
 * tie group is NEVER split across a bin boundary — a stable sort otherwise leaks
 * the caller's input order into the estimate whenever forecasts tie (the norm for
 * quantized odds-derived probabilities), making the same multiset score
 * differently across orderings. Bins are closed greedily at the ≈n/k cumulative-
 * mass targets over whole groups.
 *
 * SMALL-SAMPLE FLOOR: k is capped so each bin averages ≥ MIN_PER_BIN samples —
 * singleton bins degenerate to mean|p−y|, which maximally punishes a sharp,
 * perfectly calibrated forecaster. With very small n this collapses toward k=1
 * (overall |meanForecast − meanOutcome|), the only honest binned statement left.
 */
export function equalMassEce(samples: readonly CalibrationSample[], bins = 10): number {
  const n = samples.length;
  if (n === 0) return 0;
  const MIN_PER_BIN = 5;
  // Phase 1 — pool identical forecasts into weighted groups (order-invariant).
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  type Group = { p: number; weight: number; ySum: number };
  const groups: Group[] = [];
  for (const s of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.p === s.p) {
      last.weight += 1;
      last.ySum += s.y;
    } else {
      groups.push({ p: s.p, weight: 1, ySum: s.y });
    }
  }
  const k = Math.max(1, Math.min(bins, groups.length, Math.floor(n / MIN_PER_BIN) || 1));
  // Phase 2 — greedy whole-group bins closed at cumulative-mass targets.
  let ece = 0;
  let g = 0;
  let filled = 0;
  for (let bin = 0; bin < k && g < groups.length; bin++) {
    const target = Math.floor(((bin + 1) * n) / k);
    let weight = 0;
    let fSum = 0;
    let ySum = 0;
    // Always take at least one group; keep taking whole groups until the
    // cumulative count reaches this bin's target (last bin sweeps the rest).
    while (g < groups.length && (weight === 0 || filled + weight < target || bin === k - 1)) {
      const grp = groups[g]!;
      weight += grp.weight;
      fSum += grp.p * grp.weight;
      ySum += grp.ySum;
      g += 1;
      if (bin === k - 1 && g >= groups.length) break;
    }
    filled += weight;
    if (weight > 0) ece += (weight / n) * Math.abs(fSum / weight - ySum / weight);
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
  /**
   * The noise bar: the 90th percentile of the best-family ECE "gain" observed on
   * `nullSims` parametric-bootstrap replicas where the raw forecasts are TRUE
   * (y ~ Bernoulli(p)). A real family must beat raw by MORE than this (and than
   * minEceGain) — otherwise its win is indistinguishable from selection noise.
   */
  readonly nullGainMargin: number;
  /**
   * The recommended family, refit on ALL data. Null whenever `recommended` is
   * "identity". Callers MUST still null-check `model` even when `recommended`
   * names a family: the all-data refit can (near-unreachably) refuse — a family
   * that fit every training fold almost always fits their union, but it is not
   * guaranteed — leaving `recommended` set to the OOF winner while `model` is
   * null. Treat a null `model` as "apply nothing" regardless of `recommended`.
   */
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
 * One full CV pass: per-family pooled out-of-fold ECE + the raw bar.
 * Shared by the real-data selection and the parametric-bootstrap null below.
 */
function crossValidatedScores(
  samples: readonly CalibrationSample[],
  folds: number,
  seed: number,
  bins: number,
): { rawOofEce: number; scores: CalibratorScore[] } {
  const n = samples.length;
  const perm = seededPermutation(n, seed);
  const foldOf = new Array<number>(n);
  for (let rank = 0; rank < n; rank++) foldOf[perm[rank]!] = rank % folds;

  // Raw (identity) out-of-fold ECE: for the identity map the held-out prediction
  // IS the raw forecast, so pooling held-out raw samples across folds is the whole
  // sample — and equalMassEce is order-invariant (tie pre-pooling), so scoring the
  // sample once is EXACTLY the pooled-fold score, not merely approximately.
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
  return { rawOofEce, scores };
}

function bestGain(rawOofEce: number, scores: readonly CalibratorScore[]): { best: CalibratorScore | null; gain: number } {
  let best: CalibratorScore | null = null;
  for (const s of scores) {
    if (s.oofEce === null) continue;
    if (best === null || s.oofEce < best.oofEce!) best = s;
  }
  return { best, gain: best ? rawOofEce - best.oofEce! : 0 };
}

/**
 * Choose a calibrator family by k-fold, OUT-OF-SAMPLE ECE — the honest fix for
 * "isotonic by fiat". For each family we fit on the training folds and score the
 * held-out fold, so an overfit map is penalized where it actually matters (data it
 * did not see). The winner is refit on all data. If no family beats the raw
 * forecasts' OOF ECE, we recommend "identity" (apply nothing).
 *
 * THE NOISE BAR (hostile-review fix): finite-sample binned ECE is biased upward
 * more for dispersed raw forecasts than for the compressed predictions a fitted
 * map produces, so at a zero margin a map "wins" on PERFECTLY calibrated data
 * most of the time (measured 70–88% across n=40..200 before this fix). The
 * selection therefore calibrates its own bar: `nullSims` parametric-bootstrap
 * replicas redraw y ~ Bernoulli(p) — the world where raw is TRUE — run the
 * identical CV pipeline, and record the best-family "gain" that pure selection
 * noise produces. The real gain must exceed the 90th percentile of those null
 * gains (and any explicit minEceGain). No invented constant: the bar is measured
 * from the caller's own forecast distribution at the caller's own n.
 *
 * Returns null below a floor where CV is not meaningful. Fully deterministic given
 * `seed` (fold shuffle + null replica outcomes).
 */
export function selectCalibrator(
  samples: readonly CalibrationSample[],
  opts: {
    readonly folds?: number;
    readonly seed?: number;
    readonly bins?: number;
    readonly minSample?: number;
    /** Extra absolute OOF-ECE improvement required ON TOP of the measured noise bar. Default 0. */
    readonly minEceGain?: number;
    /**
     * Parametric-bootstrap replicas used to measure the noise bar. Default 16.
     * 0 disables the noise bar (raw comparison only — the pre-fix behavior; use
     * only in tests or when the caller supplies its own minEceGain).
     */
    readonly nullSims?: number;
  } = {},
): CalibratorSelection | null {
  const folds = opts.folds ?? 5;
  const seed = opts.seed ?? 0x5eed;
  const bins = opts.bins ?? 10;
  const minSample = opts.minSample ?? 40;
  const minEceGain = opts.minEceGain ?? 0;
  const nullSims = opts.nullSims ?? 16;
  const n = samples.length;
  if (!Number.isInteger(folds) || folds < 2) return null; // folds=0 → NaN fold ids; fractional folds silently drop samples
  if (!Number.isInteger(nullSims) || nullSims < 0) return null;
  if (n < Math.max(minSample, 2 * folds)) return null;
  if (!samples.every((s) => Number.isFinite(s.p) && (s.y === 0 || s.y === 1))) return null;

  const { rawOofEce, scores } = crossValidatedScores(samples, folds, seed, bins);
  const { best, gain } = bestGain(rawOofEce, scores);

  // Noise bar: what "gain" does the best family show when raw is TRUE?
  let nullGainMargin = 0;
  if (nullSims > 0) {
    const gains: number[] = [];
    for (let b = 0; b < nullSims; b++) {
      const rand = mulberry32((seed ^ 0x9e3779b9) + 7919 * (b + 1));
      const replica: CalibrationSample[] = samples.map((s) => ({ p: s.p, y: rand() < s.p ? 1 : 0 }));
      const cv = crossValidatedScores(replica, folds, seed, bins);
      gains.push(Math.max(0, bestGain(cv.rawOofEce, cv.scores).gain));
    }
    gains.sort((a, b2) => a - b2);
    nullGainMargin = gains[Math.min(gains.length - 1, Math.ceil(0.9 * gains.length) - 1)] ?? 0;
  }

  const requiredGain = Math.max(minEceGain, nullGainMargin);
  const beatsRaw = best !== null && gain > requiredGain;
  // A winning family is refit on ALL data. That full-sample refit succeeds in
  // practice — the winner fit every training fold, so it almost always fits their
  // union — but it is not guaranteed, so `model` can be null even when beatsRaw is
  // true. `recommended` still names the OOF winner in that case; consumers gate on
  // `model` (see its field doc), treating a null model as "apply nothing".
  const recommended: CalibrationMethod | "identity" = beatsRaw ? best!.method : "identity";
  const model = beatsRaw ? fitFamily(best!.method, samples) : null;

  return { recommended, scores, rawOofEce, nullGainMargin, model, sampleSize: n, folds, seed };
}
