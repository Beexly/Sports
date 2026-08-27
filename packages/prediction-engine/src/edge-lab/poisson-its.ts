/**
 * Poisson interrupted time series (ITS) with an exposure offset — R&D.
 *
 * Ported from arXiv:1805.01271 (Binney, Hammond, Klein, Goodman & Janssens,
 * "NFL Injuries Before and After the 2011 Collective Bargaining Agreement").
 * Their model is the right instrument for any "X changed after Y" claim GSE
 * ever wants to publish — not the injury-rate finding itself. See
 * docs/ops/edge/extraction/2026-08-26-group-sports-domain.md item 3(b).
 *
 * Model (their §2.4, simplified — see "What this simplifies" below):
 *   ln(mu_i) = ln(exposure_i) + b0 + b1*tCentered_i + b2*post_i + b3*tCentered_i*post_i
 * exp(b2) is the LEVEL-SHIFT rate ratio at the break point; b1 is the
 * pre-period trend; b1+b3 is the post-period trend.
 *
 * What this simplifies from the paper: no player random intercept (their
 * model is a mixed-effects Poisson ITS at player-season level; this is
 * fixed-effects only, for a caller aggregating counts at whatever level the
 * claim is actually about — a season, a week, a rule-change cohort). Any
 * caller with genuinely clustered/repeated-subject data should treat this as
 * a first-pass instrument, not a substitute for a real mixed model.
 *
 * The single most important discipline from the source paper (their §4,
 * pitfall iv) is baked into the TYPE, not left as a docstring warning a
 * caller can skip: `callout` can never assert "no change" — a rate-ratio CI
 * spanning 1.0 is mechanically forced to `"no_detectable_change"`, which is
 * the only honest reading of a wide/uninformative interval (their own CBA
 * level-effect finding, -7% with a 95% CI of -17% to +3%, is exactly this
 * case — a null result, not evidence of "no change").
 *
 * Fitting: Fisher scoring (Newton-Raphson on the Poisson log-likelihood,
 * i.e. IRLS), unlike the fixed-step gradient descent in
 * `expected-metrics/logistic.ts`. That module deliberately avoids matrix
 * inversion mid-fit for a LARGER, less-controlled feature space (~10
 * features, ~18k rows) where a fixed iteration count and no inversion is the
 * safer contract. This model has exactly four structural parameters and
 * typically a handful to a few dozen periods — Newton-Raphson converges in
 * single-digit iterations for a globally concave objective like Poisson
 * regression with a log link, and every inversion goes through
 * `invertMatrix`, which fails closed (`null`, never a garbage value) on a
 * singular matrix — the exact risk fixed-step gradient descent was chosen
 * to sidestep elsewhere is handled here by the primitive itself. (An
 * earlier fixed-learning-rate gradient-descent draft of this module
 * diverged to NaN on realistic count scales — `mu = exp(eta)` is
 * exponentially, not linearly, sensitive to the coefficients, and a step
 * size safe for one count scale overshoots wildly on another. Newton-Raphson
 * has no such scale-dependent tuning knob.)
 *
 * Pure. No I/O.
 */

import { invertMatrix } from "./linalg.js";

export interface ItsObservation {
  /** Time index (e.g. season year, week number) — any consistent monotone unit. */
  readonly t: number;
  /** Athlete-exposures, games-at-risk, or any positive exposure denominator. */
  readonly exposure: number;
  /** 1 if this observation falls in the post-intervention period, else 0. */
  readonly post: 0 | 1;
  /** Observed event count — a non-negative integer. */
  readonly count: number;
}

export interface ItsFitOptions {
  /** Maximum Newton-Raphson steps. Default 50 — Poisson/log-link regression typically converges in well under 10. */
  readonly maxIterations?: number;
  /** Convergence tolerance on the step size (max absolute coefficient change between iterations). Default 1e-10. */
  readonly tolerance?: number;
}

export interface ItsCoefficient {
  readonly estimate: number;
  readonly stderr: number;
  /** 95% Wald CI on the log-linear-predictor scale. */
  readonly ci95: readonly [number, number];
}

export type ChangeCallout = "increase" | "decrease" | "no_detectable_change";

export interface RateRatio {
  readonly estimate: number;
  readonly ci95: readonly [number, number];
}

export interface ItsFitResult {
  readonly intercept: number;
  /** Pre-period trend, per unit of (t - tCenter). */
  readonly trend: ItsCoefficient;
  /** The level shift at the break, on the log scale. */
  readonly levelShift: ItsCoefficient;
  /** Post-period trend CHANGE (post-period trend = trend.estimate + trendChange.estimate). */
  readonly trendChange: ItsCoefficient;
  /**
   * exp(levelShift) and its CI, exponentiated at the endpoints (exact for a
   * monotone transform, not a delta-method approximation) — the number a
   * claim actually quotes ("injuries were 1.3x [1.1x, 1.5x] after the rule").
   */
  readonly levelShiftRateRatio: RateRatio;
  /**
   * Mechanical enforcement of the paper's pitfall (iv): "no_detectable_change"
   * is the ONLY value possible when the rate-ratio CI spans 1.0. There is no
   * "no_change" value in this type — an underpowered or genuinely null
   * result and a truly absent effect are indistinguishable from a CI alone,
   * and this module will not let a caller claim the stronger one.
   */
  readonly callout: ChangeCallout;
  /** The t-value observations were centered on, for reproducing predictions. */
  readonly tCenter: number;
  readonly sampleSize: number;
  readonly converged: boolean;
}

const Z95 = 1.959963984540054; // two-sided 95% normal critical value

function meanT(observations: readonly ItsObservation[]): number {
  return observations.reduce((s, o) => s + o.t, 0) / observations.length;
}

