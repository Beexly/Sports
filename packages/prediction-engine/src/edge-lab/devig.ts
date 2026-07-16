/**
 * De-vig — converting a two-way (or n-way) book market's decimal odds into
 * no-vig ("fair") probabilities (handoff §2 Phase 0: both routines required,
 * unit-tested on known books).
 *
 * Two routines, deliberately kept side by side instead of picking one winner:
 *
 *  - PROPORTIONAL is the house default: implied_i = 1/decimalOdds_i, then
 *    normalize by the sum. Simple, transparent, and the right choice when the
 *    book itself is the estimate of fair value and no further correction is
 *    warranted.
 *
 *  - SHIN (1992) corrects the FAVOURITE-LONGSHOT BIAS that proportional
 *    de-vig leaves behind. Shin's model attributes the overround to a
 *    proportion `z` of informed ("insider") money rather than spreading it
 *    evenly across outcomes; solving for `z` and re-deriving probabilities
 *    from it pulls probability mass OFF longshots and onto favourites
 *    relative to the proportional split. It matters most exactly where
 *    proportional de-vig is weakest: longshots, where bookmakers price in
 *    more margin because mispriced longshots are the ones informed bettors
 *    exploit. On a genuinely vig-free book (overround == 1) both routines
 *    agree and Shin fits z ~ 0.
 *
 * Guard philosophy mirrors the repo's existing sub-vig guard
 * (edge-engine.ts / scoring.ts computeEdgeScore): a market whose implied
 * probabilities sum to LESS than 1 cannot come from honest two-way pricing —
 * it is crossed, stale, or a mixed-format input error — and de-vigging it
 * would manufacture probabilities that no real market supports. Both
 * routines refuse (return null) rather than emit a fabricated number.
 *
 * Pure, deterministic, no I/O.
 */

/** Convert one decimal price to a raw implied probability (1/d). Guarded:
 * non-finite or non-positive prices (which cannot be real decimal odds)
 * return NaN rather than Infinity/garbage, so a caller who skips the
 * market-level guards still gets an honestly-unusable value instead of a
 * silently wrong one. */
export function impliedFromDecimal(d: number): number {
  if (!Number.isFinite(d) || d <= 0) return NaN;
  return 1 / d;
}

/** Is this decimal-odds array usable for de-vigging at all? Every price must
 * be finite and > 1 (decimal odds of exactly 1 or below imply certainty or
 * negative payout, which is not a real price). */
function hasValidPrices(decimalOdds: readonly number[]): boolean {
  if (decimalOdds.length === 0) return false;
  for (const d of decimalOdds) {
    if (!Number.isFinite(d) || d <= 1) return false;
  }
  return true;
}

/**
 * Proportional de-vig — the house default. implied_i = 1/decimalOdds_i,
 * normalized by their sum (the "overround"). Null when any price is
 * non-finite/<=1, or when the overround is < 1: a sub-vig market is
 * crossed/stale and refused rather than de-vigged into a fabricated split
 * (see header).
 */
export function proportionalDevig(decimalOdds: readonly number[]): number[] | null {
  if (!hasValidPrices(decimalOdds)) return null;

  const implied = decimalOdds.map(impliedFromDecimal);
  const overround = implied.reduce((sum, p) => sum + p, 0);
  if (overround < 1) return null; // sub-vig: crossed/stale, refuse

  return implied.map((p) => p / overround);
}

export interface ShinResult {
  readonly probs: number[];
  /** Fitted insider-trading fraction z, roughly in [0, 0.2] for real books. */
  readonly z: number;
}

/** Shin probability for one outcome at a trial z, given its raw implied
 * probability `pi` and the booksum `B` (sum of raw implied probabilities). */
function shinProbAt(pi: number, B: number, z: number): number {
  const denom = 2 * (1 - z);
  return (Math.sqrt(z * z + (4 * (1 - z) * pi * pi) / B) - z) / denom;
}

/** Sum of Shin probabilities across all outcomes at trial z. Monotonically
 * decreasing in z (verified: at z=0 the sum is sqrt(B) >= 1 for B >= 1, and
 * it falls toward the individual pi_i/... shape as z -> 1), which is exactly
 * what makes the bisection below well-posed. */
function shinSumAt(implied: readonly number[], B: number, z: number): number {
  let sum = 0;
  for (const pi of implied) sum += shinProbAt(pi, B, z);
  return sum;
}

const SHIN_TOLERANCE = 1e-10;
const SHIN_MAX_ITERATIONS = 200;

/**
 * Shin (1992) de-vig. For the n-outcome case, solves for the insider fraction
 * z such that probabilities
 *
 *   p_i = (sqrt(z^2 + 4(1-z)*pi_i^2/B) - z) / (2(1-z))
 *
 * sum to 1, where pi_i are the raw implied probabilities (1/decimalOdds_i)
 * and B = sum(pi_i) (the booksum/overround). Solved by bisection on z (the
 * sum is monotone decreasing in z), tolerance 1e-10 on the sum residual, max
 * 200 iterations.
 *
 * The search starts in the documented z in [0, ~0.2] band that covers every
 * real sportsbook overround; it widens (capped just below 1, so 1-z never
 * hits zero) only for pathological, far-outside-market overrounds that need
 * more insider share to close the sum at all. On a genuinely fair book
 * (B == 1) the bisection converges to z == 0 and the returned probs equal
 * the raw implied probabilities (within float precision).
 *
 * Null on the same invalid inputs as proportionalDevig: any non-finite/<=1
 * price, or a sub-vig (overround < 1) market.
 */
export function shinDevig(decimalOdds: readonly number[]): ShinResult | null {
  if (!hasValidPrices(decimalOdds)) return null;

  const implied = decimalOdds.map(impliedFromDecimal);
  const B = implied.reduce((sum, p) => sum + p, 0);
  if (B < 1) return null; // sub-vig: crossed/stale, refuse

  let lo = 0;
  let hi = 0.2;
  // Widen the bracket for pathological high-overround inputs where the root
  // lies past the documented ~0.2 band; capped below 1 so (1 - hi) > 0 always.
  while (shinSumAt(implied, B, hi) > 1 && hi < 0.999999) {
    hi = Math.min(hi * 2, 0.999999);
  }

  let z = lo;
  for (let i = 0; i < SHIN_MAX_ITERATIONS; i++) {
    z = (lo + hi) / 2;
    const residual = shinSumAt(implied, B, z) - 1;
    if (Math.abs(residual) < SHIN_TOLERANCE) break;
    if (residual > 0) lo = z;
    else hi = z;
  }

  const rawProbs = implied.map((pi) => shinProbAt(pi, B, z));
  const total = rawProbs.reduce((sum, p) => sum + p, 0);
  const probs = total > 0 ? rawProbs.map((p) => p / total) : rawProbs;

  return { probs, z };
}
