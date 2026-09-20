/**
 * Steam detection by trajectory curvature, in two modes that must never be
 * confused: a CAUSAL filter for live use, and a RETROSPECTIVE smoother for
 * backtesting.
 *
 * WHAT STEAM IS, AND WHY GEOMETRY BEATS A FITTED INTENSITY HERE.
 * A steam move is clustered informed money: the line jumps, then the market
 * maker absorbs the liquidity and the movement stalls. The classical tool is a
 * Hawkes self-exciting point process, and it is the wrong tool at our horizon.
 * Fitting a self-exciting intensity needs a long, roughly stationary history;
 * odds_line_snapshots here holds 684,498 rows covering 2026-08-19 to
 * 2026-08-22 and then nothing until the Prisma filter-shape bug was fixed on
 * 2026-09-13 (AGENTS.md, measured). Fit a Hawkes model to a few days and it
 * learns the noise, then fires on it. Curvature needs no fitted history: a
 * steam move has a shape, readable from one game's own series.
 *
 * THE LEAKAGE TRAP, WHICH IS THE WHOLE REASON THIS MODULE HAS TWO MODES.
 * The source blueprint specifies a Rauch-Tung-Striebel smoother before
 * differentiating. RTS is a SMOOTHER, not a filter: its backward pass computes
 * the estimate at time t using observations AFTER t. That is exactly right for
 * labelling history and catastrophically wrong for firing a live alert, where
 * the future line does not exist yet and, in a backtest, would be the answer.
 * A detector that reads the future will look superb in evaluation and fire on
 * nothing in production.
 *
 * So the smoother is kept for what it is good at, the causal filter is provided
 * for live use, and `mode` is a REQUIRED option with no default. There is no
 * setting a caller can forget that silently leaks. Every result carries the
 * mode it was produced under, so a downstream consumer can check rather than
 * assume.
 *
 * Credit where due: this correction came from the grok agent's adversarial
 * review of the blueprint on 2026-09-18, which flagged "forward-backward
 * smoother uses the future line" against an earlier draft of this file that
 * exposed only the smoother.
 *
 * DEVIATION FROM THE SOURCE, STATED PLAINLY. The blueprint specifies a cubic
 * B-spline fed by the smoother. This reads curvature from a
 * constant-acceleration state directly, with no spline stage, because (1) a
 * spline library would be a new dependency and this repo does not install
 * packages (AGENTS.md law 7), and (2) the blueprint's own stated reason for the
 * spline is to obtain a twice-differentiable representation before
 * differentiating twice, and a constant-acceleration state already yields
 * smoothed position, velocity AND acceleration at every observation. Fitting a
 * spline to an already-smoothed series would add a second smoothing stage and a
 * second set of knots to justify. If someone later wants the spline, the state
 * output is the right input to it and these tests transfer unchanged.
 *
 * UNITS. Curvature of a graph depends on the scale of both axes, so a
 * raw-unit curvature is not comparable between a probability series and an
 * American-odds series, nor between a 1-minute and a 10-second sampling rate.
 * The series is therefore normalised before filtering - time by the median
 * sampling interval, price by a robust estimate of its own measurement noise -
 * and curvature is reported in those normalised units, which ARE comparable.
 * position, velocity and acceleration come back in the caller's units, because
 * those are the numbers a human reads.
 *
 * MEASURED 2026-09-18, AND IT CORRECTS THE SOURCE METHOD. The blueprint says
 * to detect on "an extreme global maximum in the curvature tensor". Implemented
 * and measured on a synthetic steam shape (flat at 0.500, a jump to 0.560 over
 * indices 8-10, then flat), curvature points at the WRONG PLACE:
 *
 *   causal filter: argmax |acceleration| = index 9   (the jump: correct)
 *                  argmax curvature      = index 17  (the flat tail: wrong)
 *
 * The reason is structural, not a tuning artefact. Curvature of a graph is
 * |p''| / (1 + p'^2)^{3/2}. A steam move is precisely the segment where |p'| is
 * large, so the denominator suppresses it, while the flat tail where p' -> 0
 * has denominator -> 1 and any residual acceleration reads as high curvature.
 * Curvature is the right invariant for a path through space, where it measures
 * turning per unit arc length. A price-versus-time graph is not that: its two
 * axes have unrelated units, so "turning" has no physical meaning and the
 * statistic mostly reports slope. This module therefore DETECTS on normalised
 * |acceleration| and reports curvature alongside as a diagnostic, with
 * maxCurvatureIndex in every result so the divergence stays visible.
 *
 * THE LEAKAGE, ALSO MEASURED, ON THE SAME SERIES. Normalised |velocity| at
 * indices 6 and 7 - two samples BEFORE the jump begins - reads 0.3 and 0.1
 * under the causal filter and 5.3 and 5.6 under the retrospective smoother.
 * The smoother already "knows" about a move that has not happened. That is the
 * leakage argued in the abstract above, as a number.
 *
 * NOT VALIDATED, AND THIS IS THE HONEST STATE OF THE DETECTOR. The trajectory
 * estimators below are verified: they are unit-free, the causal one provably
 * uses no future sample, and their behaviour on synthetic paths is pinned by
 * tests. The DETECTION RULE on top of them is not. Turning the statistics into
 * a yes/no verdict needs two thresholds, a deceleration window and a ratio, and
 * picking them requires labelled real steam events to fit against. This repo
 * cannot supply those yet: odds_line_snapshots covers four days, and a
 * threshold fitted to one synthetic path is not a detector, it is a curve fit
 * with one point.
 *
 * So `decelerationWindow` and `decelerationRatio` are REQUIRED options with no
 * defaults, exactly like `mode`. A default here would be an invented number
 * wearing the authority of a library default, and the caller would have no way
 * to know it had never been measured. What unblocks this is labelled history
 * from the repaired archive, not more tuning.
 *
 * Measured while trying: on the synthetic path described above, peak braking
 * under a stiff filter lands in the settling tail rather than at the jump,
 * because a lagging estimator spreads the velocity decay over many samples.
 * That is a property of the estimator and the sampling rate, not of the market,
 * and it is precisely why the thresholds need real labels.
 *
 * SCOPE. Pure functions over numbers. No database read, no write, no gate, no
 * alert. It reports a shape; what anyone does with that is a separate decision
 * on a separate surface.
 */

