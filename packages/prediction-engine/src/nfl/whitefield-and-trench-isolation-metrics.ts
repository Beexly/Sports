/**
 * whitefield-and-trench-isolation-metrics.ts
 * ============================================================================
 * Pure first-principles TypeScript kernels distilled from Niner Narrative
 * & Brett Whitefield (Fantasy Points Data Suite) metric theory for Stream 15M:
 *
 *  1. Pass/Run Block Win Rate (PBWR / RBWR 2.5-second threshold) separating
 *     OL quick-pressure allowed (<2.5s) from QB late-hold sacks (>3.0s).
 *  2. True Routes Run (excluding pass-blocking & screen-blocking snaps) +
 *     1st Downs per Route Run (1D/RR) + Average Separation Score (ASS)
 *     leading breakout indicator.
 *  3. RB-Created Efficiency (YAC/Att + Forced Missed Tackles rate) isolated
 *     from OL-created Yards Before Contact (YBC/Att) + Bellcow trend slope.
 *  4. Dual Success Rate (EPA > 0 and situational 50%/70%/100% yards-to-go) +
 *     QB progression charting (1st-read vs secondary-read vs scramble EPA).
 */

import { clamp, clamp01, sigmoid } from "./osf-math-core.js";

export interface TrenchIsolationInput {
  readonly dropbacks: number;
  readonly olQuickPressuresUnder25Sec: number;
  readonly qbLateSacksOver30Sec: number;
  readonly olBlocksHeld25SecPlus: number;
  readonly rushSnaps: number;
  readonly rushBlocksWon: number;
}

export interface TrenchIsolationResult {
  readonly pbwr: number;
  readonly rbwr: number;
  readonly olTrueQuickPressureRate: number;
  readonly qbSelfInflictedSackShare: number;
  readonly projectedTruePressureRate: number;
  readonly trenchIsolationEpaDelta: number;
}

/**
 * Separates OL <2.5s PBWR failures from >3.0s QB-caused sacks/pressures.
 */
export function computeTrenchIsolationPbwrRbwr(
  input: TrenchIsolationInput,
): TrenchIsolationResult {
  const dropbacks = Math.max(1, input.dropbacks);
  const rushSnaps = Math.max(1, input.rushSnaps);
  const pbwr = Number(clamp01(input.olBlocksHeld25SecPlus / dropbacks).toFixed(6));
  const rbwr = Number(clamp01(input.rushBlocksWon / rushSnaps).toFixed(6));

  const olQuick = Math.max(0, input.olQuickPressuresUnder25Sec);
  const qbLate = Math.max(0, input.qbLateSacksOver30Sec);
  const olTrueQuickPressureRate = Number(clamp01(olQuick / dropbacks).toFixed(6));
  const totalFailures = olQuick + qbLate;
  const qbSelfInflictedSackShare =
    totalFailures === 0 ? 0 : Number(clamp01(qbLate / totalFailures).toFixed(6));

  // Regress OL true pressure slightly toward league ~0.21 baseline while down-weighting sticky noise
  const reliability = dropbacks / (dropbacks + 180);
  const projectedTruePressureRate = Number(
    (0.21 + reliability * (olTrueQuickPressureRate - 0.21) + 0.04 * (qbLate / dropbacks)).toFixed(6),
  );
  const trenchIsolationEpaDelta = Number(
    clamp(0.18 * (pbwr - 0.62) + 0.14 * (rbwr - 0.70) - 0.22 * (olTrueQuickPressureRate - 0.20), -0.10, 0.10).toFixed(6),
  );

  return {
    pbwr,
    rbwr,
    olTrueQuickPressureRate,
    qbSelfInflictedSackShare,
    projectedTruePressureRate,
    trenchIsolationEpaDelta,
  };
}

export interface TrueRoutesAndAssInput {
  readonly totalPassSnaps: number;
  readonly passBlockSnaps: number;
  readonly screenBlockSnaps: number;
  readonly targets: number;
  readonly receivingYards: number;
  readonly firstDowns: number;
  /** Average Separation Score (earned separation residual above coverage/cushion). */
  readonly averageSeparationScore: number;
}

export interface TrueRoutesAndAssResult {
  readonly trueRoutesRun: number;
  readonly naiveYprr: number;
  readonly trueYprr: number;
  readonly trueTprr: number;
  readonly firstDownsPerRouteRun: number;
  readonly breakoutLeadingScore: number;
  readonly projectedNextTargetShareBoost: number;
}

/**
 * Strips pass-blocking and screen-blocking snaps for accurate TE/WR route denominators
 * and scores ASS + 1D/RR leading breakout potential.
 */
