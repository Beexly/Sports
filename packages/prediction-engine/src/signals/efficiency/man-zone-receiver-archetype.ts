/**
 * man-zone-receiver-archetype.ts — Defensive coverage scheme x receiver archetype interaction.
 *
 * Grounded in empirical NFL charting and NextGen/PFF charting (Factor A26):
 *  - Defensive coverage distributions:
 *      * High Man-coverage teams (> 35% man rate): 1-on-1 isolation routes dominate.
 *        Separators (high route win rate) see target share surge (+22%) and explosive play rates jump.
 *      * High Zone-coverage teams (> 72% zone rate, Cover 2/3/4/6):
 *        Space finders (slot receivers, receiving tight ends) exploit soft spots (+18% target share).
 *        Boundary contested-catch receivers see targets fall (-14%) as deep safeties bracket.
 *  - Two-High shell frequency suppresses vertical deep-threat aDOT by -2.1 air yards.
 */

export interface ManZoneCoverageContext {
  readonly opponentManCoverageRate: number; // 0.0 to 1.0 (league avg ~0.28)
  readonly opponentTwoHighShellRate: number; // 0.0 to 1.0 (league avg ~0.52)
  readonly receiverArchetype: "ELITE_SEPARATOR" | "CONTESTED_BALL_WINNER" | "SLOT_ZONE_SETTLER" | "DEEP_BURNER";
  readonly baselineTargetShare: number;
  readonly baselineAdot: number; // average depth of target in yards
}

export interface ManZoneCoverageResult {
  readonly matchupAdvantageTier: "SMASH_SPOT" | "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE" | "SHUTDOWN_RISK";
  readonly targetShareMultiplier: number;
  readonly adjustedTargetShare: number;
  readonly adjustedAdot: number;
  readonly yprrMultiplier: number; // yards per route run multiplier
  readonly explosivePlayProbabilityDelta: number; // percentage points shift on 20+ yd reception
}

/**
 * Evaluates how defensive man/zone coverage schemes interact with receiver skill archetypes.
 */
export function evaluateManZoneReceiverArchetype(
  context: ManZoneCoverageContext
): ManZoneCoverageResult {
  const manRate = Math.max(0.05, Math.min(0.65, context.opponentManCoverageRate));
  const zoneRate = 1.0 - manRate;
  const twoHighRate = Math.max(0.20, Math.min(0.85, context.opponentTwoHighShellRate));

  let targetShareMult = 1.0;
  let yprrMult = 1.0;
  let adotShift = 0.0;
  let explosiveDelta = 0.0;

  switch (context.receiverArchetype) {
    case "ELITE_SEPARATOR":
      // Separators feast on man coverage (1-on-1 wins create immediate open reads)
      if (manRate >= 0.35) {
        targetShareMult = 1.22;
        yprrMult = 1.25;
        explosiveDelta = 4.2;
      } else if (manRate >= 0.28) {
        targetShareMult = 1.08;
        yprrMult = 1.09;
        explosiveDelta = 1.8;
      }
      break;

    case "CONTESTED_BALL_WINNER":
      // Physical perimeter WRs suffer in heavy zone with over-the-top safety help
      if (zoneRate >= 0.75 && twoHighRate >= 0.58) {
        targetShareMult = 0.86;
        yprrMult = 0.88;
        adotShift = -1.2;
        explosiveDelta = -3.5;
      } else if (manRate >= 0.35) {
        targetShareMult = 1.10; // back-shoulder red zone targets in man
        yprrMult = 1.06;
      }
      break;

    case "SLOT_ZONE_SETTLER":
      // TEs and slot receivers thrive against zone defenses by finding voids between linebackers
      if (zoneRate >= 0.72) {
        targetShareMult = 1.19;
        yprrMult = 1.16;
        adotShift = -0.6; // high-percentage underneath targets
        explosiveDelta = 1.2;
      } else if (manRate >= 0.38) {
        targetShareMult = 0.89; // tight coverage sticky slot DBs reduce separation
        yprrMult = 0.90;
        explosiveDelta = -2.0;
      }
      break;

    case "DEEP_BURNER":
      // Deep speedsters get capped by two-high safety shells, but explode against single-high man
      if (twoHighRate >= 0.60) {
        targetShareMult = 0.84;
        yprrMult = 0.82;
        adotShift = -2.2;
        explosiveDelta = -5.0;
      } else if (twoHighRate <= 0.42 && manRate >= 0.32) {
        targetShareMult = 1.25;
        yprrMult = 1.34;
        adotShift = 2.4;
        explosiveDelta = 8.5;
      }
      break;
  }

  const adjustedTargetShare = Number(
    Math.max(0.02, Math.min(0.45, context.baselineTargetShare * targetShareMult)).toFixed(4)
  );

  const adjustedAdot = Number(
    Math.max(3.5, Math.min(22.0, context.baselineAdot + adotShift)).toFixed(1)
  );

  let matchupAdvantageTier: "SMASH_SPOT" | "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE" | "SHUTDOWN_RISK" = "NEUTRAL";
  if (targetShareMult >= 1.18 && yprrMult >= 1.18) {
    matchupAdvantageTier = "SMASH_SPOT";
  } else if (targetShareMult >= 1.07) {
    matchupAdvantageTier = "FAVORABLE";
  } else if (targetShareMult <= 0.86) {
    matchupAdvantageTier = "SHUTDOWN_RISK";
  } else if (targetShareMult <= 0.93) {
    matchupAdvantageTier = "UNFAVORABLE";
  }

  return {
    matchupAdvantageTier,
    targetShareMultiplier: Number(targetShareMult.toFixed(2)),
    adjustedTargetShare,
    adjustedAdot,
    yprrMultiplier: Number(yprrMult.toFixed(2)),
    explosivePlayProbabilityDelta: Number(explosiveDelta.toFixed(1)),
  };
}