/** Which estimator produced a result. Required, because the wrong one leaks. */
export type TrajectoryMode =
  /** Forward Kalman filter only. Uses no observation after t. Safe for live use. */
  | "causal"
  /** RTS forward-backward smoother. Reads the future. Backtesting and labelling ONLY. */
  | "retrospective";

export interface OddsSample {
  /** Observation time. Must be strictly increasing across the series. */
  readonly atMs: number;
  /** The price tracked, in ANY consistent unit (implied prob, decimal, American). */
  readonly price: number;
}

export interface TrajectoryPoint {
  readonly atMs: number;
  readonly observed: number;
  readonly position: number;
  /** First derivative, price units per second. */
  readonly velocity: number;
  /** Second derivative, price units per second squared. */
  readonly acceleration: number;
  /** |acceleration| in normalised units. */
  readonly accelerationNormalised: number;
  /**
   * Braking in normalised units: acceleration projected AGAINST the direction
   * of travel, i.e. -a*sign(v). Positive means the line is slowing. THIS is the
   * detection statistic; see the header for why neither curvature nor raw
   * |acceleration| is.
   */
  readonly brakingNormalised: number;
  /**
   * Curvature of the (t, price) graph in normalised units. Reported as a
   * diagnostic for fidelity to the source method, NOT used to detect.
   */
  readonly curvature: number;
}

export interface TrajectoryOptions {
  /**
   * Smoothness, dimensionless, > 0. This is the ONLY tuning knob and it means
   * the same thing in every price unit, because the series is normalised
   * internally before filtering (see `estimateScales`). Smaller is smoother.
   * 1 tracks the observations closely; the default is deliberately stiff.
   *
   * An earlier draft exposed raw measurementNoise / processNoise variances with
   * fixed defaults and a comment claiming they "suit implied-probability
   * series". That claim was never measured and was wrong: the defaults let the
   * filter report accelerations LARGER than raw second differences on a jittery
   * probability series, i.e. it amplified exactly the noise it exists to
   * suppress. A variance default cannot be unit-free; a dimensionless knob over
   * normalised data can.
   */
  readonly smoothness?: number;
}

