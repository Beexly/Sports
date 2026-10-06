/**
 * fourth-down-coaching-aggressiveness.ts — Head coach 4th-down decision elasticity.
 *
 * Grounded in empirical nflverse research (Factor A13 & Baldy/PFF 4th down studies):
 *  - Aggressive analytics-forward coaches (e.g. Campbell, Sirianni, Harbaugh, Staley historically):
 *      * Go-for-it rate on 4th-and-short (<= 2 yards) outside own 30 is 74% vs league avg 48%.
 *      * Net EPA gained per game from optimal 4th down decisions: +1.85 to +2.40 EPA.
 *      * Total points shift: Aggressive decision-making increases high-leverage drive completions (+1.8 points on total).
 *  - Ultra-conservative punt-first coaches:
 *      * Forfeit ~1.4 expected points per game through sub-optimal punting and long field goal attempts.
 */

export interface FourthDownCoachingContext {
  readonly coachName: string;
  readonly fourthDownGoRateOverExpected: number; // e.g. +0.18 (aggressive) to -0.15 (conservative)
  readonly redZoneFourthDownGoRate: number; // 0.0 to 1.0
  readonly scoreDifferential: number;
  readonly quarter: 1 | 2 | 3 | 4 | 5;
}

export interface FourthDownCoachingResult {
  readonly aggressivenessTier: "ANALYTICS_AGGRESSIVE" | "BALANCED_MODERATE" | "CONSERVATIVE_PUNT_FIRST";
  readonly expectedGoProbabilityOnFourthAndShort: number; // 4th and 1-2 yards in opponent territory
  readonly gameTotalPointsElasticity: number; // points shift on game total
  readonly winProbabilityOptimizationBonus: number; // net WP delta vs passive coaching
  readonly driveContinuationMultiplier: number;
}

/**
 * Evaluates head coach fourth down decision elasticity and its impact on game total and spread.
 */
export function evaluateFourthDownCoachingAggressiveness(
  context: FourthDownCoachingContext
): FourthDownCoachingResult {
  const LEAGUE_BASELINE_GO_RATE = 0.48;
  const goOverExpected = context.fourthDownGoRateOverExpected;

  let tier: "ANALYTICS_AGGRESSIVE" | "BALANCED_MODERATE" | "CONSERVATIVE_PUNT_FIRST" = "BALANCED_MODERATE";
  if (goOverExpected >= 0.10) {
    tier = "ANALYTICS_AGGRESSIVE";
  } else if (goOverExpected <= -0.08) {
    tier = "CONSERVATIVE_PUNT_FIRST";
  }

  // Baseline probability of going for it on 4th & 1-2 at opponent 45
  const rawGoProb = LEAGUE_BASELINE_GO_RATE + goOverExpected;
  const expectedGoProb = Number(Math.max(0.15, Math.min(0.92, rawGoProb)).toFixed(3));

  // Points shift on total: Aggressive coaches avoid low-EV punts and convert more TDs
  let pointsShift = 0.0;
  let wpBonus = 0.0;
  let driveMult = 1.0;

  if (tier === "ANALYTICS_AGGRESSIVE") {
    pointsShift = 1.65;
    wpBonus = 0.024;
    driveMult = 1.14;
  } else if (tier === "CONSERVATIVE_PUNT_FIRST") {
    pointsShift = -1.20;
    wpBonus = -0.018;
    driveMult = 0.92;
  }

  // Trailing coaches are forced aggressive in 4th quarter
  if (context.scoreDifferential <= -7 && context.quarter === 4) {
    pointsShift += 0.45;
    driveMult += 0.05;
  }

  return {
    aggressivenessTier: tier,
    expectedGoProbabilityOnFourthAndShort: expectedGoProb,
    gameTotalPointsElasticity: Number(pointsShift.toFixed(2)),
    winProbabilityOptimizationBonus: Number(wpBonus.toFixed(3)),
    driveContinuationMultiplier: Number(driveMult.toFixed(2)),
  };
}
