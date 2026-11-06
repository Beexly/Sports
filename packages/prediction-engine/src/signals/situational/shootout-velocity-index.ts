/**
 * Shootout Velocity Index (SVI) & Game Script Urgency (GSU)
 *
 * Quantifies:
 * 1. Bilateral Playoff Leverage Index (Harmonic Mean of delta P(playoffs))
 * 2. In-State & Geographic Rivalry Multiplier
 * 3. Scrimmage Clock Expansion (incomplete pass clock stoppage + hurry-up pace)
 * 4. Shootout Velocity Index (0 to 100 scale) for DFS and Game Totals
 */

export interface GameScriptUrgencyInput {
  readonly deltaPlayoffsTeamA: number; // P(playoffs | win) - P(playoffs | loss)
  readonly deltaPlayoffsTeamB: number;
  readonly isInState: boolean;
  readonly isDivisional: boolean;
  readonly distanceMiles: number;
  readonly proeTeamA: number;          // Pass rate over expected (-0.10 to +0.15)
  readonly proeTeamB: number;
  readonly fourthDownAggressionA: number; // 0.8 to 1.4
  readonly fourthDownAggressionB: number;
}

export interface ShootoutVelocityInput extends GameScriptUrgencyInput {
  readonly overUnder: number;
  readonly spread: number;             // Team A spread (e.g. -2.5)
  readonly isDome: boolean;
  readonly windMph: number;
  readonly secPerSnapA: number;        // Neutral pace (24.0 to 31.0)
  readonly secPerSnapB: number;
  readonly explosivePassRateA: number; // % of passes gaining 20+ yds (0.05 to 0.18)
  readonly explosivePassRateB: number;
  readonly passFunnelRatingA: number;  // Defense pass EPA allowed - run EPA allowed
  readonly passFunnelRatingB: number;
  readonly wr1TargetShareA: number;    // Receiver target concentration
  readonly wr2TargetShareA: number;
  readonly wr1TargetShareB: number;
  readonly wr2TargetShareB: number;
  readonly lineMovement?: number;
}

export interface SviOutput {
  readonly sviScore: number;           // 0 to 100
  readonly gsuIndex: number;           // 0 to 100
  readonly bilateralPli: number;
  readonly rivalryFactor: number;
  readonly paceFactor: number;
  readonly isTopShootout: boolean;     // SVI >= 85
}

/**
 * Calculates harmonic mean of playoff leverage.
 * Enforces that BOTH teams must have meaningful stakes for a shootout incentive.
 */
export function calculateBilateralPli(deltaA: number, deltaB: number): number {
  if (deltaA <= 0 || deltaB <= 0) return 0.0;
  const eps = 1e-5;
  return (2.0 * deltaA * deltaB) / (deltaA + deltaB + eps);
}

/**
 * Rivalry and geographic urgency multiplier.
 * In-state battles (e.g. Battle of Texas: Cowboys vs Texans) carry extreme pride and urgency.
 */
export function calculateRivalryFactor(isInState: boolean, isDivisional: boolean, distanceMiles: number): number {
  const d0 = 300.0;
  const geoProximity = Math.exp(-Math.max(0, distanceMiles) / d0);
  let base = 1.0;
  if (isInState) base += 0.40;
  if (isDivisional) base += 0.35;
  base += 0.25 * geoProximity;
  return base;
}

/**
 * Game Script Urgency (0 to 100)
 */
export function computeGameScriptUrgency(input: GameScriptUrgencyInput): { gsuIndex: number; pli: number; rivalry: number } {
  const pli = calculateBilateralPli(input.deltaPlayoffsTeamA, input.deltaPlayoffsTeamB);
  const pliNorm = Math.min(1.0, Math.max(0.0, pli / 0.35));

  const rivalry = calculateRivalryFactor(input.isInState, input.isDivisional, input.distanceMiles);
  const rivalryNorm = Math.min(1.0, Math.max(0.0, (rivalry - 1.0) / 1.0));

  const avgProe = (input.proeTeamA + input.proeTeamB) / 2.0;
  const proeNorm = Math.min(1.0, Math.max(0.0, (avgProe + 0.05) / 0.15));

  const avg4th = (input.fourthDownAggressionA + input.fourthDownAggressionB) / 2.0;
  const fourthNorm = Math.min(1.0, Math.max(0.0, (avg4th - 0.8) / 0.6));

  const coachingNorm = 0.6 * proeNorm + 0.4 * fourthNorm;
  const gsu = (0.45 * pliNorm + 0.25 * rivalryNorm + 0.30 * coachingNorm) * 100.0;

  return {
    gsuIndex: Math.round(gsu * 10) / 10,
    pli: Math.round(pli * 1000) / 1000,
    rivalry: Math.round(rivalry * 100) / 100,
  };
}

/**
 * Computes Shootout Velocity Index (SVI)
 */
export function computeShootoutVelocityIndex(input: ShootoutVelocityInput): SviOutput {
  const { gsuIndex, pli, rivalry } = computeGameScriptUrgency(input);

  // 1. Pace
  const avgSps = (input.secPerSnapA + input.secPerSnapB) / 2.0;
  const zPace = 1.8 * (28.0 - avgSps);

  // 2. Environment
  let zEnv = 0.0;
  if (input.isDome) {
    zEnv = 1.35;
  } else if (input.windMph > 15.0) {
    zEnv = -1.5 - 0.12 * (input.windMph - 15.0);
  }

  // 3. Bilateral Explosiveness
  const eprA = input.explosivePassRateA;
  const eprB = input.explosivePassRateB;
  const bilatEpr = (2.0 * eprA * eprB) / (eprA + eprB + 1e-5);
  const zExpl = 25.0 * (bilatEpr - 0.09);

  // 4. Funnel defense
  const zFunnel = 0.8 * (input.passFunnelRatingA + input.passFunnelRatingB);

  // 5. Urgency
  const zUrgency = 0.04 * (gsuIndex - 50.0);

  // 6. Vegas
  const spreadMag = Math.abs(input.spread);
  const zVegas = 0.12 * (input.overUnder - 45.0) - 0.25 * Math.max(0.0, spreadMag - 3.5) + 0.10 * (input.lineMovement ?? 0);

  // 7. Target condensation
  const hhiA = input.wr1TargetShareA ** 2 + input.wr2TargetShareA ** 2;
  const hhiB = input.wr1TargetShareB ** 2 + input.wr2TargetShareB ** 2;
  const avgHhi = (hhiA + hhiB) / 2.0;
  const zCond = 15.0 * (avgHhi - 0.09);

  const vLatent = zPace + zEnv + zExpl + zFunnel + zUrgency + zVegas + zCond;
  const zSvi = Math.max(-60.0, Math.min(60.0, -0.6 * vLatent));
  const svi = 100.0 / (1.0 + Math.exp(zSvi));
  const roundedSvi = Math.round(svi * 10) / 10;

  return {
    sviScore: roundedSvi,
    gsuIndex,
    bilateralPli: pli,
    rivalryFactor: rivalry,
    paceFactor: Math.round(zPace * 100) / 100,
    isTopShootout: roundedSvi >= 85.0,
  };
}
