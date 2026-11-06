/**
 * Proper scoring rules beyond Brier — pure diagnostics, shadow only.
 *
 * Complements probability-calibration.ts (Murphy/Brier/PAVA).
 * Never imports live scoring, confidence, or public-copy modules.
 *
 * - logScoreBinary: strictly proper; harsh on overconfident tails
 * - winklerIntervalScore: strictly proper for central prediction intervals
 *   (Winkler 1972; Gneiting & Raftery 2007 §6.2)
 */

export interface ShadowDiagnostic {
  readonly priced: false;
  readonly status: "shadow";
}

/**
 * Binary logarithmic score (negative orientation: lower is better when negated
 * for ranking; here we return the natural log likelihood contribution so
 * higher is better).
 *
 * S(p,y) = y log p + (1-y) log(1-p)
 * Clamps p away from {0,1} to avoid -Infinity while remaining honest about
 * extreme forecasts (epsilon = 1e-12).
 */
export function logScoreBinary(p: number, y: 0 | 1): number {
  if (!Number.isFinite(p)) return Number.NEGATIVE_INFINITY;
  const eps = 1e-12;
  const clamped = Math.min(1 - eps, Math.max(eps, p));
  return y === 1 ? Math.log(clamped) : Math.log(1 - clamped);
}

/** Mean log score over a batch (higher is better). */
export function meanLogScoreBinary(
  samples: readonly { readonly p: number; readonly y: 0 | 1 }[],
): number & ShadowDiagnostic {
  if (samples.length === 0) {
    return Object.assign(Number.NaN, { priced: false as const, status: "shadow" as const });
  }
  let sum = 0;
  for (const s of samples) sum += logScoreBinary(s.p, s.y);
  const mean = sum / samples.length;
  return Object.assign(mean, { priced: false as const, status: "shadow" as const });
}

/**
 * Winkler interval score for a single central (1−α) prediction interval [lo, hi].
 *
 * IS_α(lo,hi,y) =
 *   (hi − lo)
 *   + (2/α)(lo − y) 1{y < lo}
 *   + (2/α)(y − hi) 1{y > hi}
 *
 * Lower is better. Rewards narrow intervals that still cover; penalizes
 * misses proportional to distance outside the interval.
 *
 * α = 1 − targetCoverage (e.g. 0.1 for 90% intervals).
 */
export function winklerIntervalScore(
  lo: number,
  hi: number,
  y: number,
  alpha: number,
): number {
  if (
    !Number.isFinite(lo) ||
    !Number.isFinite(hi) ||
    !Number.isFinite(y) ||
    !Number.isFinite(alpha) ||
    alpha <= 0 ||
    alpha >= 1 ||
    hi < lo
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const width = hi - lo;
  let penalty = 0;
  if (y < lo) penalty = (2 / alpha) * (lo - y);
  else if (y > hi) penalty = (2 / alpha) * (y - hi);
  return width + penalty;
}

/** Mean Winkler score (lower is better). */
export function meanWinklerIntervalScore(
  rows: readonly {
    readonly lo: number;
    readonly hi: number;
    readonly y: number;
  }[],
  alpha: number,
): { readonly mean: number; readonly priced: false; readonly status: "shadow" } {
  if (rows.length === 0) {
    return { mean: Number.NaN, priced: false, status: "shadow" };
  }
  let sum = 0;
  for (const r of rows) sum += winklerIntervalScore(r.lo, r.hi, r.y, alpha);
  return { mean: sum / rows.length, priced: false, status: "shadow" };
}
