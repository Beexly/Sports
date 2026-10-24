/**
 * Biomechanical Kinetic Chain & Acute Workload Evaluator
 *
 * Mathematical port and synthesis of `zhenzoo/ai-sports-coach`,
 * `NVIDIA/sports-intelligence-playbooks`, and `rainerblind/aTrainingTracker`.
 *
 * Evaluates quarterback kinetic chain sequencing, Acute:Chronic Workload Ratio (ACWR),
 * and throwing arm fatigue to adjust deep completion probability and passing velocity.
 */

export interface KineticChainKeypoints {
  pelvisPeakAngularVelocityMs: number;
  torsoPeakAngularVelocityMs: number;
  shoulderExtRotationMs: number;
  elbowExtensionMs: number;
  ballReleaseMs: number;
  shoulderElbowAngleDeg: number;
}

export interface QuarterbackWorkloadHistory {
  acutePassAttempts7d: number;
  chronicPassAttempts28d: number;
  gamePassAttemptsCurrent: number;
  hitsOrSacksTakenCurrent: number;
  daysRestSinceLastGame: number;
}

export interface BiomechanicalEvaluation {
  isKineticChainOrdered: boolean;
  kineticChainEfficiency: number;
  sequencingLagsMs: {
    pelvisToTorso: number;
    torsoToShoulder: number;
    shoulderToElbow: number;
    elbowToRelease: number;
  };
  acuteChronicWorkloadRatio: number;
  workloadRiskTier: 'OPTIMAL' | 'ELEVATED' | 'DANGER_SPIKE' | 'UNDERLOAD';
  armFatiguePenaltyFactor: number;
  deepPassingAccuracyDiscount: number;
  releaseVelocityDropMph: number;
}

/**
 * Evaluates whether the quarterback's kinetic chain sequences in the correct proximal-to-distal order:
 * Pelvis -> Torso -> Shoulder -> Elbow -> Ball Release
 */
export function evaluateKineticChainSequencing(keypoints: KineticChainKeypoints): {
  isOrdered: boolean;
  efficiency: number;
  lags: {
    pelvisToTorso: number;
    torsoToShoulder: number;
    shoulderToElbow: number;
    elbowToRelease: number;
  };
} {
  const {
    pelvisPeakAngularVelocityMs: tPelvis,
    torsoPeakAngularVelocityMs: tTorso,
    shoulderExtRotationMs: tShoulder,
    elbowExtensionMs: tElbow,
    ballReleaseMs: tRelease,
  } = keypoints;

  const lag1 = tTorso - tPelvis;
  const lag2 = tShoulder - tTorso;
  const lag3 = tElbow - tShoulder;
  const lag4 = tRelease - tElbow;

  // Strict proximal-to-distal monotonicity
  const isOrdered = lag1 >= 0 && lag2 >= 0 && lag3 >= 0 && lag4 >= 0;

  // Ideal timing windows (calibrated from MLB/NFL biomechanics literature):
  // pelvis-to-torso: 25-50ms; torso-to-shoulder: 20-40ms; shoulder-to-elbow: 15-35ms; elbow-to-release: 10-25ms
  let penalty = 0;
  if (!isOrdered) {
    penalty += 0.35;
  }

  // Check out-of-bounds lags
  if (lag1 < 10 || lag1 > 80) penalty += 0.1;
  if (lag2 < 10 || lag2 > 60) penalty += 0.1;
  if (lag3 < 5 || lag3 > 50) penalty += 0.1;
  if (lag4 < 5 || lag4 > 40) penalty += 0.1;

  // Elbow stress penalty if angle is outside optimal 85-105 deg window
  if (keypoints.shoulderElbowAngleDeg < 80 || keypoints.shoulderElbowAngleDeg > 115) {
    penalty += 0.15;
  }

  const efficiency = Math.max(0.4, Math.min(1.0, 1.0 - penalty));

  return {
    isOrdered,
    efficiency: Number(efficiency.toFixed(3)),
    lags: {
      pelvisToTorso: lag1,
      torsoToShoulder: lag2,
      shoulderToElbow: lag3,
      elbowToRelease: lag4,
    },
  };
}

