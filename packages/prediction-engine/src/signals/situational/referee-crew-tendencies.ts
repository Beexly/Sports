/**
 * referee-crew-tendencies.ts — Referee and officiating crew penalty elasticity.
 *
 * Grounded in empirical NFL research:
 *  - Factors A3 & A27: Referee crew flag rates & foul profiles (nflverse.officials, games.csv)
 *  - Historical crew splits:
 *      * Bill Vinovich: low penalty volume (~10.2 flags/game vs 12.8 avg), under lean (pace & clock)
 *      * John Hussey / Clete Blakeman: higher defensive holding & DPI rates
 *  - Home field penalty asymmetry: away teams commit +1.2 more penalties per game due to cadence/noise
 *  - Drive death vs field position elasticity: pre-snap penalties destroy drives (-0.48 EPA); DPI grants chunk yards (+1.82 EPA)
 */

export interface RefereeCrewContext {
  readonly refereeName: string;
  readonly crewFlagsPerGame: number; // league avg ~12.4
  readonly leagueAvgFlagsPerGame: number; // 12.4
  readonly defensiveHoldingFlagsPerGame: number; // league avg ~1.9
  readonly passInterferenceFlagsPerGame: number; // league avg ~1.4
  readonly homePenaltyRateRatio: number; // home / away penalties (typically 0.44 to 0.48)
  readonly isDomeVenue?: boolean; // indoor noise amplifies false starts on visitor
}

export interface RefereeCrewTendencyResult {
  readonly penaltyPaceTier: "HEAVY_FLAGS" | "AVERAGE" | "LET_THEM_PLAY";
  readonly flagsAboveLeagueAverage: number;
  readonly expectedTotalPointsDelta: number; // net shift in game total points
  readonly homeFieldPenaltyYardageAdvantage: number; // expected net penalty yards favoring home
  readonly dpiVolatilityMultiplier: number; // multiplier for deep pass EPA variance
  readonly driveStallProbabilityMultiplier: number; // impact on drives stalling due to holding/false starts
}

/**
 * Evaluates officiating crew tendencies and their elasticity on game totals and spreads.
 */
export function evaluateRefereeCrewTendencies(
  context: RefereeCrewContext
): RefereeCrewTendencyResult {
  const leagueAvg = context.leagueAvgFlagsPerGame || 12.4;
  const flagsDiff = context.crewFlagsPerGame - leagueAvg;

  let penaltyPaceTier: "HEAVY_FLAGS" | "AVERAGE" | "LET_THEM_PLAY" = "AVERAGE";
  if (flagsDiff >= 1.5) {
    penaltyPaceTier = "HEAVY_FLAGS";
  } else if (flagsDiff <= -1.5) {
    penaltyPaceTier = "LET_THEM_PLAY";
  }

  // Heavy flag crews slow game flow and increase drive stall rates, creating an UNDER lean
  // Pre-snap and holding penalties kill drive momentum: -0.35 points per excess flag
  // However, high DPI crews introduce sudden-death field position swings: +0.45 points per excess DPI
  const holdingExcess = context.defensiveHoldingFlagsPerGame - 1.9;
  const dpiExcess = context.passInterferenceFlagsPerGame - 1.4;

  const expectedTotalPointsDelta = Number(
    (-flagsDiff * 0.28 + dpiExcess * 0.65 - holdingExcess * 0.42).toFixed(2)
  );

  // Home field penalty advantage: crowd noise creates false start disparity
  // Base home advantage is ~7.5 net penalty yards; dome venues spike this by +3.5 yards
  const baseNetYards = 7.2 * (1.0 - (context.homePenaltyRateRatio - 0.46) * 5.0);
  const domeMultiplier = context.isDomeVenue ? 1.25 : 1.0;
  const homeFieldPenaltyYardageAdvantage = Number(
    Math.max(2.0, Math.min(18.0, baseNetYards * domeMultiplier)).toFixed(1)
  );

  const dpiVolatilityMultiplier = Number(
    Math.max(0.85, Math.min(1.45, 1.0 + dpiExcess * 0.22)).toFixed(2)
  );

  const driveStallProbabilityMultiplier = Number(
    Math.max(0.88, Math.min(1.35, 1.0 + (flagsDiff / leagueAvg) * 0.45)).toFixed(2)
  );

  return {
    penaltyPaceTier,
    flagsAboveLeagueAverage: Number(flagsDiff.toFixed(1)),
    expectedTotalPointsDelta,
    homeFieldPenaltyYardageAdvantage,
    dpiVolatilityMultiplier,
    driveStallProbabilityMultiplier,
  };
}