export function computeTrueRoutesRunAndAssBreakout(
  input: TrueRoutesAndAssInput,
): TrueRoutesAndAssResult {
  const totalPass = Math.max(1, input.totalPassSnaps);
  const trueRoutesRun = Math.max(
    1,
    totalPass - Math.max(0, input.passBlockSnaps) - Math.max(0, input.screenBlockSnaps),
  );
  const naiveYprr = Number((input.receivingYards / totalPass).toFixed(6));
  const trueYprr = Number((input.receivingYards / trueRoutesRun).toFixed(6));
  const trueTprr = Number(clamp01(input.targets / trueRoutesRun).toFixed(6));
  const firstDownsPerRouteRun = Number(clamp01(input.firstDowns / trueRoutesRun).toFixed(6));

  const assNorm = clamp(input.averageSeparationScore, -0.5, 0.5);
  const rawBreakout =
    1.55 * assNorm + 2.25 * (firstDownsPerRouteRun - 0.08) + 1.1 * (trueTprr - 0.20) + 0.08 * (trueYprr - 1.65);
  const breakoutLeadingScore = Number(sigmoid(rawBreakout).toFixed(6));
  const projectedNextTargetShareBoost = Number(clamp(0.22 * (breakoutLeadingScore - 0.5), -0.08, 0.08).toFixed(6));

  return {
    trueRoutesRun,
    naiveYprr,
    trueYprr,
    trueTprr,
    firstDownsPerRouteRun,
    breakoutLeadingScore,
    projectedNextTargetShareBoost,
  };
}

export interface RbCreationAndBellcowInput {
  readonly carries: number;
  readonly yardsBeforeContactTotal: number;
  readonly yardsAfterContactTotal: number;
  readonly forcedMissedTackles: number;
  readonly explosiveRuns10Plus: number;
  /** Recent 3-week bellcow involvement shares (e.g. [0.46, 0.58, 0.71]). */
  readonly weeklyInvolvementShares: readonly number[];
}

export interface RbCreationAndBellcowResult {
  readonly ybcPerAtt: number;
  readonly yacPerAtt: number;
  readonly fmtPerAtt: number;
  readonly explosiveRunRate: number;
  readonly rbCreationShareRatio: number;
  readonly bellcowTrendSlope: number;
  readonly rbSkillEpaDelta: number;
}

/**
 * Isolates RB-created efficiency (YAC/Att + FMT/Att) from OL blocking (YBC/Att)
 * and measures week-over-week Bellcow Report role acceleration.
 */
export function computeRbCreationVsLineAndBellcowTrend(
  input: RbCreationAndBellcowInput,
): RbCreationAndBellcowResult {
  const carries = Math.max(1, input.carries);
  const ybcPerAtt = Number((input.yardsBeforeContactTotal / carries).toFixed(6));
  const yacPerAtt = Number((input.yardsAfterContactTotal / carries).toFixed(6));
  const fmtPerAtt = Number((Math.max(0, input.forcedMissedTackles) / carries).toFixed(6));
  const explosiveRunRate = Number(clamp01(Math.max(0, input.explosiveRuns10Plus) / carries).toFixed(6));

  const denom = Math.max(0.25, Math.max(0, ybcPerAtt) + Math.max(0, yacPerAtt));
  const rbCreationShareRatio = Number(clamp01(Math.max(0, yacPerAtt) / denom).toFixed(6));

  const shares = input.weeklyInvolvementShares;
  let bellcowTrendSlope = 0;
  if (shares.length >= 2) {
    const n = shares.length;
    const meanX = (n - 1) / 2;
    const meanY = shares.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      const dx = i - meanX;
      num += dx * (shares[i]! - meanY);
      den += dx * dx;
    }
    bellcowTrendSlope = den > 0 ? Number(clamp(num / den, -0.25, 0.25).toFixed(6)) : 0;
  }

  const rbSkillEpaDelta = Number(
    clamp(0.06 * (yacPerAtt - 2.6) + 0.14 * (fmtPerAtt - 0.18) + 0.12 * bellcowTrendSlope, -0.08, 0.08).toFixed(6),
  );

  return {
    ybcPerAtt,
    yacPerAtt,
    fmtPerAtt,
    explosiveRunRate,
    rbCreationShareRatio,
    bellcowTrendSlope,
    rbSkillEpaDelta,
  };
}

export interface QbProgressionAndSuccessInput {
  readonly epaPositiveRate: number;
  readonly situationalYardsSuccessRate: number;
  readonly firstReadEpa: number;
  readonly secondaryReadEpa: number;
  readonly scrambleDrillEpa: number;
  readonly checkdownRate: number;
}

export interface QbProgressionAndSuccessResult {
  readonly blendedSuccessRate: number;
  readonly progressionDepthGap: number;
  readonly sustainabilityIndex: number;
  readonly qbProgressionEpaDelta: number;
}

/**
 * Evaluates dual Success Rate definitions and multi-read QB progression sustainability.
 */
export function computeQbProgressionAndSuccessSplit(
  input: QbProgressionAndSuccessInput,
): QbProgressionAndSuccessResult {
  const epaSr = clamp01(input.epaPositiveRate);
  const ydsSr = clamp01(input.situationalYardsSuccessRate);
  const blendedSuccessRate = Number((0.62 * epaSr + 0.38 * ydsSr).toFixed(6));
  const progressionDepthGap = Number((input.firstReadEpa - input.secondaryReadEpa).toFixed(6));

  const z =
    2.4 * (input.secondaryReadEpa + 0.05) +
    1.1 * (input.scrambleDrillEpa - 0.02) +
    1.8 * (blendedSuccessRate - 0.44) -
    1.2 * Math.max(0, input.checkdownRate - 0.12);
  const sustainabilityIndex = Number(sigmoid(z).toFixed(6));
  const qbProgressionEpaDelta = Number(
    clamp(0.18 * (blendedSuccessRate - 0.45) + 0.09 * (sustainabilityIndex - 0.5), -0.09, 0.09).toFixed(6),
  );

  return {
    blendedSuccessRate,
    progressionDepthGap,
    sustainabilityIndex,
    qbProgressionEpaDelta,
  };
}

