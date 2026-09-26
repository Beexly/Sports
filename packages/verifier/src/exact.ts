/**
 * Exact-rational Wilson bounds — the formal companion to `wilsonInterval`.
 *
 * Ported from the natural/formal hybrid idea of arXiv:2505.23703, "Let's Reason
 * Formally: Natural-Formal Hybrid Reasoning Enhances LLM's Math Capability"
 * (Wang, Li, Fung & Zhang): a claim stated in prose ("the upper Wilson bound at
 * k = n is 1") is worth much more when a formal layer can discharge it, and the
 * natural-language layer is what says WHICH claim matters.
 *
 * The claim this file discharges is the one the repo's own pins document and
 * tolerate: the float path returns 0.9999999999999999 for
 * `wilsonInterval(10, 10).high` because centre + margin is mathematically 1 but
 * lands a ULP short in IEEE754, so an exact containment test
 * `rate <= interval.high` FAILS at k = n. That is a rounding artifact, and here
 * it is proven rather than asserted: with `z` carried as an exact rational the
 * bound is exactly 1, and the float deviation is measured and reported.
 *
 * Everything is BigInt rational arithmetic — no floating point anywhere in the
 * computation, so there is nothing to round. The scale assertions refuse rather
 * than silently losing precision.
 */

export type ExactRational = {
  /** Numerator over `denominator`, already reduced. */
  readonly numerator: bigint;
  readonly denominator: bigint;
};

export type WilsonExactResult = {
  readonly successes: bigint;
  readonly n: bigint;
  /** Exact point estimate k/n. */
  readonly point: ExactRational;
  readonly low: ExactRational;
  readonly high: ExactRational;
  readonly z: ExactRational;
  /** Exact high converted to a double, for side-by-side reading only. */
  readonly highAsDouble: number;
};

/**
 * The formal/numeric audit of one interval: what the exact bound is, what the
 * float path reports, and whether the containment test `rate <= high` survives
 * each. This is the hybrid step — the prose claim is "the bound at k = n is 1",
 * the exact layer proves it, and the float layer is shown to be a ULP short.
 */
export type WilsonBoundaryAudit = {
  readonly exact: WilsonExactResult;
  readonly float: { readonly low: number; readonly high: number; readonly point: number } | null;
  /** floatHigh - exactHigh. Negative means the float path UNDER-reports. */
  readonly highGap: number;
  readonly floatLowGap: number;
  /** rate <= exactHigh, evaluated exactly. */
  readonly containmentHoldsExactly: boolean;
  /** rate <= floatHigh, evaluated in IEEE754 — the check that actually fails. */
  readonly containmentHoldsInFloat: boolean;
  /** True when the two layers disagree about containment. */
  readonly floatBreaksContainment: boolean;
};

/** z_95 = 1.959963984540054, exactly: 1959963984540054 / 10^15. */
export const Z_95_EXACT: ExactRational = {
  numerator: 1959963984540054n,
  denominator: 1000000000000000n,
};

const ONE: ExactRational = { numerator: 1n, denominator: 1n };
const ZERO: ExactRational = { numerator: 0n, denominator: 1n };

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

function make(numerator: bigint, denominator: bigint): ExactRational {
  if (denominator === 0n) throw new Error("zero denominator");
  let n = numerator;
  let d = denominator;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { numerator: n / g, denominator: d / g };
}

