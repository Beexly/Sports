/**
 * circadian-travel-fatigue.ts — Circadian rhythm, timezone crossing, and travel fatigue model.
 *
 * Grounded in empirical NFL & sports chronobiology research:
 *  - Factor A4: Fodor & Krieger travel fatigue and body clock specification
 *  - Circadian phase: West Coast teams playing at 1:00 PM EST (10:00 AM Pacific body clock)
 *    exhibit a statistically significant 1st-half scoring deficit (-2.1 points)
 *  - Short week rest asymmetry: Thursday night games with cross-country travel
 *  - Trailing 14-day cumulative travel mileage fatigue saturation
 */

export interface CircadianTravelInput {
  readonly team: string;
  readonly isVisitor: boolean;
  readonly originTimeZoneOffset: number; // e.g. -8 for PST, -5 for EST
  readonly destinationTimeZoneOffset: number; // e.g. -5 for EST
  readonly localKickoffHour24: number; // e.g. 13 for 1:00 PM, 20.25 for 8:15 PM
  readonly daysOfRest: number; // e.g. 4 for Thursday game, 7 for standard, 14 for bye
  readonly opponentDaysOfRest: number; // opponent's rest
  readonly trailing14DayTravelMiles?: number; // cumulative air miles
}

export interface CircadianTravelResult {
  readonly bodyClockKickoffHour: number; // local kickoff adjusted to biological time
  readonly timeZoneShiftEastward: number; // positive = travelling eastward (harder adaptation)
  readonly circadianDeficitMagnitude: number; // 0.0 (optimal) to 1.0 (severe circadian mismatch)
  readonly restAsymmetryDays: number; // rest days minus opponent rest days
  readonly expectedFirstHalfMarginAdjustment: number; // net point adjustment for visitor 1st half
  readonly fourthQuarterFatigueRisk: "LOW" | "MODERATE" | "HIGH";
  readonly netGameSpreadAdjustment: number; // estimated full-game impact on spread
}

/**
 * Evaluates travel fatigue, biological clock misalignment, and rest asymmetry.
 */
export function evaluateCircadianTravelFatigue(
  input: CircadianTravelInput
): CircadianTravelResult {
  if (!input.isVisitor) {
    // Home team plays in native time zone with zero travel fatigue
    const restAdvantage = input.daysOfRest - input.opponentDaysOfRest;
    const netSpread = restAdvantage >= 3 ? 1.2 : restAdvantage <= -3 ? -0.9 : 0.0;
    return {
      bodyClockKickoffHour: input.localKickoffHour24,
      timeZoneShiftEastward: 0,
      circadianDeficitMagnitude: 0.0,
      restAsymmetryDays: restAdvantage,
      expectedFirstHalfMarginAdjustment: 0.0,
      fourthQuarterFatigueRisk: "LOW",
      netGameSpreadAdjustment: netSpread,
    };
  }

  // Eastward travel shift (e.g. PST -8 to EST -5 = +3 hours)
  const timeZoneShiftEastward = input.destinationTimeZoneOffset - input.originTimeZoneOffset;
  
  // Body clock hour at kickoff (e.g. 13:00 EST - 3 hours = 10:00 AM PST)
  const bodyClockKickoffHour = input.localKickoffHour24 - timeZoneShiftEastward;

  // Circadian deficit peaks when body clock is before 11:30 AM (early morning biological state)
  let circadianDeficit = 0.0;
  if (timeZoneShiftEastward >= 2 && bodyClockKickoffHour <= 10.5) {
    // Classic West-to-East 1pm early game
    circadianDeficit = 0.85;
  } else if (timeZoneShiftEastward >= 1 && bodyClockKickoffHour <= 11.5) {
    circadianDeficit = 0.45;
  } else if (timeZoneShiftEastward <= -2 && bodyClockKickoffHour >= 22.0) {
    // Late night biological fatigue for East teams playing late West Coast games
    circadianDeficit = 0.55;
  }

  // Rest asymmetry
  const restAsymmetryDays = input.daysOfRest - input.opponentDaysOfRest;
  
  // Short rest combined with travel exacerbates fatigue
  const shortRestPenalty = input.daysOfRest <= 4 ? 0.4 : 0.0;
  const miles = input.trailing14DayTravelMiles || 0;
  const travelMilesPenalty = Math.min(0.3, miles / 8000);

  const totalDeficit = Math.min(1.0, circadianDeficit + shortRestPenalty + travelMilesPenalty);

  // First half margin deficit: West teams start sluggishly in 1st half
  const expectedFirstHalfMarginAdjustment = Number(
    (-circadianDeficit * 1.85 - Math.max(0, -restAsymmetryDays) * 0.4).toFixed(2)
  );

  // Full game spread impact
  const netGameSpreadAdjustment = Number(
    (
      expectedFirstHalfMarginAdjustment * 0.85 +
      (restAsymmetryDays * 0.28) -
      (totalDeficit >= 0.7 ? 1.15 : 0.0)
    ).toFixed(2)
  );

  let fourthQuarterFatigueRisk: "LOW" | "MODERATE" | "HIGH" = "LOW";
  if (totalDeficit >= 0.75 || (input.daysOfRest <= 4 && timeZoneShiftEastward >= 2)) {
    fourthQuarterFatigueRisk = "HIGH";
  } else if (totalDeficit >= 0.4) {
    fourthQuarterFatigueRisk = "MODERATE";
  }

  return {
    bodyClockKickoffHour: Number(bodyClockKickoffHour.toFixed(2)),
    timeZoneShiftEastward,
    circadianDeficitMagnitude: Number(totalDeficit.toFixed(2)),
    restAsymmetryDays,
    expectedFirstHalfMarginAdjustment,
    fourthQuarterFatigueRisk,
    netGameSpreadAdjustment,
  };
}