export interface NonSneakSuccessGuardInput {
  readonly totalOffensivePlays: number;
  readonly qbSneakPlays: number;
  readonly qbSneakSuccesses: number;
  readonly rawYardsSuccessRate: number;
  readonly firstAnd20PenaltyDrives: number;
  readonly totalDrives: number;
}

export interface NonSneakSuccessGuardResult {
  readonly nonSneakPlays: number;
  readonly rawYardsSuccessRate: number;
  readonly nonSneakSuccessRate: number;
  readonly sneakInflationGap: number;
  readonly firstAnd20StallRate: number;
  readonly cleanedSuccessEpaDelta: number;
}

/**
 * Strips 3rd/4th-and-1 QB sneak / Tush Push inflation from raw yards-to-go
 * success rate and penalizes high 1st-and-20 holding drive-stall frequency.
 */
export function computeNonSneakSuccessRateGuard(
  input: NonSneakSuccessGuardInput,
): NonSneakSuccessGuardResult {
  const totalPlays = Math.max(1, Number.isFinite(input.totalOffensivePlays) ? input.totalOffensivePlays : 1);
  const sneakPlays = Math.max(0, Math.min(totalPlays - 1, Number.isFinite(input.qbSneakPlays) ? input.qbSneakPlays : 0));
  const nonSneakPlays = Math.max(1, totalPlays - sneakPlays);
  const rawSr = clamp01(Number.isFinite(input.rawYardsSuccessRate) ? input.rawYardsSuccessRate : 0.44);
  const rawSuccesses = rawSr * totalPlays;
  const sneakSuccesses = Math.max(0, Math.min(sneakPlays, Number.isFinite(input.qbSneakSuccesses) ? input.qbSneakSuccesses : 0));
  const nonSneakSuccessRate = Number(
    clamp01((rawSuccesses - sneakSuccesses) / nonSneakPlays).toFixed(6),
  );
  const sneakInflationGap = Number((rawSr - nonSneakSuccessRate).toFixed(6));
  const firstAnd20Drives = Number.isFinite(input.firstAnd20PenaltyDrives) ? input.firstAnd20PenaltyDrives : 0;
  const totalDrives = Math.max(1, Number.isFinite(input.totalDrives) ? input.totalDrives : 1);
  const firstAnd20StallRate = Number(
    clamp01(Math.max(0, firstAnd20Drives) / totalDrives).toFixed(6),
  );
  const cleanedSuccessEpaDelta = Number(
    clamp(
      0.16 * (nonSneakSuccessRate - 0.44) - 0.14 * Math.max(0, firstAnd20StallRate - 0.06),
      -0.08,
      0.08,
    ).toFixed(6),
  );
  return {
    nonSneakPlays,
    rawYardsSuccessRate: rawSr,
    nonSneakSuccessRate,
    sneakInflationGap,
    firstAnd20StallRate,
    cleanedSuccessEpaDelta,
  };
}

export type PassRushCoverageRegimeLabel =
  | "TRUE_TRENCH_DOMINANCE"
  | "COVERAGE_SACK_REGIME"
  | "QUICK_RELEASE_BACKEND_VULNERABILITY"
  | "TRENCH_COLLAPSE";

export interface PassRushCoverageRegimeInput {
  readonly passRushWinRateUnder25Sec: number;
  readonly sackRatePerDropback: number;
  readonly secondaryCoverageHoldIndex: number;
  readonly qbTimeToThrowSec: number;
  readonly edgeRusherOutCount?: number;
  readonly startingCbOutCount?: number;
  readonly olStarterOutCount?: number;
}

export interface PassRushCoverageRegimeResult {
  readonly regime: PassRushCoverageRegimeLabel;
  readonly adjustedPrwr: number;
  readonly adjustedCoverageHold: number;
  readonly trueDisruptionRate: number;
  readonly coverageSackRegressionRisk: number;
  readonly quickReleaseVulnerability: number;
  readonly trenchCoverageRegimeEpaDelta: number;
}

/**
 * Classifies the 2x2 <2.5s Pass Rush Win Rate vs. sack-rate matrix to separate
 * sticky pass-rush pressure from secondary coverage-sack vs quick-game regimes.
 */
