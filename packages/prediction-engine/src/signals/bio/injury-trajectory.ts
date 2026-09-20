/**
 * injury-trajectory.ts — NFL Practice Report Trajectory & Injury Timing Signal.
 *
 * Grounded in:
 *  - Official NFL Injury Reporting Cadence (Wed/Thu/Fri practice reports, Fri game-status)
 *  - Historical play rates: Questionable ~72% actual play rate, Doubtful ~25%
 *  - Trajectory dynamics: Downgrade (FP->DNP or LP->DNP) signals 82% inactive probability
 *  - Positional spread leverage: Starting QB 3-7 pts, Elite WR1 1.5-3 pts, LT 1-3 pts
 */

export type PracticeStatus = "FP" | "LP" | "DNP" | "DNP_NIR" | "MP";
export type OfficialGameStatus = "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "ACTIVE" | "NONE";
export type PlayerPositionTier = "QB_STARTER" | "WR1_ELITE" | "RB_BELLCOW" | "LT_ANCHOR" | "CB_SHUTDOWN" | "STARTER_OTHER";

export interface InjuryPracticeReport {
  readonly wednesday?: PracticeStatus;
  readonly thursday?: PracticeStatus;
  readonly friday?: PracticeStatus;
  readonly officialStatus?: OfficialGameStatus;
  readonly positionTier: PlayerPositionTier;
}

export interface InjuryTrajectoryAnalysis {
  readonly estimatedPlayProbability: number;
  readonly trajectoryTrend: "IMPROVING" | "DETERIORATING" | "STATIC_HEALTHY" | "STATIC_INJURED" | "VETERAN_REST";
  readonly spreadImpactPointsIfOut: number;
  readonly marketOverreactionFadePoints: number; // Edge if market overprices absence on Questionable
  readonly hasEarlyWarningDowngrade: boolean; // Detected before official Friday designation
}

const SPREAD_LEVERAGE_BY_POSITION: Record<PlayerPositionTier, number> = {
  QB_STARTER: 4.5,
  WR1_ELITE: 2.25,
  RB_BELLCOW: 1.75,
  LT_ANCHOR: 2.0,
  CB_SHUTDOWN: 1.5,
  STARTER_OTHER: 0.6,
};

/**
 * Calculates injury trajectory, play probability, and market pricing misalignments.
 */
export function analyzeInjuryTrajectory(report: InjuryPracticeReport): InjuryTrajectoryAnalysis {
  const spreadLeverage = SPREAD_LEVERAGE_BY_POSITION[report.positionTier] ?? 0.6;
  const status = report.officialStatus ?? "NONE";

  // Check for veteran rest
  if (report.wednesday === "DNP_NIR" && (report.thursday === "FP" || report.friday === "FP")) {
    return {
      estimatedPlayProbability: 0.98,
      trajectoryTrend: "VETERAN_REST",
      spreadImpactPointsIfOut: spreadLeverage,
      marketOverreactionFadePoints: 0.0,
      hasEarlyWarningDowngrade: false,
    };
  }

  // Official Status Anchors
  if (status === "OUT") {
    return {
      estimatedPlayProbability: 0.0,
      trajectoryTrend: "STATIC_INJURED",
      spreadImpactPointsIfOut: spreadLeverage,
      marketOverreactionFadePoints: 0.0,
      hasEarlyWarningDowngrade: false,
    };
  }

  if (status === "DOUBTFUL") {
    return {
      estimatedPlayProbability: 0.25,
      trajectoryTrend: "STATIC_INJURED",
      spreadImpactPointsIfOut: spreadLeverage,
      marketOverreactionFadePoints: 0.0,
      hasEarlyWarningDowngrade: false,
    };
  }

  // Trajectory Assessment across Wed, Thu, Fri
  let playProb = 0.85;
  let trend: InjuryTrajectoryAnalysis["trajectoryTrend"] = "STATIC_HEALTHY";
  let hasDowngrade = false;

  const wed = report.wednesday;
  const thu = report.thursday;
  const fri = report.friday;

  // Deterioration: Thursday or Friday downgrade from FP/LP to DNP
  if ((wed === "FP" || wed === "LP") && (thu === "DNP" || fri === "DNP")) {
    trend = "DETERIORATING";
    playProb = 0.18;
    hasDowngrade = true;
  } else if (thu === "LP" && fri === "DNP") {
    trend = "DETERIORATING";
    playProb = 0.20;
    hasDowngrade = true;
  }
  // Improvement: DNP -> LP -> FP
  else if (wed === "DNP" && (thu === "LP" || thu === "FP") && fri === "FP") {
    trend = "IMPROVING";
    playProb = 0.90;
  } else if (wed === "LP" && fri === "FP") {
    trend = "IMPROVING";
    playProb = 0.92;
  }
  // Static DNP throughout
  else if (wed === "DNP" && thu === "DNP" && fri === "DNP") {
    trend = "STATIC_INJURED";
    playProb = 0.05;
  }

  // Questionable adjustments:
  // Historical data proves ~72% of Questionable tags play.
  // When a player improves to FP on Friday but remains listed Questionable, P(play) is ~88%.
  let marketFadeEdge = 0.0;
  if (status === "QUESTIONABLE") {
    if (fri === "FP") {
      playProb = 0.88;
      // Retail market often deducts 0.75-1.5 pts expecting absence or limited reps; fade edge
      marketFadeEdge = Number((spreadLeverage * 0.35).toFixed(2));
    } else if (fri === "LP") {
      playProb = 0.72;
      marketFadeEdge = Number((spreadLeverage * 0.20).toFixed(2));
    } else if (fri === "DNP") {
      playProb = 0.35; // Questionable with Friday DNP is effectively Doubtful
      marketFadeEdge = 0.0;
    }
  }

  return {
    estimatedPlayProbability: Number(playProb.toFixed(3)),
    trajectoryTrend: trend,
    spreadImpactPointsIfOut: spreadLeverage,
    marketOverreactionFadePoints: marketFadeEdge,
    hasEarlyWarningDowngrade: hasDowngrade,
  };
}
