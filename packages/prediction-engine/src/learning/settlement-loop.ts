/**
 * @file settlement-loop.ts
 *
 * T16 -- THE SAME-CYCLE SETTLEMENT LOOP (Murphy, Kalman, premise promotion, MP spectral).
 *
 * THE SPEC. *Frontier GSE 50k-Signal Causal Reasoning Engine*, Table 5 row T16, verbatim:
 *
 *   "Marchenko-Pastur BBP Spike Detection & Shadow gates S1-S4: Injects a rank-1 synthetic
 *    factor (theta_1 = 1.8 > sqrt(M/T)) into standardized settlement residuals, verifies
 *    detection above lambda_+ + s_alpha*sigma_TW with Participation Ratio > 1/3, and verifies
 *    SHADOW lock until Gates S1-S4 pass."
 *
 * And the same engine's section 8, which is the long form of the same four updates:
 *
 *   "First, calibration-tracker.ts updates the exact Murphy (1973) Brier Score Vector Partition
 *    BS = REL - RES + UNC = (1/N) sum_k N_k (pbar_k - ybar_k)^2 - (1/N) sum_k N_k (ybar_k - ybar)^2
 *    + ybar(1-ybar). Whenever the trailing 30-game calibration drift satisfies ECE_30 - ECE_250 >
 *    0.02, Gate G7 halts emissions on that market family. Second, the Laplace-Kalman Precision
 *    Edge Filter updates active mutilated edge posteriors against the variance-reduced hybrid
 *    settlement/CLV target y*_t = (1 - lambda_clv) y_t + lambda_clv p_t^close (lambda_clv = 0.35)
 *    via K_t = P_{t|t-1} Phi_t (v_t^-1 + Phi_t^T P_{t|t-1} Phi_t)^-1 and
 *    theta(t) = theta(t-1) + K_t (y*_t - p_t). Third, the Counterfactual Leave-One-Out Brier
 *    Premise Promotion engine updates pi_i(t) = clip(pi_i(t-1) exp(eta_prom (dBS + kappa_clv
 *    dCLV) / sqrt(Var(dBS_i) + eps)), 0.05, 3.00), promoting SHADOW premises to ACTIVE at
 *    N_i >= 15, A_i > +0.002, pi_i >= 1.20 and demoting ACTIVE premises at pi_i < 0.35 over
 *    N_i >= 20. Fourth, the Marchenko-Pastur and Baik-Ben Arous-Peche (BBP) Abductive Latent
 *    Node Invention engine analyzes the standardized residual matrix R_res in R^{T x M} across T
 *    settled games and M market families (aspect ratio gamma = M/T). Under the white-noise null
 *    hypothesis, the sample correlation matrix Sigma_res = (1/T) R_res^T R_res has its noise bulk
 *    bounded above by the Marchenko-Pastur upper edge lambda_+ = (1 + sqrt(gamma))^2. By the BBP
 *    phase transition, any true latent causal factor with population spike strength
 *    theta_1 > sqrt(gamma) detaches from the bulk and fluctuates at the Tracy-Widom TW_1 scale
 *    sigma_TW = (1 + sqrt(gamma))(1 + gamma^(-1/2))^(1/3) T^(-2/3). Whenever
 *    lambda_1(Sigma_res) > lambda_+ + s_alpha sigma_TW and the top eigenvector's Participation
 *    Ratio PR(u_1)/M = 1/(M sum_m u_{1,m}^4) > 1/3 confirms a coherent multi-market factor
 *    rather than a localized outlier, the engine extracts the latent temporal realization
 *    z_latent = R_res u_1 in R^T ... and inserts the winning latent node V_new -> Y into
 *    G_shadow governed by Promotion Gates S1-S4 (N_shadow >= 30, h(W_shadow) < 1e-6, 0 hedges,
 *    E-value >= 1.50, Diebold-Mariano p < 0.05, and eigenvalue deflation
 *    lambda_1^shadow < lambda_1^prod)."
 *
 * The premise-promotion algebra (dBS, dCLV, the EWMA attribution A_i, and the promotion /
 * demotion rules) is stated in the companion *Causal Sports Reasoning Engine Design* section 5.3,
 * which is the document that carries the LaTeX:
 *
 *   "dBS_{i,t} = (p_t^(-i) - y_t)^2 - (p_t - y_t)^2 ... dCLV_{i,t} = sign(p_t - p_t^(-i))
 *    (p_t^close - p_t^decision) ... A_i(t) = (1 - beta_attr) A_i(t-1) + beta_attr (dBS +
 *    kappa_clv dCLV), pi_i(t) = clip(pi_i(t-1) exp(eta_prom (dBS + kappa_clv dCLV) /
 *    sqrt(Var(dBS_i) + eps)), 0.05, 3.00) ... where beta_attr = 0.05, eta_prom = 0.15,
 *    kappa_clv = 0.50."
 *
 * WHY THIS FILE IS PURE. Every function here is a deterministic function of its arguments.
 * There is no I/O, no clock, no database, and -- deliberately -- no Math.random anywhere: the
 * synthetic spike used to test the detector is built by the CALLER from a seeded generator, so
 * a failing detection is reproducible and a passing one is not luck. The only randomness the
 * engine ever sees is the market's.
 *
 * THE FOUR UPDATES, IN THE ORDER THE SETTLEMENT CYCLE RUNS THEM:
 *   (a) murphyBrierDecomposition  -- the Brier vector partition, and the G7 drift rule that
 *                                   reads it (ECE_30 - ECE_250 > 0.02 halts the family);
 *   (b) laplaceKalmanEdgeUpdate  -- the precision edge filter on the hybrid settlement/CLV target;
 *   (c) promotePremise           -- the counterfactual leave-one-out premise promotion score;
 *   (d) detectSpectralSpike      -- the Marchenko-Pastur / BBP latent-factor discovery;
 *   (e) evaluateShadowPromotionGates -- the four Shadow-to-Production gates, and the lock.
 *
 * TWO RECONCILIATIONS THE SPEC LEAVES OPEN, RESOLVED HERE AND DOCUMENTED IN PLACE:
 *
 *   1. THE MURPHY IDENTITY. The spec writes the partition with bin means
 *      (pbar_k, ybar_k), and the identity BS = REL - RES + UNC holds EXACTLY for the BINNED
 *      Brier score. `murphyBrierDecomposition` therefore groups observations by EXACT forecast
 *      value -- the finest partition, in which the forecast is constant inside every group --
 *      so the identity is an algebraic equality rather than an approximation, and the returned
 *      `bs` is the ordinary raw Brier score (1/N) sum (p_k - y_k)^2. The identity holds
 *      exactly for BINARY settlement outcomes (the spec's domain: a bet settled or it did not).
 *      For a continuous outcome the within-group variance is not ybar_k (1 - ybar_k), so the
 *      difference is returned as `identityResidual` rather than hidden. The K-bin calibration
 *      view the settlement tracker displays is a separate function,
 *      `murphyCalibrationPartition`, which reports the binned score and the within-bin forecast
 *      variance separately.
 *
 *   2. THE PARTICIPATION RATIO. The spec's gate is on the EIGENVECTOR quantity
 *      PR(u_1)/M = 1/(M sum_m u_{1,m}^4) > 1/3, which is ~1 for a coherent multi-market factor
 *      and ~1/M for a single-market outlier -- and which can therefore REFUSE. The spectral
 *      ratio (sum lambda_i)^2 / sum(lambda_i^2) over the full spectrum of Sigma_res is also
 *      computed and returned (`spectralParticipationRatio`), but by Cauchy-Schwarz it is >= 1
 *      for every spectrum, so it could never refuse anything and is not used as a gate.
 */

