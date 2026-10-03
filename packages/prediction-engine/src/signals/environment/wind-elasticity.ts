/**
 * wind-elasticity.ts — Convex non-linear wind sensitivity for NFL props and totals.
 *
 * Grounded in empirical research:
 *  - Claremont Tables 6/7 (log model per-mph elasticity: -0.7% to -0.9% pass yds/mph visitor)
 *  - Spax & Covers: distance-controlled residual xFG% -11.86 pts @ 20+ mph, attempt distance -7 yds
 *  - CapperTek / weatherimpactonnflbet: 15->20->25 convex inflection point, completion drop 60.3% -> 54.65%
 *  - Volume substitution: play-calling pivots from pass to run (+20-30 rush yds, lead RB +3-5 FP).
 */

export type WindDirection = "CROSSWIND" | "HEADWIND" | "TAILWIND" | "CALM_OR_VARIABLE";

export interface WindElasticityInput {
  readonly sustainedWindMph: number;
  readonly gustMph?: number;
  readonly direction?: WindDirection;
  readonly isDomeOrRetractableClosed?: boolean;
  readonly isVisitor?: boolean;
}

export interface WindElasticityResult {
  readonly effectiveWindMph: number;
  readonly passingYardsMultiplier: number;
  readonly passingCompletionDelta: number; // in percentage points, e.g. -5.65
  readonly fieldGoalAccuracyDelta: number; // in probability delta, e.g. -0.1186
  readonly fieldGoalRangeShrinkageYards: number;
  readonly rushingVolumeMultiplier: number;
  readonly expectedTotalPointsAdjustment: number; // net shift in game total points
}

/**
 * Computes wind elasticity adjustments across passing, rushing, field goals, and totals.
 */
export function calculateWindElasticity(input: WindElasticityInput): WindElasticityResult {
  // If game is in a dome or closed roof, wind has zero physical effect.
  if (input.isDomeOrRetractableClosed) {
    return {
      effectiveWindMph: 0,
      passingYardsMultiplier: 1.0,
      passingCompletionDelta: 0.0,
      fieldGoalAccuracyDelta: 0.0,
      fieldGoalRangeShrinkageYards: 0.0,
      rushingVolumeMultiplier: 1.0,
      expectedTotalPointsAdjustment: 0.0,
    };
  }

  const sustained = Math.max(0, input.sustainedWindMph);
  const gust = Math.max(sustained, input.gustMph ?? sustained);
  // Gusts amplify sustained wind: 15 mph sustained + 25 mph gusts behaves like ~20 mph tier
  const effectiveWind = sustained + 0.5 * (gust - sustained);

  // 0-7 mph is calm baseline in NFL
  if (effectiveWind <= 7.0) {
    return {
      effectiveWindMph: Number(effectiveWind.toFixed(1)),
      passingYardsMultiplier: 1.0,
      passingCompletionDelta: 0.0,
      fieldGoalAccuracyDelta: 0.0,
      fieldGoalRangeShrinkageYards: 0.0,
      rushingVolumeMultiplier: 1.0,
      expectedTotalPointsAdjustment: 0.0,
    };
  }

  const windAboveBaseline = effectiveWind - 7.0;

  // 1. Passing Yards Multiplier: Convex non-linear decay
  // Claremont: visitors suffer ~1.25x larger sensitivity
  // At 20-25 mph, passing yards compress by 20-25% (multiplier ~0.75-0.80)
  const visitorSkew = input.isVisitor ? 1.25 : 1.0;
  const passDecayExponent = 1.62;
  const rawPassDecay = 0.00165 * Math.pow(windAboveBaseline, passDecayExponent) * visitorSkew;
  const passingMultiplier = Math.max(0.40, Math.min(1.0, 1.0 - rawPassDecay));

  // 2. Completion Percentage Delta:
  // 15 mph: -1.6 pts; 20-25 mph: -5.65 pts; 25+ mph: -8 to -10 pts
  const compDelta = -Math.min(10.5, 0.028 * Math.pow(windAboveBaseline, 1.75));

  // 3. Field Goal Sensitivity:
  // Crosswind is the #1 accuracy killer; Headwind kills range; Tailwind extends range
  const dir = input.direction ?? "CROSSWIND";
  let fgAccDelta = 0.0;
  let fgRangeShrink = 0.0;

  if (effectiveWind >= 10.0) {
    const windAbove10 = effectiveWind - 10.0;
    if (dir === "CROSSWIND") {
      // Spax: at 20+ mph crosswind, xFG drop reaches -11.86 pts (-0.1186)
      fgAccDelta = -Math.min(0.25, 0.0055 * Math.pow(windAbove10, 1.4));
      fgRangeShrink = Math.min(10.0, 0.7 * windAbove10);
    } else if (dir === "HEADWIND") {
      fgAccDelta = -Math.min(0.15, 0.0035 * Math.pow(windAbove10, 1.3));
      fgRangeShrink = Math.min(8.0, 0.6 * windAbove10);
    } else if (dir === "TAILWIND") {
      // Tailwind helps range +8 to 10 yds per 10 mph, but lateral buffeting still hurts extreme kicks slightly
      fgAccDelta = -Math.min(0.06, 0.0012 * Math.pow(windAbove10, 1.2));
      fgRangeShrink = -Math.min(9.0, 0.8 * windAbove10); // negative shrinkage = extension
    } else {
      fgAccDelta = -Math.min(0.18, 0.0042 * Math.pow(windAbove10, 1.35));
      fgRangeShrink = Math.min(7.0, 0.55 * windAbove10);
    }
  }

  // 4. Rushing Volume Substitution:
  // Above 12 mph, offensive coordinators pivot from pass to run
  let rushMultiplier = 1.0;
  if (effectiveWind > 12.0) {
    const windAbove12 = effectiveWind - 12.0;
    rushMultiplier = Math.min(1.28, 1.0 + 0.0065 * Math.pow(windAbove12, 1.25));
  }

  // 5. Net Game Total Points Shift:
  // Research: "Subtract a full FG (-3.0 pts) at 15-20 mph, and -6.0 to -8.0 pts at 20-25+ mph"
  let totalPointsShift = 0.0;
  if (effectiveWind > 10.0) {
    totalPointsShift = -Math.min(9.5, 0.22 * Math.pow(effectiveWind - 10.0, 1.32));
  }

  return {
    effectiveWindMph: Number(effectiveWind.toFixed(1)),
    passingYardsMultiplier: Number(passingMultiplier.toFixed(4)),
    passingCompletionDelta: Number(compDelta.toFixed(2)),
    fieldGoalAccuracyDelta: Number(fgAccDelta.toFixed(4)),
    fieldGoalRangeShrinkageYards: Number(fgRangeShrink.toFixed(1)),
    rushingVolumeMultiplier: Number(rushMultiplier.toFixed(4)),
    expectedTotalPointsAdjustment: Number(totalPointsShift.toFixed(2)),
  };
}
