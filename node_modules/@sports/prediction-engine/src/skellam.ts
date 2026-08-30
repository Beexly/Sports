/**
 * Skellam cover probabilities — first-party, not wired into live scoring.
 *
 * If home and away scoring are independent Poissons with rates λh, λa, the
 * margin M = home − away is Skellam(λh, λa). That is the honest model for
 * hockey/baseball (and soccer) spreads: it does not double-count the Poisson
 * moneyline already in team-rates.ts, and it is not the NFL Stern-normal
 * mixture (key numbers 3/7/6/10 live in a separate module).
 *
 * Implementation is the finite convolution of the two Poisson PMFs, which is
 * exact Skellam on {−maxGoals..maxGoals} and avoids overflow in I_|k|(2√(λh λa)).
 *
 * Live wire: ingestion emits `{ source: "skellam_cover" }` into
 * independentFairValues; scoring uses it for SPREAD rankingP only
 * (heuristic confidence stays market-echo). Callers must supply real λ.
 * Returning null is the honest default.
 *
 * References:
 *   Skellam, J. G. (1946). "The frequency distribution of the difference
 *   between two Poisson variates belonging to different populations."
 *   Journal of the Royal Statistical Society 109(3), 296.
 */

import { poissonPmf } from "./poisson.js";
import { isPoissonValidSport } from "./team-rates.js";

/** Truncation that covers NHL/MLB/soccer tails; basketball/NFL must not call this. */
export const DEFAULT_SKELLAM_MAX_GOALS = 20;

export const SKELLAM_SPORT_PREFIXES = ["soccer", "icehockey", "baseball"] as const;

/** Independent ATS source id. Moneyline ranking must ignore this row. */
export const SKELLAM_COVER_SOURCE = "skellam_cover";

export function isSkellamValidSport(sportKey: string): boolean {
  return isPoissonValidSport(sportKey);
}

export interface SkellamCoverInput {
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  /** Home spread as posted (negative = home favourite). Cover iff M + spreadHome > 0. */
  readonly spreadHome: number;
  readonly maxGoals?: number;
}

export interface SkellamCoverProbabilities {
  readonly homeCover: number;
  readonly awayCover: number;
  readonly push: number;
  readonly coverage: number;
  readonly expectedMargin: number;
}

export interface SkellamPmfPoint {
  readonly margin: number;
  readonly probability: number;
}

function round6(x: number): number {
  return Number(x.toFixed(6));
}

function isPositiveFinite(x: number): boolean {
  return Number.isFinite(x) && x > 0;
}

/**
 * P(M = k) for M ~ Skellam(λh, λa), truncated to |k| ≤ maxGoals via convolution.
 * Returns 0 on degenerate λ or non-integer k.
 */
export function skellamPmf(
  k: number,
  lambdaHome: number,
  lambdaAway: number,
  maxGoals: number = DEFAULT_SKELLAM_MAX_GOALS,
): number {
  if (!Number.isInteger(k)) return 0;
  if (!isPositiveFinite(lambdaHome) || !isPositiveFinite(lambdaAway)) return 0;
  if (!Number.isInteger(maxGoals) || maxGoals < 0) return 0;
  if (Math.abs(k) > maxGoals) return 0;

  let mass = 0;
  if (k >= 0) {
    for (let away = 0; away <= maxGoals - k; away++) {
      mass += poissonPmf(away + k, lambdaHome) * poissonPmf(away, lambdaAway);
    }
  } else {
    const d = -k;
    for (let home = 0; home <= maxGoals - d; home++) {
      mass += poissonPmf(home, lambdaHome) * poissonPmf(home + d, lambdaAway);
    }
  }
  return mass;
}

/** P(M ≤ k), same truncation. */
export function skellamCdf(
  k: number,
  lambdaHome: number,
  lambdaAway: number,
  maxGoals: number = DEFAULT_SKELLAM_MAX_GOALS,
): number {
  if (!Number.isInteger(k)) return 0;
  let sum = 0;
  for (let m = -maxGoals; m <= k && m <= maxGoals; m++) {
    sum += skellamPmf(m, lambdaHome, lambdaAway, maxGoals);
  }
  return Math.min(1, sum);
}

export function skellamPmfGrid(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals: number = DEFAULT_SKELLAM_MAX_GOALS,
): readonly SkellamPmfPoint[] {
  const points: SkellamPmfPoint[] = [];
  for (let m = -maxGoals; m <= maxGoals; m++) {
    points.push({
      margin: m,
      probability: skellamPmf(m, lambdaHome, lambdaAway, maxGoals),
    });
  }
  return points;
}

/**
 * Home-cover / away-cover / push from a Skellam margin and a posted home spread.
 * Half-point spreads have push = 0. Returns null when λ is not a real positive
 * rate or the sport is outside the Poisson-valid set (if sportKey is supplied).
 */
export function skellamCoverProbabilities(
  input: SkellamCoverInput & { readonly sportKey?: string },
): SkellamCoverProbabilities | null {
  if (input.sportKey !== undefined && !isSkellamValidSport(input.sportKey)) {
    return null;
  }
  const { lambdaHome, lambdaAway, spreadHome } = input;
  if (!isPositiveFinite(lambdaHome) || !isPositiveFinite(lambdaAway)) return null;
  if (!Number.isFinite(spreadHome)) return null;

  const maxGoals = input.maxGoals ?? DEFAULT_SKELLAM_MAX_GOALS;
  if (!Number.isInteger(maxGoals) || maxGoals < 0) return null;

  let homeCover = 0;
  let awayCover = 0;
  let push = 0;
  for (let home = 0; home <= maxGoals; home++) {
    const pHome = poissonPmf(home, lambdaHome);
    if (pHome === 0) continue;
    for (let away = 0; away <= maxGoals; away++) {
      const p = pHome * poissonPmf(away, lambdaAway);
      const adjusted = home - away + spreadHome;
      if (adjusted > 0) homeCover += p;
      else if (adjusted < 0) awayCover += p;
      else push += p;
    }
  }

  const coverage = homeCover + awayCover + push;
  return {
    homeCover: round6(homeCover),
    awayCover: round6(awayCover),
    push: round6(push),
    coverage: round6(coverage),
    expectedMargin: round6(lambdaHome - lambdaAway),
  };
}

export interface SkellamCoverFairValue {
  readonly homeFairProb: number;
  readonly awayFairProb: number;
  readonly push: number;
}

/**
 * 2-way ATS fair (push mass removed, sides renormalised) — same bridge as
 * poissonIndependentFairValue dropping draws. Null when no decisive cover mass.
 */
export function skellamCoverFairValue(
  input: SkellamCoverInput & { readonly sportKey?: string },
): SkellamCoverFairValue | null {
  const cover = skellamCoverProbabilities(input);
  if (!cover) return null;
  const twoWay = cover.homeCover + cover.awayCover;
  if (!(twoWay > 0)) return null;
  return {
    homeFairProb: round6(cover.homeCover / twoWay),
    awayFairProb: round6(cover.awayCover / twoWay),
    push: cover.push,
  };
}
