/**
 * 4th-down policy for the Coach-First Markov simulator.
 * Pure Class A. No OddsInput, no market tokens.
 *
 * Validated from nfl-farm Cycle 29 / X-SITUATIONAL-TRAINING-CORPUS:
 * - 4th-short GO past midfield: +0.111 WP
 * - FG alternative: -0.084 WP
 * - Gap: +19.5 percentage points (n=1,018)
 * - Staff aggression: 0.51 (CIN/LA) to 0.94 (PHI)
 */

export interface FourthDownState {
  down: 4;
  ydstogo: number;
  yardline: number; // 0 = own goal, 100 = opponent goal
  scoreDiff: number;
  timeRemaining: number; // seconds
  timeouts: number;
  staffAggression: number; // 0-1, team-specific
}

export interface FourthDownDecision {
  action: "GO" | "FG" | "PUNT";
  wpDelta: number;
  rationale: string;
}

const GO_WP_PAST_MIDFIELD = 0.111;
const FG_WP = -0.084;
const GAP = 0.195;

export function evaluateFourthDown(state: FourthDownState): FourthDownDecision {
  const pastMidfield = state.yardline >= 50;
  const short = state.ydstogo <= 2;
  const late = state.timeRemaining <= 120;

  if (pastMidfield && short) {
    const goAdvantage = GO_WP_PAST_MIDFIELD - FG_WP;
    const staffBias = (state.staffAggression - 0.5) * 0.04;
    return {
      action: "GO",
      wpDelta: goAdvantage + staffBias,
      rationale: `4th-short past midfield: GO +${GO_WP_PAST_MIDFIELD.toFixed(3)} WP vs FG ${FG_WP.toFixed(3)} WP (${(GAP * 100).toFixed(1)} pp gap). Staff aggression ${state.staffAggression.toFixed(2)}.`,
    };
  }

  if (state.yardline >= 30 && state.ydstogo <= 5 && state.staffAggression > 0.7) {
    return {
      action: "GO",
      wpDelta: 0.04,
      rationale: "Aggressive staff on 4th-and-medium in FG range prefers GO over FG.",
    };
  }

  if (state.yardline >= 35 && state.ydstogo <= 10) {
    return {
      action: "FG",
      wpDelta: FG_WP,
      rationale: "FG range, not short enough for high-confidence GO.",
    };
  }

  return {
    action: "PUNT",
    wpDelta: 0,
    rationale: "Outside high-value GO window. Punt preserves field position.",
  };
}

export const STAFF_AGGRESSION = {
  PHI: 0.94,
  CIN: 0.51,
  LAR: 0.51,
} as const;