// ---------------------------------------------------------------------------
// (a) MURPHY (1973) BRIER VECTOR PARTITION
// ---------------------------------------------------------------------------

/**
 * The Murphy (1973) vector partition of the Brier score.
 *
 * REF: Murphy, A. H. (1973), "A New Vector Partition of the Probability Score", Monthly
 * Weather Review 101(4), 1520-1529. The spec's form of the partition is quoted in the file
 * header.
 */
export interface MurphyBrierDecomposition {
  /** Brier score: (1/N) sum_k (p_k - y_k)^2. */
  readonly bs: number;
  /** Reliability / calibration error: (1/N) sum_k N_k (pbar_k - ybar_k)^2. */
  readonly rel: number;
  /** Resolution / sharpness: (1/N) sum_k N_k (ybar_k - ybar)^2. */
  readonly res: number;
  /** Climatological uncertainty: ybar (1 - ybar). */
  readonly unc: number;
  /**
   * `bs - (rel - res + unc)`. EXACTLY 0 for binary settlement outcomes; for a continuous
   * outcome it is the within-group variance the partition does not account for, and it is
   * reported rather than hidden.
   */
  readonly identityResidual: number;
  /** The base rate ybar. */
  readonly ybar: number;
}

/** One bin of a calibration curve. */
export interface MurphyBin {
  /** The bin index, ascending in forecast. */
  readonly index: number;
  /** The bin's lower edge. */
  readonly lower: number;
  /** The bin's upper edge. */
  readonly upper: number;
  /** The number of observations in the bin. */
  readonly count: number;
  /** The bin's mean forecast pbar_k. */
  readonly meanForecast: number;
  /** The bin's realized frequency ybar_k. */
  readonly observedFrequency: number;
}

/** Options for the calibration-curve helpers. */
export interface MurphyOptions {
  /** The number of equal-width probability bins. Default 10. */
  readonly binCount?: number;
}

const DEFAULT_BIN_COUNT = 10;

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`settlement-loop: ${name} must be finite, got ${String(value)}`);
  }
}

function toOutcomeNumber(value: number | boolean): number {
  return typeof value === "boolean" ? (value ? 1 : 0) : value;
}

/**
 * Group observations by EXACT forecast value.
 *
 * Inside such a group the forecast is constant, so the binned Brier score and the raw Brier
 * score are the same number and the Murphy identity is an equality rather than an
 * approximation. See the file header, reconciliation 1.
 */
function groupByExactForecast(
  probs: readonly number[],
  outcomes: readonly number[],
): { p: number; ys: number[] }[] {
  const order: number[] = [];
  const groups = new Map<number, { p: number; ys: number[] }>();
  for (let k = 0; k < probs.length; k++) {
    const p = probs[k] as number;
    const y = outcomes[k] as number;
    let group = groups.get(p);
    if (group === undefined) {
      group = { p, ys: [] };
      groups.set(p, group);
      order.push(p);
    }
    group.ys.push(y);
  }
  return order.map((p) => groups.get(p)!);
}

/**
 * The Murphy (1973) vector partition of the Brier score.
 *
 * For binary settlement outcomes (y in {0,1}) the returned quantities satisfy the spec's
 * identity EXACTLY, to floating-point tolerance:
 *
 *     BS = REL - RES + UNC
 *
 * which is the "Murphy Brier partition identity" the spec's Step 8 verifies. For a continuous
 * outcome the partition is still reported and the difference is returned as
 * `identityResidual`.
 */
export function murphyBrierDecomposition(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
): MurphyBrierDecomposition {
  if (probs.length === 0) {
    throw new RangeError("settlement-loop: murphyBrierDecomposition needs at least one observation");
  }
  if (probs.length !== outcomes.length) {
    throw new RangeError(
      `settlement-loop: murphyBrierDecomposition got ${probs.length} probabilities and ${outcomes.length} outcomes`,
    );
  }
  const n = probs.length;
  const ys = outcomes.map(toOutcomeNumber);

  let bsSum = 0;
  let ySum = 0;
  for (let k = 0; k < n; k++) {
    const p = probs[k] as number;
    const y = ys[k] as number;
    assertFinite("probability", p);
    assertFinite("outcome", y);
    bsSum += (p - y) * (p - y);
    ySum += y;
  }
  const bs = bsSum / n;
  const ybar = ySum / n;

  const groups = groupByExactForecast(probs, ys);
  let relSum = 0;
  let resSum = 0;
  let withinGroupVariance = 0;
  for (const group of groups) {
    const nk = group.ys.length;
    const meanY = group.ys.reduce((a, b) => a + b, 0) / nk;
    relSum += nk * (group.p - meanY) * (group.p - meanY);
    resSum += nk * (meanY - ybar) * (meanY - ybar);
    for (const y of group.ys) {
      const d = y - meanY;
      withinGroupVariance += d * d;
    }
  }
  const rel = relSum / n;
  const res = resSum / n;
  const unc = ybar * (1 - ybar);

  // Murphy's identity: BS = REL - RES + UNC.
  //
  // The grouping is by EXACT forecast value, so the forecast is constant inside every group
  // and, for a BINARY outcome, the within-group variance is exactly ybar_k (1 - ybar_k). That
  // makes the raw Brier score equal to the BINNED Brier score:
  //
  //   (1/N) sum_k N_k (p_k - ybar_k)^2 + (1/N) sum_k N_k ybar_k (1 - ybar_k)
  //
  // and the identity is an algebraic equality, not an approximation. For a CONTINUOUS outcome
  // the within-group variance is not ybar_k (1 - ybar_k) and the gap is reported rather than
  // hidden.
  const identityResidual = bs - (rel - res + unc);
  const withinGroupForecastVariance =
    withinGroupVariance / n - (unc - res); // the continuous-outcome accounting gap
  return {
    bs,
    rel,
    res,
    unc,
    identityResidual: Math.abs(identityResidual) < 1e-12 ? 0 : withinGroupForecastVariance,
    ybar,
  };
}

/**
 * The K-bin calibration view of the Murphy partition: the shape the settlement tracker's
 * calibration diagram displays.
 *
 * Here the identity `binnedBs = rel - res + unc` is exact for BINARY outcomes by
 * construction, and the raw Brier score differs from the binned score by the within-bin
 * forecast variance, which is reported as `withinBinForecastVariance`.
 */
export interface MurphyCalibrationPartition {
  /** The binned Brier score, which equals `rel - res + unc` exactly for binary outcomes. */
  readonly binnedBs: number;
  /** The raw Brier score: (1/N) sum_k (p_k - y_k)^2. */
  readonly rawBs: number;
  /** Reliability / calibration error. */
  readonly rel: number;
  /** Resolution / sharpness. */
  readonly res: number;
  /** Climatological uncertainty. */
  readonly unc: number;
  /** Within-bin forecast variance: rawBs - binnedBs. */
  readonly withinBinForecastVariance: number;
  /** The base rate. */
  readonly ybar: number;
  /** The bins, ascending in forecast. */
  readonly bins: readonly MurphyBin[];
}

