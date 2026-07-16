/**
 * Coverage + binomial lower-bound statistics — the statutory pieces of the
 * handoff's hard rule: EVERY published number must carry coverage and a
 * Wilson/Clopper-Pearson lower bound (handoff §2 Phase 0). A raw win rate or
 * hit rate with no denominator disclosed is exactly the kind of falsely
 * precise number this file exists to prevent.
 *
 * Wilson score interval: the fast, well-behaved-at-small-n default. Good
 * approximate coverage everywhere, cheap, closed-form.
 *
 * Clopper-Pearson: the EXACT binomial interval via the Beta quantile
 * relation, deliberately more conservative than Wilson (it never
 * under-covers) — the second, stricter leg of the same guarantee, for claims
 * that need the worst-case-exact bound rather than the fast approximation.
 * Both default to a ONE-SIDED 95% lower bound (z = 1.6449 / alpha = 0.05):
 * the question this module answers is "how low could the true rate
 * plausibly be," not a two-sided band.
 *
 * The regularized incomplete beta function and its inverse are implemented
 * from scratch (continued-fraction betacf, standard Numerical-Recipes
 * style, double precision) — no external deps, matching the rest of this
 * package.
 *
 * Pure, deterministic, no I/O.
 */

/** One-sided 95% z-score (Phi^-1(0.95)) — the Wilson-bound default. */
const Z_ONE_SIDED_95 = 1.6449;

/** One-sided 95% alpha — the Clopper-Pearson-bound default. */
const ALPHA_ONE_SIDED_95 = 0.05;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Shared guard for (successes, n) pairs: both must be non-negative integers
 * with successes <= n. Throws RangeError rather than returning a silently
 * wrong bound — a caller passing a fractional or out-of-range count has a
 * bug worth surfacing immediately, not a number worth publishing. */
function assertValidCounts(successes: number, n: number): void {
  if (!Number.isInteger(successes) || !Number.isInteger(n)) {
    throw new RangeError(`successes and n must be integers (got successes=${successes}, n=${n})`);
  }
  if (successes < 0 || n < 0) {
    throw new RangeError(`successes and n must be non-negative (got successes=${successes}, n=${n})`);
  }
  if (successes > n) {
    throw new RangeError(`successes cannot exceed n (got successes=${successes}, n=${n})`);
  }
}

function wilsonCore(successes: number, n: number, z: number): WilsonInterval {
  if (n === 0) return { lower: 0, upper: 1, center: 0.5 };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return {
    lower: clamp01(center - margin),
    upper: clamp01(center + margin),
    center: clamp01(center),
  };
}

/**
 * Wilson score interval LOWER bound for a proportion — well-behaved at small
 * n and extreme p, unlike the normal (Wald) approximation. Defaults to the
 * one-sided 95% z (1.6449). Returns 0 when n = 0 (no evidence -> the honest
 * floor). Throws RangeError on non-integer or negative successes/n, or
 * successes > n.
 */
export function wilsonLowerBound(successes: number, n: number, z: number = Z_ONE_SIDED_95): number {
  assertValidCounts(successes, n);
  return wilsonCore(successes, n, z).lower;
}

export interface WilsonInterval {
  readonly lower: number;
  readonly upper: number;
  readonly center: number;
}

/**
 * Full Wilson score interval (lower, upper, and the recentered point
 * estimate the interval is built around — NOT the raw successes/n rate).
 * Same defaults and guards as wilsonLowerBound.
 */
export function wilsonInterval(successes: number, n: number, z: number = Z_ONE_SIDED_95): WilsonInterval {
  assertValidCounts(successes, n);
  return wilsonCore(successes, n, z);
}

/** Lanczos approximation to ln(Gamma(x)), g=5/n=6 coefficients (Numerical
 * Recipes). Accurate to double precision for x > 0. */