const add = (a: ExactRational, b: ExactRational): ExactRational =>
  make(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
const sub = (a: ExactRational, b: ExactRational): ExactRational =>
  make(a.numerator * b.denominator - b.numerator * a.denominator, a.denominator * b.denominator);
const mul = (a: ExactRational, b: ExactRational): ExactRational =>
  make(a.numerator * b.numerator, a.denominator * b.denominator);
const div = (a: ExactRational, b: ExactRational): ExactRational =>
  make(a.numerator * b.denominator, a.denominator * b.numerator);
const cmp = (a: ExactRational, b: ExactRational): number => {
  const l = a.numerator * b.denominator;
  const r = b.numerator * a.denominator;
  return l < r ? -1 : l > r ? 1 : 0;
};
const toNumber = (r: ExactRational): number => Number(r.numerator) / Number(r.denominator);
const clamp01Exact = (r: ExactRational): ExactRational =>
  cmp(r, ZERO) < 0 ? ZERO : cmp(r, ONE) > 0 ? ONE : r;

function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error("isqrt of a negative integer");
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

/** sqrt(num/den) as an exact rational, via isqrt(num*den)/den. */
function sqrtExact(r: ExactRational): ExactRational {
  if (cmp(r, ZERO) < 0) throw new Error("sqrtExact of a negative rational");
  return make(isqrt(r.numerator * r.denominator), r.denominator);
}

/**
 * Runaway guard, not a precision guard: BigInt is arbitrary-precision, so
 * nothing is silently rounded. The reduced Wilson fractions carry z^2 (denominator
 * 10^30) through n^2 and then through every add/multiply, so a few hundred bits
 * is ordinary; the limit exists only to stop a pathological input from spinning,
 * and it is deliberately far above anything a real panel needs.
 */
const assertScaleFits = (value: bigint, bits = 4096n): void => {
  const a = value < 0n ? -value : value;
  if (a >= 1n << bits) throw new Error(`exact arithmetic would exceed ${bits}-bit budget`);
};

/**
 * sqrt( p(1-p)/n + z^2/(4n^2) ) — the Wilson margin's inner term, written out
 * so it can be audited against `wilsonInterval` line by line.
 */
export function wilsonMarginExact(k: bigint, n: bigint, z: ExactRational): ExactRational {
  const p = make(k, n);
  const z2 = mul(z, z);
  const inner = add(
    div(mul(p, sub(ONE, p)), make(n, 1n)),
    div(z2, make(4n * n * n, 1n)),
  );
  return sqrtExact(inner);
}

/**
 * Two-sided Wilson score interval in exact rational arithmetic.
 *
 * Same formula, same z default and same null on n <= 0 as `wilsonInterval`, but
 * every intermediate is a reduced fraction, so the k = n boundary comes out as
 * exactly 1 rather than 0.9999999999999999.
 */
export function wilsonExact(
  k: number,
  n: number,
  z: ExactRational = Z_95_EXACT,
): WilsonExactResult | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  const N = BigInt(Math.floor(n));
  const K = (() => {
    const raw = BigInt(Math.floor(k));
    if (raw < 0n) return 0n;
    return raw > N ? N : raw;
  })();

  const z2 = mul(z, z);
  const p = make(K, N);
  const denom = add(ONE, div(z2, make(N, 1n)));
  const centre = div(add(p, div(z2, make(2n * N, 1n))), denom);
  const margin = mul(div(z, denom), wilsonMarginExact(K, N, z));
  assertScaleFits(centre.denominator);
  assertScaleFits(margin.denominator);

  const low = clamp01Exact(sub(centre, margin));
  const high = clamp01Exact(add(centre, margin));
  return {
    successes: K,
    n: N,
    point: p,
    low,
    high,
    z,
    highAsDouble: toNumber(high),
  };
}

/**
 * Run BOTH layers on the same (k, n) and report where they disagree.
 *
 * `rate` defaults to the observed point estimate k/n — the containment test a
 * caller would actually write. At k = n the exact bound is 1 and containment
 * holds; the float path returns 0.9999999999999999 and containment fails. That
 * disagreement is the whole point: it turns a tolerated IEEE754 footnote into a
 * measured, checkable number, and tells a caller exactly when a tolerance is
 * required.
 */
export function wilsonBoundaryAudit(
  k: number,
  n: number,
  options?: { readonly z?: ExactRational; readonly rate?: number },
): WilsonBoundaryAudit | null {
  const z = options?.z ?? Z_95_EXACT;
  const exact = wilsonExact(k, n, z);
  if (!exact) return null;
  const float = wilsonIntervalFloat(k, n, z);
  const rate = options?.rate ?? toNumber(exact.point);
  const rateExact = make(BigInt(Math.round(rate * 1e12)), 1000000000000n);
  const holdsExactly = cmp(exact.high, rateExact) >= 0;
  const holdsInFloat = float ? float.high >= rate : false;
  return {
    exact,
    float,
    highGap: float ? float.high - toNumber(exact.high) : NaN,
    floatLowGap: float ? float.low - toNumber(exact.low) : NaN,
    containmentHoldsExactly: holdsExactly,
    containmentHoldsInFloat: holdsInFloat,
    floatBreaksContainment: holdsExactly && !holdsInFloat,
  };
}

/** The float path, accepting the same exact z so the two layers differ only in arithmetic. */
function wilsonIntervalFloat(
  k: number,
  n: number,
  z: ExactRational,
): { low: number; high: number; point: number } | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  const total = Math.floor(n);
  const successes = Math.min(total, Math.max(0, Math.floor(k)));
  const p = successes / total;
  const zf = toNumber(z);
  const z2 = zf * zf;
  const denom = 1 + z2 / total;
  const centre = (p + z2 / (2 * total)) / denom;
  const margin = (zf / denom) * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));
  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
  return { low: clamp01(centre - margin), high: clamp01(centre + margin), point: p };
}

/** String form for error messages and pins: "num/den" or "num" when integral. */
export function formatExact(r: ExactRational): string {
  return r.denominator === 1n ? `${r.numerator}` : `${r.numerator}/${r.denominator}`;
}
