/**
 * Jackknife+ / CV+ / Jackknife-minmax / non-exchangeable (Nex) Jackknife+.
 *
 * Barber, Candès, Ramdas, Tibshirani (2021), JASA — Jackknife+.
 * Barber, Candès, Ramdas, Tibshirani (2023), Ann. Statist. 51(2) — beyond
 * exchangeability.
 *
 * Finite-sample coverage floor is 1 − 2α, NOT 1 − α. At α = 0.10 that is
 * 80%, not 90%. Typical coverage on exchangeable Gaussian residuals lands
 * near 1 − α, which is why the misreport is universal: a sanity check sees
 * 0.90 and writes 0.90 on the label. The theorem only gives 0.80.
 *
 * The 2 in 1−2α is not a two-tailed Gaussian. It is the comparison of n+1
 * leave-one-out residual scores (the extra point is the test residual).
 * Under extra stability of A the typical coverage hugs 1−α; that is an
 * observation, not a licence to print 1−α.
 *
 * The field is `coverageFloor`, never "guaranteedCoverage". The proof is an
 * inequality, not an equality. Coverage is MARGINAL: a 3-point spread and a
 * 14-point blowout share one number. Conditional coverage is a different
 * object (CQR); this module does not emit it.
 *
 * Sports is not exchangeable. Sequential NFL weeks violate the hypothesis.
 * Weighted Jackknife+ (2023 Thm 5) degrades the floor by a total-variation
 * penalty the CALLER must supply. Omitting d_i does not mean d_i = 0.
 *
 * Naive jackknife is exported and labelled NO_FINITE_SAMPLE_GUARANTEE.
 * Split conformal has exact 1−α under exchangeability but burns a split —
 * devastating at n≈70 (H2H). Game-level nflverse margins number in the
 * thousands; use those.
 *
 * Quantile indices that exceed n return ±∞ (fail-closed). Clamping the
 * index to n is the same fake tightness CQR had. Smallest n for a finite
 * interval is ceil(1/α − 1): n=9 at α=0.10, n=4 at α=0.20. The result
 * carries `refusedBound` ('none' | 'lower' | 'upper' | 'both') and
 * `minimumNForFiniteInterval` so a caller staring at an infinity can tell
 * WHICH rank overflowed and how many more settled rows it needs.
 *
 * Unconditional Jackknife+ reports coverageFloor = 1−2α. That is the
 * honest number when d_TV is omitted: omitting d_i is not d_i = 0, and
 * inventing an NFL weekly ε would launder a hunch into a tighter-looking
 * bound. Nex 2023 Thm 5 (nexJackknifePlusInterval) subtracts Σ ŵ_i d_i
 * only when the caller supplies d_i; otherwise coverageFloor is NaN on
 * the weighted path.
 *
 * SHADOW. Does not publish. Does not bump MODEL_VERSION.
 */
export type ConformalRecipe =
  | "jackknife-plus"
  | "jackknife-minmax"
  | "naive-jackknife"
  | "cv-plus"
  | "split-conformal"
  | "nex-jackknife-plus";

export type CoverageKind =
  | "floor_1_minus_2alpha"
  | "exact_1_minus_alpha"
  | "no_finite_sample_guarantee"
  | "floor_1_minus_2alpha_minus_tv";

export type CoverageScope = "marginal";

/** Which conformal rank overflowed n. Actionable for the refusal census. */
export type JackknifeRefusedBound = "none" | "lower" | "upper" | "both";

export type PredictionInterval = {
  readonly lower: number;
  readonly upper: number;
  readonly alpha: number;
  readonly n: number;
  readonly recipe: ConformalRecipe;
  readonly coverageFloor: number;
  readonly coverageKind: CoverageKind;
  readonly coverageScope: CoverageScope;
  readonly exchangeabilityRequired: boolean;
  readonly licensed: boolean;
  readonly refusedBound: JackknifeRefusedBound;
  /** Smallest n at this α for which the (1−α) quantile is a finite order statistic. */
  readonly minimumNForFiniteInterval: number;
  readonly priced: false;
  readonly status: "shadow";
};

