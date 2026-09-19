/**
 * age-conditioned-rest.ts — Rest days elasticity conditioned on roster age distribution.
 *
 * Grounded in empirical NFL situational research (Factor A24):
 *  - Standard bye-week models assume flat +1.5 point boost for all teams off rest.
 *  - Reality: Rest elasticity is heavily conditioned on snap-weighted roster age:
 *      * Veteran rosters (snap-weighted age >= 27.5):
 *          - Bye / 10+ days rest: +2.45 margin boost (joint/tissue recovery, veteran game planning).
 *          - Short rest (4 days, Thursday Night Football): -2.80 margin penalty (fatigue, recovery deficit).
 *      * Young rosters (snap-weighted age <= 25.2):
 *          - Bye / 10+ days rest: -0.30 to +0.20 margin (rhythm disruption, rust outweighs tissue recovery).
 *          - Short rest: Only -0.65 margin penalty (quick recovery physiology).
 */

export interface AgeConditionedRestContext {
  readonly teamName: string;
  readonly daysOfRest: number; // 4 = TNF, 7 = normal, 10 = mini-bye, 14 = full bye
  readonly snapWeightedRosterAge: number; // e.g. 25.1 (very young) to 28.2 (very old)
  readonly startingQbAge: number;
  readonly offensiveLineAvgAge: number;
}

export interface AgeConditionedRestResult {
  readonly ageBracket: "YOUNG_DEVELOPING" | "BALANCED_PRIME" | "VETERAN_HEAVY";
  readonly restRegime: "SHORT_REST_TNF" | "NORMAL_WEEK" | "MINI_BYE" | "FULL_BYE";
  readonly expectedMarginAdjustment: number; // points shift on spread
  readonly fourthQuarterFatigueFactor: number; // defensive fatigue multiplier
  readonly injuryRiskMultiplier: number;
}

/**
 * Evaluates the non-linear interaction between days of rest and roster age curve.
 */
export function evaluateAgeConditionedRest(
  context: AgeConditionedRestContext
): AgeConditionedRestResult {
  const age = Math.max(23.0, Math.min(31.0, context.snapWeightedRosterAge));
  const rest = Math.max(3, Math.min(21, context.daysOfRest));

  let ageBracket: "YOUNG_DEVELOPING" | "BALANCED_PRIME" | "VETERAN_HEAVY" = "BALANCED_PRIME";
  if (age >= 27.3) {
    ageBracket = "VETERAN_HEAVY";
  } else if (age <= 25.3) {
    ageBracket = "YOUNG_DEVELOPING";
  }

  let restRegime: "SHORT_REST_TNF" | "NORMAL_WEEK" | "MINI_BYE" | "FULL_BYE" = "NORMAL_WEEK";
  if (rest <= 5) {
    restRegime = "SHORT_REST_TNF";
  } else if (rest >= 13) {
    restRegime = "FULL_BYE";
  } else if (rest >= 9) {
    restRegime = "MINI_BYE";
  }

  let marginDelta = 0.0;
  let fatigueFactor = 1.0;
  let injuryRiskMult = 1.0;

  if (restRegime === "SHORT_REST_TNF") {
    if (ageBracket === "VETERAN_HEAVY") {
      marginDelta = -2.85;
      fatigueFactor = 1.32;
      injuryRiskMult = 1.45;
    } else if (ageBracket === "BALANCED_PRIME") {
      marginDelta = -1.40;
      fatigueFactor = 1.15;
      injuryRiskMult = 1.20;
    } else {
      // Young team handles short turnaround with minimal drop
      marginDelta = -0.65;
      fatigueFactor = 1.05;
      injuryRiskMult = 1.08;
    }
  } else if (restRegime === "FULL_BYE") {
    if (ageBracket === "VETERAN_HEAVY") {
      // Veteran teams get massive recovery boost + coaching prep
      marginDelta = 2.45;
      fatigueFactor = 0.82;
      injuryRiskMult = 0.72;
    } else if (ageBracket === "BALANCED_PRIME") {
      marginDelta = 1.35;
      fatigueFactor = 0.90;
      injuryRiskMult = 0.82;
    } else {
      // Young teams often show rust/sluggish start after bye
      marginDelta = -0.15;
      fatigueFactor = 0.96;
      injuryRiskMult = 0.90;
    }
  } else if (restRegime === "MINI_BYE") {
    if (ageBracket === "VETERAN_HEAVY") {
      marginDelta = 1.20;
      fatigueFactor = 0.88;
      injuryRiskMult = 0.85;
    } else if (ageBracket === "BALANCED_PRIME") {
      marginDelta = 0.70;
      fatigueFactor = 0.94;
      injuryRiskMult = 0.92;
    } else {
      marginDelta = 0.10;
      fatigueFactor = 0.98;
      injuryRiskMult = 0.97;
    }
  }

  // Veteran trench boost off bye
  if (context.offensiveLineAvgAge >= 29.0 && rest >= 10) {
    marginDelta += 0.45;
  }

  return {
    ageBracket,
    restRegime,
    expectedMarginAdjustment: Number(marginDelta.toFixed(2)),
    fourthQuarterFatigueFactor: Number(fatigueFactor.toFixed(2)),
    injuryRiskMultiplier: Number(injuryRiskMult.toFixed(2)),
  };
}