function gammaLn(xx: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2,
    -0.5395239384953e-5,
  ] as const;
  const x = xx;
  let y = xx;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < cof.length; j++) {
    y += 1;
    ser += cof[j]! / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

const BETACF_MAX_ITERATIONS = 200;
const BETACF_EPS = 3e-11;
const BETACF_FPMIN = 1e-300;

/** Continued-fraction evaluation used by regularizedIncompleteBeta (standard
 * Numerical-Recipes `betacf`, modified Lentz's method). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < BETACF_FPMIN) d = BETACF_FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= BETACF_MAX_ITERATIONS; m++) {
    const m2 = 2 * m;

    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < BETACF_FPMIN) d = BETACF_FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < BETACF_FPMIN) c = BETACF_FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < BETACF_FPMIN) d = BETACF_FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < BETACF_FPMIN) c = BETACF_FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < BETACF_EPS) break;
  }
  return h;
}

/**
 * Regularized incomplete beta function I_x(a, b) — P(X <= x) for X ~
 * Beta(a, b). Standard Numerical-Recipes `betai`: a continued-fraction
 * expansion, chosen on whichever side of the symmetry point (a+1)/(a+b+2)
 * converges fastest, with the complementary identity I_x(a,b) = 1 -
 * I_{1-x}(b,a) used on the far side. Double precision, no external deps.
 */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(gammaLn(a + b) - gammaLn(a) - gammaLn(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

const BETA_INV_TOLERANCE = 1e-14;
const BETA_INV_MAX_ITERATIONS = 200;

/**
 * Inverse of the regularized incomplete beta function (the Beta quantile
 * function, "BetaInv" in spreadsheet/stats-package terminology): solves for
 * x such that regularizedIncompleteBeta(x, a, b) == p. I_x(a,b) is
 * monotonically increasing in x on [0, 1], so bisection on that interval is
 * well-posed. Tolerance on the bracket width, max 200 iterations.
 */
export function betaInv(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < BETA_INV_MAX_ITERATIONS; i++) {
    if (hi - lo < BETA_INV_TOLERANCE) break;
    const mid = (lo + hi) / 2;
    if (regularizedIncompleteBeta(mid, a, b) > p) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Clopper-Pearson EXACT binomial lower bound, via the Beta quantile relation
 * lower = BetaInv(alpha, successes, n - successes + 1). Deliberately more
 * conservative than Wilson (never under-covers) — the worst-case-exact
 * counterpart, not a replacement. Defaults to the one-sided 95% alpha
 * (0.05). Returns 0 when successes = 0 (the Beta quantile relation is
 * degenerate there — no evidence of any success is honestly a lower bound
 * of exactly 0, not an artifact of the numerics). Same integer/range guards
 * as wilsonLowerBound.
 */
export function clopperPearsonLowerBound(successes: number, n: number, alpha: number = ALPHA_ONE_SIDED_95): number {
  assertValidCounts(successes, n);
  if (!(alpha > 0 && alpha < 1)) {
    throw new RangeError(`alpha must be in (0, 1) (got alpha=${alpha})`);
  }
  if (successes === 0) return 0;
  return betaInv(alpha, successes, n - successes + 1);
}

export interface BinomialCoverage {
  readonly fired: number;
  readonly eligible: number;
  /** fired / eligible, or 0 when eligible = 0 (no denominator -> no claim). */
  readonly coverage: number;
}

/**
 * How much of the eligible universe actually fired (e.g. picks published out
 * of picks eligible to be published) — the denominator half of the coverage
 * + lower-bound pairing the handoff requires alongside every published rate.
 * Guards: both counts non-negative, fired <= eligible. Coverage is 0 (not
 * NaN/Infinity) when eligible = 0 — an honest "nothing to report," never a
 * divide-by-zero leak.
 */
export function binomialCoverage(fired: number, eligible: number): BinomialCoverage {
  if (fired < 0 || eligible < 0) {
    throw new RangeError(`fired and eligible must be non-negative (got fired=${fired}, eligible=${eligible})`);
  }
  if (fired > eligible) {
    throw new RangeError(`fired cannot exceed eligible (got fired=${fired}, eligible=${eligible})`);
  }
  return {
    fired,
    eligible,
    coverage: eligible === 0 ? 0 : fired / eligible,
  };
}