export interface SteamDetectorOptions extends TrajectoryOptions {
  /** REQUIRED. No default: a forgotten mode would silently read the future. */
  readonly mode: TrajectoryMode;
  /** Samples on each side of the peak used to compare speed before vs after. */
  readonly decelerationWindow: number;
  /**
   * REQUIRED, with no default, because no validated default exists. Speed after
   * the peak must fall to at most this fraction of peak speed at or before it.
   * See "NOT VALIDATED" in the header: choosing this number needs labelled real
   * steam events, and the line archive cannot yet supply them.
   */
  readonly decelerationRatio: number;
  /** Minimum samples required before any verdict is possible. */
  readonly minSamples?: number;
}

export interface SteamDetection {
  /** True only when BOTH the curvature peak and the deceleration test pass. */
  readonly detected: boolean;
  /** Which estimator produced this. A consumer can check rather than assume. */
  readonly mode: TrajectoryMode;
  /** Index of the global curvature maximum, or -1 when the series never moves. */
  /** Index of peak braking: the detection statistic. */
  readonly peakIndex: number;
  readonly peakAtMs: number | null;
  /** Peak braking: the detection statistic. */
  readonly peakBraking: number;
  /** |acceleration| at that same point. Diagnostic. */
  readonly peakAccelerationNormalised: number;
  /** Graph curvature AT that peak. Diagnostic only. */
  readonly curvatureAtPeak: number;
  /**
   * Where graph curvature peaks, which is usually NOT peakIndex. Exposed so the
   * divergence stays visible in every result rather than living only in a
   * comment. See the header for the measured example.
   */
  readonly maxCurvatureIndex: number;
  /** Mean |velocity| over the window ending at the peak. */
  readonly speedBefore: number;
  /** Mean |velocity| over the window starting after the peak. */
  readonly speedAfter: number;
  /** speedAfter / speedBefore. Infinity when speedBefore is 0. */
  readonly observedDecelerationRatio: number;
  readonly reason:
    | "detected"
    | "no_braking_observed"
    | "no_deceleration_after_peak"
    | "peak_too_close_to_edge";
  readonly trajectory: readonly TrajectoryPoint[];
}

type Vec3 = readonly [number, number, number];
type Mat3 = readonly [Vec3, Vec3, Vec3];

// 3x3 helpers, fully destructured. No indexing by a variable, so there is no
// possibly-undefined element to assert away and no assertion to get wrong.
function mul(a: Mat3, b: Mat3): Mat3 {
  const [[a00, a01, a02], [a10, a11, a12], [a20, a21, a22]] = a;
  const [[b00, b01, b02], [b10, b11, b12], [b20, b21, b22]] = b;
  return [
    [a00 * b00 + a01 * b10 + a02 * b20, a00 * b01 + a01 * b11 + a02 * b21, a00 * b02 + a01 * b12 + a02 * b22],
    [a10 * b00 + a11 * b10 + a12 * b20, a10 * b01 + a11 * b11 + a12 * b21, a10 * b02 + a11 * b12 + a12 * b22],
    [a20 * b00 + a21 * b10 + a22 * b20, a20 * b01 + a21 * b11 + a22 * b21, a20 * b02 + a21 * b12 + a22 * b22],
  ];
}

function transpose(a: Mat3): Mat3 {
  const [[a00, a01, a02], [a10, a11, a12], [a20, a21, a22]] = a;
  return [
    [a00, a10, a20],
    [a01, a11, a21],
    [a02, a12, a22],
  ];
}

function addM(a: Mat3, b: Mat3): Mat3 {
  const [[a00, a01, a02], [a10, a11, a12], [a20, a21, a22]] = a;
  const [[b00, b01, b02], [b10, b11, b12], [b20, b21, b22]] = b;
  return [
    [a00 + b00, a01 + b01, a02 + b02],
    [a10 + b10, a11 + b11, a12 + b12],
    [a20 + b20, a21 + b21, a22 + b22],
  ];
}

