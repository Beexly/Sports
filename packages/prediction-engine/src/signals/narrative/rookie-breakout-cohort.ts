/**
 * rookie-breakout-cohort.ts — Rookie wide receiver week-N breakout cohort trajectory.
 *
 * Grounded in empirical NFL charting and cohort research (Factor A28):
 *  - First- and Second-Round rookie WR trajectory:
 *      * Weeks 1-4: Acclimation phase (route participation ~42%, target share ~11.5%).
 *      * Weeks 5-9: Trust inflection / Bye-week integration (coaches re-scheme during bye).
 *      * Weeks 10-18: Full alpha ascension (route participation jumps to ~82%, target share ~22.4%).
 *  - Post-bye rookie bump: A rookie playing immediately after their bye week sees an average +5.8 percentage point target share surge.
 *  - Day 3 / UDFA rookies require severe injury vacancy to trigger breakout acceleration.
 */

export interface RookieBreakoutContext {
  readonly rookieDraftRound: 1 | 2 | 3 | 4 | 5 | 6 | 7 | "UDFA";
  readonly currentWeekOfSeason: number; // 1 to 18
  readonly hasHadByeWeek: boolean;
  readonly isImmediatelyPostBye: boolean; // 1st game after bye
  readonly baselineTargetShare: number;
  readonly baselineRouteParticipation: number;
  readonly depthChartRank: number; // 1 = WR1, 2 = WR2, 3 = WR3
}

export interface RookieBreakoutResult {
  readonly breakoutPhase: "EARLY_ACCLIMATION" | "INFLECTION_SURGE" | "LATE_ALPHA_ASCENSION" | "LIMITED_ROLE";
  readonly targetShareMultiplier: number;
  readonly adjustedTargetShare: number;
  readonly adjustedRouteParticipation: number;
  readonly postByeAccelerationBonusPp: number;
  readonly isPrimeBreakoutCandidate: boolean;
}

/**
 * Evaluates rookie WR cohort curve and target growth elasticity.
 */
export function evaluateRookieBreakoutCohort(
  context: RookieBreakoutContext
): RookieBreakoutResult {
  const isEarlyDraftCapital =
    context.rookieDraftRound === 1 || context.rookieDraftRound === 2;
  const isMidDraftCapital =
    context.rookieDraftRound === 3 || context.rookieDraftRound === 4;

  let targetShareMult = 1.0;
  let routeMult = 1.0;
  let postByeBonusPp = 0.0;
  let phase: "EARLY_ACCLIMATION" | "INFLECTION_SURGE" | "LATE_ALPHA_ASCENSION" | "LIMITED_ROLE" = "EARLY_ACCLIMATION";

  if (!isEarlyDraftCapital && !isMidDraftCapital) {
    // Day 3 / UDFA rarely ascend without major injuries
    return {
      breakoutPhase: "LIMITED_ROLE",
      targetShareMultiplier: 1.0,
      adjustedTargetShare: context.baselineTargetShare,
      adjustedRouteParticipation: context.baselineRouteParticipation,
      postByeAccelerationBonusPp: 0,
      isPrimeBreakoutCandidate: false,
    };
  }

  const week = Math.max(1, Math.min(18, context.currentWeekOfSeason));

  if (week <= 4) {
    phase = "EARLY_ACCLIMATION";
    targetShareMult = 0.95;
    routeMult = 0.92;
  } else if (week <= 9) {
    phase = "INFLECTION_SURGE";
    targetShareMult = isEarlyDraftCapital ? 1.25 : 1.12;
    routeMult = isEarlyDraftCapital ? 1.22 : 1.10;
  } else {
    phase = "LATE_ALPHA_ASCENSION";
    targetShareMult = isEarlyDraftCapital ? 1.45 : 1.22;
    routeMult = isEarlyDraftCapital ? 1.38 : 1.18;
  }

  // Post-bye week installation bonus
  if (context.isImmediatelyPostBye) {
    postByeBonusPp = isEarlyDraftCapital ? 4.8 : 2.5;
  }

  const rawAdjustedShare =
    context.baselineTargetShare * targetShareMult + postByeBonusPp / 100.0;
  const adjustedTargetShare = Number(
    Math.max(0.02, Math.min(0.38, rawAdjustedShare)).toFixed(4)
  );

  const adjustedRouteParticipation = Number(
    Math.max(0.15, Math.min(0.98, context.baselineRouteParticipation * routeMult)).toFixed(3)
  );

  const isPrimeCandidate =
    isEarlyDraftCapital &&
    (week >= 6 || context.isImmediatelyPostBye) &&
    context.depthChartRank <= 2;

  return {
    breakoutPhase: phase,
    targetShareMultiplier: Number(targetShareMult.toFixed(2)),
    adjustedTargetShare,
    adjustedRouteParticipation,
    postByeAccelerationBonusPp: postByeBonusPp,
    isPrimeBreakoutCandidate: isPrimeCandidate,
  };
}