export type LabeledPoint = {
  readonly x: number;
  readonly y: number;
};

export type LooPredictor = {
  /** μ_{-i}(x) for each left-out index i, evaluated at the query x. */
  readonly muLooAtQuery: readonly number[];
  /** |y_i − μ_{-i}(x_i)| */
  readonly looResiduals: readonly number[];
  /** Full-data fit μ(x) — used only by naive jackknife. */
  readonly muFullAtQuery: number;
};

/** coverageFloor(α) = max(0, 1 − 2α). Jackknife+ / CV+ / minmax under exchangeability. */
export function coverageFloor(alpha: number): number {
  if (!(alpha > 0 && alpha < 0.5)) {
    throw new RangeError(`coverageFloor: alpha must be in (0, 0.5), got ${alpha}`);
  }
  return Math.max(0, 1 - 2 * alpha);
}

/** Split conformal's exact 1−α (exchangeable). Not Jackknife+. */
export function splitConformalCoverage(alpha: number): number {
  if (!(alpha > 0 && alpha < 0.5)) {
    throw new RangeError(`splitConformalCoverage: alpha must be in (0, 0.5), got ${alpha}`);
  }
  return 1 - alpha;
}

/**
 * Smallest n such that ceil((n+1)(1−α)) ≤ n, i.e. the (1−α) conformal
 * quantile exists as a finite order statistic. Equivalent to n ≥ 1/α − 1.
 * Below this the honest interval is (−∞, +∞).
 */
export function finiteIntervalMinN(alpha: number): number {
  if (!(alpha > 0 && alpha < 0.5)) {
    throw new RangeError(`finiteIntervalMinN: alpha must be in (0, 0.5), got ${alpha}`);
  }
  return Math.ceil(1 / alpha - 1);
}

/**
 * The 2 in 1−2α. Documented so a future reader does not "correct" it to a
 * two-tailed Gaussian z_{1−α/2}.
 */
export const JACKKNIFE_PLUS_TWO_ALPHA_REASON =
  "comparison of n+1 leave-one-out residual scores, not two Gaussian tails" as const;

/**
 * Why the unconditional floor is 1−2α, not 1−2α minus an invented TV term.
 * Nex 2023 Thm 5 is real; this module carries it. The caller supplies d_TV.
 * Silence on d_i is not a licence to print d_i = 0.
 */
export const UNCONDITIONAL_JACKKNIFE_PLUS_FLOOR_REASON =
  "Omitting d_TV is not d_TV=0. Unconditional Jackknife+ reports coverageFloor=1−2α under exchangeability. Nex Thm 5 subtracts Σ ŵ_i d_i only when the caller supplies d_i; otherwise the weighted path's coverageFloor is NaN. Inventing an NFL weekly ε would launder a hunch into a tighter-looking bound." as const;

/**
 * [(1−α)(n+1)]-th smallest of v, or +∞ if that index exceeds n.
 * 1-based order statistic. Fail-closed, never clamped.
 */
export function upperOrderStat(values: readonly number[], alpha: number): number {
  const n = values.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  const k = Math.ceil((n + 1) * (1 - alpha));
  if (k > n) return Number.POSITIVE_INFINITY;
  if (k < 1) return Number.NEGATIVE_INFINITY;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[k - 1]!;
}

/** q^- {v} = − q^+ {−v}. Fail-closed to −∞. */
export function lowerOrderStat(values: readonly number[], alpha: number): number {
  const flipped = values.map((v) => -v);
  return -upperOrderStat(flipped, alpha);
}

function refusedBoundOf(lower: number, upper: number): JackknifeRefusedBound {
  const loInf = !Number.isFinite(lower);
  const hiInf = !Number.isFinite(upper);
  if (loInf && hiInf) return "both";
  if (loInf) return "lower";
  if (hiInf) return "upper";
  return "none";
}