function subM(a: Mat3, b: Mat3): Mat3 {
  const [[a00, a01, a02], [a10, a11, a12], [a20, a21, a22]] = a;
  const [[b00, b01, b02], [b10, b11, b12], [b20, b21, b22]] = b;
  return [
    [a00 - b00, a01 - b01, a02 - b02],
    [a10 - b10, a11 - b11, a12 - b12],
    [a20 - b20, a21 - b21, a22 - b22],
  ];
}

function matVec(a: Mat3, v: Vec3): Vec3 {
  const [[a00, a01, a02], [a10, a11, a12], [a20, a21, a22]] = a;
  const [v0, v1, v2] = v;
  return [a00 * v0 + a01 * v1 + a02 * v2, a10 * v0 + a11 * v1 + a12 * v2, a20 * v0 + a21 * v1 + a22 * v2];
}

const I3: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** 3x3 inverse by adjugate. Returns null when effectively singular. */
function inverse(m: Mat3): Mat3 | null {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-18) return null;
  const s = 1 / det;
  return [
    [(e * i - f * h) * s, (c * h - b * i) * s, (b * f - c * e) * s],
    [(f * g - d * i) * s, (a * i - c * g) * s, (c * d - a * f) * s],
    [(d * h - e * g) * s, (b * g - a * h) * s, (a * e - b * d) * s],
  ];
}

/** Constant-acceleration transition over dt seconds. */
function transition(dt: number): Mat3 {
  return [
    [1, dt, (dt * dt) / 2],
    [0, 1, dt],
    [0, 0, 1],
  ];
}

/** Continuous white-noise-jerk process covariance over dt seconds. */
function processCov(dt: number, q: number): Mat3 {
  const dt2 = dt * dt;
  const dt3 = dt2 * dt;
  const dt4 = dt3 * dt;
  const dt5 = dt4 * dt;
  return [
    [(q * dt5) / 20, (q * dt4) / 8, (q * dt3) / 6],
    [(q * dt4) / 8, (q * dt3) / 3, (q * dt2) / 2],
    [(q * dt3) / 6, (q * dt2) / 2, q * dt],
  ];
}

/** Median of a copy. Empty -> 0. */
function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? (a[m] as number) : (((a[m - 1] as number) + (a[m] as number)) / 2);
}

export interface TrajectoryScales {
  /** Median sampling interval, seconds. Time is divided by this. */
  readonly timeScaleSec: number;
  /** Robust estimate of per-observation measurement noise, price units. */
  readonly priceScale: number;
}

/**
 * Estimate the scales that make the filter unit-free.
 *
 * Time: the median sampling interval.
 *
 * Price: for white measurement noise of standard deviation sigma riding on a
 * smooth path, the second difference p[i] - 2p[i-1] + p[i-2] has variance
 * 6*sigma^2. So a robust scale of the second differences, divided by sqrt(6),
 * estimates sigma without being dragged around by the real movement in the
 * series. Robust matters here: a genuine steam jump IS a large second
 * difference, and a mean-based estimate would read the signal as noise and
 * smooth it away.
 *
 * A perfectly clean series has no measurement noise to estimate; the fallback
 * is a small fraction of the observed price range, and a flat series falls back
 * to 1 so the arithmetic stays finite.
 */
export function estimateScales(samples: readonly OddsSample[]): TrajectoryScales {
  const dts: number[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    dts.push(((samples[i] as OddsSample).atMs - (samples[i - 1] as OddsSample).atMs) / 1000);
  }
  const timeScaleSec = median(dts) || 1;

  const secondDiffs: number[] = [];
  for (let i = 2; i < samples.length; i += 1) {
    secondDiffs.push(
      Math.abs(
        (samples[i] as OddsSample).price -
          2 * (samples[i - 1] as OddsSample).price +
          (samples[i - 2] as OddsSample).price,
      ),
    );
  }
  // 1.4826 rescales a median absolute value to a Gaussian sigma.
  const mad = median(secondDiffs);
  let priceScale = (mad * 1.4826) / Math.sqrt(6);

  if (!(priceScale > 0)) {
    const prices = samples.map((x) => x.price);
    const range = Math.max(...prices) - Math.min(...prices);
    priceScale = range > 0 ? range / 1000 : 1;
  }
  return { timeScaleSec, priceScale };
}

