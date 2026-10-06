/**
 * high-altitude-fatigue-decay.ts — Factor A6: High-Altitude Environmental & Late-Game Fatigue Decay.
 *
 * Models the aerodynamic and physiological impact of extreme elevation venues
 * (Denver Mile High: 5,280 ft, Estadio Azteca: 7,200 ft).
 *
 * Physical & Physiological Mechanisms:
 * 1. Aerodynamics: Air density is ~17% lower at 5,280 ft. Projectiles experience less drag,
 *    increasing field goal range by +3.5 to +4.5 yards and kickoff touchback probability by +22%.
 * 2. Physiological: Unacclimated visiting teams suffer an 8-10% decline in VO2 max, accelerating
 *    lactic acid build-up in high-intensity anaerobic bursts (offensive/defensive line snaps).
 * 3. Temporal Distribution: Fatigue compounds non-linearly into the 2nd half and 4th quarter,
 *    widening defensive blown coverage rates and red zone concession rates.
 */

export interface HighAltitudeContext {
  readonly venueAltitudeFeet: number; // e.g. 5280 for Denver, 7200 for Azteca, 0-1000 for standard
  readonly isVisitingTeam: boolean;
  readonly visitingTeamArrivalDaysPrior: number; // e.g. 1 (standard night before) vs 5+ (rare early acclimation)
  readonly defensiveSnapCountPaceProjection: number; // Expected defensive snaps (e.g. 65 avg, 75+ fast pace)
}

export interface HighAltitudeResult {
  readonly isHighAltitudeVenue: boolean;
  readonly fieldGoalRangeExtensionYards: number;
  readonly touchbackProbabilityBoost: number;
  readonly secondHalfFatigueMultiplier: number;
  readonly visitingDefensiveEpaDecay: number;
  readonly spreadPointAdjustment: number;
  readonly confidence: number;
  readonly explanation: string;
}

export function evaluateHighAltitudeFatigueDecay(ctx: HighAltitudeContext): HighAltitudeResult {
  const isHighAltitude = ctx.venueAltitudeFeet >= 4000;

  if (!isHighAltitude) {
    return {
      isHighAltitudeVenue: false,
      fieldGoalRangeExtensionYards: 0.0,
      touchbackProbabilityBoost: 0.0,
      secondHalfFatigueMultiplier: 1.0,
      visitingDefensiveEpaDecay: 0.0,
      spreadPointAdjustment: 0.0,
      confidence: 0.95,
      explanation: `Standard venue altitude (${ctx.venueAltitudeFeet} ft). No altitude-induced fatigue decay.`,
    };
  }

  // Aerodynamic boosts (apply to both teams)
  const altitudeThousands = ctx.venueAltitudeFeet / 1000;
  const fgRangeExtension = Math.min(5.5, Number((altitudeThousands * 0.75).toFixed(1)));
  const touchbackBoost = Math.min(0.30, Number((altitudeThousands * 0.045).toFixed(3)));

  // Physiological decay (primarily hits unacclimated visiting team)
  let fatigueMultiplier = 1.0;
  let defEpaDecay = 0.0;
  let spreadAdj = 0.0;

  if (ctx.isVisitingTeam) {
    // Acclimation mitigates some decay if arrived >= 4 days prior, but short trips suffer full decay
    const acclimationDampener = ctx.visitingTeamArrivalDaysPrior >= 4 ? 0.65 : 1.0;

    // Fast pace games compound the anaerobic fatigue
    const paceStress = ctx.defensiveSnapCountPaceProjection > 70 ? 1.25 : 1.0;

    fatigueMultiplier = Number((1.0 + 0.18 * acclimationDampener * paceStress).toFixed(3));
    defEpaDecay = Number((0.085 * acclimationDampener * paceStress).toFixed(3));

    // Home altitude edge: typically +1.20 to +1.65 points for Denver
    spreadAdj = Number((-1.45 * acclimationDampener * paceStress).toFixed(2));
  } else {
    // Acclimatized home team enjoys the relative aerobic and recovery advantage
    spreadAdj = +1.45;
  }

  const confidence = 0.88;
  const explanation = ctx.isVisitingTeam
    ? `Visiting unacclimated team at high altitude (${ctx.venueAltitudeFeet} ft) suffers ${((fatigueMultiplier - 1) * 100).toFixed(0)}% second-half fatigue multiplier, decaying defensive EPA by +${defEpaDecay} / play (Spread impact: ${spreadAdj} pts). FG range extended by +${fgRangeExtension} yds.`
    : `Acclimatized home team at high altitude (${ctx.venueAltitudeFeet} ft) possesses stamina advantage (+${spreadAdj} pts spread value). FG range extended by +${fgRangeExtension} yds.`;

  return {
    isHighAltitudeVenue: true,
    fieldGoalRangeExtensionYards: fgRangeExtension,
    touchbackProbabilityBoost: touchbackBoost,
    secondHalfFatigueMultiplier: fatigueMultiplier,
    visitingDefensiveEpaDecay: defEpaDecay,
    spreadPointAdjustment: spreadAdj,
    confidence,
    explanation,
  };
}