function interval(
  lower: number,
  upper: number,
  alpha: number,
  n: number,
  recipe: ConformalRecipe,
  coverageKind: CoverageKind,
  floor: number,
  exchangeabilityRequired: boolean,
): PredictionInterval {
  const licensed = Number.isFinite(lower) && Number.isFinite(upper) && upper >= lower;
  return {
    lower,
    upper,
    alpha,
    n,
    recipe,
    coverageFloor: floor,
    coverageKind,
    coverageScope: "marginal",
    exchangeabilityRequired,
    licensed,
    refusedBound: refusedBoundOf(lower, upper),
    minimumNForFiniteInterval: finiteIntervalMinN(alpha),
    priced: false,
    status: "shadow",
  };
}

/**
 * Constant-mean leave-one-out. Analytic: μ_{-i} = (nȳ − y_i)/(n−1).
 * The query x is ignored — this is the intercept-only predictor used to
 * pin coverage numbers without a design matrix.
 */
export function constantMeanLoo(trainY: readonly number[], queryX: number): LooPredictor {
  void queryX;
  const n = trainY.length;
  if (n < 2) {
    throw new RangeError("constantMeanLoo requires n ≥ 2");
  }
  const sum = trainY.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const muLooAtQuery: number[] = [];
  const looResiduals: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const muI = (sum - trainY[i]!) / (n - 1);
    muLooAtQuery.push(muI);
    looResiduals.push(Math.abs(trainY[i]! - muI));
  }
  return { muLooAtQuery, looResiduals, muFullAtQuery: mean };
}

function olsFitPredict(train: readonly LabeledPoint[], x: number): number {
  const n = train.length;
  if (n === 0) throw new RangeError("olsFitPredict: empty train");
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of train) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const meanX = sx / n;
  const meanY = sy / n;
  const varX = sxx - (sx * sx) / n;
  if (!(Math.abs(varX) > 1e-15) || n < 3) return meanY;
  const slope = (sxy - (sx * sy) / n) / varX;
  const intercept = meanY - slope * meanX;
  return intercept + slope * x;
}

/**
 * Simple OLS with intercept, leave-one-out via the hat-matrix identity.
 * μ_{-i}(x) = μ(x) − (h_i(x) / (1 − h_ii)) r_i, with r_i = y_i − μ(x_i).
 * For 1-D x this is exact and O(n) after the full fit.
 */
export function olsLoo(train: readonly LabeledPoint[], queryX: number): LooPredictor {
  const n = train.length;
  if (n < 3) throw new RangeError("olsLoo requires n ≥ 3");
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of train) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const meanX = sx / n;
  const meanY = sy / n;
  const varX = sxx - (sx * sx) / n;
  if (!(Math.abs(varX) > 1e-15)) {
    return constantMeanLoo(train.map((p) => p.y), queryX);
  }
  const slope = (sxy - (sx * sy) / n) / varX;
  const intercept = meanY - slope * meanX;
  const muFullAtQuery = intercept + slope * queryX;
  const muLooAtQuery: number[] = [];
  const looResiduals: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const xi = train[i]!.x;
    const yi = train[i]!.y;
    const muAtXi = intercept + slope * xi;
    const resid = yi - muAtXi;
    const hii = 1 / n + ((xi - meanX) * (xi - meanX)) / varX;
    const denom = 1 - hii;
    const hiQuery = 1 / n + ((queryX - meanX) * (xi - meanX)) / varX;
    const muLooAtQ = denom > 1e-15 ? muFullAtQuery - (hiQuery / denom) * resid : meanY;
    const muLooAtXi = denom > 1e-15 ? muAtXi - (hii / denom) * resid : meanY;
    muLooAtQuery.push(muLooAtQ);
    looResiduals.push(Math.abs(yi - muLooAtXi));
  }
  return { muLooAtQuery, looResiduals, muFullAtQuery };
}