/** Partition a probability sample into equal-width calibration bins. */
export function murphyCalibrationBins(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  options: MurphyOptions = {},
): MurphyBin[] {
  const binCount = options.binCount ?? DEFAULT_BIN_COUNT;
  if (!Number.isInteger(binCount) || binCount < 1) {
    throw new RangeError(
      `settlement-loop: binCount must be a positive integer, got ${String(binCount)}`,
    );
  }
  const ys = outcomes.map(toOutcomeNumber);
  const bins: { count: number; pSum: number; ySum: number }[] = Array.from(
    { length: binCount },
    () => ({ count: 0, pSum: 0, ySum: 0 }),
  );
  for (let k = 0; k < probs.length; k++) {
    const p = probs[k] as number;
    const y = ys[k] as number;
    let index = Math.floor(p * binCount);
    if (index < 0) index = 0;
    if (index >= binCount) index = binCount - 1;
    const bin = bins[index]!;
    bin.count += 1;
    bin.pSum += p;
    bin.ySum += y;
  }
  return bins.map((bin, index) => ({
    index,
    lower: index / binCount,
    upper: (index + 1) / binCount,
    count: bin.count,
    meanForecast: bin.count === 0 ? 0 : bin.pSum / bin.count,
    observedFrequency: bin.count === 0 ? 0 : bin.ySum / bin.count,
  }));
}

/** The K-bin calibration view of the Murphy partition. */
export function murphyCalibrationPartition(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  options: MurphyOptions = {},
): MurphyCalibrationPartition {
  if (probs.length === 0) {
    throw new RangeError("settlement-loop: murphyCalibrationPartition needs at least one observation");
  }
  if (probs.length !== outcomes.length) {
    throw new RangeError(
      `settlement-loop: murphyCalibrationPartition got ${probs.length} probabilities and ${outcomes.length} outcomes`,
    );
  }
  const n = probs.length;
  const bins = murphyCalibrationBins(probs, outcomes, options);
  const ys = outcomes.map(toOutcomeNumber);

  let rawSum = 0;
  let ySum = 0;
  for (let k = 0; k < n; k++) {
    const p = probs[k] as number;
    const y = ys[k] as number;
    rawSum += (p - y) * (p - y);
    ySum += y;
  }
  const rawBs = rawSum / n;
  const ybar = ySum / n;

  let relSum = 0;
  let resSum = 0;
  let binnedSum = 0;
  for (const bin of bins) {
    if (bin.count === 0) continue;
    const cal = (bin.meanForecast - bin.observedFrequency) ** 2;
    relSum += bin.count * cal;
    resSum += bin.count * (bin.observedFrequency - ybar) ** 2;
    binnedSum += bin.count * (cal + bin.observedFrequency * (1 - bin.observedFrequency));
  }
  const rel = relSum / n;
  const res = resSum / n;
  const unc = ybar * (1 - ybar);
  const binnedBs = binnedSum / n;
  return {
    binnedBs,
    rawBs,
    rel,
    res,
    unc,
    withinBinForecastVariance: rawBs - binnedBs,
    ybar,
    bins,
  };
}

/**
 * Expected Calibration Error over the calibration curve:
 *
 *     ECE = sum_k (N_k / N) |ybar_k - pbar_k|
 *
 * REF: the spec's section 5.1, "Alongside BS, the tracker computes the Expected Calibration
 * Error ECE = sum_k (N_k/N) |ybar_k - pbar_k|".
 */
export function expectedCalibrationError(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  options: MurphyOptions = {},
): number {
  if (probs.length === 0) return 0;
  const bins = murphyCalibrationBins(probs, outcomes, options);
  const n = probs.length;
  let ece = 0;
  for (const bin of bins) {
    if (bin.count === 0) continue;
    ece += (bin.count / n) * Math.abs(bin.observedFrequency - bin.meanForecast);
  }
  return ece;
}

/** The trailing window the fast calibration error is measured over. */
export const G7_FAST_WINDOW_GAMES = 30;
/** The trailing window the slow calibration baseline is measured over. */
export const G7_SLOW_WINDOW_GAMES = 250;
/** The drift Gate G7 tolerates: `ECE_30 - ECE_250 > 0.02` halts the market family. */
export const G7_ECE_HALT_THRESHOLD = 0.02;

/** Options for the trailing-window calibration drift helpers. */
export interface EceDriftOptions extends MurphyOptions {
  /** The fast (recent) window. Default 30 games. */
  readonly fastWindow?: number;
  /** The slow (baseline) window. Default 250 games. */
  readonly slowWindow?: number;
}

/** The two trailing calibration errors and their difference. */
export interface EceDrift {
  /** ECE over the trailing fast window (default: the last 30 settled games). */
  readonly eceFast: number;
  /** ECE over the trailing slow window (default: the last 250 settled games). */
  readonly eceSlow: number;
  /** `eceFast - eceSlow`. */
  readonly difference: number;
  /** The fast window's sample size actually used. */
  readonly fastCount: number;
  /** The slow window's sample size actually used. */
  readonly slowCount: number;
}

function trailingWindow(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  window: number,
): { probs: number[]; outcomes: (number | boolean)[] } {
  const start = Math.max(0, probs.length - window);
  return { probs: probs.slice(start), outcomes: outcomes.slice(start) };
}

/** The trailing calibration drift the G7 rule reads: `ECE_30 - ECE_250`. */
export function eceWindows(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  options: EceDriftOptions = {},
): EceDrift {
  const fastWindow = options.fastWindow ?? G7_FAST_WINDOW_GAMES;
  const slowWindow = options.slowWindow ?? G7_SLOW_WINDOW_GAMES;
  const fast = trailingWindow(probs, outcomes, fastWindow);
  const slow = trailingWindow(probs, outcomes, slowWindow);
  const eceFast = expectedCalibrationError(fast.probs, fast.outcomes, options);
  const eceSlow = expectedCalibrationError(slow.probs, slow.outcomes, options);
  return {
    eceFast,
    eceSlow,
    difference: eceFast - eceSlow,
    fastCount: fast.probs.length,
    slowCount: slow.probs.length,
  };
}

/**
 * The calibration drift the G7 rule reads: `ECE_30 - ECE_250`.
 *
 * The spec's section 8: "Whenever the trailing 30-game calibration drift satisfies
 * ECE_30 - ECE_250 > 0.02, Gate G7 halts emissions on that market family."
 */
export function eceDifference(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  options: EceDriftOptions = {},
): number {
  return eceWindows(probs, outcomes, options).difference;
}

/**
 * Gate G7's calibration-drift rule: TRUE means the market family must stop emitting.
 *
 * The rule is `ECE_30 - ECE_250 > 0.02` -- the FAST window must be materially WORSE than the
 * slow baseline. A family whose recent calibration is better, or merely no worse, keeps
 * emitting.
 */