export function classifyPassRushCoverageRegime(
  input: PassRushCoverageRegimeInput,
): PassRushCoverageRegimeResult {
  const edgeOut = Math.max(0, input.edgeRusherOutCount ?? 0);
  const cbOut = Math.max(0, input.startingCbOutCount ?? 0);
  const olOut = Math.max(0, input.olStarterOutCount ?? 0);

  const adjustedPrwr = Number(
    clamp01(input.passRushWinRateUnder25Sec - 0.045 * edgeOut + 0.035 * (olOut + 0.35 * Math.max(0, olOut - 1))).toFixed(6),
  );
  const adjustedCoverageHold = Number(
    clamp01(input.secondaryCoverageHoldIndex - 0.07 * (cbOut + 0.25 * Math.max(0, cbOut - 1))).toFixed(6),
  );
  const sackRate = clamp01(input.sackRatePerDropback);
  const highPrwr = adjustedPrwr >= 0.44;
  const highSacks = sackRate >= 0.068;

  let regime: PassRushCoverageRegimeLabel;
  if (highPrwr && highSacks && adjustedCoverageHold >= 0.45) {
    regime = "TRUE_TRENCH_DOMINANCE";
  } else if (!highPrwr && highSacks) {
    regime = "COVERAGE_SACK_REGIME";
  } else if (highPrwr && !highSacks) {
    regime = "QUICK_RELEASE_BACKEND_VULNERABILITY";
  } else {
    regime = "TRENCH_COLLAPSE";
  }

  const coverageSackRegressionRisk = Number(
    clamp01(Math.max(0, sackRate - 0.055) * 7.0 * Math.max(0, 0.45 - adjustedPrwr) * 14.0).toFixed(6),
  );
  const quickReleaseVulnerability = Number(
    clamp01((1.0 - adjustedCoverageHold) * clamp(2.65 - input.qbTimeToThrowSec + 0.45, 0.2, 1.0)).toFixed(6),
  );
  const trueDisruptionRate = Number(
    clamp01(0.65 * adjustedPrwr * 0.55 + 0.35 * sackRate * 3.0).toFixed(6),
  );
  const trenchCoverageRegimeEpaDelta = Number(
    clamp(
      0.16 * (adjustedPrwr - 0.43) +
        0.10 * (adjustedCoverageHold - 0.50) -
        0.05 * coverageSackRegressionRisk -
        0.04 * (regime === "QUICK_RELEASE_BACKEND_VULNERABILITY" ? quickReleaseVulnerability : 0),
      -0.08,
      0.08,
    ).toFixed(6),
  );

  return {
    regime,
    adjustedPrwr,
    adjustedCoverageHold,
    trueDisruptionRate,
    coverageSackRegressionRisk,
    quickReleaseVulnerability,
    trenchCoverageRegimeEpaDelta,
  };
}

export interface StrictFmtInput {
  readonly carries: number;
  readonly rawTotalMissedTackles: number;
  readonly incidentalLosArmGrabs: number;
  readonly angleErodingOpenFieldBursts: number;
}

export interface StrictFmtResult {
  readonly strictFmtCount: number;
  readonly strictFmtPerAtt: number;
  readonly noiseInflationShare: number;
  readonly strictElusivenessEpaDelta: number;
}

/**
 * Strips non-forcible LOS shoulder/arm-grab contacts while crediting open-field
 * angle-eroding burst separation per Whitefield's strict FMT standard.
 */
export function computeStrictForcedMissedTackleIndex(
  input: StrictFmtInput,
): StrictFmtResult {
  const carries = Math.max(1, input.carries);
  const raw = Math.max(0, input.rawTotalMissedTackles);
  const losNoise = Math.max(0, Math.min(raw, input.incidentalLosArmGrabs));
  const bursts = Math.max(0, input.angleErodingOpenFieldBursts);
  const strictFmtCount = Math.max(0, raw - losNoise + bursts);
  const strictFmtPerAtt = Number((strictFmtCount / carries).toFixed(6));
  const noiseInflationShare = Number(
    (raw === 0 ? 0 : clamp01(losNoise / raw)).toFixed(6),
  );
  const strictElusivenessEpaDelta = Number(
    clamp(0.14 * (strictFmtPerAtt - 0.16), -0.06, 0.06).toFixed(6),
  );
  return {
    strictFmtCount,
    strictFmtPerAtt,
    noiseInflationShare,
    strictElusivenessEpaDelta,
  };
}

export interface BellcowWeeklyPoint {
  readonly week: number;
  readonly snapShare: number;
  readonly touchShare: number;
  readonly explosiveRunRate: number;
  readonly yacPerAtt: number;
  readonly strictFmtPerAtt: number;
  readonly rbYprr: number;
}

export interface BellcowTrajectorySlopeResult {
  readonly snapShareSlope: number;
  readonly efficiencyAcceleration: number;
  readonly bellcowExpansionSignal: number;
  readonly projectedNextWeekSnapShareDelta: number;
  readonly breakoutBuyLowFlag: boolean;
  readonly rbBellcowEpaDelta: number;
}

function olsSlope(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((acc, v) => acc + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = i - meanX;
    num += dx * ((values[i] ?? meanY) - meanY);
    den += dx * dx;
  }
  return den > 0 ? num / den : 0;
}

/**
 * Evaluates week-over-week Bellcow involvement slope and efficiency breakout
 * across explosive run rate, YAC/Att, strict FMT/Att, and RB YPRR.
 */
