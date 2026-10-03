/**
 * Standard normal inverse CDF (quantile function) — Peter Acklam's rational
 * approximation, relative error < 1.15e-9 across (0, 1). No external deps,
 * matching the rest of the package's from-scratch special functions.
 *
 * This exists to fix a specific defect in the recovered starter skeleton:
 * `welchOneSidedNonInferiority` took an `alpha` parameter but hardcoded
 * `zCrit = 1.64485` (the z for alpha = 0.05) regardless of what alpha was
 * actually passed in — so a Bonferroni-adjusted alpha (e.g. 0.05 / 5 = 0.01)
 * silently had no effect on the critical value. `zCritOneSided` below is a
 * real function of alpha, unit-tested against known quantiles.
 */

const ACKLAM_A = [
  -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1,
  2.506628277459239e0,
] as const;
const ACKLAM_B = [
  -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1,
] as const;
const ACKLAM_C = [
  -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0,
  2.938163982698783e0,
] as const;
const ACKLAM_D = [
  7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0,
] as const;

const P_LOW = 0.02425;
const P_HIGH = 1 - P_LOW;

/**
 * Inverse standard normal CDF: returns x such that Phi(x) = p, for
 * p in (0, 1). Throws RangeError outside that open interval (no evidence,
 * no honest quantile at the boundary).
 */
export function standardNormalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) {
    throw new RangeError(`standardNormalQuantile: p must be in (0, 1) (got ${p})`);
  }

  if (p < P_LOW) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q +
        ACKLAM_C[5]) /
      ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1)
    );
  }

  if (p <= P_HIGH) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((ACKLAM_A[0] * r + ACKLAM_A[1]) * r + ACKLAM_A[2]) * r + ACKLAM_A[3]) * r + ACKLAM_A[4]) * r +
        ACKLAM_A[5]) *
        q) /
      (((((ACKLAM_B[0] * r + ACKLAM_B[1]) * r + ACKLAM_B[2]) * r + ACKLAM_B[3]) * r + ACKLAM_B[4]) * r + 1)
    );
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q +
      ACKLAM_C[5]) /
    ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1)
  );
}

/**
 * One-sided critical z-value for a given alpha: Phi^-1(1 - alpha). E.g.
 * zCritOneSided(0.05) ~ 1.6449, zCritOneSided(0.01) ~ 2.3263. This is a real
 * function of alpha (unlike the skeleton's hardcoded 1.64485), so a
 * Bonferroni-adjusted alpha actually tightens the critical value.
 */
export function zCritOneSided(alpha: number): number {
  if (!(alpha > 0 && alpha < 1)) {
    throw new RangeError(`zCritOneSided: alpha must be in (0, 1) (got ${alpha})`);
  }
  return standardNormalQuantile(1 - alpha);
}