/** Design row [1, tCentered, post, tCentered*post] for one observation. */
function designRow(o: ItsObservation, tCenter: number): readonly [number, number, number, number] {
  const tc = o.t - tCenter;
  return [1, tc, o.post, tc * o.post];
}

/**
 * Fit the ITS model. Returns `null` when there is not enough data to
 * identify all four parameters (fewer than `minObservations`, default 8 —
 * more than the 4 structural parameters, since asymptotic Wald CIs are not
 * meaningful at the boundary of identifiability), when any exposure is
 * non-positive, or when the converged Fisher information matrix is singular
 * (the design cannot separate its own parameters — e.g. every observation
 * shares the same `post` value, or `t` never varies within a period).
 */
export function fitPoissonIts(
  observations: readonly ItsObservation[],
  options: ItsFitOptions = {},
  minObservations = 8,
): ItsFitResult | null {
  const n = observations.length;
  if (n < minObservations) return null;
  for (const o of observations) {
    if (!(o.exposure > 0) || !Number.isFinite(o.exposure)) return null;
    if (!Number.isFinite(o.count) || o.count < 0) return null;
  }

  const maxIterations = options.maxIterations ?? 50;
  const tolerance = options.tolerance ?? 1e-10;
  // A non-finite/non-positive maxIterations or tolerance would make the
  // Newton-Raphson loop below non-terminating (an unbounded iteration count
  // with no way for `delta` to ever fall under a non-positive tolerance).
  // Same fail-closed convention as the observation-level checks above.
  if (!Number.isInteger(maxIterations) || maxIterations <= 0) return null;
  if (!Number.isFinite(tolerance) || tolerance <= 0) return null;
  const tCenter = meanT(observations);

  const rows = observations.map((o) => designRow(o, tCenter));
  const offsets = observations.map((o) => Math.log(o.exposure));
  const counts = observations.map((o) => o.count);

  // Sensible starting point (mirrors fitLogistic's class-prior intercept
  // init): assume a constant rate matching the average observed count per
  // unit exposure, trend/level-shift/interaction all starting at zero. This
  // keeps the FIRST Newton step's Hessian well-scaled to the data instead of
  // starting from mu ~= exp(offset) which can be wildly off the observed
  // count scale.
  const meanRate = counts.reduce((s, c) => s + c, 0) / observations.reduce((s, o) => s + o.exposure, 0);
  let beta = [Math.log(Math.max(meanRate, 1e-9)), 0, 0, 0];

  // One Newton step: given the current beta, compute the gradient and
  // Fisher information (== Hessian, canonical log link), solve
  // info . delta = grad via the tested matrix inverse, and return the next
  // beta plus the info matrix (reused for the final standard errors on
  // whichever iteration is last, converged or not).
  const step = (current: readonly number[]): { next: number[]; info: number[][]; delta: number[] } | null => {
    const grad = [0, 0, 0, 0];
    const info: number[][] = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const row = rows[i]!;
      let eta = offsets[i]!;
      for (let c = 0; c < 4; c++) eta += current[c]! * row[c]!;
      const mu = Math.exp(eta);
      const err = mu - counts[i]!;
      for (let a = 0; a < 4; a++) {
        grad[a] = grad[a]! + err * row[a]!;
        for (let b = 0; b < 4; b++) info[a]![b] = info[a]![b]! + mu * row[a]! * row[b]!;
      }
    }
    const infoInv = invertMatrix(info);
    if (infoInv === null) return null;
    const delta = infoInv.map((invRow) => invRow.reduce((s, v, j) => s + v * grad[j]!, 0));
    return { next: current.map((c, j) => c - delta[j]!), info, delta };
  };

  let converged = false;
  let lastInfo: number[][] | null = null;
  for (let iter = 0; iter < maxIterations; iter++) {
    const result = step(beta);
    if (result === null) return null; // singular Hessian — design can't identify all four parameters
    beta = result.next;
    lastInfo = result.info;
    if (Math.max(...result.delta.map(Math.abs)) < tolerance) {
      converged = true;
      break;
    }
  }
  if (!Number.isFinite(beta[0]) || !Number.isFinite(beta[1]) || !Number.isFinite(beta[2]) || !Number.isFinite(beta[3])) {
    return null;
  }

  // Standard errors from the Fisher information AT THE FINAL beta (recompute
  // once more so `info` matches the returned coefficients exactly, not the
  // second-to-last iterate).
  const final = step(beta);
  const cov = final ? invertMatrix(final.info) : (lastInfo ? invertMatrix(lastInfo) : null);
  if (cov === null) return null; // refuse a CI rather than fabricate one

  const coefAt = (idx: number): ItsCoefficient => {
    const estimate = beta[idx]!;
    const stderr = Math.sqrt(Math.max(0, cov[idx]![idx]!));
    return { estimate, stderr, ci95: [estimate - Z95 * stderr, estimate + Z95 * stderr] };
  };

  const trend = coefAt(1);
  const levelShift = coefAt(2);
  const trendChange = coefAt(3);

  const rrEstimate = Math.exp(levelShift.estimate);
  const rrCi95: readonly [number, number] = [Math.exp(levelShift.ci95[0]), Math.exp(levelShift.ci95[1])];
  const callout: ChangeCallout = rrCi95[0] <= 1 && rrCi95[1] >= 1 ? "no_detectable_change" : rrCi95[0] > 1 ? "increase" : "decrease";

  return {
    intercept: beta[0]!,
    trend,
    levelShift,
    trendChange,
    levelShiftRateRatio: { estimate: rrEstimate, ci95: rrCi95 },
    callout,
    tCenter,
    sampleSize: n,
    converged,
  };
}