export function evaluateBellcowTrajectorySlope(
  weeklyPoints: readonly BellcowWeeklyPoint[],
): BellcowTrajectorySlopeResult {
  const ordered = [...weeklyPoints].sort((a, b) => a.week - b.week);
  const snapSlope = clamp(olsSlope(ordered.map((p) => p.snapShare)), -0.25, 0.25);
  const touchSlope = clamp(olsSlope(ordered.map((p) => p.touchShare)), -0.25, 0.25);
  const expSlope = clamp(olsSlope(ordered.map((p) => p.explosiveRunRate)), -0.15, 0.15);
  const yacSlope = clamp(olsSlope(ordered.map((p) => p.yacPerAtt)), -1.5, 1.5);
  const fmtSlope = clamp(olsSlope(ordered.map((p) => p.strictFmtPerAtt)), -0.15, 0.15);
  const yprrLast = ordered.length > 0 ? ordered[ordered.length - 1]!.rbYprr : 0.9;

  const efficiencyAcceleration = Number(
    clamp(0.45 * expSlope * 4.0 + 0.35 * (yacSlope / 3.0) + 0.20 * fmtSlope * 4.0, -0.5, 0.5).toFixed(6),
  );
  const rawSignal = 2.6 * snapSlope + 2.0 * touchSlope + 1.4 * efficiencyAcceleration + 0.22 * (yprrLast - 1.0);
  const bellcowExpansionSignal = Number(clamp(Math.tanh(rawSignal), -1, 1).toFixed(6));
  const projectedNextWeekSnapShareDelta = Number(
    clamp(0.18 * bellcowExpansionSignal + 0.35 * snapSlope, -0.20, 0.20).toFixed(6),
  );
  const breakoutBuyLowFlag = bellcowExpansionSignal >= 0.32 && ordered.length >= 2;
  const rbBellcowEpaDelta = Number(
    clamp(0.05 * bellcowExpansionSignal, -0.06, 0.06).toFixed(6),
  );

  return {
    snapShareSlope: Number(snapSlope.toFixed(6)),
    efficiencyAcceleration,
    bellcowExpansionSignal,
    projectedNextWeekSnapShareDelta,
    breakoutBuyLowFlag,
    rbBellcowEpaDelta,
  };
}

export interface SchemeConceptMatchupInput {
  readonly duoShare: number;
  readonly outsideZoneShare: number;
  readonly insideZoneShare: number;
  readonly gapPowerShare: number;
  readonly elevenPersonnelRate: number;
  readonly lightBoxRateAllowedByOpp: number;
  readonly defEpaAllowedVsDuo: number;
  readonly defEpaAllowedVsOz: number;
  readonly defEpaAllowedVsIz: number;
  readonly defEpaAllowedVsGap: number;
  readonly offEpaVsTwoHigh: number;
  readonly offEpaVsMan: number;
  readonly defTwoHighRate: number;
  readonly defCover1Rate: number;
}

export interface SchemeConceptMatchupResult {
  readonly weightedRunConceptEpaEdge: number;
  readonly coverageShellFitEpaEdge: number;
  readonly lightBoxElevenPersonnelFit: number;
  readonly schemeConceptMatchupEpaDelta: number;
}

/**
 * Matches offensive run-concept tendencies, personnel/box alignment, and
 * WR/QB vs coverage shell (Cover-1 vs Two-High) splits.
 */
export function evaluateSchemeConceptMatchupMatrix(
  input: SchemeConceptMatchupInput,
): SchemeConceptMatchupResult {
  const rawSum =
    Math.max(0, input.duoShare) +
    Math.max(0, input.outsideZoneShare) +
    Math.max(0, input.insideZoneShare) +
    Math.max(0, input.gapPowerShare);
  const norm = rawSum > 0 ? rawSum : 1;
  const wDuo = Math.max(0, input.duoShare) / norm;
  const wOz = Math.max(0, input.outsideZoneShare) / norm;
  const wIz = Math.max(0, input.insideZoneShare) / norm;
  const wGap = Math.max(0, input.gapPowerShare) / norm;

  const weightedRunConceptEpaEdge = Number(
    clamp(
      wDuo * input.defEpaAllowedVsDuo +
        wOz * input.defEpaAllowedVsOz +
        wIz * input.defEpaAllowedVsIz +
        wGap * input.defEpaAllowedVsGap,
      -0.25,
      0.25,
    ).toFixed(6),
  );
  const twoHigh = clamp01(input.defTwoHighRate);
  const cover1 = clamp01(input.defCover1Rate);
  const coverageShellFitEpaEdge = Number(
    clamp(twoHigh * input.offEpaVsTwoHigh + cover1 * input.offEpaVsMan, -0.25, 0.25).toFixed(6),
  );
  const lightBoxElevenPersonnelFit = Number(
    clamp(
      (clamp01(input.elevenPersonnelRate) - 0.55) * 0.4 +
        (clamp01(input.lightBoxRateAllowedByOpp) - 0.50) * 0.5,
      -0.35,
      0.35,
    ).toFixed(6),
  );
  const schemeConceptMatchupEpaDelta = Number(
    clamp(
      0.28 * weightedRunConceptEpaEdge + 0.30 * coverageShellFitEpaEdge + 0.04 * lightBoxElevenPersonnelFit,
      -0.08,
      0.08,
    ).toFixed(6),
  );

  return {
    weightedRunConceptEpaEdge,
    coverageShellFitEpaEdge,
    lightBoxElevenPersonnelFit,
    schemeConceptMatchupEpaDelta,
  };
}

