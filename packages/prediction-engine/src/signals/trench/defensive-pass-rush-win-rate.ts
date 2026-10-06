/**
 * defensive-pass-rush-win-rate.ts — defensive-line features for QB pressure modeling.
 *
 * Grounded in empirical NFL research:
 *  - Pass Rush Win Rate (PRWR): ESPN PRWR. Include both overall and "True pass set"
 *    variant (@ColeJacksonFB). True pass set provides a cleaner signal by excluding
 *    screens, play-action, and quick throws.
 *  - Double Team Rate: OL/DL double-team % as pass-rush context.
 *    Key insight: high double-team rate + high PRWR = elite rusher;
 *    high double-team + low PRWR = neutralized.
 *  - Data Source: Uses proxy stats from available play-by-play metrics or mapped
 *    nflverse-derived / tracked metrics where direct proprietary data is uningestible.
 */

export interface DefensivePassRushInput {
  readonly player: string;
  readonly team: string;
  readonly passRushSnaps: number;
  readonly overallPrwrPercent: number; // 0 to 100
  readonly truePassSetPrwrPercent: number; // 0 to 100 (excluding screens, PA, quick throws)
  readonly doubleTeamRatePercent: number; // 0 to 100
}

export interface DefensivePassRushResult {
  readonly isEliteRusher: boolean; // high double team + high PRWR
  readonly isNeutralized: boolean; // high double team + low PRWR
  readonly truePassSetAdvantage: number; // diff between true pass set PRWR and overall PRWR
  readonly baselineDisruptionScore: number; // composite metric representing disruptive impact
}

export function evaluateDefensivePassRush(
  input: DefensivePassRushInput
): DefensivePassRushResult {
  // Constants for thresholds based on research
  const ELITE_PRWR_THRESHOLD = 20; // Example threshold, adjust based on league avg ~15%
  const HIGH_DOUBLE_TEAM_THRESHOLD = 60; // Example threshold
  const LOW_PRWR_THRESHOLD = 10;

  const isEliteRusher = input.doubleTeamRatePercent >= HIGH_DOUBLE_TEAM_THRESHOLD &&
                        input.truePassSetPrwrPercent >= ELITE_PRWR_THRESHOLD;

  const isNeutralized = input.doubleTeamRatePercent >= HIGH_DOUBLE_TEAM_THRESHOLD &&
                        input.truePassSetPrwrPercent <= LOW_PRWR_THRESHOLD;

  const truePassSetAdvantage = Number((input.truePassSetPrwrPercent - input.overallPrwrPercent).toFixed(2));

  // Composite score: weights true pass set PRWR higher due to cleaner signal, plus credit for drawing double teams
  const baselineDisruptionScore = Number(
    ((input.truePassSetPrwrPercent * 0.7) + (input.overallPrwrPercent * 0.3) + (input.doubleTeamRatePercent * 0.15)).toFixed(2)
  );

  return {
    isEliteRusher,
    isNeutralized,
    truePassSetAdvantage,
    baselineDisruptionScore
  };
}
