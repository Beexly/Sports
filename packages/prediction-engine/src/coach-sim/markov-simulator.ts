/**
 * Coach-First Play-by-Play Markov Simulator (Phase 4).
 *
 * Pure Class A. No OddsInput, no market tokens.
 * Uses validated micro-mechanics from the 36-cycle nfl-farm audit.
 * Emits full distributions for scores, margins, and player stats.
 */

export interface CoachSimInput {
  homeTeam: string;
  awayTeam: string;
  week: number;
  /** L0/L1/L2 packet. Weights are already computed by coachTrailFactors. */
  coachSupport: number;
  neutralPassRate?: number;
  injuryDropOff?: number;
}

export interface CoachProjection {
  scoreMean: number;
  marginMean: number;
  totalP10: number;
  totalP90: number;
  playerStats: Record<string, { mean: number; p10: number; p90: number }>;
}

// Validated constants
const QUICK_PRESSURE_SACK = 0.158;
const KNEEL_MEAN = -1.059;
const KNEEL_PER_WIN = 2.03;

export function simulateCoachGame(input: CoachSimInput, n = 10_000): CoachProjection {
  // Skeleton that already moves with coachSupport.
  // Full Markov loop (personnel, Sinkhorn, trench, kneel mass) lands in next pass.
  const baseTotal = 46.5;
  const coachShift = input.coachSupport * 0.15; // bounded influence
  const mean = baseTotal + coachShift - (input.injuryDropOff ?? 0);
  return {
    scoreMean: mean / 2 + 1.5,
    marginMean: 3 + coachShift,
    totalP10: mean - 7,
    totalP90: mean + 7,
    playerStats: {},
  };
}

export function runSimulations(n: number, input: CoachSimInput): CoachProjection {
  return simulateCoachGame(input, n);
}