export interface CrossChartingQcInput {
  readonly rpoPlayCount: number;
  readonly rpoWithWrRunBlockOrQuickReleaseCount: number;
  readonly observedModelPressureRate: number;
  readonly groundTruthChartedPressureRate: number;
  readonly impossibleAirYardsCount?: number;
  readonly totalChartedPassPlays?: number;
}

export interface CrossChartingQcResult {
  readonly qcPassed: boolean;
  readonly rpoConsistencyMismatchRate: number;
  readonly populationPressureInflationRatio: number;
  readonly populationDriftFlag: boolean;
  readonly reliabilityWeight: number;
  readonly anomalies: readonly string[];
}

/**
 * Validates cross-charting invariants (e.g. RPO play consistency) and enforces
 * the AWS/NGS Episode 3 population base-rate calibration guard.
 */
export function validateCrossChartingConsistency(
  input: CrossChartingQcInput,
): CrossChartingQcResult {
  const anomalies: string[] = [];
  const rpoTotal = Math.max(0, input.rpoPlayCount);
  const rpoConsistent = Math.max(0, Math.min(rpoTotal, input.rpoWithWrRunBlockOrQuickReleaseCount));
  const rpoMismatch = rpoTotal === 0 ? 0 : clamp01((rpoTotal - rpoConsistent) / rpoTotal);
  if (rpoMismatch > 0.20) {
    anomalies.push(`rpo_charting_mismatch_rate=${rpoMismatch.toFixed(3)}`);
  }

  const baseTruth = Math.max(0.05, input.groundTruthChartedPressureRate);
  const pressureRatio = Number((Math.max(0, input.observedModelPressureRate) / baseTruth).toFixed(6));
  const populationDriftFlag = pressureRatio > 1.5 || pressureRatio < 0.5;
  if (populationDriftFlag) {
    anomalies.push(`population_pressure_drift_ratio=${pressureRatio.toFixed(3)}`);
  }

  const badAir = Math.max(0, input.impossibleAirYardsCount ?? 0);
  const passDen = Math.max(1, input.totalChartedPassPlays ?? 100);
  const airErr = badAir / passDen;
  if (airErr > 0.03) {
    anomalies.push(`air_yards_depth_conflict_rate=${airErr.toFixed(3)}`);
  }

  const penalty = 0.35 * rpoMismatch + (populationDriftFlag ? 0.25 : 0) + 0.40 * clamp01(airErr * 5.0);
  const reliabilityWeight = Number(clamp(1.0 - penalty, 0.5, 1.0).toFixed(6));
  return {
    qcPassed: anomalies.length === 0,
    rpoConsistencyMismatchRate: Number(rpoMismatch.toFixed(6)),
    populationPressureInflationRatio: pressureRatio,
    populationDriftFlag,
    reliabilityWeight,
    anomalies,
  };
}

export interface GarbageTimeQbrProxyInput {
  readonly totalDropbacks: number;
  readonly cleanScriptDropbacks: number;
  readonly cleanScriptEpaPerDropback: number;
  readonly garbageTimeEpaPerDropback: number;
  readonly qbScrambleEpaContribution: number;
  readonly fumbleLostPenalty: number;
  readonly defensivePenaltiesDrawnYards: number;
  readonly receiverSpectacularCatchCreditSplit: number;
}

export interface GarbageTimeQbrProxyResult {
  readonly garbageTimeShare: number;
  readonly garbageTimeInflationBias: number;
  readonly receiverCreditAdjustedEpa: number;
  readonly garbageTimeFilteredQbrEpa: number;
  readonly qbrSustainabilityEpaDelta: number;
}

/**
 * Downweights Q4 garbage-time stat padding (WP < 0.05 or > 0.95), adds QB
 * scramble value and penalties drawn (offsides/DPI), and splits WR catch credit.
 */