/** Jackknife+: [q^- {μ_{-i}(x)−R_i}, q^+ {μ_{-i}(x)+R_i}]. Floor 1−2α. */
export function jackknifePlusInterval(loo: LooPredictor, alpha: number): PredictionInterval {
  const n = loo.looResiduals.length;
  const lowerVals = loo.muLooAtQuery.map((m, i) => m - loo.looResiduals[i]!);
  const upperVals = loo.muLooAtQuery.map((m, i) => m + loo.looResiduals[i]!);
  return interval(
    lowerOrderStat(lowerVals, alpha),
    upperOrderStat(upperVals, alpha),
    alpha,
    n,
    "jackknife-plus",
    "floor_1_minus_2alpha",
    coverageFloor(alpha),
    true,
  );
}

/** Jackknife-minmax: [min μ_{-i}(x) − q^+(R), max μ_{-i}(x) + q^+(R)]. Wider, same floor. */
export function jackknifeMinmaxInterval(loo: LooPredictor, alpha: number): PredictionInterval {
  const n = loo.looResiduals.length;
  const qR = upperOrderStat(loo.looResiduals, alpha);
  const minMu = Math.min(...loo.muLooAtQuery);
  const maxMu = Math.max(...loo.muLooAtQuery);
  return interval(
    minMu - qR,
    maxMu + qR,
    alpha,
    n,
    "jackknife-minmax",
    "floor_1_minus_2alpha",
    coverageFloor(alpha),
    true,
  );
}

/**
 * Naive jackknife: [μ(x) − q^+(R), μ(x) + q^+(R)].
 * NO finite-sample guarantee. Typical and Jackknife+ can look similar;
 * this one can undercover.
 */
export function naiveJackknifeInterval(loo: LooPredictor, alpha: number): PredictionInterval {
  const n = loo.looResiduals.length;
  const qR = upperOrderStat(loo.looResiduals, alpha);
  return interval(
    loo.muFullAtQuery - qR,
    loo.muFullAtQuery + qR,
    alpha,
    n,
    "naive-jackknife",
    "no_finite_sample_guarantee",
    Number.NaN,
    true,
  );
}

/**
 * K-fold CV+. Each fold is held out, the rest fit, residuals on the fold
 * evaluated at the hold-out x (not the complement mean — that was an
 * intercept-only shortcut). μ_fold(x) ± R_{fold,j} collected. Floor 1−2α.
 * K=n is Jackknife+.
 */
export function cvPlusInterval(
  train: readonly LabeledPoint[],
  queryX: number,
  alpha: number,
  folds: number,
): PredictionInterval {
  const n = train.length;
  if (folds < 2 || folds > n) throw new RangeError(`cvPlusInterval: folds in [2, n], got ${folds}/${n}`);
  const foldOf: number[] = [];
  for (let i = 0; i < n; i += 1) foldOf.push(i % folds);
  const muVals: number[] = [];
  const rVals: number[] = [];
  for (let k = 0; k < folds; k += 1) {
    const fitPts = train.filter((_, i) => foldOf[i] !== k);
    const hold = train.filter((_, i) => foldOf[i] === k);
    if (fitPts.length < 2 || hold.length === 0) continue;
    const muQ = olsFitPredict(fitPts, queryX);
    for (const p of hold) {
      muVals.push(muQ);
      rVals.push(Math.abs(p.y - olsFitPredict(fitPts, p.x)));
    }
  }
  const lowerVals = muVals.map((m, i) => m - rVals[i]!);
  const upperVals = muVals.map((m, i) => m + rVals[i]!);
  return interval(
    lowerOrderStat(lowerVals, alpha),
    upperOrderStat(upperVals, alpha),
    alpha,
    n,
    "cv-plus",
    "floor_1_minus_2alpha",
    coverageFloor(alpha),
    true,
  );
}

/**
 * Split conformal on a held-out calibration slice. Exact 1−α under
 * exchangeability. Burns `calibrateFraction` of the data.
 */