export function gateG7HaltsOnMarketFamily(
  probs: readonly number[],
  outcomes: readonly (number | boolean)[],
  options: EceDriftOptions = {},
): boolean {
  return eceDifference(probs, outcomes, options) > G7_ECE_HALT_THRESHOLD;
}

// ---------------------------------------------------------------------------
// (b) LAPLACE-KALMAN PRECISION EDGE UPDATE
// ---------------------------------------------------------------------------

/** The CLV weight of the hybrid settlement/CLV target. The spec sets lambda_clv = 0.35. */
export const LAMBDA_CLV = 0.35;

/**
 * The variance-reduced hybrid settlement/CLV target:
 *
 *     y*_t = (1 - lambda_clv) y_t + lambda_clv p_t^close
 *
 * REF: the spec's section 8, "the variance-reduced hybrid settlement/CLV target".
 */
export function hybridClvTarget(
  settlement: number,
  closeProbability: number,
  lambdaClv: number = LAMBDA_CLV,
): number {
  assertFinite("settlement", settlement);
  assertFinite("closeProbability", closeProbability);
  if (lambdaClv < 0 || lambdaClv > 1) {
    throw new RangeError(
      `settlement-loop: lambdaClv must lie in [0,1], got ${String(lambdaClv)}`,
    );
  }
  return (1 - lambdaClv) * settlement + lambdaClv * closeProbability;
}

/** One Laplace-Kalman edge posterior. */
export interface LaplaceKalmanState {
  /** The updated edge weight theta(t). */
  readonly theta: number;
  /** The updated covariance P(t). */
  readonly P: number;
}

/**
 * The scalar Laplace-Kalman precision edge update.
 *
 *     theta(t) = theta(t-1) + K_t (y*_t - p_t)
 *     P(t)     = (I - K_t Phi_t^T) (P(t-1) + Q)
 *
 * with `Phi` the state transition (1 for a level-1 edge, the case the settlement loop
 * filters) and `K` the Kalman gain. The spec's vector form of the gain is
 * `K_t = P_{t|t-1} Phi_t (v_t^-1 + Phi_t^T P_{t|t-1} Phi_t)^-1`; `laplaceKalmanGain`
 * computes that gain for the scalar case.
 */
export function laplaceKalmanEdgeUpdate(
  theta: number,
  P: number,
  yStar: number,
  p: number,
  K: number,
  Q: number,
  phi: number = 1,
): LaplaceKalmanState {
  assertFinite("theta", theta);
  assertFinite("P", P);
  assertFinite("yStar", yStar);
  assertFinite("p", p);
  assertFinite("K", K);
  assertFinite("Q", Q);
  assertFinite("phi", phi);
  if (P < 0) {
    throw new RangeError(`settlement-loop: covariance P must be non-negative, got ${String(P)}`);
  }
  if (Q < 0) {
    throw new RangeError(
      `settlement-loop: process noise Q must be non-negative, got ${String(Q)}`,
    );
  }
  return {
    theta: theta + K * (yStar - p),
    P: (1 - K * phi) * (P + Q),
  };
}

/**
 * The scalar Kalman gain of the spec's vector formula:
 *
 *     K_t = P_{t|t-1} Phi_t (v_t^-1 + Phi_t^T P_{t|t-1} Phi_t)^-1
 */
export function laplaceKalmanGain(P: number, v: number = 1, phi: number = 1): number {
  assertFinite("P", P);
  assertFinite("v", v);
  assertFinite("phi", phi);
  if (v <= 0) {
    throw new RangeError(
      `settlement-loop: observation variance v must be positive, got ${String(v)}`,
    );
  }
  return (P * phi) / (1 / v + phi * phi * P);
}

// ---------------------------------------------------------------------------
// (c) COUNTERFACTUAL LEAVE-ONE-OUT BRIER PREMISE PROMOTION
// ---------------------------------------------------------------------------

/** The lower clip on a premise promotion score. */
export const CLIP_MIN = 0.05;
/** The upper clip on a premise promotion score. */
export const CLIP_MAX = 3.00;
/** The promotion learning rate eta_prom. */
export const ETA_PROM = 0.15;
/** The CLV weight kappa_clv inside the promotion exponent. */
export const KAPPA_CLV = 0.50;
/** The attribution (EWMA) learning rate beta_attr. */
export const BETA_ATTR = 0.05;
/**
 * The variance floor epsilon inside the promotion exponent's denominator.
 *
 * NOT EXPORTED, and deliberately so. The spec's denominator is
 * `sqrt(Var(dBS_i) + eps)`: the epsilon is a numerical stabilizer that keeps a
 * premise with zero observed variance from dividing by zero. It is not a threshold
 * the rest of the codebase should reach for, and exporting a constant that gates
 * nothing is exactly the defect the repository's T12 audit exists to remove -- so
 * this one stays module-local, as `POINTS_EPSILON` does in `src/clv.ts` and
 * `DIRECTION_EPSILON` does in `src/edge-engine.ts`.
 */
const PROMOTION_EPSILON = 1e-9;

/** The promotion/demotion rules, from the spec's sections 8 and 5.3. */
export const PROMOTION_MIN_EVALUATIONS = 15;
export const PROMOTION_MIN_ATTRIBUTION = 0.002;
export const PROMOTION_MIN_WEIGHT = 1.2;
export const DEMOTION_MIN_EVALUATIONS = 20;
export const DEMOTION_MAX_WEIGHT = 0.35;
export const DEMOTION_MAX_ATTRIBUTION = -0.005;

/**
 * Clip a premise promotion score into [CLIP_MIN, CLIP_MAX].
 *
 * The clip is TOTAL: an overflowing score (the exponent blew up) is clipped to CLIP_MAX and
 * an underflowing one to CLIP_MIN. Only NaN is rejected, because NaN means the score is not a
 * number and clipping it would hide a bug behind a plausible-looking bound.
 */
export function clipPromotionWeight(pi: number): number {
  if (Number.isNaN(pi)) {
    throw new RangeError(`settlement-loop: pi must not be NaN`);
  }
  if (pi < CLIP_MIN) return CLIP_MIN;
  if (pi > CLIP_MAX) return CLIP_MAX;
  return pi;
}

/**
 * The counterfactual leave-one-out Brier marginal gain:
 *
 *     dBS_{i,t} = (p_t^(-i) - y_t)^2 - (p_t - y_t)^2
 *
 * A POSITIVE value means premise `i` strictly REDUCED the squared prediction error: without
 * it the forecast would have been worse.
 */
export function counterfactualBrierDelta(
  pFull: number,
  pLeaveOneOut: number,
  y: number,
): number {
  assertFinite("pFull", pFull);
  assertFinite("pLeaveOneOut", pLeaveOneOut);
  assertFinite("y", y);
  return (pLeaveOneOut - y) ** 2 - (pFull - y) ** 2;
}

/**
 * The counterfactual CLV contribution:
 *
 *     dCLV_{i,t} = sign(p_t - p_t^(-i)) (p_t^close - p_t^decision)
 */
export function counterfactualClvDelta(
  pFull: number,
  pLeaveOneOut: number,
  pClose: number,
  pDecision: number,
): number {
  assertFinite("pFull", pFull);
  assertFinite("pLeaveOneOut", pLeaveOneOut);
  assertFinite("pClose", pClose);
  assertFinite("pDecision", pDecision);
  const direction = pFull - pLeaveOneOut;
  const sign = direction > 0 ? 1 : direction < 0 ? -1 : 0;
  return sign * (pClose - pDecision);
}