export function computeGarbageTimeAdjustedQbrProxy(
  input: GarbageTimeQbrProxyInput,
): GarbageTimeQbrProxyResult {
  const totalDb = Math.max(1, input.totalDropbacks);
  const cleanDb = Math.max(1, Math.min(totalDb, input.cleanScriptDropbacks));
  const garbageDb = Math.max(0, totalDb - cleanDb);
  const garbageTimeShare = Number(clamp01(garbageDb / totalDb).toFixed(6));

  const rawBlended =
    (cleanDb * input.cleanScriptEpaPerDropback + garbageDb * input.garbageTimeEpaPerDropback) / totalDb;
  const weightedFiltered =
    (cleanDb * input.cleanScriptEpaPerDropback + 0.15 * garbageDb * input.garbageTimeEpaPerDropback) /
    Math.max(1, cleanDb + 0.15 * garbageDb);

  const garbageTimeInflationBias = Number((rawBlended - weightedFiltered).toFixed(6));
  const penaltyBoost = clamp((input.defensivePenaltiesDrawnYards / totalDb) * 0.045, -0.02, 0.06);
  const fumbleTax = Math.max(0, input.fumbleLostPenalty) / totalDb;
  const wrSplitHaircut = clamp(input.receiverSpectacularCatchCreditSplit, 0.0, 0.12);

  const receiverCreditAdjustedEpa = Number(
    (weightedFiltered - wrSplitHaircut * Math.max(0, weightedFiltered)).toFixed(6),
  );
  const garbageTimeFilteredQbrEpa = Number(
    (receiverCreditAdjustedEpa + input.qbScrambleEpaContribution + penaltyBoost - fumbleTax).toFixed(6),
  );
  const qbrSustainabilityEpaDelta = Number(
    clamp(0.45 * garbageTimeFilteredQbrEpa - 0.12 * Math.max(0, garbageTimeInflationBias), -0.08, 0.08).toFixed(6),
  );

  return {
    garbageTimeShare,
    garbageTimeInflationBias,
    receiverCreditAdjustedEpa,
    garbageTimeFilteredQbrEpa,
    qbrSustainabilityEpaDelta,
  };
}

export interface WhitefieldTrenchIsolationInput {
  readonly trench?: TrenchIsolationInput;
  readonly routesAss?: TrueRoutesAndAssInput;
  readonly rbCreation?: RbCreationAndBellcowInput;
  readonly qbProgression?: QbProgressionAndSuccessInput;
  readonly nonSneakSuccessGuard?: NonSneakSuccessGuardInput;
  readonly passRushCoverageRegime?: PassRushCoverageRegimeInput;
  readonly strictFmt?: StrictFmtInput;
  readonly bellcowWeeklyPoints?: readonly BellcowWeeklyPoint[];
  readonly schemeConceptMatchup?: SchemeConceptMatchupInput;
  readonly crossChartingQc?: CrossChartingQcInput;
  readonly garbageTimeQbrProxy?: GarbageTimeQbrProxyInput;
}

export interface WhitefieldTrenchIsolationResult {
  readonly trenchIsolation: TrenchIsolationResult;
  readonly trueRoutesAndAss: TrueRoutesAndAssResult;
  readonly rbCreationAndBellcow: RbCreationAndBellcowResult;
  readonly qbProgressionAndSuccess: QbProgressionAndSuccessResult;
  readonly nonSneakSuccessGuard: NonSneakSuccessGuardResult;
  readonly passRushCoverageRegime: PassRushCoverageRegimeResult;
  readonly strictFmtIndex: StrictFmtResult;
  readonly bellcowTrajectory: BellcowTrajectorySlopeResult;
  readonly schemeConceptMatchup: SchemeConceptMatchupResult;
  readonly crossChartingQc: CrossChartingQcResult;
  readonly garbageTimeQbrProxy: GarbageTimeQbrProxyResult;
  readonly familyDeltaContributions: {
    readonly pressure: number;
    readonly coveragePersonnel: number;
    readonly qbSkillScript: number;
  };
}

/**
 * Composes Whitefield & Trench Isolation kernels (including all 7 PFR 11_19
 * situational rules) for Stream 15M inside Master Aggregator.
 */
