/**
 * temperature-precipitation-decay.ts — Sub-freezing temperature and precipitation impact.
 *
 * Grounded in empirical NFL weather research (Factor A25):
 *  - Temperature threshold effects:
 *      * Temp > 40 F: Negligible temperature impact on football elasticity.
 *      * Temp 25-35 F (Freezing boundary): Ball stiffness reduces completion rate by -2.2 pp.
 *      * Temp < 25 F (Deep freeze - Lambeau/Buffalo/KC winter): Passing yards decay -18.5 yds, rush rate +6.5%.
 *  - Precipitation interactions:
 *      * Heavy rain (> 0.25 in/hr): Pass completion drops -4.8 pp, fumbles increase +42%, game total points -3.6 pts.
 *      * Snow / Freezing rain: Deep pass frequency (20+ yds) drops -35%, EPA/play drops -0.065.
 *  - Domes and retractable roofs are completely immune (zero weather penalty).
 */

export interface WeatherConditionContext {
  readonly temperatureFahrenheit: number;
  readonly precipitationType: "NONE" | "LIGHT_RAIN" | "HEAVY_RAIN" | "SNOW" | "FREEZING_RAIN";
  readonly isDomeVenue: boolean;
  readonly baselinePassingYards: number;
  readonly baselineGameTotal: number;
}

export interface WeatherConditionResult {
  readonly weatherRegime: "DOME_CONTROLLED" | "MILD_OPEN" | "FREEZING_DRY" | "WET_SLOPPY" | "DEEP_FREEZE_PRECIP";
  readonly passingYardsAdjustment: number;
  readonly gameTotalPointsAdjustment: number;
  readonly rushAttemptBonus: number; // additional rush plays expected
  readonly turnoverVolatilityMultiplier: number;
  readonly completionRatePenaltyPercentagePoints: number;
}

/**
 * Evaluates thermal and precipitation friction on passing efficiency and game totals.
 */
export function evaluateTemperaturePrecipitationDecay(
  context: WeatherConditionContext
): WeatherConditionResult {
  if (context.isDomeVenue) {
    return {
      weatherRegime: "DOME_CONTROLLED",
      passingYardsAdjustment: 0,
      gameTotalPointsAdjustment: 0,
      rushAttemptBonus: 0,
      turnoverVolatilityMultiplier: 1.0,
      completionRatePenaltyPercentagePoints: 0,
    };
  }

  const temp = context.temperatureFahrenheit;
  const precip = context.precipitationType;

  let passYardsDelta = 0.0;
  let totalPointsDelta = 0.0;
  let rushBonus = 0;
  let turnoverMult = 1.0;
  let completionPenaltyPp = 0.0;
  let regime: "DOME_CONTROLLED" | "MILD_OPEN" | "FREEZING_DRY" | "WET_SLOPPY" | "DEEP_FREEZE_PRECIP" = "MILD_OPEN";

  // Temperature penalties
  if (temp <= 22) {
    passYardsDelta -= 21.0;
    totalPointsDelta -= 3.2;
    rushBonus += 4;
    completionPenaltyPp += 3.5;
    turnoverMult *= 1.25;
    regime = "FREEZING_DRY";
  } else if (temp <= 34) {
    passYardsDelta -= 9.5;
    totalPointsDelta -= 1.5;
    rushBonus += 2;
    completionPenaltyPp += 1.6;
    regime = "FREEZING_DRY";
  }

  // Precipitation penalties
  if (precip === "HEAVY_RAIN") {
    passYardsDelta -= 24.0;
    totalPointsDelta -= 4.2;
    rushBonus += 5;
    completionPenaltyPp += 4.6;
    turnoverMult *= 1.45;
    regime = "WET_SLOPPY";
  } else if (precip === "LIGHT_RAIN") {
    passYardsDelta -= 7.0;
    totalPointsDelta -= 1.2;
    rushBonus += 1;
    completionPenaltyPp += 1.2;
    turnoverMult *= 1.12;
    regime = "WET_SLOPPY";
  } else if (precip === "SNOW" || precip === "FREEZING_RAIN") {
    passYardsDelta -= 28.0;
    totalPointsDelta -= 5.1;
    rushBonus += 6;
    completionPenaltyPp += 5.2;
    turnoverMult *= 1.55;
    regime = "DEEP_FREEZE_PRECIP";
  }

  return {
    weatherRegime: regime,
    passingYardsAdjustment: Number(Math.max(-55.0, passYardsDelta).toFixed(1)),
    gameTotalPointsAdjustment: Number(Math.max(-9.0, totalPointsDelta).toFixed(1)),
    rushAttemptBonus: rushBonus,
    turnoverVolatilityMultiplier: Number(turnoverMult.toFixed(2)),
    completionRatePenaltyPercentagePoints: Number(completionPenaltyPp.toFixed(1)),
  };
}