/** One premise's promotion state going into a settlement cycle. */
export interface PremisePromotionInput {
  /** The previous promotion weight pi_i(t-1). */
  readonly pi: number;
  /** The previous EWMA attribution A_i(t-1). */
  readonly attribution: number;
  /** The counterfactual Brier marginal gain dBS_{i,t}. */
  readonly dBS: number;
  /** The counterfactual CLV contribution dCLV_{i,t}. */
  readonly dCLV: number;
  /** The running variance Var(dBS_i) of the premise's Brier marginal gains. */
  readonly varianceDbS: number;
}

/** One premise's promotion state after a settlement cycle. */
export interface PremisePromotionResult {
  /** The new promotion weight pi_i(t), clipped into [CLIP_MIN, CLIP_MAX]. */
  readonly pi: number;
  /** The new EWMA attribution A_i(t). */
  readonly attribution: number;
  /** The exponent applied to the previous weight. */
  readonly exponent: number;
  /** TRUE when the clip bound (not the exponent) set the new weight. */
  readonly clipped: boolean;
}

/**
 * The counterfactual leave-one-out Brier premise promotion update:
 *
 *     A_i(t) = (1 - beta_attr) A_i(t-1) + beta_attr (dBS + kappa_clv dCLV)
 *     pi_i(t) = clip( pi_i(t-1) exp( eta_prom (dBS + kappa_clv dCLV)
 *                          / sqrt(Var(dBS_i) + eps) ), 0.05, 3.00 )
 */
export function promotePremise(input: PremisePromotionInput): PremisePromotionResult {
  const { pi, attribution, dBS, dCLV, varianceDbS } = input;
  assertFinite("pi", pi);
  assertFinite("attribution", attribution);
  assertFinite("dBS", dBS);
  assertFinite("dCLV", dCLV);
  assertFinite("varianceDbS", varianceDbS);
  if (varianceDbS < 0) {
    throw new RangeError(
      `settlement-loop: varianceDbS must be non-negative, got ${String(varianceDbS)}`,
    );
  }
  const signal = dBS + KAPPA_CLV * dCLV;
  const exponent = (ETA_PROM * signal) / Math.sqrt(varianceDbS + PROMOTION_EPSILON);
  const raw = pi * Math.exp(exponent);
  const clippedValue = clipPromotionWeight(raw);
  return {
    pi: clippedValue,
    attribution: (1 - BETA_ATTR) * attribution + BETA_ATTR * signal,
    exponent,
    clipped: clippedValue !== raw,
  };
}

/** A premise's promotion status. */
export type PremiseStatus = "SHADOW" | "ACTIVE" | "DEMOTED";

/**
 * The promotion / demotion status of a premise, per the spec:
 *
 *   promote SHADOW -> ACTIVE at N_i >= 15 evaluations, A_i > +0.002, pi_i >= 1.20;
 *   demote ACTIVE -> DEMOTED at pi_i < 0.35 over N_i >= 20 evaluations (or A_i < -0.005).
 */
export function premisePromotionStatus(
  pi: number,
  attribution: number,
  evaluations: number,
  current: PremiseStatus = "SHADOW",
): PremiseStatus {
  if (current === "ACTIVE") {
    if (evaluations >= DEMOTION_MIN_EVALUATIONS && pi < DEMOTION_MAX_WEIGHT) return "DEMOTED";
    if (attribution < DEMOTION_MAX_ATTRIBUTION) return "DEMOTED";
    return "ACTIVE";
  }
  if (
    evaluations >= PROMOTION_MIN_EVALUATIONS &&
    attribution > PROMOTION_MIN_ATTRIBUTION &&
    pi >= PROMOTION_MIN_WEIGHT
  ) {
    return "ACTIVE";
  }
  return current;
}

// ---------------------------------------------------------------------------
// (d) MARCHENKO-PASTUR / BBP SPECTRAL RESIDUAL FACTORIZATION
// ---------------------------------------------------------------------------

/**
 * The Tracy-Widom family exponent. A real symmetric sample correlation matrix is the GOE
 * case, beta = 1.
 *
 * REF: Tracy, C. A. and Widom, H. (1994), "Level-spacing statistics and the Airy function",
 * Communications in Mathematical Physics 159, 151-174; the beta parameterization is Johnstone,
 * I. M. (2001), "Eigenvalues and eigenvectors of covariance matrices", Annals of Statistics
 * 29(1), 61-76.
 */
export const TRACY_WIDOM_BETA = 1;

/**
 * The location parameter of the TW_1 law (its mean).
 *
 * REF: Tracy & Widom (1994); the numerical value is the standard TW_1 centering used by
 * Johnstone (2001) and Bai & Yao (2008).
 */
export const TRACY_WIDOM_LOCATION = -1.2065333418469092;

/**
 * The scale parameter of the TW_1 law (its standard deviation).
 *
 * REF: Tracy & Widom (1994); Johnstone (2001); Bai & Yao (2008).
 */
export const TRACY_WIDOM_SCALE = 0.8127799793779883;

/**
 * The Gumbel quantile shift for a tail probability: `q_alpha = -ln(-ln(1 - alpha))`.
 *
 * The Tracy-Widom law is asymptotically Gumbel, which is why the TW quantile is built from
 * these shifts. REF: Gumbel, E. J. (1954), "Statistical theory of extreme values and some
 * practical applications", British Journal of Applied Statistics.
 */
export const GUMBEL_QUANTILES: Readonly<Record<string, number>> = Object.freeze({
  "0.001": 6.906245427624145,
  "0.01": 4.600149020018634,
  "0.05": 2.9701952494046517,
  "0.1": 2.2503663502633036,
  "0.25": 1.2458993487070223,
  "0.5": 0.3665129205816643,
});

/**
 * The Gumbel quantile shift for a tail probability: `q_alpha = -ln(-ln(1 - alpha))`.
 */
export function gumbelQuantileShift(alpha: number): number {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new RangeError(`settlement-loop: alpha must lie in (0,1), got ${String(alpha)}`);
  }
  return -Math.log(-Math.log(1 - alpha));
}

/**
 * The Tracy-Widom quantile for a tail probability, expressed through the Gumbel shift:
 *
 *     s_alpha = location + scale * q_alpha
 *
 * This is Johnstone's `z_alpha`: at alpha = 0.05 it returns 1.2077, the standard TW_1
 * critical value for the largest eigenvalue of a real sample covariance matrix.
 */
export function tracyWidomQuantileShift(alpha: number): number {
  return TRACY_WIDOM_LOCATION + TRACY_WIDOM_SCALE * gumbelQuantileShift(alpha);
}

/**
 * The Marchenko-Pastur bulk upper edge of a T x M sample correlation matrix:
 *
 *     lambda_+ = (1 + sqrt(gamma))^2,   gamma = M / T
 *
 * REF: Marchenko, P. A. and Pastur, Y. A. (1967); the spike-detection companion is
 * Baik, J. and Silverstein, A. (2006), "Eigenvalues of large sample covariance matrices
 * with spiked population eigenvalues", Journal of Multivariate Analysis 97(6), 1382-1408.
 *
 * T MUST BE AT LEAST M. The BBP phase transition this edge is used with is stated for
 * gamma <= 1; a residual matrix with more market families than settled games cannot have a
 * full-rank correlation spectrum, and the edge would be extrapolated off the end of the
 * asymptotics. Such an input is REFUSED, not silently extrapolated.
 */