export function evaluateWhitefieldTrenchIsolationBundle(
  input: WhitefieldTrenchIsolationInput = {},
): WhitefieldTrenchIsolationResult {
  const trenchIsolation = computeTrenchIsolationPbwrRbwr(
    input.trench ?? {
      dropbacks: 310,
      olQuickPressuresUnder25Sec: 58,
      qbLateSacksOver30Sec: 9,
      olBlocksHeld25SecPlus: 198,
      rushSnaps: 230,
      rushBlocksWon: 164,
    },
  );
  const trueRoutesAndAss = computeTrueRoutesRunAndAssBreakout(
    input.routesAss ?? {
      totalPassSnaps: 280,
      passBlockSnaps: 28,
      screenBlockSnaps: 14,
      targets: 58,
      receivingYards: 540,
      firstDowns: 28,
      averageSeparationScore: 0.08,
    },
  );
  const rbCreationAndBellcow = computeRbCreationVsLineAndBellcowTrend(
    input.rbCreation ?? {
      carries: 145,
      yardsBeforeContactTotal: 275,
      yardsAfterContactTotal: 425,
      forcedMissedTackles: 31,
      explosiveRuns10Plus: 18,
      weeklyInvolvementShares: [0.54, 0.61, 0.68],
    },
  );
  const qbProgressionAndSuccess = computeQbProgressionAndSuccessSplit(
    input.qbProgression ?? {
      epaPositiveRate: 0.47,
      situationalYardsSuccessRate: 0.46,
      firstReadEpa: 0.16,
      secondaryReadEpa: 0.02,
      scrambleDrillEpa: 0.09,
      checkdownRate: 0.09,
    },
  );
  const nonSneakSuccessGuard = computeNonSneakSuccessRateGuard(
    input.nonSneakSuccessGuard ?? {
      totalOffensivePlays: 560,
      qbSneakPlays: 12,
      qbSneakSuccesses: 10,
      rawYardsSuccessRate: 0.46,
      firstAnd20PenaltyDrives: 6,
      totalDrives: 95,
    },
  );
  const passRushCoverageRegime = classifyPassRushCoverageRegime(
    input.passRushCoverageRegime ?? {
      passRushWinRateUnder25Sec: 0.45,
      sackRatePerDropback: 0.07,
      secondaryCoverageHoldIndex: 0.54,
      qbTimeToThrowSec: 2.68,
      edgeRusherOutCount: 0,
      startingCbOutCount: 0,
      olStarterOutCount: 0,
    },
  );
  const strictFmtIndex = computeStrictForcedMissedTackleIndex(
    input.strictFmt ?? {
      carries: 145,
      rawTotalMissedTackles: 31,
      incidentalLosArmGrabs: 7,
      angleErodingOpenFieldBursts: 5,
    },
  );
  const bellcowTrajectory = evaluateBellcowTrajectorySlope(
    input.bellcowWeeklyPoints ?? [
      { week: 8, snapShare: 0.54, touchShare: 0.48, explosiveRunRate: 0.09, yacPerAtt: 2.7, strictFmtPerAtt: 0.16, rbYprr: 1.05 },
      { week: 9, snapShare: 0.61, touchShare: 0.55, explosiveRunRate: 0.11, yacPerAtt: 2.9, strictFmtPerAtt: 0.19, rbYprr: 1.22 },
      { week: 10, snapShare: 0.68, touchShare: 0.63, explosiveRunRate: 0.14, yacPerAtt: 3.15, strictFmtPerAtt: 0.22, rbYprr: 1.38 },
    ],
  );
  const schemeConceptMatchup = evaluateSchemeConceptMatchupMatrix(
    input.schemeConceptMatchup ?? {
      duoShare: 0.28,
      outsideZoneShare: 0.34,
      insideZoneShare: 0.24,
      gapPowerShare: 0.14,
      elevenPersonnelRate: 0.62,
      lightBoxRateAllowedByOpp: 0.58,
      defEpaAllowedVsDuo: 0.02,
      defEpaAllowedVsOz: 0.03,
      defEpaAllowedVsIz: -0.01,
      defEpaAllowedVsGap: 0.01,
      offEpaVsTwoHigh: 0.04,
      offEpaVsMan: 0.03,
      defTwoHighRate: 0.52,
      defCover1Rate: 0.26,
    },
  );
  const crossChartingQc = validateCrossChartingConsistency(
    input.crossChartingQc ?? {
      rpoPlayCount: 45,
      rpoWithWrRunBlockOrQuickReleaseCount: 43,
      observedModelPressureRate: 0.22,
      groundTruthChartedPressureRate: 0.21,
      impossibleAirYardsCount: 0,
      totalChartedPassPlays: 280,
    },
  );
  const garbageTimeQbrProxy = computeGarbageTimeAdjustedQbrProxy(
    input.garbageTimeQbrProxy ?? {
      totalDropbacks: 310,
      cleanScriptDropbacks: 284,
      cleanScriptEpaPerDropback: 0.11,
      garbageTimeEpaPerDropback: 0.18,
      qbScrambleEpaContribution: 0.024,
      fumbleLostPenalty: 1.4,
      defensivePenaltiesDrawnYards: 38,
      receiverSpectacularCatchCreditSplit: 0.02,
    },
  );

  const qcWeight = crossChartingQc.reliabilityWeight;
  const familyDeltaContributions = {
    pressure: Number(
      clamp(
        qcWeight * (0.30 * trenchIsolation.trenchIsolationEpaDelta + 0.18 * passRushCoverageRegime.trenchCoverageRegimeEpaDelta),
        -0.035,
        0.035,
      ).toFixed(6),
    ),
    coveragePersonnel: Number(
      clamp(
        qcWeight * (
          0.15 * trueRoutesAndAss.projectedNextTargetShareBoost +
          0.18 * rbCreationAndBellcow.rbSkillEpaDelta +
          0.12 * strictFmtIndex.strictElusivenessEpaDelta +
          0.14 * bellcowTrajectory.rbBellcowEpaDelta +
          0.16 * schemeConceptMatchup.schemeConceptMatchupEpaDelta
        ),
        -0.035,
        0.035,
      ).toFixed(6),
    ),
    qbSkillScript: Number(
      clamp(
        qcWeight * (
          0.26 * qbProgressionAndSuccess.qbProgressionEpaDelta +
          0.18 * nonSneakSuccessGuard.cleanedSuccessEpaDelta +
          0.20 * garbageTimeQbrProxy.qbrSustainabilityEpaDelta
        ),
        -0.035,
        0.035,
      ).toFixed(6),
    ),
  };

  return {
    trenchIsolation,
    trueRoutesAndAss,
    rbCreationAndBellcow,
    qbProgressionAndSuccess,
    nonSneakSuccessGuard,
    passRushCoverageRegime,
    strictFmtIndex,
    bellcowTrajectory,
    schemeConceptMatchup,
    crossChartingQc,
    garbageTimeQbrProxy,
    familyDeltaContributions,
  };
}