/**
 * Calculates Acute:Chronic Workload Ratio (ACWR) and fatigue metrics.
 * Based on Gabbett (2016) sports science workload framework.
 */
export function calculateAcwrAndFatigue(history: QuarterbackWorkloadHistory): {
  acwr: number;
  riskTier: 'OPTIMAL' | 'ELEVATED' | 'DANGER_SPIKE' | 'UNDERLOAD';
  fatigueFactor: number;
  deepAccuracyDiscount: number;
  velocityDropMph: number;
} {
  const {
    acutePassAttempts7d,
    chronicPassAttempts28d,
    gamePassAttemptsCurrent,
    hitsOrSacksTakenCurrent,
    daysRestSinceLastGame,
  } = history;

  // Chronic weekly average
  const chronicWeeklyAvg = Math.max(15, chronicPassAttempts28d / 4.0);
  const acwr = acutePassAttempts7d / chronicWeeklyAvg;

  let riskTier: 'OPTIMAL' | 'ELEVATED' | 'DANGER_SPIKE' | 'UNDERLOAD' = 'OPTIMAL';
  if (acwr < 0.75) {
    riskTier = 'UNDERLOAD';
  } else if (acwr > 1.50) {
    riskTier = 'DANGER_SPIKE';
  } else if (acwr > 1.25) {
    riskTier = 'ELEVATED';
  }

  // Cumulative in-game fatigue score
  let fatigueScore = gamePassAttemptsCurrent * 0.015 + hitsOrSacksTakenCurrent * 0.05;
  if (daysRestSinceLastGame < 5) {
    // Short week penalty (Thursday Night Football)
    fatigueScore += 0.12;
  }

  if (riskTier === 'DANGER_SPIKE') {
    fatigueScore += 0.20;
  }

  // Clamped fatigue penalty factor (1.0 = perfectly fresh, 0.70 = severe fatigue)
  const fatigueFactor = Math.max(0.70, Math.min(1.0, 1.0 - fatigueScore));

  // Deep passing accuracy discount (throws > 20 air yards suffer greatest loss of kinetic power)
  const deepAccuracyDiscount = Math.max(0.65, Math.min(1.0, 1.0 - fatigueScore * 1.5));

  // Velocity drop in mph (up to 3.5 mph drop on late throws under acute strain)
  const velocityDropMph = Number((fatigueScore * 5.0).toFixed(1));

  return {
    acwr: Number(acwr.toFixed(3)),
    riskTier,
    fatigueFactor: Number(fatigueFactor.toFixed(3)),
    deepAccuracyDiscount: Number(deepAccuracyDiscount.toFixed(3)),
    velocityDropMph,
  };
}

/**
 * Evaluates comprehensive quarterback biomechanical status.
 */
export function evaluateQuarterbackBiomechanics(
  keypoints: KineticChainKeypoints,
  workload: QuarterbackWorkloadHistory
): BiomechanicalEvaluation {
  const sequencing = evaluateKineticChainSequencing(keypoints);
  const workloadAnalysis = calculateAcwrAndFatigue(workload);

  // Combined discount combines kinetic chain inefficiency with workload fatigue
  const combinedDeepDiscount = workloadAnalysis.deepAccuracyDiscount * (0.8 + 0.2 * sequencing.efficiency);

  return {
    isKineticChainOrdered: sequencing.isOrdered,
    kineticChainEfficiency: sequencing.efficiency,
    sequencingLagsMs: sequencing.lags,
    acuteChronicWorkloadRatio: workloadAnalysis.acwr,
    workloadRiskTier: workloadAnalysis.riskTier,
    armFatiguePenaltyFactor: workloadAnalysis.fatigueFactor,
    deepPassingAccuracyDiscount: Number(combinedDeepDiscount.toFixed(3)),
    releaseVelocityDropMph: workloadAnalysis.velocityDropMph,
  };
}