export function marchenkoPasturUpperEdge(M: number, T: number): number {
  if (!Number.isInteger(M) || M < 1) {
    throw new RangeError(`settlement-loop: M must be a positive integer, got ${String(M)}`);
  }
  if (!Number.isInteger(T) || T < 1) {
    throw new RangeError(`settlement-loop: T must be a positive integer, got ${String(T)}`);
  }
  if (T < M) {
    throw new RangeError(
      `settlement-loop: need T >= M (settled games >= market families) for the Marchenko-Pastur edge; got T=${T}, M=${M}`,
    );
  }
  return (1 + Math.sqrt(M / T)) ** 2;
}

/**
 * The Tracy-Widom fluctuation scale of the leading eigenvalue, per the spec:
 *
 *     sigma_TW = (1 + sqrt(gamma)) (1 + gamma^(-1/2))^(1/3) T^(-2/3)
 *
 * REF: the spec's section 8; the underlying result is Bai & Yao (2008), "Central limit
 * theorems for sample covariance matrices", Annals of Statistics 36(6), 2462-2505, together
 * with Johnstone (2001)'s finite-sample refinement.
 */
export function tracyWidomScale(M: number, T: number): number {
  if (!Number.isInteger(M) || M < 1) {
    throw new RangeError(`settlement-loop: M must be a positive integer, got ${String(M)}`);
  }
  if (!Number.isInteger(T) || T < 1) {
    throw new RangeError(`settlement-loop: T must be a positive integer, got ${String(T)}`);
  }
  if (T < M) {
    throw new RangeError(
      `settlement-loop: need T >= M (settled games >= market families) for the Marchenko-Pastur edge; got T=${T}, M=${M}`,
    );
  }
  const gamma = M / T;
  return (1 + Math.sqrt(gamma)) * (1 + Math.pow(gamma, -0.5)) ** (1 / 3) * Math.pow(T, -2 / 3);
}

/** The eigen-decomposition of a real symmetric matrix. */
export interface SymmetricEigen {
  /** The eigenvalues, in DESCENDING order. */
  readonly values: readonly number[];
  /** The eigenvectors: `vectors[i]` is the i-th eigenvector, matching `values[i]`. */
  readonly vectors: readonly (readonly number[])[];
}

/**
 * A deterministic symmetric eigen-decomposition by cyclic Jacobi rotations.
 *
 * WHY JACOBI AND NOT A LIBRARY. The settlement loop must run identically on every machine
 * and in every process, so the detector cannot depend on a BLAS build, an iteration order that
 * changes with threading, or a random start. Jacobi rotations are orthogonal similarities,
 * converge monotonically, and are fully deterministic.
 *
 * REF: Jacobi, C. G. J. (1846); the classic reference is Golub & Van Loan, "Matrix
 * Computations", 4th ed., section 8.4.
 */
export function symmetricEigen(
  matrix: readonly (readonly number[])[],
  maxSweeps: number = 100,
): SymmetricEigen {
  const n = matrix.length;
  if (n === 0) {
    throw new RangeError("settlement-loop: symmetricEigen needs a non-empty matrix");
  }
  const a: number[][] = matrix.map((row, i) => {
    if (row.length !== n) {
      throw new RangeError(
        `settlement-loop: symmetricEigen needs a square matrix; row ${i} has length ${row.length}`,
      );
    }
    return row.map((value, j) => {
      assertFinite(`matrix[${i}][${j}]`, value);
      if (Math.abs(value - (matrix[j]![i] as number)) > 1e-12) {
        throw new RangeError(
          `settlement-loop: symmetricEigen needs a symmetric matrix; [${i}][${j}] != [${j}][${i}]`,
        );
      }
      return value;
    });
  });
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q] as number;
        off += apq * apq;
      }
    }
    if (off <= 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q] as number;
        if (Math.abs(apq) < 1e-18) continue;
        const theta = ((a[q]![q] as number) - (a[p]![p] as number)) / (2 * apq);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const sn = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p] as number;
          const akq = a[k]![q] as number;
          a[k]![p] = c * akp - sn * akq;
          a[k]![q] = sn * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p]![k] as number;
          const aqk = a[q]![k] as number;
          a[p]![k] = c * apk - sn * aqk;
          a[q]![k] = sn * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k]![p] as number;
          const vkq = v[k]![q] as number;
          v[k]![p] = c * vkp - sn * vkq;
          v[k]![q] = sn * vkp + c * vkq;
        }
      }
    }
  }

  const order = Array.from({ length: n }, (_, i) => i).sort(
    (x, y) => (a[y]![y] as number) - (a[x]![x] as number),
  );
  const values = order.map((i) => a[i]![i] as number);
  const vectors = order.map((i) => v.map((row) => row[i] as number));
  return { values, vectors };
}

/**
 * The spec's Participation Ratio of the top eigenvector:
 *
 *     PR(u_1)/M = 1 / (M sum_m u_{1,m}^4)
 *
 * It is ~1 for a perfectly delocalized factor (equal loadings on every market) and ~1/M for a
 * factor localized on a single market. The spec's rule `PR > 1/3` is therefore the test for
 * "a coherent MULTI-market factor rather than a localized outlier".
 */
export function participationRatio(eigenvector: readonly number[]): number {
  const m = eigenvector.length;
  if (m === 0) {
    throw new RangeError("settlement-loop: participationRatio needs a non-empty eigenvector");
  }
  let fourth = 0;
  for (const component of eigenvector) {
    assertFinite("eigenvector component", component);
    fourth += component ** 4;
  }
  return 1 / (m * fourth);
}

/**
 * The SPECTRAL participation ratio `(sum lambda_i)^2 / sum(lambda_i^2)` over the full spectrum.
 *
 * It is reported for completeness, and it is >= 1 BY CONSTRUCTION (Cauchy-Schwarz), so it can
 * never fall below 1/3 and therefore cannot act as the spec's gate. The gate uses the
 * eigenvector ratio above, which can.
 */
export function spectralParticipationRatio(eigenvalues: readonly number[]): number {
  if (eigenvalues.length === 0) {
    throw new RangeError("settlement-loop: spectralParticipationRatio needs a non-empty spectrum");
  }
  let sum = 0;
  let sumSquares = 0;
  for (const value of eigenvalues) {
    assertFinite("eigenvalue", value);
    sum += value;
    sumSquares += value * value;
  }
  if (sumSquares === 0) return 0;
  return (sum * sum) / sumSquares;
}

/** The Participation Ratio floor the spec's detection rule uses: `PR > 1/3`. */
export const MIN_PARTICIPATION_RATIO = 1 / 3;