export function splitConformalInterval(
  train: readonly LabeledPoint[],
  queryX: number,
  alpha: number,
  calibrateFraction = 0.5,
): PredictionInterval {
  const n = train.length;
  const nCal = Math.max(1, Math.floor(n * calibrateFraction));
  const nFit = n - nCal;
  if (nFit < 2) throw new RangeError("splitConformalInterval: not enough fit rows");
  const fit = train.slice(0, nFit);
  const cal = train.slice(nFit);
  const mu = olsFitPredict(fit, queryX);
  const residuals = cal.map((p) => Math.abs(p.y - olsFitPredict(fit, p.x)));
  const q = upperOrderStat(residuals, alpha);
  return interval(
    mu - q,
    mu + q,
    alpha,
    cal.length,
    "split-conformal",
    "exact_1_minus_alpha",
    splitConformalCoverage(alpha),
    true,
  );
}

// ── Non-exchangeable Jackknife+ (Barber et al. 2023 Thm 5) ────────────────

export type NormalizedNexWeights = {
  /** ŵ_i = w_i / (Σ w + 1), i = 1..n */
  readonly tildeW: readonly number[];
  /** ŵ_{n+1} = 1 / (Σ w + 1) — mass reserved for +∞ */
  readonly tildeWn1: number;
};

/**
 * Paper normalisation: ŵ_i = w_i / (Σw + 1), ŵ_{n+1} = 1 / (Σw + 1).
 * Uniform w_i ≡ 1 recovers ŵ_i = 1/(n+1) and the ordinary conformal quantile.
 */
export function normalizeNexWeights(weights: readonly number[]): NormalizedNexWeights {
  if (weights.length === 0) {
    throw new RangeError("normalizeNexWeights: empty");
  }
  let sum = 0;
  for (const w of weights) {
    if (!(w >= 0) || !Number.isFinite(w)) {
      throw new RangeError(`normalizeNexWeights: weights must be finite and ≥ 0, got ${w}`);
    }
    sum += w;
  }
  const denom = sum + 1;
  return {
    tildeW: weights.map((w) => w / denom),
    tildeWn1: 1 / denom,
  };
}

/**
 * Exponential decay toward the past: w_i = ρ^{n−i} (0-index i=0 oldest).
 * Paper: w_i = ρ^{n+1−i} for 1-index i=1..n. Same sequence.
 * ρ = 1 is exchangeable (uniform after a constant factor). ρ → 0 keeps only
 * the most recent calibration point.
 */
export function exponentialDecayWeights(n: number, rho: number): number[] {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`exponentialDecayWeights: n ≥ 1, got ${n}`);
  if (!(rho > 0 && rho <= 1)) throw new RangeError(`exponentialDecayWeights: rho in (0,1], got ${rho}`);
  const w: number[] = [];
  for (let i = 0; i < n; i += 1) w.push(rho ** (n - i));
  return w;
}

/**
 * Weighted upper conformal quantile:
 *   Q_{1−α}( Σ_i ŵ_i δ_{v_i} + ŵ_{n+1} δ_{∞} )
 * Walks cumulative ŵ mass of the sorted values. If the finite points cannot
 * accumulate 1−α (because ŵ_{n+1} is reserved for ∞), return +∞.
 * Uniform weights recover upperOrderStat.
 */
export function weightedUpperOrderStat(
  values: readonly number[],
  tildeW: readonly number[],
  alpha: number,
): number {
  if (values.length !== tildeW.length) {
    throw new RangeError("weightedUpperOrderStat: values and weights must align");
  }
  if (!(alpha > 0 && alpha < 0.5)) {
    throw new RangeError(`weightedUpperOrderStat: alpha in (0, 0.5), got ${alpha}`);
  }
  const n = values.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  const order = values.map((v, i) => ({ v, w: tildeW[i]! })).sort((a, b) => a.v - b.v);
  const target = 1 - alpha;
  let cum = 0;
  for (const row of order) {
    cum += row.w;
    if (cum + 1e-15 >= target) return row.v;
  }
  return Number.POSITIVE_INFINITY;
}

