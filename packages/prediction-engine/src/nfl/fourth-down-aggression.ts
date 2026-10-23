/**
 * Fourth-down aggression, measured rather than narrated.
 *
 * FITTED 2026-10-23 on 1,018 decisions (pbp 2018-2021 REG, 4th and <=2,
 * yardline_100 <= 45, 0.10 < wp < 0.90). Mean win-probability delta per branch:
 *
 *   GO    +0.1113  (n=706)
 *   FG    -0.0837  (n=295)
 *   PUNT  -0.2892  (n= 17)
 *
 * Going is worth +19.5 wp points over kicking in this spot. Punting is nearly
 * extinct here (1.7%), so a "punting is bad" claim is now comparing against
 * something staffs barely do — quote the FG comparison, not the punt one.
 *
 * Staff aggression is a real and large trait: go-rate ranges 0.51 (CIN, LA) to
 * 0.94 (PHI) across teams with >=15 such decisions, which is why this is a
 * usable covariate rather than trivia.
 */

export type FourthDownDecision = "go" | "field_goal" | "punt" | "other";

export const WP_DELTA: Readonly<Record<FourthDownDecision, number>> = {
  go: 0.1113,
  field_goal: -0.0837,
  punt: -0.2892,
  other: 0,
};

export const LEAGUE_GO_RATE = 0.694;
export const GO_OVER_FG_WP = 0.195;
export const AGGRESSION_MIN = 0.51;
export const AGGRESSION_MAX = 0.94;

/** Spots the constants were fit on. */
export function isFourthDownSpot(input: {
  readonly down: number;
  readonly distance: number;
  readonly yardline100: number;
  readonly winProbability: number;
}): boolean {
  return (
    input.down === 4 &&
    input.distance > 0 &&
    input.distance <= 2 &&
    input.yardline100 <= 45 &&
    input.winProbability > 0.1 &&
    input.winProbability < 0.9
  );
}

export function classifyDecision(playType: string | null | undefined): FourthDownDecision {
  switch (playType) {
    case "run":
    case "pass":
      return "go";
    case "field_goal":
      return "field_goal";
    case "punt":
      return "punt";
    default:
      return "other";
  }
}

/**
 * How far a staff's go-rate sits from the league, in points of win probability
 * on a single decision. Positive = more aggressive than the league.
 */
export function aggressionDelta(teamGoRate: number): number {
  return teamGoRate - LEAGUE_GO_RATE;
}

/**
 * Expected wp cost of the decision actually taken against going, for a staff
 * with the given go-rate tendency. 0 when the team goes.
 */
export function decisionCostVsGoing(decision: FourthDownDecision): number {
  return WP_DELTA.go - WP_DELTA[decision];
}

/**
 * The branch a passive staff is most likely to take, for the reasoning layer to
 * cite before the snap. Thresholds bracket the observed range.
 */
export function expectedBranch(teamGoRate: number): FourthDownDecision {
  if (teamGoRate >= 0.85) return "go";
  if (teamGoRate >= 0.6) return "go";
  return "field_goal";
}