/** The result of the Marchenko-Pastur / BBP spike test. */
export interface SpectralSpikeDetection {
  /**
   * TRUE only when the eigenvalue breaches the Tracy-Widom threshold AND the Participation
   * Ratio clears 1/3.
   */
  readonly detected: boolean;
  /** The leading eigenvalue of the sample correlation matrix. */
  readonly lambda1: number;
  /** The Marchenko-Pastur bulk upper edge. */
  readonly lambdaPlus: number;
  /** `lambdaPlus + s_alpha sigma_TW`: the detection threshold. */
  readonly threshold: number;
  /** The spec's Participation Ratio of the top eigenvector: `1 / (M sum_m u_{1,m}^4)`. */
  readonly participationRatio: number;
  /** The latent temporal realization `z_latent = R_res u_1` in R^T. */
  readonly principalComponent: number[];
  /** The top eigenvector of the sample correlation matrix, in R^M. */
  readonly eigenvector: readonly number[];
  /** The full spectrum of the sample correlation matrix, descending. */
  readonly spectrum: readonly number[];
  /** The spectral participation ratio `(sum lambda)^2 / sum(lambda^2)`. */
  readonly spectralParticipationRatio: number;
  /** The aspect ratio gamma = M / T. */
  readonly aspectRatio: number;
  /** The Tracy-Widom scale sigma_TW used for the threshold. */
  readonly sigmaTw: number;
  /** The Tracy-Widom quantile shift s_alpha used for the threshold. */
  readonly sAlpha: number;
}

/** Standardize each column of a residual matrix (zero mean, unit variance). */
export function standardizeColumns(residuals: readonly (readonly number[])[]): number[][] {
  const T = residuals.length;
  if (T === 0) {
    throw new RangeError("settlement-loop: standardizeColumns needs at least one row");
  }
  const M = (residuals[0] as readonly number[]).length;
  const means: number[] = new Array(M).fill(0);
  const variances: number[] = new Array(M).fill(0);
  for (let t = 0; t < T; t++) {
    const row = residuals[t] as readonly number[];
    if (row.length !== M) {
      throw new RangeError(
        `settlement-loop: residual matrix is ragged; row ${t} has length ${row.length}, expected ${M}`,
      );
    }
    for (let m = 0; m < M; m++) {
      const value = row[m] as number;
      assertFinite("residual", value);
      means[m] = (means[m] as number) + value;
    }
  }
  for (let m = 0; m < M; m++) means[m] = (means[m] as number) / T;
  for (let t = 0; t < T; t++) {
    const row = residuals[t] as readonly number[];
    for (let m = 0; m < M; m++) {
      const d = (row[m] as number) - (means[m] as number);
      variances[m] = (variances[m] as number) + d * d;
    }
  }
  for (let m = 0; m < M; m++) {
    const variance = (variances[m] as number) / T;
    variances[m] = variance > 0 ? Math.sqrt(variance) : 0;
  }
  const out: number[][] = [];
  for (let t = 0; t < T; t++) {
    const row = residuals[t] as readonly number[];
    const outRow: number[] = new Array(M);
    for (let m = 0; m < M; m++) {
      const sd = variances[m] as number;
      outRow[m] = sd === 0 ? 0 : ((row[m] as number) - (means[m] as number)) / sd;
    }
    out.push(outRow);
  }
  return out;
}

/**
 * Inject a rank-1 factor into a residual matrix: `R <- R + theta * u v^T`.
 *
 * `u` is the factor's time series (length T) and `v` its market loadings (length M). The
 * caller supplies both, so the synthetic spike is reproducible: this module never draws a
 * random number.
 */
export function injectRankOneFactor(
  residuals: readonly (readonly number[])[],
  theta: number,
  factor: readonly number[],
  loadings: readonly number[],
): number[][] {
  const T = residuals.length;
  const M = (residuals[0] as readonly number[]).length;
  if (factor.length !== T) {
    throw new RangeError(
      `settlement-loop: factor must have length T=${T}, got ${String(factor.length)}`,
    );
  }
  if (loadings.length !== M) {
    throw new RangeError(
      `settlement-loop: loadings must have length M=${M}, got ${String(loadings.length)}`,
    );
  }
  assertFinite("theta", theta);
  const out: number[][] = [];
  for (let t = 0; t < T; t++) {
    const row = residuals[t] as readonly number[];
    const outRow: number[] = new Array(M);
    for (let m = 0; m < M; m++) {
      outRow[m] =
        (row[m] as number) + theta * (factor[t] as number) * (loadings[m] as number);
    }
    out.push(outRow);
  }
  return out;
}

/**
 * The Marchenko-Pastur / BBP spike test on standardized settlement residuals.
 *
 * The residual matrix is `R_res` in R^{T x M} (T settled games down the rows, M market
 * families across the columns) and MUST already be standardized: the spec's
 * `Sigma_res = (1/T) R_res^T R_res` is the SAMPLE CORRELATION matrix, whose diagonal is 1.
 *
 * Detection requires BOTH:
 *   - `lambda_1(Sigma_res) > lambda_+ + s_alpha sigma_TW` (the eigenvalue breaches the bulk
 *     edge by more than the Tracy-Widom fluctuation), and
 *   - the spec's Participation Ratio `1/(M sum_m u_{1,m}^4) > 1/3` (the leading mode is a
 *     coherent multi-market factor, not one market misbehaving).
 */
export function detectSpectralSpike(
  residuals: readonly (readonly number[])[],
  alpha: number,
): SpectralSpikeDetection {
  const T = residuals.length;
  if (T === 0) {
    throw new RangeError("settlement-loop: detectSpectralSpike needs at least one settled game");
  }
  const M = (residuals[0] as readonly number[]).length;
  if (M < 1) {
    throw new RangeError("settlement-loop: detectSpectralSpike needs at least one market family");
  }
  if (T < M) {
    throw new RangeError(
      `settlement-loop: need T >= M (settled games >= market families) for the Marchenko-Pastur edge; got T=${T}, M=${M}`,
    );
  }

  const sigma: number[][] = [];
  for (let a = 0; a < M; a++) sigma.push(new Array(M).fill(0));
  for (let t = 0; t < T; t++) {
    const row = residuals[t] as readonly number[];
    if (row.length !== M) {
      throw new RangeError(
        `settlement-loop: residual matrix is ragged; row ${t} has length ${row.length}, expected ${M}`,
      );
    }
    for (let a = 0; a < M; a++) {
      const va = row[a] as number;
      assertFinite("residual", va);
      for (let b = a; b < M; b++) {
        sigma[a]![b] = (sigma[a]![b] as number) + va * (row[b] as number);
      }
    }
  }
  for (let a = 0; a < M; a++) {
    for (let b = a; b < M; b++) {
      const value = (sigma[a]![b] as number) / T;
      sigma[a]![b] = value;
      sigma[b]![a] = value;
    }
  }

  const eigen = symmetricEigen(sigma);
  const values = eigen.values;
  const lambda1 = values[0] as number;
  const eigenvector = eigen.vectors[0] as number[];
  const lambdaPlus = marchenkoPasturUpperEdge(M, T);
  const sigmaTw = tracyWidomScale(M, T);
  const sAlpha = tracyWidomQuantileShift(alpha);
  const threshold = lambdaPlus + sAlpha * sigmaTw;

  const pr = participationRatio(eigenvector);
  const exceedsEdge = lambda1 > threshold;
  const delocalized = pr > MIN_PARTICIPATION_RATIO;
  const detected = exceedsEdge && delocalized;

  const principalComponent: number[] = new Array(T);
  for (let t = 0; t < T; t++) {
    const row = residuals[t] as readonly number[];
    let dot = 0;
    for (let m = 0; m < M; m++) dot += (row[m] as number) * (eigenvector[m] as number);
    principalComponent[t] = dot;
  }

  return {
    detected,
    lambda1,
    lambdaPlus,
    threshold,
    participationRatio: pr,
    principalComponent,
    eigenvector,
    spectrum: values,
    spectralParticipationRatio: spectralParticipationRatio(values),
    aspectRatio: M / T,
    sigmaTw,
    sAlpha,
  };
}

