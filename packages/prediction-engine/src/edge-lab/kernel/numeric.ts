/**
 * Shared special functions for the kernel — implemented ONCE, here, so that the
 * correctness-critical numerics are single-sourced and every slot is held to
 * the same approximations. No slot may re-derive any of these.
 *
 * Accuracy notes:
 *  - `logGamma`: Lanczos (g = 7, n = 9); |rel err| < 1e-13 on x > 0.
 *  - `regularizedGammaP`: series / continued-fraction split at x = a + 1
 *    (Numerical Recipes gammp/gammq structure), tol 1e-14, budget 500 iters.
 *  - `erf`: exact identity erf(x) = sign(x) · P(1/2, x²) via the above.
 *  - `normalQuantile`: Acklam's rational approximation + one Halley refinement
 *    against `normalCdf`; abs err ≲ 1e-13 on (0, 1).
 */

import { KernelError, assertFinite, assertProbability, type Rng } from "./contract.js";

// Lanczos g = 7, n = 9 coefficients.
const LANCZOS: readonly number[] = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** Natural log of the gamma function for x > 0. Throws DOMAIN for x <= 0. */
export function logGamma(x: number): number {
  assertFinite(x, "x");
  if (x <= 0) {
    throw new KernelError("DOMAIN", `logGamma requires x > 0, received ${x}`);
  }
  if (x < 0.5) {
    // Reflection: Γ(x)Γ(1−x) = π / sin(πx)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const z = x - 1;
  let acc = LANCZOS[0]!;
  for (let i = 1; i < LANCZOS.length; i += 1) {
    acc += LANCZOS[i]! / (z + i);
  }
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(acc);
}

/** log B(a, b) = logΓ(a) + logΓ(b) − logΓ(a + b). Requires a, b > 0. */
export function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/** log C(n, k) for integer 0 <= k <= n. Throws DOMAIN otherwise. */
export function logChoose(n: number, k: number): number {
  assertFinite(n, "n");
  assertFinite(k, "k");
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) {
    throw new KernelError("DOMAIN", `logChoose requires integers 0 <= k <= n, received n=${n} k=${k}`);
  }
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

const GAMMA_TOL = 1e-14;
const GAMMA_ITERS = 500;

/**
 * Regularized lower incomplete gamma P(a, x) = γ(a, x) / Γ(a), for a > 0, x >= 0.
 * Series expansion for x < a + 1; Lentz continued fraction for the complement
 * otherwise. Throws NO_CONVERGENCE past the iteration budget.
 */
export function regularizedGammaP(a: number, x: number): number {
  assertFinite(a, "a");
  assertFinite(x, "x");
  if (a <= 0) throw new KernelError("DOMAIN", `regularizedGammaP requires a > 0, received ${a}`);
  if (x < 0) throw new KernelError("DOMAIN", `regularizedGammaP requires x >= 0, received ${x}`);
  if (x === 0) return 0;
  const logPrefix = a * Math.log(x) - x - logGamma(a);
  if (x < a + 1) {
    // Series: P(a,x) = e^{-x} x^a / Γ(a) · Σ x^n / (a (a+1) … (a+n))
    let term = 1 / a;
    let sum = term;
    let ap = a;
    for (let i = 0; i < GAMMA_ITERS; i += 1) {
      ap += 1;
      term *= x / ap;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * GAMMA_TOL) {
        return Math.min(1, Math.exp(logPrefix) * sum);
      }
    }
    throw new KernelError("NO_CONVERGENCE", "regularizedGammaP series did not converge");
  }
  // Continued fraction for Q(a,x), modified Lentz.
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / (b === 0 ? tiny : b);
  let h = d;
  for (let i = 1; i <= GAMMA_ITERS; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < GAMMA_TOL) {
      const q = Math.exp(logPrefix) * h;
      return Math.max(0, 1 - q);
    }
  }
  throw new KernelError("NO_CONVERGENCE", "regularizedGammaP continued fraction did not converge");
}

/** Error function via the exact identity erf(x) = sign(x) · P(1/2, x²). */
export function erf(x: number): number {
  assertFinite(x, "x");
  if (x === 0) return 0;
  const p = regularizedGammaP(0.5, x * x);
  return x > 0 ? p : -p;
}

/** Complementary error function. */
export function erfc(x: number): number {
  return 1 - erf(x);
}

const SQRT2 = Math.SQRT2;

/** Standard normal CDF Φ(x). */
export function normalCdf(x: number): number {
  assertFinite(x, "x");
  return 0.5 * erfc(-x / SQRT2);
}

// Acklam's inverse-normal coefficients.
const ACK_A = [
  -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
  1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
] as const;
const ACK_B = [
  -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
  6.680131188771972e1, -1.328068155288572e1,
] as const;
const ACK_C = [
  -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
  -2.549732539343734, 4.374664141464968, 2.938163982698783,
] as const;
const ACK_D = [
  7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416,
] as const;

/**
 * Standard normal quantile Φ⁻¹(p) for p in (0, 1): Acklam's rational
 * approximation plus one Halley refinement. Throws DOMAIN at p = 0 or 1.
 */
export function normalQuantile(p: number): number {
  assertProbability(p, "p");
  if (p === 0 || p === 1) {
    throw new KernelError("DOMAIN", `normalQuantile requires p in (0,1), received ${p}`);
  }
  const pLow = 0.02425;
  let x: number;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((ACK_C[0] * q + ACK_C[1]) * q + ACK_C[2]) * q + ACK_C[3]) * q + ACK_C[4]) * q + ACK_C[5]) /
      ((((ACK_D[0] * q + ACK_D[1]) * q + ACK_D[2]) * q + ACK_D[3]) * q + 1);
  } else if (p <= 1 - pLow) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((ACK_A[0] * r + ACK_A[1]) * r + ACK_A[2]) * r + ACK_A[3]) * r + ACK_A[4]) * r + ACK_A[5]) * q) /
      (((((ACK_B[0] * r + ACK_B[1]) * r + ACK_B[2]) * r + ACK_B[3]) * r + ACK_B[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((ACK_C[0] * q + ACK_C[1]) * q + ACK_C[2]) * q + ACK_C[3]) * q + ACK_C[4]) * q + ACK_C[5]) /
      ((((ACK_D[0] * q + ACK_D[1]) * q + ACK_D[2]) * q + ACK_D[3]) * q + 1);
  }
  // One Halley step against the exact CDF.
  const e = normalCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/**
 * One standard-normal deviate via Box–Muller from the injected uniform source.
 * Guards u1 = 0 (log of zero) by substituting the smallest positive uniform.
 */
export function boxMuller(rng: Rng): number {
  const u1 = Math.max(rng(), 1e-323);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Digamma ψ(x) for x > 0: recurrence ψ(x) = ψ(x + 1) − 1/x up to x >= 6, then
 * the asymptotic series ψ(x) ≈ ln x − 1/(2x) − 1/(12x²) + 1/(120x⁴) − 1/(252x⁶).
 * |abs err| ≲ 1e-12 across the positive axis. Needed by Minka's fixed-point
 * update for Dirichlet-multinomial concentration fitting.
 */
export function digamma(x: number): number {
  assertFinite(x, "x");
  if (x <= 0) {
    throw new KernelError("DOMAIN", `digamma requires x > 0, received ${x}`);
  }
  let result = 0;
  let z = x;
  while (z < 6) {
    result -= 1 / z;
    z += 1;
  }
  const inv = 1 / z;
  const inv2 = inv * inv;
  result += Math.log(z) - 0.5 * inv - inv2 * (1 / 12 - inv2 * (1 / 120 - inv2 / 252));
  return result;
}