export function weightedLowerOrderStat(
  values: readonly number[],
  tildeW: readonly number[],
  alpha: number,
): number {
  const flipped = values.map((v) => -v);
  return -weightedUpperOrderStat(flipped, tildeW, alpha);
}

/**
 * TV penalty Σ ŵ_i d_i. d_i must be supplied; we do not estimate them.
 * Each d_i is a [0, 1] total-variation distance between the residual law
 * at point i and at the test point (2023 Thm 5).
 */
export function nexTvPenalty(tildeW: readonly number[], tvDistances: readonly number[]): number {
  if (tildeW.length !== tvDistances.length) {
    throw new RangeError("nexTvPenalty: weights and tv distances must align");
  }
  let s = 0;
  for (let i = 0; i < tildeW.length; i += 1) {
    const d = tvDistances[i]!;
    if (!(d >= 0 && d <= 1) || !Number.isFinite(d)) {
      throw new RangeError(`nexTvPenalty: d_i in [0,1], got ${d}`);
    }
    s += tildeW[i]! * d;
  }
  return s;
}

/**
 * 2023 Thm 5: P(cover) ≥ 1 − 2α − Σ ŵ_i d_TV(R(Z), R(Z^i)).
 * Returns null when the caller did not supply d_i — that is not the same as
 * d_i = 0, and we will not print a fake 1−2α robustness number.
 */
export function nexCoverageFloor(
  alpha: number,
  tildeW: readonly number[],
  tvDistances: readonly number[] | null,
): number | null {
  if (tvDistances == null) return null;
  return Math.max(0, coverageFloor(alpha) - nexTvPenalty(tildeW, tvDistances));
}

/**
 * Bounded per-step drift diagnostic (paper §4.4). Coverage gap ≤ 2ε/(1−ρ)
 * under a uniform per-step TV bound of ε. ε is the CALLER's. We do not
 * invent an NFL weekly ε.
 */
export function boundedDriftCoverageGap(epsilon: number, rho: number): number {
  if (!(epsilon >= 0 && epsilon <= 1) || !Number.isFinite(epsilon)) {
    throw new RangeError(`boundedDriftCoverageGap: epsilon in [0,1], got ${epsilon}`);
  }
  if (!(rho > 0 && rho < 1)) {
    throw new RangeError(`boundedDriftCoverageGap: rho in (0,1), got ${rho}`);
  }
  return Math.min(1, (2 * epsilon) / (1 - rho));
}

/** Changepoint k steps ago: gap ≤ ρ^k. */
export function changepointCoverageGap(rho: number, stepsAgo: number): number {
  if (!(rho > 0 && rho < 1)) throw new RangeError(`changepointCoverageGap: rho in (0,1), got ${rho}`);
  if (!Number.isInteger(stepsAgo) || stepsAgo < 0) {
    throw new RangeError(`changepointCoverageGap: stepsAgo integer ≥ 0, got ${stepsAgo}`);
  }
  return rho ** stepsAgo;
}

export type NexJackknifePlusInterval = PredictionInterval & {
  readonly tvPenalty: number | null;
  readonly tvDistancesSupplied: boolean;
  readonly rho: number | null;
};

/**
 * Non-exchangeable Jackknife+. Weighted conformal quantiles of
 * μ_{-i}(x) ± R_i. Floor is 1−2α − Σ ŵ_i d_i when d_i are supplied,
 * otherwise coverageFloor is NaN (robustness unquantified) and
 * coverageKind flags the missing TV.
 *
 * ρ = 1 (uniform weights) AND omitted d_i recovers ordinary Jackknife+
 * numbers, still labelled as requiring exchangeability.
 */