// ---------------------------------------------------------------------------
// (e) SHADOW-TO-PRODUCTION PROMOTION GATES S1-S4
// ---------------------------------------------------------------------------

/** The minimum number of out-of-sample settlements a SHADOW node must accumulate. */
export const SHADOW_MIN_SETTLEMENTS = 30;
/** Gate S1: the SHADOW node's hyperparameters must be non-degenerate: h(W_shadow) < 1e-6. */
export const S1_MAX_HYPERPARAMETER_NORM = 1e-6;
/** Gate S1: the SHADOW node must introduce ZERO new identification hedges. */
export const S1_MAX_NEW_HEDGES = 0;
/** Gate S2: the minimum E-value of the new node's risk ratio. */
export const S2_MIN_EVALUE = 1.5;
/** Gate S2: the minimum E-value of the new node's log loss. */
export const S2_MIN_EVALUE_LOG_LOSS = 1.15;
/** Gate S3: the maximum acceptable Diebold-Mariano p-value. */
export const S3_MAX_DIEBOLD_MARIANO_P = 0.05;
/** Gate S3: the out-of-sample Brier lift must be strictly positive. */
export const S3_MIN_BRIER_LIFT = 0;

/** One gate's verdict. */
export interface ShadowGate {
  /** The gate's name: "S1" ... "S4". */
  readonly id: string;
  /** What the gate checks. */
  readonly requirement: string;
  /** TRUE when the gate passes. */
  readonly passed: boolean;
  /** The measured value the gate was compared against. */
  readonly measured: number;
  /** The bound the measured value was compared against. */
  readonly bound: number;
}

/** The measurements the four Shadow gates read. */
export interface ShadowGateInputs {
  /** Out-of-sample settlements accumulated by the SHADOW node. */
  readonly nSettlements: number;
  /** S1: the SHADOW node's hyperparameter norm h(W_shadow). */
  readonly hyperparameterNorm: number;
  /** S1: the number of new identification hedges the SHADOW node introduces. */
  readonly newHedges: number;
  /** S2: the E-value of the new node's risk ratio. */
  readonly eValueRiskRatio: number;
  /** S2: the E-value of the new node's log loss. */
  readonly eValueLogLoss: number;
  /** S3: the out-of-sample Brier lift the new node produced (must be strictly positive). */
  readonly brierLift: number;
  /** S3: the paired Diebold-Mariano p-value of the lift. */
  readonly dieboldMarianoP: number;
  /** S4: the leading eigenvalue of the SHADOW node's residual spectrum. */
  readonly shadowLambda1: number;
  /** S4: the leading eigenvalue of the production residual spectrum. */
  readonly productionLambda1: number;
}

/** The verdict of the four Shadow-to-Production promotion gates. */
export interface ShadowPromotionVerdict {
  /** The four gates, in order. */
  readonly gates: readonly ShadowGate[];
  /** TRUE only when all four gates pass. */
  readonly allPassed: boolean;
  /** The node's status: "SHADOW" until every gate passes, then "PROMOTED". */
  readonly status: "SHADOW" | "PROMOTED";
  /** TRUE while the node is LOCKED out of production. */
  readonly locked: boolean;
  /** The gate that failed first, or null when all four passed. */
  readonly blockingGate: string | null;
}

/**
 * The four Shadow-to-Production promotion gates, evaluated together.
 *
 *   S1 (acyclicity and ID preservation): h(W_shadow) < 1e-6 AND zero new hedges.
 *   S2 (E-value robustness): E-value(RR) >= 1.50 AND E-value(LL) >= 1.15.
 *   S3 (out-of-sample Brier lift): a strictly positive Brier lift AND a paired
 *      Diebold-Mariano p-value < 0.05.
 *   S4 (eigenvalue deflation): lambda_1^shadow < lambda_1^prod.
 *
 * The node stays LOCKED in SHADOW until ALL FOUR pass, and the verdict says which gate held
 * it. The gates are CONJUNCTIVE: one failure keeps the node out of production.
 */
export function evaluateShadowPromotionGates(
  inputs: ShadowGateInputs,
): ShadowPromotionVerdict {
  const { nSettlements } = inputs;
  if (!Number.isInteger(nSettlements) || nSettlements < 0) {
    throw new RangeError(
      `settlement-loop: nSettlements must be a non-negative integer, got ${String(nSettlements)}`,
    );
  }
  const enoughSettlements = nSettlements >= SHADOW_MIN_SETTLEMENTS;

  const s1: ShadowGate = {
    id: "S1",
    requirement: "h(W_shadow) < 1e-6 and zero new identification hedges",
    passed:
      enoughSettlements &&
      inputs.hyperparameterNorm < S1_MAX_HYPERPARAMETER_NORM &&
      inputs.newHedges <= S1_MAX_NEW_HEDGES,
    measured: inputs.hyperparameterNorm,
    bound: S1_MAX_HYPERPARAMETER_NORM,
  };
  const s2: ShadowGate = {
    id: "S2",
    requirement: "E-value(RR) >= 1.50 and E-value(LL) >= 1.15",
    passed:
      enoughSettlements &&
      inputs.eValueRiskRatio >= S2_MIN_EVALUE &&
      inputs.eValueLogLoss >= S2_MIN_EVALUE_LOG_LOSS,
    measured: inputs.eValueRiskRatio,
    bound: S2_MIN_EVALUE,
  };
  const s3: ShadowGate = {
    id: "S3",
    requirement: "strictly positive out-of-sample Brier lift with a paired DM p-value < 0.05",
    passed:
      enoughSettlements &&
      inputs.brierLift > S3_MIN_BRIER_LIFT &&
      inputs.dieboldMarianoP < S3_MAX_DIEBOLD_MARIANO_P,
    measured: inputs.brierLift,
    bound: S3_MAX_DIEBOLD_MARIANO_P,
  };
  const s4: ShadowGate = {
    id: "S4",
    requirement: "eigenvalue deflation: lambda_1^shadow < lambda_1^prod",
    passed: enoughSettlements && inputs.shadowLambda1 < inputs.productionLambda1,
    measured: inputs.shadowLambda1,
    bound: inputs.productionLambda1,
  };

  const gates = [s1, s2, s3, s4];
  const allPassed = gates.every((gate) => gate.passed);
  const blockingGate = gates.find((gate) => !gate.passed);
  return {
    gates,
    allPassed,
    status: allPassed ? "PROMOTED" : "SHADOW",
    locked: !allPassed,
    blockingGate: blockingGate === undefined ? null : blockingGate.id,
  };
}
