/**
 * Per-sport NB2 dispersion estimation (OFFLINE / research only).
 *
 * WHY THIS EXISTS
 * ---------------
 * `φ` was a hardcoded literal (12) inherited without derivation. For NB2:
 *
 *     var = μ + μ²/φ        →        VMR = var/μ = 1 + μ/φ
 *
 * so φ alone sets the tail thickness of every total. A single constant cannot be
 * right for all sports: measured MLB team-runs VMR is ≈2.15 (φ ≈ 3.7 at μ≈4.3),
 * while NHL goals come out ≈1.0 — i.e. Poisson, where NB2 has no dispersion left
 * to model at all. Estimating φ per sport from settled results makes that fall out
 * of the data instead of an assumption.
 *
 * SCOPE — deliberately not wired into live scoring. This module computes evidence;
 * changing the constant a priced path uses is MODEL_VERSION-affecting and is the
 * founder's call. Consume it from a runner/report, not from the pick pipeline.
 *
 * METHOD — method of moments. Given samples with mean m and unbiased variance s²:
 *
 *     φ̂ = m² / (s² − m)      valid only when s² > m
 *
 * When s² ≤ m the data is Poisson-like or under-dispersed and NB2 is *not
 * identifiable* — there is no positive φ that produces it. We say so explicitly
 * rather than returning a huge number that a caller might treat as a real fit.
 * (MLE would be more efficient, but MoM is closed-form, has no convergence mode to
 * mis-tune, and is the standard first estimate; penaltyblog's own NB had to be
 * hardened for exactly that convergence reason.)
 */

/** How the sample's dispersion relates to a Poisson baseline. */
export type DispersionVerdict =
  /** s² > m by more than noise — NB2 fits, φ̂ is meaningful. */
  | "overdispersed"
  /** s² ≈ m — Poisson. NB2 adds nothing; use a Poisson tail. */
  | "poisson"
  /** s² < m — under-dispersed. NB2 cannot represent this at all. */
  | "underdispersed"
  /** Not enough data to say anything honest. */
  | "insufficient-data";

export interface PhiEstimate {
  readonly verdict: DispersionVerdict;
  /** Method-of-moments φ̂. Null unless verdict is "overdispersed". */
  readonly phi: number | null;
  readonly mean: number;
  /** Unbiased (n−1) sample variance. */
  readonly variance: number;
  /** variance / mean. 1.0 is Poisson. */
  readonly vmr: number;
  readonly n: number;
  /** Human-readable reason, always populated — for the evidence report. */
  readonly reason: string;
}

/**
 * Minimum samples before we'll call a dispersion at all. Below this the VMR is
 * dominated by sampling noise; a confident φ̂ off 20 games is not evidence.
 */
export const MIN_SAMPLES_FOR_DISPERSION = 200;

/**
 * How far VMR must exceed 1 before we call it overdispersion rather than noise.
 * The standard error of VMR under Poisson is ≈ sqrt(2/(n−1)), so this is a ~3σ
 * band at n=200 and tightens as n grows.
 */
function vmrNoiseBand(n: number): number {
  return 3 * Math.sqrt(2 / Math.max(1, n - 1));
}

/**
 * Estimate NB2 φ from observed counts (e.g. per-team runs or goals per game).
 *
 * Returns a verdict first and a number second, on purpose: the most important
 * output for NHL is "this is Poisson", not a φ.
 */
export function estimatePhi(samples: readonly number[]): PhiEstimate {
  const clean = samples.filter((v) => Number.isFinite(v) && v >= 0);
  const n = clean.length;

  if (n < MIN_SAMPLES_FOR_DISPERSION) {
    return {
      verdict: "insufficient-data",
      phi: null,
      mean: n > 0 ? clean.reduce((a, b) => a + b, 0) / n : 0,
      variance: 0,
      vmr: 0,
      n,
      reason: `n=${n} < ${MIN_SAMPLES_FOR_DISPERSION}; VMR would be dominated by sampling noise.`,
    };
  }

  const mean = clean.reduce((a, b) => a + b, 0) / n;
  if (mean <= 0) {
    return {
      verdict: "insufficient-data",
      phi: null,
      mean,
      variance: 0,
      vmr: 0,
      n,
      reason: "Mean is zero; dispersion is undefined.",
    };
  }

  // Unbiased (n−1) variance — the n-denominator form biases VMR low, which would
  // make genuine overdispersion look like Poisson.
  let ss = 0;
  for (const v of clean) ss += (v - mean) * (v - mean);
  const variance = ss / (n - 1);
  const vmr = variance / mean;
  const band = vmrNoiseBand(n);

  if (vmr < 1 - band) {
    return {
      verdict: "underdispersed",
      phi: null,
      mean,
      variance,
      vmr,
      n,
      reason:
        `VMR=${vmr.toFixed(3)} < 1 beyond the ${band.toFixed(3)} noise band. ` +
        "NB2 cannot represent under-dispersion (it only adds variance); a Poisson " +
        "or Conway-Maxwell-Poisson tail is required.",
    };
  }

  if (vmr <= 1 + band) {
    return {
      verdict: "poisson",
      phi: null,
      mean,
      variance,
      vmr,
      n,
      reason:
        `VMR=${vmr.toFixed(3)} is within the ${band.toFixed(3)} noise band of 1.0. ` +
        "Poisson-like: NB2 has no dispersion left to model, so a fitted phi would be " +
        "an artifact of noise. Use a Poisson tail for this sport.",
    };
  }

  // s² > m: NB2 is identifiable.
  const phi = (mean * mean) / (variance - mean);
  return {
    verdict: "overdispersed",
    phi,
    mean,
    variance,
    vmr,
    n,
    reason:
      `VMR=${vmr.toFixed(3)} exceeds 1 beyond noise; method-of-moments ` +
      `phi = m^2/(s^2 - m) = ${phi.toFixed(3)} at mean ${mean.toFixed(3)}.`,
  };
}

/**
 * Convenience: the NB2 VMR a given φ implies at a given mean. Inverse of the
 * estimator, useful for asserting a proposed constant against observed data.
 */
export function impliedVmr(mean: number, phi: number): number {
  return 1 + mean / phi;
}