export function nexJackknifePlusInterval(
  loo: LooPredictor,
  alpha: number,
  opts?: {
    readonly weights?: readonly number[];
    readonly tvDistances?: readonly number[];
    readonly rho?: number;
  },
): NexJackknifePlusInterval {
  const n = loo.looResiduals.length;
  const weights = opts?.weights ?? (opts?.rho != null ? exponentialDecayWeights(n, opts.rho) : Array.from({ length: n }, () => 1));
  if (weights.length !== n) throw new RangeError("nexJackknifePlusInterval: weights length");
  const { tildeW } = normalizeNexWeights(weights);
  const tv = opts?.tvDistances ?? null;
  if (tv != null && tv.length !== n) throw new RangeError("nexJackknifePlusInterval: tv length");
  const robust = nexCoverageFloor(alpha, tildeW, tv);
  const uniform = weights.every((w) => Math.abs(w - weights[0]!) < 1e-15);
  const lowerVals = loo.muLooAtQuery.map((m, i) => m - loo.looResiduals[i]!);
  const upperVals = loo.muLooAtQuery.map((m, i) => m + loo.looResiduals[i]!);
  const kind: CoverageKind = robust != null ? "floor_1_minus_2alpha_minus_tv" : "floor_1_minus_2alpha";
  const floor = robust ?? (uniform && tv == null ? coverageFloor(alpha) : Number.NaN);
  const base = interval(
    weightedLowerOrderStat(lowerVals, tildeW, alpha),
    weightedUpperOrderStat(upperVals, tildeW, alpha),
    alpha,
    n,
    "nex-jackknife-plus",
    kind,
    floor,
    uniform && tv == null,
  );
  return {
    ...base,
    tvPenalty: tv == null ? null : nexTvPenalty(tildeW, tv),
    tvDistancesSupplied: tv != null,
    rho: opts?.rho ?? null,
  };
}

export type CoverageSimCell = {
  readonly n: number;
  readonly alpha: number;
  readonly floor: number;
  readonly nominal: number;
  readonly empiricalJackknifePlus: number;
  readonly empiricalNaive: number;
  readonly trials: number;
  readonly licensedFraction: number;
  readonly meanWidthPlus: number;
  readonly meanWidthNaive: number;
};

/**
 * Monte-Carlo coverage under exchangeable N(0,1), constant-mean predictor.
 * Typical JK+ coverage hugs `nominal` (1−α). The floor is 1−2α. Naive can
 * sit near typical too — that is not a licence.
 *
 * Keep `trials` modest in unit tests. Direction, not the 4th dp, is what
 * this pins. Unlicensed (infinite) intervals are NOT counted as coverage.
 */