interface ForwardPass {
  readonly xFilt: readonly Vec3[];
  readonly pFilt: readonly Mat3[];
  readonly xPred: readonly Vec3[];
  readonly pPred: readonly Mat3[];
  readonly fUsed: readonly Mat3[];
}

interface Normalised {
  /** Times in units of the median sampling interval, starting at 0. */
  readonly t: readonly number[];
  /** Prices in units of the estimated measurement noise, starting at 0. */
  readonly p: readonly number[];
  readonly scales: TrajectoryScales;
  readonly price0: number;
}

function validate(samples: readonly OddsSample[], smoothness: number): boolean {
  if (samples.length < 3 || !(smoothness > 0)) return false;
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i] as OddsSample;
    if (!Number.isFinite(s.atMs) || !Number.isFinite(s.price)) return false;
    if (i > 0 && s.atMs <= (samples[i - 1] as OddsSample).atMs) return false;
  }
  return true;
}

function normalise(samples: readonly OddsSample[]): Normalised {
  const scales = estimateScales(samples);
  const t0 = (samples[0] as OddsSample).atMs;
  const price0 = (samples[0] as OddsSample).price;
  return {
    t: samples.map((s) => (s.atMs - t0) / 1000 / scales.timeScaleSec),
    p: samples.map((s) => (s.price - price0) / scales.priceScale),
    scales,
    price0,
  };
}

/**
 * Forward Kalman pass over NORMALISED data. Measurement noise is 1 by
 * construction (price is expressed in units of the estimated noise), so the
 * only free parameter is the dimensionless process intensity.
 */
