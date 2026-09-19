/**
 * coaching-tendencies.ts — Empirical coaching play-calling biases & game-state situational edges.
 *
 * Grounded in:
 *  - StatsbyLopez / Galef (Advanced Football Analytics): 2nd-and-long rush alternation bias (p < 0.00005)
 *  - Wharton Sports Analytics (2024): 4th-down conversion miscalibration & conservatism gap
 *  - SumerSports: 0.247 coach right-decision-over-expected persistence across seasons
 *  - Yale Sports Analytics: Home/Road early timeout burnout & 2-minute drill asymmetry
 */

export type PlayType = "PASS" | "RUSH" | "PUNT" | "FIELD_GOAL" | "KICKOFF";

export interface PlayCallingContext {
  readonly down: 1 | 2 | 3 | 4;
  readonly distance: number;
  readonly previousPlayType?: PlayType;
  readonly previousPlayGain?: number;
  readonly coachAggressivenessScore?: number; // 0.0 (extreme conservative) to 1.0 (Dan Campbell tier)
  readonly isRoadTeam?: boolean;
  readonly halfSecondsRemaining?: number;
}

export interface CoachingTendencyEdge {
  readonly expectedRunProbability: number;
  readonly baselineRunProbability: number;
  readonly runAlternationDelta: number; // percentage points shift, e.g. +0.19 on 2nd-and-10
  readonly fourthDownGoForItEdgeEv: number; // EV delta vs conservative punt/FG
  readonly lateHalfScoringAdjustmentRoad: number; // point suppression due to depleted road timeouts
}

/**
 * Evaluates coaching situational tendencies and biases.
 */
export function evaluateCoachingTendencies(ctx: PlayCallingContext): CoachingTendencyEdge {
  const down = ctx.down;
  const distance = Math.max(1, ctx.distance);
  const prevPlay = ctx.previousPlayType;
  const prevGain = ctx.previousPlayGain ?? 0;
  const coachAggression = ctx.coachAggressivenessScore ?? 0.50; // 0.50 league baseline

  // 1. Baseline run probabilities by down and distance
  let baselineRunProb = 0.42;
  if (down === 1) baselineRunProb = 0.48;
  else if (down === 2) baselineRunProb = distance >= 8 ? 0.32 : distance <= 3 ? 0.65 : 0.44;
  else if (down === 3) baselineRunProb = distance <= 2 ? 0.58 : distance <= 5 ? 0.24 : 0.12;
  else if (down === 4) baselineRunProb = distance <= 1 ? 0.52 : 0.08;

  // 2. Run-After-Pass Alternation Bias (Jesse Galef / StatsbyLopez)
  // If prior play was a pass, recency bias creates an overcorrection towards run.
  let alternationDelta = 0.0;
  if (prevPlay === "PASS") {
    if (down === 2 && distance >= 8) {
      // On 2nd-and-10, following an incomplete pass (prevGain == 0), the rush spike is largest: +19% absolute
      alternationDelta = prevGain <= 0 ? 0.19 : 0.12;
    } else if (down === 2) {
      alternationDelta = 0.12;
    } else if (down === 1) {
      alternationDelta = 0.06;
    }
  }

  const adjustedRunProb = Math.min(0.95, Math.max(0.05, baselineRunProb + alternationDelta));

  // 3. 4th-Down Conservatism Gap (Wharton model)
  // Actual conversion rates: 4th-and-1: ~70%, 4th-and-2: ~58%, 4th-and-4: ~50%, 4th-and-5: ~42.7%
  // Baseline league decision-making is overly conservative; aggressive coaches capture positive EPA
  let fourthDownEv = 0.0;
  if (down === 4) {
    let actualConversionRate = 0.30;
    let perceivedConservativeRate = 0.22;

    if (distance <= 1) {
      actualConversionRate = 0.70;
      perceivedConservativeRate = 0.55;
    } else if (distance <= 2) {
      actualConversionRate = 0.58;
      perceivedConservativeRate = 0.45;
    } else if (distance <= 4) {
      actualConversionRate = 0.50;
      perceivedConservativeRate = 0.38;
    } else if (distance <= 6) {
      actualConversionRate = 0.42;
      perceivedConservativeRate = 0.32;
    }

    // Edge captured by aggressive coach who converts at actual rate vs conservative baseline punt/FG
    const capturedConversionAdvantage = (actualConversionRate - perceivedConservativeRate) * (coachAggression / 0.50);
    fourthDownEv = capturedConversionAdvantage * 2.2;
  }

  // 4. Road Timeout Asymmetry (Yale Sports Analytics Group)
  // Road teams use 85% of early timeouts on noise avoidance; end of half scoring suffers
  let roadTimeoutPenalty = 0.0;
  if (ctx.isRoadTeam && ctx.halfSecondsRemaining !== undefined && ctx.halfSecondsRemaining <= 120) {
    roadTimeoutPenalty = -1.65; // ~1.65 points suppression on 2-minute drill expectations
  }

  return {
    expectedRunProbability: Number(adjustedRunProb.toFixed(4)),
    baselineRunProbability: Number(baselineRunProb.toFixed(4)),
    runAlternationDelta: Number(alternationDelta.toFixed(4)),
    fourthDownGoForItEdgeEv: Number(fourthDownEv.toFixed(3)),
    lateHalfScoringAdjustmentRoad: Number(roadTimeoutPenalty.toFixed(2)),
  };
}
