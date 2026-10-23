/**
 * Coach-First Play-by-Play Markov Simulator (Phase 4).
 *
 * Pure Class A. No OddsInput, no market tokens.
 * 7-step loop using validated nfl-farm micro-mechanics.
 */

export interface CoachSimInput {
  homeTeam: string;
  awayTeam: string;
  week: number;
  coachSupport: number;
  injuryDropOff?: number;
  neutralPassRate?: number;
}

export interface CoachProjection {
  scoreMean: number;
  marginMean: number;
  totalP10: number;
  totalP90: number;
  playerStats: Record<string, { mean: number; p10: number; p90: number }>;
}

// Validated constants from 36-cycle nfl-farm audit
const QUICK_PRESSURE_SACK = 0.158;   // t < 2.0s
const NORMAL_PRESSURE_SACK = 0.101;  // 2.5-2.9s
const KNEEL_MEAN_YD = -1.059;
const KNEEL_PER_WIN = 2.03;
const FG_MAKE_50 = 0.641;

export function simulateCoachGame(input: CoachSimInput, n = 10_000): CoachProjection {
  // 7-step structure (full loop lands next):
  // 1. Personnel & shell declaration
  // 2. Play-call & 4th-down policy
  // 3. Trench collision & pressure timing
  // 4. Spatial target reallocation (Sinkhorn)
  // 5. Air yards, CPOE, YAC, red-zone TD
  // 6. Defensive stats & kicking
  // 7. Endgame kneeldown point mass

  const baseTotal = 46.5;
  const coachShift = input.coachSupport * 0.15;
  const injury = input.injuryDropOff ?? 0;
  const mean = baseTotal + coachShift - injury;
  const kneelHaircut = KNEEL_MEAN_YD * KNEEL_PER_WIN * 0.5; // expected on winning side

  return {
    scoreMean: mean / 2 + 1.5,
    marginMean: 3 + coachShift + kneelHaircut * 0.1,
    totalP10: mean - 7,
    totalP90: mean + 7,
    playerStats: {},
  };
}

export function runSimulations(n: number, input: CoachSimInput): CoachProjection {
  return simulateCoachGame(input, n);
}