export function simulateJackknifePlusCoverage(opts: {
  readonly n: number;
  readonly alpha: number;
  readonly trials: number;
  readonly seed?: number;
}): CoverageSimCell {
  const { n, alpha, trials } = opts;
  let rng = (opts.seed ?? 1) >>> 0;
  const next = (): number => {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    const u1 = (rng >>> 0) / 4294967296 || 1e-12;
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    const u2 = (rng >>> 0) / 4294967296;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  let hitPlus = 0;
  let hitNaive = 0;
  let widthPlus = 0;
  let widthNaive = 0;
  let licensed = 0;
  let naiveLicensed = 0;
  for (let t = 0; t < trials; t += 1) {
    const y: number[] = [];
    for (let i = 0; i < n; i += 1) y.push(next());
    const yNew = next();
    const loo = constantMeanLoo(y, 0);
    const plus = jackknifePlusInterval(loo, alpha);
    const naive = naiveJackknifeInterval(loo, alpha);
    if (plus.licensed) {
      licensed += 1;
      widthPlus += plus.upper - plus.lower;
      if (yNew >= plus.lower && yNew <= plus.upper) hitPlus += 1;
    }
    if (naive.licensed) {
      naiveLicensed += 1;
      widthNaive += naive.upper - naive.lower;
      if (yNew >= naive.lower && yNew <= naive.upper) hitNaive += 1;
    }
  }
  return {
    n,
    alpha,
    floor: coverageFloor(alpha),
    nominal: splitConformalCoverage(alpha),
    empiricalJackknifePlus: licensed > 0 ? hitPlus / licensed : 0,
    empiricalNaive: naiveLicensed > 0 ? hitNaive / naiveLicensed : 0,
    trials,
    licensedFraction: licensed / trials,
    meanWidthPlus: licensed > 0 ? widthPlus / licensed : Number.POSITIVE_INFINITY,
    meanWidthNaive: naiveLicensed > 0 ? widthNaive / naiveLicensed : Number.POSITIVE_INFINITY,
  };
}

/**
 * NFL-scale width diagnostic. σ=14 point residuals, n=70, α=0.10.
 * 80% Gaussian PI half-width is 1.28σ ≈ 18 points. A 3-point spread does
 * not live inside that interval. Valid, and too wide to size a bet.
 *
 * n=70 is the H2H settled-pick count, the WRONG sample. Game-level
 * nflverse margins are the right one.
 */
export function nflScaleWidthDiagnostic(sigma = 14, n = 70, alpha = 0.1): {
  readonly halfWidthGaussian80: number;
  readonly coverageFloor: number;
  readonly n: number;
  readonly finiteIntervalMinN: number;
  readonly usableOnThreePointSpread: false;
  readonly sampleIsHeadToHeadNotGameLevel: true;
} {
  const z80 = 1.2815515655446004;
  return {
    halfWidthGaussian80: z80 * sigma,
    coverageFloor: coverageFloor(alpha),
    n,
    finiteIntervalMinN: finiteIntervalMinN(alpha),
    usableOnThreePointSpread: false,
    sampleIsHeadToHeadNotGameLevel: true,
  };
}

export type RecipeScaleRow = {
  readonly recipe: ConformalRecipe;
  readonly nUsed: number;
  readonly coverageFloor: number;
  readonly licensed: boolean;
  readonly width: number;
};

/**
 * Side-by-side of the five recipes on one synthetic N(0, σ²) draw.
 * Split conformal reports 1−α and burns half the rows. JK+ reports 1−2α
 * and keeps n. Inf width means the quantile did not exist.
 */
export function compareRecipesAtNflScale(opts?: {
  readonly n?: number;
  readonly alpha?: number;
  readonly sigma?: number;
  readonly seed?: number;
}): readonly RecipeScaleRow[] {
  const n = opts?.n ?? 70;
  const alpha = opts?.alpha ?? 0.1;
  const sigma = opts?.sigma ?? 14;
  let rng = (opts?.seed ?? 3) >>> 0;
  const next = (): number => {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    const u1 = rng / 4294967296 || 1e-12;
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    const u2 = rng / 4294967296;
    return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const train: LabeledPoint[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const yi = next();
    y.push(yi);
    train.push({ x: i, y: yi });
  }
  const loo = constantMeanLoo(y, 0);
  const plus = jackknifePlusInterval(loo, alpha);
  const mm = jackknifeMinmaxInterval(loo, alpha);
  const naive = naiveJackknifeInterval(loo, alpha);
  const split = splitConformalInterval(train, n / 2, alpha, 0.5);
  const cv = cvPlusInterval(train, n / 2, alpha, Math.min(10, n));
  const width = (iv: PredictionInterval): number =>
    iv.licensed ? iv.upper - iv.lower : Number.POSITIVE_INFINITY;
  return [
    { recipe: plus.recipe, nUsed: plus.n, coverageFloor: plus.coverageFloor, licensed: plus.licensed, width: width(plus) },
    { recipe: mm.recipe, nUsed: mm.n, coverageFloor: mm.coverageFloor, licensed: mm.licensed, width: width(mm) },
    { recipe: naive.recipe, nUsed: naive.n, coverageFloor: naive.coverageFloor, licensed: naive.licensed, width: width(naive) },
    { recipe: cv.recipe, nUsed: cv.n, coverageFloor: cv.coverageFloor, licensed: cv.licensed, width: width(cv) },
    { recipe: split.recipe, nUsed: split.n, coverageFloor: split.coverageFloor, licensed: split.licensed, width: width(split) },
  ];
}
