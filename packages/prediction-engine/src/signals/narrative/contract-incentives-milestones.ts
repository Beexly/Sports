/**
 * contract-incentives-milestones.ts — Contract incentives, milestone proximity, and financial escalators.
 *
 * Grounded in empirical NFL research:
 *  - Factor A15 & Workstream 5B: Documented OverTheCap (OTC) incentives & performance escalators
 *  - Late-season milestone proximity (Weeks 14-18):
 *      * Players within 5-15% of a contract milestone (e.g. 75/80 catches, 910/1000 rush yds, 8.5/10 sacks)
 *        receive statistically significant target funneling and goal-line touch prioritization.
 *      * Coaching staff alignment: Teams out of playoff contention frequently scheme to secure player bonuses.
 *  - Replaces inferred "revenge" narratives with verifiable, binding financial incentives.
 */

export interface ContractMilestoneContext {
  readonly playerName: string;
  readonly position: "WR" | "TE" | "RB" | "QB" | "EDGE" | "CB";
  readonly metricType: "RECEPTIONS" | "RECEIVING_YARDS" | "RUSHING_YARDS" | "TOUCHDOWNS" | "SACKS";
  readonly currentSeasonTotal: number;
  readonly milestoneTarget: number;
  readonly bonusValueUsd: number;
  readonly remainingGamesInSeason: number; // typically 1 to 5
  readonly isContractYear: boolean;
  readonly teamPlayoffStatus: "CLINCHED" | "IN_HUNT" | "ELIMINATED";
}

export interface ContractMilestoneResult {
  readonly incentiveProximityRatio: number; // currentTotal / target (e.g. 0.92)
  readonly neededPerGame: number;
  readonly incentiveAttainability: "HIGH_PROXIMITY" | "ACHIEVABLE" | "OUT_OF_REACH" | "ALREADY_MET";
  readonly touchPriorityBoostMultiplier: number; // multiplier on baseline usage, e.g. 1.18x
  readonly projectedTargetShareDelta: number; // in percentage points, e.g. +3.5%
  readonly financialUrgencyScore: number; // 0-100 composite score
}

/**
 * Evaluates contract incentive proximity and projected usage elevation.
 */
export function evaluateContractMilestones(
  context: ContractMilestoneContext
): ContractMilestoneResult {
  if (context.milestoneTarget <= 0 || context.remainingGamesInSeason <= 0) {
    return {
      incentiveProximityRatio: 1.0,
      neededPerGame: 0,
      incentiveAttainability: "ALREADY_MET",
      touchPriorityBoostMultiplier: 1.0,
      projectedTargetShareDelta: 0.0,
      financialUrgencyScore: 0,
    };
  }

  const current = Math.max(0, context.currentSeasonTotal);
  const target = context.milestoneTarget;
  const neededTotal = Math.max(0, target - current);
  const ratio = Number((current / target).toFixed(3));
  const neededPerGame = Number((neededTotal / context.remainingGamesInSeason).toFixed(1));

  if (neededTotal === 0) {
    return {
      incentiveProximityRatio: ratio,
      neededPerGame: 0,
      incentiveAttainability: "ALREADY_MET",
      touchPriorityBoostMultiplier: 1.0,
      projectedTargetShareDelta: 0.0,
      financialUrgencyScore: 0,
    };
  }

  // Attainability assessment:
  // HIGH_PROXIMITY: Within 1-2 games of reaching target in late season
  let attainability: "HIGH_PROXIMITY" | "ACHIEVABLE" | "OUT_OF_REACH" = "ACHIEVABLE";
  
  if (ratio >= 0.85 && ratio < 1.0 && neededPerGame <= getRealisticPerGameCap(context.metricType)) {
    attainability = "HIGH_PROXIMITY";
  } else if (neededPerGame > getUnrealisticThreshold(context.metricType)) {
    attainability = "OUT_OF_REACH";
  }

  // Team playoff status impact: eliminated teams scheme heavily for individual player bonuses
  let teamContextBoost = 1.0;
  if (context.teamPlayoffStatus === "ELIMINATED") {
    teamContextBoost = 1.25; // coaches reward loyal veterans
  } else if (context.teamPlayoffStatus === "CLINCHED") {
    teamContextBoost = 0.85; // starters may sit or be limited
  }

  // Contract year adds intrinsic motivation
  const contractYearMultiplier = context.isContractYear ? 1.15 : 1.0;

  let touchPriorityBoostMultiplier = 1.0;
  let projectedTargetShareDelta = 0.0;

  if (attainability === "HIGH_PROXIMITY") {
    touchPriorityBoostMultiplier = Number((1.0 + 0.18 * teamContextBoost * contractYearMultiplier).toFixed(3));
    projectedTargetShareDelta = Number((3.2 * teamContextBoost).toFixed(1));
  } else if (attainability === "ACHIEVABLE") {
    touchPriorityBoostMultiplier = Number((1.0 + 0.06 * teamContextBoost).toFixed(3));
    projectedTargetShareDelta = Number((1.1 * teamContextBoost).toFixed(1));
  }

  // Financial urgency composite (0-100)
  const financialWeight = Math.min(30, (context.bonusValueUsd / 1000000) * 15);
  const proximityWeight = attainability === "HIGH_PROXIMITY" ? 50 : attainability === "ACHIEVABLE" ? 25 : 5;
  const urgency = Math.min(100, Math.round(proximityWeight + financialWeight + (context.isContractYear ? 15 : 0)));

  return {
    incentiveProximityRatio: ratio,
    neededPerGame,
    incentiveAttainability: attainability,
    touchPriorityBoostMultiplier,
    projectedTargetShareDelta,
    financialUrgencyScore: urgency,
  };
}

function getRealisticPerGameCap(metric: string): number {
  switch (metric) {
    case "RECEPTIONS": return 7.5;
    case "RECEIVING_YARDS": return 85.0;
    case "RUSHING_YARDS": return 80.0;
    case "TOUCHDOWNS": return 1.5;
    case "SACKS": return 1.2;
    default: return 50.0;
  }
}

function getUnrealisticThreshold(metric: string): number {
  switch (metric) {
    case "RECEPTIONS": return 14.0;
    case "RECEIVING_YARDS": return 160.0;
    case "RUSHING_YARDS": return 150.0;
    case "TOUCHDOWNS": return 3.0;
    case "SACKS": return 2.5;
    default: return 100.0;
  }
}