function forwardPass(norm: Normalised, smoothness: number): ForwardPass {
  const r = 1;
  const xFilt: Vec3[] = [];
  const pFilt: Mat3[] = [];
  const xPred: Vec3[] = [];
  const pPred: Mat3[] = [];
  const fUsed: Mat3[] = [];

  let x: Vec3 = [norm.p[0] as number, 0, 0];
  // Normalised priors: one noise-unit of position, one unit of movement per
  // sampling interval. In the pre-normalisation draft this row read
  // diag(r, 1, 1) in RAW units, i.e. a prior of one probability point of
  // velocity PER SECOND, which is why the filter amplified jitter.
  let p: Mat3 = [
    [r, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  xFilt.push(x);
  pFilt.push(p);
  xPred.push(x);
  pPred.push(p);
  fUsed.push(I3);

  for (let k = 1; k < norm.t.length; k += 1) {
    const dt = (norm.t[k] as number) - (norm.t[k - 1] as number);
    const F = transition(dt);
    const xp = matVec(F, x);
    const pp = addM(mul(mul(F, p), transpose(F)), processCov(dt, smoothness));

    // Scalar measurement update with H = [1, 0, 0].
    const s = pp[0][0] + r;
    const K: Vec3 = [pp[0][0] / s, pp[1][0] / s, pp[2][0] / s];
    const innov = (norm.p[k] as number) - xp[0];
    x = [xp[0] + K[0] * innov, xp[1] + K[1] * innov, xp[2] + K[2] * innov];
    const KH: Mat3 = [
      [K[0], 0, 0],
      [K[1], 0, 0],
      [K[2], 0, 0],
    ];
    p = mul(subM(I3, KH), pp);

    xFilt.push(x);
    pFilt.push(p);
    xPred.push(xp);
    pPred.push(pp);
    fUsed.push(F);
  }

  return { xFilt, pFilt, xPred, pPred, fUsed };
}

/**
 * Convert normalised states back to reportable points.
 *
 * position, velocity and acceleration are returned in the CALLER'S price and
 * time units, because those are what a human reads. curvature is returned in
 * NORMALISED units on purpose: curvature of a graph depends on the scale of
 * both axes, so a raw-unit curvature cannot be compared between a probability
 * series and an American-odds series, or between a 1-minute and a 10-second
 * sampling rate. Normalised, it can. Within one series the peak is in the same
 * place either way.
 */
function toPoints(
  samples: readonly OddsSample[],
  states: readonly Vec3[],
  norm: Normalised,
): readonly TrajectoryPoint[] {
  const { priceScale, timeScaleSec } = norm.scales;
  return samples.map((s, k) => {
    const st = states[k] as Vec3;
    const vN = st[1];
    const aN = st[2];
    return {
      atMs: s.atMs,
      observed: s.price,
      position: norm.price0 + st[0] * priceScale,
      velocity: (vN * priceScale) / timeScaleSec,
      acceleration: (aN * priceScale) / (timeScaleSec * timeScaleSec),
      accelerationNormalised: Math.abs(aN),
      brakingNormalised: vN === 0 ? 0 : -aN * Math.sign(vN),
      curvature: Math.abs(aN) / Math.pow(1 + vN * vN, 1.5),
    };
  });
}

/**
 * CAUSAL. Forward Kalman filter only. The estimate at index k uses samples
 * 0..k and nothing later, so this is the only estimator that may drive a live
 * alert or an honest backtest of one. Returns null on malformed input.
 */
export function filterOddsTrajectoryCausal(
  samples: readonly OddsSample[],
  options: TrajectoryOptions = {},
): readonly TrajectoryPoint[] | null {
  const smoothness = options.smoothness ?? 1e-3;
  if (!validate(samples, smoothness)) return null;
  const norm = normalise(samples);
  return toPoints(samples, forwardPass(norm, smoothness).xFilt, norm);
}

/**
 * RETROSPECTIVE. RTS forward-backward smoother. The estimate at index k uses
 * the WHOLE series including samples after k, which makes it strictly better
 * for labelling history and unusable for anything live. Returns null on
 * malformed input.
 */
export function smoothOddsTrajectoryRetrospective(
  samples: readonly OddsSample[],
  options: TrajectoryOptions = {},
): readonly TrajectoryPoint[] | null {
  const smoothness = options.smoothness ?? 1e-3;
  if (!validate(samples, smoothness)) return null;
  const norm = normalise(samples);

  const { xFilt, pFilt, xPred, pPred, fUsed } = forwardPass(norm, smoothness);
  const n = samples.length;
  const xSmooth: Vec3[] = new Array<Vec3>(n);
  const pSmooth: Mat3[] = new Array<Mat3>(n);
  xSmooth[n - 1] = xFilt[n - 1] as Vec3;
  pSmooth[n - 1] = pFilt[n - 1] as Mat3;

  for (let k = n - 2; k >= 0; k -= 1) {
    const ppNext = pPred[k + 1] as Mat3;
    const ppInv = inverse(ppNext);
    if (ppInv === null) {
      // Singular predicted covariance: keep the filtered estimate rather than
      // inventing a smoothed one.
      xSmooth[k] = xFilt[k] as Vec3;
      pSmooth[k] = pFilt[k] as Mat3;
      continue;
    }
    const C = mul(mul(pFilt[k] as Mat3, transpose(fUsed[k + 1] as Mat3)), ppInv);
    const xs = xSmooth[k + 1] as Vec3;
    const xp = xPred[k + 1] as Vec3;
    const corr = matVec(C, [xs[0] - xp[0], xs[1] - xp[1], xs[2] - xp[2]]);
    const xf = xFilt[k] as Vec3;
    xSmooth[k] = [xf[0] + corr[0], xf[1] + corr[1], xf[2] + corr[2]];
    pSmooth[k] = addM(pFilt[k] as Mat3, mul(mul(C, subM(pSmooth[k + 1] as Mat3, ppNext)), transpose(C)));
  }

  return toPoints(samples, xSmooth, norm);
}

function meanAbsVelocity(points: readonly TrajectoryPoint[]): number {
  if (points.length === 0) return 0;
  return points.reduce((acc, p) => acc + Math.abs(p.velocity), 0) / points.length;
}

/**
 * Detect a steam move: a global curvature maximum followed immediately by a
 * collapse in speed.
 *
 * `options.mode` is required. Pass "causal" for anything that could inform a
 * live decision; "retrospective" only for backtesting and labelling.
 *
 * Returns null ONLY for malformed or too-short input. A series that simply did
 * not steam returns a real result with detected=false and a reason, because
 * "this line did not move informatively" is a finding, not an error.
 */
export function detectSteam(
  samples: readonly OddsSample[],
  options: SteamDetectorOptions,
): SteamDetection | null {
  const minSamples = options.minSamples ?? 8;
  const window = options.decelerationWindow;
  const ratio = options.decelerationRatio;
  if (!Number.isFinite(window) || !Number.isFinite(ratio)) return null;
  const mode = options.mode;
  if (mode !== "causal" && mode !== "retrospective") return null;
  if (samples.length < minSamples || window < 1 || !(ratio > 0)) return null;

  const trajectory =
    mode === "causal"
      ? filterOddsTrajectoryCausal(samples, options)
      : smoothOddsTrajectoryRetrospective(samples, options);
  if (trajectory === null) return null;

  // Detect on normalised |acceleration|, NOT on graph curvature. See the
  // header: curvature divides by (1 + v^2)^{3/2} and so suppresses exactly the
  // fast segment a steam move consists of.
  let peakIndex = -1;
  let peakBraking = 0;
  let maxCurvatureIndex = -1;
  let maxCurvature = 0;
  for (let i = 0; i < trajectory.length; i += 1) {
    const pt = trajectory[i] as TrajectoryPoint;
    if (pt.brakingNormalised > peakBraking) {
      peakBraking = pt.brakingNormalised;
      peakIndex = i;
    }
    if (pt.curvature > maxCurvature) {
      maxCurvature = pt.curvature;
      maxCurvatureIndex = i;
    }
  }

  const base = {
    mode,
    peakIndex,
    peakAtMs: peakIndex >= 0 ? (trajectory[peakIndex] as TrajectoryPoint).atMs : null,
    peakBraking,
    peakAccelerationNormalised:
      peakIndex >= 0 ? (trajectory[peakIndex] as TrajectoryPoint).accelerationNormalised : 0,
    maxCurvatureIndex,
    curvatureAtPeak: peakIndex >= 0 ? (trajectory[peakIndex] as TrajectoryPoint).curvature : 0,
    trajectory,
  };

  if (peakIndex < 0 || peakBraking <= 0) {
    return {
      ...base,
      detected: false,
      speedBefore: 0,
      speedAfter: 0,
      observedDecelerationRatio: Number.POSITIVE_INFINITY,
      reason: "no_braking_observed",
    };
  }

  // The deceleration test needs room on both sides. A peak at the edge of the
  // series is unverifiable, and calling it steam would be a guess.
  if (peakIndex < window || peakIndex + window >= trajectory.length) {
    return {
      ...base,
      detected: false,
      speedBefore: 0,
      speedAfter: 0,
      observedDecelerationRatio: Number.POSITIVE_INFINITY,
      reason: "peak_too_close_to_edge",
    };
  }

  // Peak speed of the move, not its mean: the question is how far the line
  // fell from full pace, and a mean over the ramp-up understates that.
  const speedBefore = Math.max(
    ...trajectory.slice(peakIndex - window, peakIndex + 1).map((pt) => Math.abs(pt.velocity)),
  );
  const speedAfter = meanAbsVelocity(trajectory.slice(peakIndex + 1, peakIndex + 1 + window));
  const observed = speedBefore === 0 ? Number.POSITIVE_INFINITY : speedAfter / speedBefore;

  if (observed > ratio) {
    return { ...base, detected: false, speedBefore, speedAfter, observedDecelerationRatio: observed, reason: "no_deceleration_after_peak" };
  }
  return { ...base, detected: true, speedBefore, speedAfter, observedDecelerationRatio: observed, reason: "detected" };
}
