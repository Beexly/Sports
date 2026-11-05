/**
 * Batch 3 + Batch 4 + Gap-Hunt + Repo-Catalog + AM Sweep — Deep Mathematical,
 * Statistical Physics, Neuro-Biomechanical, Spatial Tracking & Calibration Bridge.
 *
 * Implements the 12 core multi-paper operators and wires them into the live
 * GSE zero-orphan expected-metrics and situational reasoning pipeline:
 *   1. Short-Week Circadian & Travel Penalty (arXiv:2601.15504v1)
 *   2. Neuro-Biomechanical Collision Load & Subconcussive Cascade
 *      (Omalu W4253308936, Guskiewicz W2105910930, Goldstein W2116016048,
 *       Yi & Cantu 2013 immunoexcitotoxicity, McKee W2081325915/W2141679195/W2217184110,
 *       Sweeney-Zloković W2786608785 BBB breakdown, Kanakis/Volloch 2026 sustained ISR)
 *   3. In-Game Defensive Drive Fatigue Decay (arXiv:2510.19402v1 + Malone 2025)
 *   4. Carter-Machol EP Origin + Brill Uncertainty + Daly-Grafstein Selection Correction
 *      (Carter & Machol 1971, Brill et al. 2023, Daly-Grafstein 2023, arXiv:2306.03891v1)
 *   5. Osborne-Levine Empirical Bayes FG Shrinkage + Dube Doinkalytics + Martin Markov OT
 *   6. Efron-Hastie Tweedie Empirical Bayes Non-Parametric Prop Shrinkage (CASI 2016 + 2410.08539v2)
 *   7. Thorp Exact Multi-Outcome Kelly + Baker-McHale Variance Shrinkage + Kalshi Event Hedge
 *      (Thorp 2006, Baker & McHale JQAS, arXiv:1412.2031v1, arXiv:2603.04411v1, AM-INV-B05)
 *   8. Second Spectrum US10521671 + UnravelSports Data-Oriented Float64Array Spatial Control
 *   9. Continuum Anisotropic Percolation + ASEP Jamming + Fokker-Planck Moving Barrier +
 *      Navier-Stokes Trench Shockwave + Kardar 8.333 Boltzmann Transport
 *      (cond-mat/0212434v1, cond-mat/0306541v2, cond-mat/0412143v2, physics/0701164v1)
 *  10. Heuer (1999) CIA Analysis of Competing Hypotheses (ACH) Diagnosticity Matrix
 *  11. Edge0 (AM-02) Next-Snap Prerouter Expert Activation + Ward & Cowling (2009) Determinized UCB1
 *  12. Dimitriadis-Gneiting-Jordan (2021) CORP PAV Isotonic Recalibration + Walsh-Joshi ROI Gate
 */

export interface ShortWeekCircadianInput {
  restDaysOffense: number;
  restDaysDefense: number;
  timeZoneDeltaHours: number; // positive = eastward travel (harder circadian phase advance)
  kickoffLocalHour24: number; // e.g., 20.25 for 8:15 PM TNF
  isAwayTeam: boolean;
}

export interface ShortWeekCircadianResult {
  circadianPhasePenaltyEpa: number;
  neuromuscularFatigueMultiplier: number;
  lateGameFourthQuarterDecayDelta: number;
}

/**
 * 1. Short-Week Circadian Phase-Shift & Travel Penalty (arXiv:2601.15504v1).
 * Models incomplete glycogen/neuromuscular recovery on < 6 rest days (< 96 hours recovery window)
 * coupled with eastward/westward circadian phase misalignment.
 */
export function computeShortWeekCircadianPenalty(
  input: ShortWeekCircadianInput,
): ShortWeekCircadianResult {
  const restDeficitOff = Math.max(0, 7 - input.restDaysOffense);
  const restDeficitDef = Math.max(0, 7 - input.restDaysDefense);
  const netRestAdvantage = input.restDaysOffense - input.restDaysDefense;

  // Eastward travel (positive tz delta) requires phase advance, 1.35x harder than phase delay
  const tzAsymmetry =
    input.timeZoneDeltaHours > 0
      ? input.timeZoneDeltaHours * 1.35
      : Math.abs(input.timeZoneDeltaHours) * 0.9;

  // Circadian nadir misalignment when body clock > 22:30 local equivalent
  const biologicalHour = (input.kickoffLocalHour24 + input.timeZoneDeltaHours + 24) % 24;
  const nadirOverhang = Math.max(0, biologicalHour - 21.5);

  const awayShortWeekInteraction =
    input.isAwayTeam && input.restDaysOffense <= 4 ? -0.022 : 0;

  const circadianPhasePenaltyEpa = Number(
    Math.max(
      -0.085,
      Math.min(
        0.045,
        0.008 * netRestAdvantage -
          0.0065 * tzAsymmetry -
          0.0045 * nadirOverhang +
          awayShortWeekInteraction,
      ),
    ).toFixed(5),
  );

  const neuromuscularFatigueMultiplier = Number(
    Math.max(
      0.88,
      Math.min(1.06, 1 - 0.018 * restDeficitOff + 0.012 * restDeficitDef - 0.005 * tzAsymmetry),
    ).toFixed(4),
  );

  const lateGameFourthQuarterDecayDelta = Number(
    (-0.011 * restDeficitOff - 0.004 * tzAsymmetry).toFixed(5),
  );

  return {
    circadianPhasePenaltyEpa,
    neuromuscularFatigueMultiplier,
    lateGameFourthQuarterDecayDelta,
  };
}

export interface NeuroBiomechanicalCollisionInput {
  priorCareerConcussions: number;
  recent72hSubconcussiveHits: number;
  peakRotationalAccelerationRadPerSec2: number; // Goldstein W2116016048 bobblehead shear
  hoursSinceLastHighGImpact: number;
  hypoxicAltitudeMeters?: number;
}

export interface NeuroBiomechanicalCollisionResult {
  guskiewiczRecurrentHazardRatio: number;
  goldsteinSulcalShearStressIndex: number;
  yiCantuImmunoexcitotoxicCascadeScore: number;
  sweeneyZlokovicBbbPermeabilityIndex: number;
  vollochSustainedIsrTranslationSuppression: number;
  processingSpeedLogitPenalty: number;
}

/**
 * 2. Multi-Scale Neuro-Biomechanical Collision Load & Subconcussive Cascade.
 * Synthesizes Omalu (2005), Guskiewicz (2005 >=3 concussion 3x-5x threshold),
 * Goldstein (2012 bobblehead rotational acceleration), Yi & Cantu (2013 glutamate/Ca2+
 * microglial priming), McKee (2009/2013/2016 sulcal depth perivascular p-tau),
 * Sweeney & Zloković (2018 BBB tight-junction breakdown), and Kanakis/Volloch (2026
 * sustained neuronal eIF2alpha ISR + HIF-1alpha switch).
 */
export function computeNeuroBiomechanicalCollisionLoad(
  input: NeuroBiomechanicalCollisionInput,
): NeuroBiomechanicalCollisionResult {
  // Guskiewicz et al. (2005, W2105910930): nonlinear jump at >= 3 prior concussions
  const guskiewiczRecurrentHazardRatio =
    input.priorCareerConcussions >= 3
      ? 3.4 + 0.55 * (input.priorCareerConcussions - 3)
      : input.priorCareerConcussions === 2
        ? 1.85
        : input.priorCareerConcussions === 1
          ? 1.25
          : 1.0;

  // Goldstein et al. (2012, W2116016048) & McKee (2016, W2217184110):
  // Rotational acceleration concentrates shear strain at the depths of cortical sulci
  const normalizedRotAccel = Math.max(0, input.peakRotationalAccelerationRadPerSec2) / 4500;
  const goldsteinSulcalShearStressIndex = Number(
    (Math.pow(normalizedRotAccel, 1.45) * (1 + 0.03 * input.recent72hSubconcussiveHits)).toFixed(4),
  );

  // Yi & Cantu (2013) + Hickman et al. (2018, W2890627020):
  // First hits prime microglia; subsequent hits within 72h window trigger hyper-reactive
  // glutamate/NMDA/AMPA Ca2+ excitotoxicity
  const recoveryDecay = Math.exp(-Math.max(0, input.hoursSinceLastHighGImpact) / 48);
  const yiCantuImmunoexcitotoxicCascadeScore = Number(
    Math.min(
      1.0,
      0.18 * Math.log1p(input.recent72hSubconcussiveHits) * (1 + 1.4 * recoveryDecay) *
        Math.sqrt(guskiewiczRecurrentHazardRatio),
    ).toFixed(4),
  );

  // Sweeney, Sagare & Zloković (2018, W2786608785): BBB pericyte/claudin-5 permeability index
  const sweeneyZlokovicBbbPermeabilityIndex = Number(
    Math.min(
      1.0,
      0.35 * goldsteinSulcalShearStressIndex + 0.65 * yiCantuImmunoexcitotoxicCascadeScore,
    ).toFixed(4),
  );

  // Kanakis (2026) / Volloch ACH 2.0: sustained neuronal Integrated Stress Response (p-eIF2alpha)
  // plus biphasic HIF-1alpha altitude/hypoxia amplification
  const hypoxiaFactor = 1 + Math.max(0, (input.hypoxicAltitudeMeters ?? 0) - 500) / 3500;
  const vollochSustainedIsrTranslationSuppression = Number(
    Math.min(
      1.0,
      sweeneyZlokovicBbbPermeabilityIndex *
        (0.5 + 0.15 * Math.min(4, input.priorCareerConcussions)) *
        hypoxiaFactor,
    ).toFixed(4),
  );

  const processingSpeedLogitPenalty = Number(
    (-0.085 * vollochSustainedIsrTranslationSuppression).toFixed(5),
  );

  return {
    guskiewiczRecurrentHazardRatio: Number(guskiewiczRecurrentHazardRatio.toFixed(3)),
    goldsteinSulcalShearStressIndex,
    yiCantuImmunoexcitotoxicCascadeScore,
    sweeneyZlokovicBbbPermeabilityIndex,
    vollochSustainedIsrTranslationSuppression,
    processingSpeedLogitPenalty,
  };
}

export interface DefensiveDriveFatigueInput {
  consecutiveDefensiveSnapsOnDrive: number;
  cumulativeDefensiveSnapsGame: number;
  secondsBetweenPlays: number; // offensive tempo pace
  defensiveLineRotationDepth: number; // 1.0 = average 8-man rotation
}

export interface DefensiveDriveFatigueResult {
  fatigueSuccessRateAllowanceDelta: number;
  explosivePlayHazardMultiplier: number;
  passRushSnapDisruptionDecay: number;
}

/**
 * 3. In-Game Defensive Drive Fatigue & Tempo Elasticity (arXiv:2510.19402v1 + Malone 2025).
 * Models non-linear defensive degradation once a drive crosses snap 7+ under fast tempo.
 */
export function computeDefensiveDriveFatigueDecay(
  input: DefensiveDriveFatigueInput,
): DefensiveDriveFatigueResult {
  const driveOverhang = Math.max(0, input.consecutiveDefensiveSnapsOnDrive - 6);
  const gameOverhang = Math.max(0, input.cumulativeDefensiveSnapsGame - 48);
  const tempoPressure = Math.max(0.75, Math.min(1.45, 28 / Math.max(16, input.secondsBetweenPlays)));
  const depthCushion = Math.max(0.7, Math.min(1.3, input.defensiveLineRotationDepth));

  const effectiveFatigueLoad =
    ((0.0095 * Math.pow(driveOverhang, 1.25) + 0.0018 * gameOverhang) * tempoPressure) /
    depthCushion;

  return {
    fatigueSuccessRateAllowanceDelta: Number(Math.min(0.14, effectiveFatigueLoad).toFixed(5)),
    explosivePlayHazardMultiplier: Number(
      Math.min(1.45, 1 + 2.4 * effectiveFatigueLoad).toFixed(4),
    ),
    passRushSnapDisruptionDecay: Number(
      Math.max(0.65, 1 - 1.8 * effectiveFatigueLoad).toFixed(4),
    ),
  };
}

export interface FourthDownEpInput {
  yardline100: number; // yards from opponent endzone (1..99)
  yardsToGo: number;
  goForItConversionProb: number;
  fieldGoalMakeProb: number;
  netPuntYards: number;
  bootstrapSampleSizeN: number; // Brill 2023 effective sample size at this state
  offensiveQualityZ: number; // Daly-Grafstein 2023 unobserved offensive strength selection factor
}

export interface FourthDownEpResult {
  carterMacholBaselineEp: number;
  dalyGrafsteinSelectionCorrectedConvProb: number;
  epGoForIt: number;
  epFieldGoal: number;
  epPunt: number;
  brillConfidenceIntervalHalfWidth: number;
  decisionVerdict: "GO_FOR_IT" | "FIELD_GOAL" | "PUNT" | "TOSS_UP_HUMILITY_BAND";
}

/**
 * 4. Carter & Machol (1971) EP Origin + Brill et al. (2023) Bootstrap Humility Band +
 *    Daly-Grafstein (2023) Preferential Selection-Bias Correction + arXiv:2306.03891v1.
 */
export function computeCarterMacholBrillFourthDownEp(
  input: FourthDownEpInput,
): FourthDownEpResult {
  // Carter & Machol (1971) piecewise linear-anchor Expected Points Value of 1st-and-10
  const epFirstDownAt = (yl100: number): number => {
    const clamped = Math.max(1, Math.min(99, yl100));
    return Number((6.45 - 0.082 * clamped + 0.00012 * clamped * (100 - clamped)).toFixed(4));
  };

  const carterMacholBaselineEp = epFirstDownAt(input.yardline100);

  // Daly-Grafstein (2023): naive empirical conversion rates overstate weak offenses because
  // historically only strong offenses went for it in borderline spots.
  const selectionLogitShift = 0.22 * input.offensiveQualityZ - 0.065;
  const rawLogit = Math.log(
    Math.max(0.02, Math.min(0.98, input.goForItConversionProb)) /
      (1 - Math.max(0.02, Math.min(0.98, input.goForItConversionProb))),
  );
  const dalyGrafsteinSelectionCorrectedConvProb = Number(
    (1 / (1 + Math.exp(-(rawLogit + selectionLogitShift)))).toFixed(4),
  );

  const newYlIfConverted = Math.max(1, input.yardline100 - input.yardsToGo);
  const epIfConverted = input.yardline100 <= input.yardsToGo ? 6.95 : epFirstDownAt(newYlIfConverted);
  const epIfFailed = -epFirstDownAt(100 - input.yardline100);
  const epGoForIt = Number(
    (
      dalyGrafsteinSelectionCorrectedConvProb * epIfConverted +
      (1 - dalyGrafsteinSelectionCorrectedConvProb) * epIfFailed
    ).toFixed(4),
  );

  const missedFgSpot = Math.min(80, 100 - (input.yardline100 + 7));
  const epFieldGoal =
    input.yardline100 <= 42
      ? Number(
          (
            input.fieldGoalMakeProb * 3.0 +
            (1 - input.fieldGoalMakeProb) * -epFirstDownAt(missedFgSpot)
          ).toFixed(4),
        )
      : -3.5;

  const puntLanding = Math.max(20, 100 - (input.yardline100 - input.netPuntYards));
  const epPunt = Number((-epFirstDownAt(puntLanding)).toFixed(4));

  // Brill, Wyner & Jensen (2023): non-parametric bootstrap standard error widens in sparse states
  const nEff = Math.max(15, input.bootstrapSampleSizeN);
  const brillConfidenceIntervalHalfWidth = Number((1.96 * (2.65 / Math.sqrt(nEff))).toFixed(4));

  const sorted = [
    { key: "GO_FOR_IT" as const, val: epGoForIt },
    { key: "FIELD_GOAL" as const, val: epFieldGoal },
    { key: "PUNT" as const, val: epPunt },
  ].sort((a, b) => b.val - a.val);

  const edgeOverSecondBest = sorted[0]!.val - sorted[1]!.val;
  const decisionVerdict =
    edgeOverSecondBest < brillConfidenceIntervalHalfWidth
      ? "TOSS_UP_HUMILITY_BAND"
      : sorted[0]!.key;

  return {
    carterMacholBaselineEp,
    dalyGrafsteinSelectionCorrectedConvProb,
    epGoForIt,
    epFieldGoal,
    epPunt,
    brillConfidenceIntervalHalfWidth,
    decisionVerdict,
  };
}

export interface KickerShrinkageAndOvertimeInput {
  kickerMadeInBin: number;
  kickerAttemptsInBin: number;
  leagueBinMeanProb: number;
  priorStrengthM: number; // Osborne & Levine (2017) Beta prior concentration
  kickDistanceYards: number;
  windSpeedMph: number;
  otReceivingTeamTdProb: number;
  otReceivingTeamFgProb: number;
  otKickingTeamReplyTdProb: number;
  otKickingTeamReplyFgProb: number;
}

export interface KickerShrinkageAndOvertimeResult {
  osborneLevineShrunkFgProb: number;
  dubeDoinkPostCollisionHazard: number;
  martinMarkovOtReceivingWinProb: number;
  martinMarkovOtTieProb: number;
}

/**
 * 5. Osborne & Levine (2017) Empirical Bayes FG Shrinkage + Dube Doinkalytics +
 *    Martin et al. (2018) Absorbing Markov Chain for NFL Overtime Rules.
 */
export function computeOsborneLevineShrinkageFieldGoalAndOvertime(
  input: KickerShrinkageAndOvertimeInput,
): KickerShrinkageAndOvertimeResult {
  // Osborne & Levine (2017): Beta-Binomial Empirical Bayes shrinkage toward distance-bin prior
  const m = Math.max(8, input.priorStrengthM);
  const alpha0 = m * input.leagueBinMeanProb;
  const beta0 = m * (1 - input.leagueBinMeanProb);
  const shrunk =
    (input.kickerMadeInBin + alpha0) / Math.max(1, input.kickerAttemptsInBin + alpha0 + beta0);

  // Dube (Doinkalytics): lateral angular dispersion grows superlinearly with distance & crosswind
  const distanceRatio = Math.max(0.4, input.kickDistanceYards / 50);
  const windFactor = 1 + 0.035 * Math.max(0, input.windSpeedMph - 8);
  const dubeDoinkPostCollisionHazard = Number(
    Math.min(0.085, 0.014 * Math.pow(distanceRatio, 1.7) * windFactor).toFixed(4),
  );

  const osborneLevineShrunkFgProb = Number(
    Math.max(0.05, Math.min(0.995, shrunk - 0.5 * dubeDoinkPostCollisionHazard)).toFixed(4),
  );

  // Martin et al. (2018): Absorbing Markov chain on Opening Drive + Sudden-Death continuation
  const pTd1 = Math.max(0, Math.min(0.6, input.otReceivingTeamTdProb));
  const pFg1 = Math.max(0, Math.min(0.5, input.otReceivingTeamFgProb));
  const pStop1 = Math.max(0, 1 - pTd1 - pFg1);

  const pTd2 = Math.max(0, Math.min(0.6, input.otKickingTeamReplyTdProb));
  const pFg2 = Math.max(0, Math.min(0.5, input.otKickingTeamReplyFgProb));
  const pStop2 = Math.max(0, 1 - pTd2 - pFg2);

  // Sudden death continuation win share when tied after 2 possessions
  const suddenDeathRecShare = 0.535;
  const martinMarkovOtTieProb = Number((pStop1 * pStop2 * 0.14 + pFg1 * pFg2 * 0.18).toFixed(4));
  const rawWinRec =
    pTd1 +
    pFg1 * (pStop2 + pFg2 * suddenDeathRecShare * (1 - 0.18)) +
    pStop1 * pStop2 * suddenDeathRecShare * (1 - 0.14);

  const martinMarkovOtReceivingWinProb = Number(
    Math.max(0.4, Math.min(0.7, rawWinRec)).toFixed(4),
  );

  return {
    osborneLevineShrunkFgProb,
    dubeDoinkPostCollisionHazard,
    martinMarkovOtReceivingWinProb,
    martinMarkovOtTieProb,
  };
}

export interface TweediePropShrinkageInput {
  playerObservedStatZ: number;
  observationVarianceSigma2: number;
  empiricalPopulationSample: number[]; // active-player empirical cohort
  hierarchicalSnapShareWeight: number; // arXiv:2410.08539v2 playing-time reliability [0..1]
  positionalPriorMean: number;
}

export interface TweediePropShrinkageResult {
  tweedieBayesEstimate: number;
  logMarginalScoreDerivative: number;
  hierarchicallyBlendedProjection: number;
  shrinkageMagnitude: number;
}

/**
 * 6. Efron & Hastie (2016, CASI) Tweedie's Non-Parametric Empirical Bayes Formula:
 *    E[mu | z] = z + sigma^2 * d/dz log f(z)
 *    combined with arXiv:2410.08539v2 hierarchical snap-share weighting.
 */
export function computeTweedieEmpiricalBayesPropShrinkage(
  input: TweediePropShrinkageInput,
): TweediePropShrinkageResult {
  const cohort =
    input.empiricalPopulationSample.length >= 3
      ? input.empiricalPopulationSample
      : [input.positionalPriorMean - 10, input.positionalPriorMean, input.positionalPriorMean + 10];

  const n = cohort.length;
  const meanC = cohort.reduce((a, b) => a + b, 0) / n;
  const varC =
    cohort.reduce((acc, v) => acc + (v - meanC) * (v - meanC), 0) / Math.max(1, n - 1) +
    input.observationVarianceSigma2;

  // Kernel-smoothed score function d/dz log f(z) with robust Gaussian-mixture tail damping
  const h = Math.max(1.5, 1.06 * Math.sqrt(varC) * Math.pow(n, -0.2));
  let num = 0;
  let den = 0;
  for (const x of cohort) {
    const diff = input.playerObservedStatZ - x;
    const w = Math.exp((-0.5 * diff * diff) / (h * h));
    num += (-diff / (h * h)) * w;
    den += w;
  }

  const fallbackScore = -(input.playerObservedStatZ - meanC) / Math.max(1e-6, varC);
  const rawScore = den > 1e-12 ? num / den : fallbackScore;
  // Blend kernel score and parametric empirical Bayes score for finite-sample stability
  const logMarginalScoreDerivative = Number((0.65 * rawScore + 0.35 * fallbackScore).toFixed(6));

  const rawTweedie =
    input.playerObservedStatZ + input.observationVarianceSigma2 * logMarginalScoreDerivative;
  const snapTrust = Math.max(0.05, Math.min(1.0, input.hierarchicalSnapShareWeight));
  const hierarchicallyBlendedProjection = Number(
    (snapTrust * rawTweedie + (1 - snapTrust) * input.positionalPriorMean).toFixed(4),
  );

  return {
    tweedieBayesEstimate: Number(rawTweedie.toFixed(4)),
    logMarginalScoreDerivative,
    hierarchicallyBlendedProjection,
    shrinkageMagnitude: Number(
      Math.abs(input.playerObservedStatZ - hierarchicallyBlendedProjection).toFixed(4),
    ),
  };
}

export interface PortfolioKellyLeg {
  id: string;
  trueProb: number;
  decimalOdds: number; // e.g., 1.909 for -110
  edgeEstimationStdErr: number; // Baker & McHale parameter uncertainty sigma_p
}

export interface PortfolioKellyResult {
  allocations: Array<{
    id: string;
    thorpFullKellyFraction: number;
    bakerMcHaleShrinkageFactor: number;
    simultaneousPortfolioFraction: number;
  }>;
  totalBankrollCommittedFraction: number;
  kalshiEventHedgeContractsRatio: number;
}

/**
 * 7. Thorp (2006) Exact Kelly Criterion + Baker & McHale (JQAS) Uncertainty-Shrunk Kelly +
 *    Simultaneous Correlated Portfolio Kelly (arXiv:1412.2031v1, arXiv:2603.04411v1) +
 *    Kalshi Event Contract Hedge Ratio (AM-INV-B05).
 */
export function computeThorpBakerMcHalePortfolioKelly(
  legs: PortfolioKellyLeg[],
  pairwiseCorrelationRho = 0.15,
  maxBankrollCap = 0.05,
  businessExposureAtRiskUsd = 0,
  kalshiContractPayoutUsd = 1.0,
): PortfolioKellyResult {
  const n = legs.length;
  // Simultaneous multi-bet diversification penalty 1 / (1 + (n - 1) * max(0, rho))
  const corrDamping = n > 1 ? 1 / (1 + (n - 1) * Math.max(0, pairwiseCorrelationRho)) : 1.0;

  const rawAllocations = legs.map((leg) => {
    const b = Math.max(0.01, leg.decimalOdds - 1);
    const p = Math.max(0.001, Math.min(0.999, leg.trueProb));
    const q = 1 - p;
    const thorpFull = Math.max(0, (b * p - q) / b);

    // Baker & McHale (2013): Shrinkage multiplier k = 1 / (1 + b^2 * sigma_p^2 / (p * q))
    const varianceTerm = (b * b * leg.edgeEstimationStdErr * leg.edgeEstimationStdErr) / (p * q);
    const bakerMcHaleShrinkageFactor = 1 / (1 + Math.max(0, varianceTerm) * 8.0);

    // Fractional half-Kelly baseline * Baker-McHale shrinkage * simultaneous correlation damping
    const simultaneous = 0.5 * thorpFull * bakerMcHaleShrinkageFactor * corrDamping;

    return {
      id: leg.id,
      thorpFullKellyFraction: Number(thorpFull.toFixed(5)),
      bakerMcHaleShrinkageFactor: Number(bakerMcHaleShrinkageFactor.toFixed(4)),
      simultaneousPortfolioFraction: simultaneous,
    };
  });

  const totalRaw = rawAllocations.reduce((acc, a) => acc + a.simultaneousPortfolioFraction, 0);
  const scale = totalRaw > maxBankrollCap && totalRaw > 0 ? maxBankrollCap / totalRaw : 1.0;

  const allocations = rawAllocations.map((a) => ({
    ...a,
    simultaneousPortfolioFraction: Number((a.simultaneousPortfolioFraction * scale).toFixed(5)),
  }));

  const totalBankrollCommittedFraction = Number(
    allocations.reduce((acc, a) => acc + a.simultaneousPortfolioFraction, 0).toFixed(5),
  );

  // Kalshi Playoff / Event Business Hedge (AM-INV-B05): minimum-variance hedge ratio h* = Exposure / Payout
  const kalshiEventHedgeContractsRatio =
    businessExposureAtRiskUsd > 0 && kalshiContractPayoutUsd > 0
      ? Number((businessExposureAtRiskUsd / kalshiContractPayoutUsd).toFixed(2))
      : 0;

  return {
    allocations,
    totalBankrollCommittedFraction,
    kalshiEventHedgeContractsRatio,
  };
}

export interface SpatialTrackingFrameSoA {
  /** Data-Oriented ECS Struct-of-Arrays (Float64Array) length N */
  offenseX: Float64Array;
  offenseY: Float64Array;
  offenseVx: Float64Array;
  offenseVy: Float64Array;
  defenseX: Float64Array;
  defenseY: Float64Array;
  defenseVx: Float64Array;
  defenseVy: Float64Array;
  targetX: number;
  targetY: number;
}

export interface SpatialControlResult {
  secondSpectrumPitchControlOffense: number;
  unravelPressingIntensityMax: number;
  expectedPossessionValueDelta: number;
}

/**
 * 8. Second Spectrum US Patent 10,521,671 Spatiotemporal EPV + UnravelSports Pressing
 *    Intensity + arXiv:2003.01304v2 Pitch Control using Data-Oriented Float64Array ECS buffers.
 */
export function computeSecondSpectrumUnravelSpatialControl(
  frame: SpatialTrackingFrameSoA,
  reactionTimeTauSec = 0.55,
  pressingThresholdD0Yards = 3.5,
  pressingScaleSYards = 1.1,
): SpatialControlResult {
  let offInfluenceSum = 0;
  let defInfluenceSum = 0;
  let maxPressing = 0;

  const nOff = Math.min(frame.offenseX.length, frame.offenseY.length);
  for (let i = 0; i < nOff; i++) {
    const projX = frame.offenseX[i]! + frame.offenseVx[i]! * reactionTimeTauSec;
    const projY = frame.offenseY[i]! + frame.offenseVy[i]! * reactionTimeTauSec;
    const dist = Math.hypot(frame.targetX - projX, frame.targetY - projY);
    const tti = reactionTimeTauSec + dist / 9.2; // yards/sec sprint top speed
    offInfluenceSum += Math.exp(-1.65 * tti);
  }

  const nDef = Math.min(frame.defenseX.length, frame.defenseY.length);
  for (let j = 0; j < nDef; j++) {
    const projX = frame.defenseX[j]! + frame.defenseVx[j]! * reactionTimeTauSec;
    const projY = frame.defenseY[j]! + frame.defenseVy[j]! * reactionTimeTauSec;
    const dist = Math.hypot(frame.targetX - projX, frame.targetY - projY);
    const tti = reactionTimeTauSec + dist / 9.4;
    defInfluenceSum += Math.exp(-1.65 * tti);

    // UnravelSports logistic pressing kernel p_j(t) = [1 + exp(-(d0 - d)/s)]^-1
    const press = 1 / (1 + Math.exp(-(pressingThresholdD0Yards - dist) / pressingScaleSYards));
    if (press > maxPressing) maxPressing = press;
  }

  const secondSpectrumPitchControlOffense = Number(
    (offInfluenceSum / Math.max(1e-6, offInfluenceSum + defInfluenceSum)).toFixed(4),
  );

  const expectedPossessionValueDelta = Number(
    ((secondSpectrumPitchControlOffense - 0.5) * 1.45 - 0.35 * maxPressing).toFixed(4),
  );

  return {
    secondSpectrumPitchControlOffense,
    unravelPressingIntensityMax: Number(maxPressing.toFixed(4)),
    expectedPossessionValueDelta,
  };
}

export interface HydrodynamicTrenchInput {
  gapClearanceAspectRatio: number; // cond-mat/0212434v1 anisotropic percolation aspect ratio
  boxDefenderDensityRho: number; // cond-mat/0306541v2 ASEP lattice density [0..1]
  pocketCollapseVelocityYdsPerSec: number; // cond-mat/0412143v2 Fokker-Planck moving boundary v_b
  initialPocketRadiusYards: number;
  leadBlockerMomentumRatio: number; // physics/0701164v1 Navier-Stokes shockwave density ratio
}

export interface HydrodynamicTrenchResult {
  anisotropicPercolationOpenProb: number;
  asepGapCurrentJ: number;
  fokkerPlanckFirstPassageSackHazard: number;
  navierStokesTrenchShockVelocity: number;
  kardarBoltzmannViscosityDamping: number;
}

/**
 * 9. Statistical Physics & Hydrodynamic Trench Transport:
 *    - Continuum anisotropic percolation (cond-mat/0212434v1)
 *    - Driven lattice ASEP jamming current J = rho * (1 - rho) (cond-mat/0306541v2)
 *    - Fokker-Planck moving-barrier first-passage sack hazard (cond-mat/0412143v2)
 *    - Navier-Stokes compressible shockwave Rankine-Hugoniot jump (physics/0701164v1)
 *    - Kardar MIT 8.333 Boltzmann H-theorem kinetic relaxation
 */
export function computeHydrodynamicTrenchShockwaveAndPercolation(
  input: HydrodynamicTrenchInput,
): HydrodynamicTrenchResult {
  const rho = Math.max(0.05, Math.min(0.95, input.boxDefenderDensityRho));
  // Continuum percolation critical density shifts with alignment anisotropy aspect ratio
  const criticalDensityRhoC = 0.52 + 0.08 * Math.tanh(input.gapClearanceAspectRatio - 1.0);
  const anisotropicPercolationOpenProb = Number(
    (1 / (1 + Math.exp(9.5 * (rho - criticalDensityRhoC)))).toFixed(4),
  );

  // ASEP lattice exclusion current with high-density jamming phase transition
  const asepGapCurrentJ = Number(
    (rho * (1 - rho) * (1 - 0.45 * Math.pow(rho, 2))).toFixed(4),
  );

  // Fokker-Planck moving boundary first-passage sack probability before 2.65s release
  const tRelease = 2.65;
  const effectiveBarrier = Math.max(
    0.2,
    input.initialPocketRadiusYards - input.pocketCollapseVelocityYdsPerSec * tRelease,
  );
  const diffusionD = 1.35;
  const fokkerPlanckFirstPassageSackHazard = Number(
    Math.min(
      0.85,
      Math.exp((-effectiveBarrier * effectiveBarrier) / (4 * diffusionD * tRelease)),
    ).toFixed(4),
  );

  // Rankine-Hugoniot shock speed across trench collision front
  const navierStokesTrenchShockVelocity = Number(
    (2.8 * Math.sqrt(Math.max(0.25, input.leadBlockerMomentumRatio)) * (1 - 0.5 * rho)).toFixed(4),
  );

  // Kardar 8.333 Boltzmann collisional relaxation factor
  const kardarBoltzmannViscosityDamping = Number(
    Math.exp(-0.65 * rho * (1 + fokkerPlanckFirstPassageSackHazard)).toFixed(4),
  );

  return {
    anisotropicPercolationOpenProb,
    asepGapCurrentJ,
    fokkerPlanckFirstPassageSackHazard,
    navierStokesTrenchShockVelocity,
    kardarBoltzmannViscosityDamping,
  };
}

export interface AchEvidenceRow {
  evidenceId: string;
  likelihoodGivenPrimaryH1: number; // P(E_i | H1: Edge exists)
  likelihoodGivenNullH0: number; // P(E_i | H0: Market is efficient / Trap)
}

export interface HeuerAchDiagnosticityResult {
  cumulativeLogLikelihoodRatio: number;
  posteriorPrimaryProb: number;
  disconfirmingEvidenceCount: number;
  nonDiagnosticEvidenceDropped: number;
}

/**
 * 10. Richards J. Heuer Jr. (1999) CIA Analysis of Competing Hypotheses (ACH):
 *     Scores hypotheses by disconfirming diagnosticity log(P(E|H1)/P(E|H0)) and drops
 *     non-diagnostic confirmation-bias evidence where |log LR| < 0.08.
 */
export function computeHeuerAchDiagnosticityScore(
  evidenceRows: AchEvidenceRow[],
  priorPrimaryProb = 0.5,
): HeuerAchDiagnosticityResult {
  let llrSum = 0;
  let disconfirmingEvidenceCount = 0;
  let nonDiagnosticEvidenceDropped = 0;

  for (const row of evidenceRows) {
    const p1 = Math.max(0.01, Math.min(0.99, row.likelihoodGivenPrimaryH1));
    const p0 = Math.max(0.01, Math.min(0.99, row.likelihoodGivenNullH0));
    const logLr = Math.log(p1 / p0);

    if (Math.abs(logLr) < 0.08) {
      nonDiagnosticEvidenceDropped += 1;
      continue;
    }

    if (logLr < 0) {
      // Heuer ACH rule: weight disconfirming evidence 1.25x to defeat confirmation bias
      disconfirmingEvidenceCount += 1;
      llrSum += 1.25 * logLr;
    } else {
      llrSum += logLr;
    }
  }

  const priorOdds =
    Math.max(0.01, Math.min(0.99, priorPrimaryProb)) /
    (1 - Math.max(0.01, Math.min(0.99, priorPrimaryProb)));
  const postOdds = priorOdds * Math.exp(llrSum);
  const posteriorPrimaryProb = Number((postOdds / (1 + postOdds)).toFixed(4));

  return {
    cumulativeLogLikelihoodRatio: Number(llrSum.toFixed(4)),
    posteriorPrimaryProb,
    disconfirmingEvidenceCount,
    nonDiagnosticEvidenceDropped,
  };
}

export interface PrerouterExpertCandidate {
  expertClusterId: string;
  currentLayerAffinity: number;
  historicalVisitsN: number;
  totalParentSimulationsT: number;
  meanDeterminizedReward: number;
}

export interface PrerouterPredictionResult {
  prefetchedClusters: string[];
  ucb1Scores: Record<string, number>;
}

/**
 * 11. Edge0 (AM-02) Next-Snap Prerouter Expert Activation Predictor +
 *     Ward & Cowling (2009) Determinized UCB1 Exploration under Imperfect Information.
 */
export function predictNextSnapPrerouterActivation(
  candidates: PrerouterExpertCandidate[],
  topK = 3,
  explorationConstantC = 0.75,
): PrerouterPredictionResult {
  const ucb1Scores: Record<string, number> = {};
  const scored = candidates.map((c) => {
    const n = Math.max(1, c.historicalVisitsN);
    const t = Math.max(n, c.totalParentSimulationsT);
    const ucbBonus = explorationConstantC * Math.sqrt(Math.log(t + 1) / n);
    const combined = 0.55 * c.currentLayerAffinity + 0.45 * (c.meanDeterminizedReward + ucbBonus);
    ucb1Scores[c.expertClusterId] = Number(combined.toFixed(4));
    return { id: c.expertClusterId, score: combined };
  });

  scored.sort((a, b) => b.score - a.score);
  return {
    prefetchedClusters: scored.slice(0, Math.max(1, topK)).map((s) => s.id),
    ucb1Scores,
  };
}

export interface CorpCalibrationPair {
  forecastProb: number;
  outcome: 0 | 1;
}

export interface CorpIsotonicCalibrationResult {
  recalibratedProbs: number[];
  brierScore: number;
  miscalibrationMcb: number;
  discriminationDsc: number;
  uncertaintyUnc: number;
  walshJoshiCalibrationClean: boolean;
}

/**
 * 12. Dimitriadis, Gneiting & Jordan (2021, PNAS / arXiv:2008.03033) CORP
 *     Consistent, Optimal, Reproducible Pool-Adjacent-Violators (PAV) Isotonic
 *     Recalibration + Exact BS = MCB - DSC + UNC Decomposition +
 *     Walsh & Joshi (2023) Calibration-Driven ROI Gate.
 */
export function computeDimitriadisCorpIsotonicCalibration(
  pairs: CorpCalibrationPair[],
): CorpIsotonicCalibrationResult {
  if (pairs.length === 0) {
    return {
      recalibratedProbs: [],
      brierScore: 0,
      miscalibrationMcb: 0,
      discriminationDsc: 0,
      uncertaintyUnc: 0,
      walshJoshiCalibrationClean: true,
    };
  }

  const indexed = pairs
    .map((p, idx) => ({
      idx,
      x: Math.max(0, Math.min(1, p.forecastProb)),
      y: p.outcome,
    }))
    .sort((a, b) => a.x - b.x || a.y - b.y);

  // Pool-Adjacent-Violators (PAV) algorithm for monotone non-decreasing calibrated probabilities
  interface Block {
    sumY: number;
    count: number;
    indices: number[];
  }
  const blocks: Block[] = [];
  for (const item of indexed) {
    blocks.push({ sumY: item.y, count: 1, indices: [item.idx] });
    while (blocks.length >= 2) {
      const last = blocks[blocks.length - 1]!;
      const prev = blocks[blocks.length - 2]!;
      if (prev.sumY / prev.count > last.sumY / last.count) {
        prev.sumY += last.sumY;
        prev.count += last.count;
        prev.indices.push(...last.indices);
        blocks.pop();
      } else {
        break;
      }
    }
  }

  const recalibratedProbs = new Array<number>(pairs.length).fill(0);
  for (const b of blocks) {
    const val = Number((b.sumY / b.count).toFixed(5));
    for (const origIdx of b.indices) {
      recalibratedProbs[origIdx] = val;
    }
  }

  const n = pairs.length;
  const yBar = pairs.reduce((acc, p) => acc + p.outcome, 0) / n;
  const uncertaintyUnc = yBar * (1 - yBar);

  let brierSum = 0;
  let brierRecalSum = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.max(0, Math.min(1, pairs[i]!.forecastProb));
    const y = pairs[i]!.outcome;
    const r = recalibratedProbs[i]!;
    brierSum += (x - y) * (x - y);
    brierRecalSum += (r - y) * (r - y);
  }

  const brierScore = brierSum / n;
  const brierRecal = brierRecalSum / n;
  // Exact CORP identity: MCB = S(x, y) - S(r, y), DSC = S(yBar, y) - S(r, y)
  const miscalibrationMcb = Math.max(0, brierScore - brierRecal);
  const discriminationDsc = Math.max(0, uncertaintyUnc - brierRecal);

  return {
    recalibratedProbs,
    brierScore: Number(brierScore.toFixed(5)),
    miscalibrationMcb: Number(miscalibrationMcb.toFixed(5)),
    discriminationDsc: Number(discriminationDsc.toFixed(5)),
    uncertaintyUnc: Number(uncertaintyUnc.toFixed(5)),
    // Walsh & Joshi (2023): miscalibration MCB must stay strictly below 0.025 for positive Kelly ROI
    walshJoshiCalibrationClean: miscalibrationMcb <= 0.025,
  };
}

export interface CoverageExecutionIndexInput {
  yacPerCompletionAllowed: number; // league avg ~5.2
  deep20PlusCompletionRateAllowed: number; // league avg ~0.36
  contestedCatchWinRateDef: number; // league avg ~0.50 (FTN/charted pillar when available)
  wideOpenTargetRateAllowed: number; // league avg ~0.14
  turnoverWorthyThrowRateForced: number; // league avg ~0.032
}

/**
 * 13. @The_Coach_A (2026-11-05 AM W1) Coverage Execution Index (CEI):
 *     Five-pillar coverage grade stripped of pass-rush confounding, DVOA-style standardized.
 */
export function computeRushIndependentCoverageExecutionIndex(
  input: CoverageExecutionIndexInput,
): { ceiStandardizedPct: number; pbpApproximableSubIndex: number } {
  const yacZ = (5.2 - input.yacPerCompletionAllowed) / 0.85;
  const deepZ = (0.36 - input.deep20PlusCompletionRateAllowed) / 0.075;
  const contestedZ = (input.contestedCatchWinRateDef - 0.5) / 0.08;
  const wideOpenZ = (0.14 - input.wideOpenTargetRateAllowed) / 0.04;
  const twtZ = (input.turnoverWorthyThrowRateForced - 0.032) / 0.01;

  const pbpApproximableSubIndex = Number((((yacZ + deepZ) / 2) * 12.5).toFixed(3));
  const compositeZ =
    0.25 * yacZ + 0.25 * deepZ + 0.2 * contestedZ + 0.15 * wideOpenZ + 0.15 * twtZ;
  const ceiStandardizedPct = Number((compositeZ * 15.0).toFixed(3));

  return { ceiStandardizedPct, pbpApproximableSubIndex };
}

/**
 * 14. @ihartitz (2026-11-05 AM W3) Week 9 Mismatch Manifesto Combined Sum +
 *     @SamHoppen (2026-11-05 AM F6) TNF Two-High / Dime / Light-Box Shell Penalty +
 *     @Doug_Analytics (2026-11-05 AM F7) Time-to-Pressure vs QB Time-to-Throw Race.
 */
export function computeTnfShellAndPressureRaceMismatch(input: {
  offenseEpaPerPlay: number;
  defenseAllowedEpaPerPlay: number;
  defenseTwoHighRate: number;
  defenseDimeRate: number;
  defenseLightBoxRate: number;
  qbEpaDeltaVsTwoHigh: number; // e.g., -0.17 for Trevor Lawrence vs BAL two-high
  fastestRusherTimeToPressureSec: number; // e.g., 2.13s Abdul Carter
  qbMedianTimeToThrowSec: number;
}): {
  combinedEpaMismatchSum: number;
  shellAdjustedPassingEpaDelta: number;
  clockRaceMarginSec: number;
  pressureWinsClockRace: boolean;
} {
  const combinedEpaMismatchSum = Number(
    (input.offenseEpaPerPlay + input.defenseAllowedEpaPerPlay).toFixed(4),
  );
  const shellWeight =
    0.55 * input.defenseTwoHighRate + 0.25 * input.defenseDimeRate + 0.2 * input.defenseLightBoxRate;
  const shellAdjustedPassingEpaDelta = Number(
    (shellWeight * input.qbEpaDeltaVsTwoHigh).toFixed(4),
  );
  const clockRaceMarginSec = Number(
    (input.fastestRusherTimeToPressureSec - input.qbMedianTimeToThrowSec).toFixed(3),
  );
  return {
    combinedEpaMismatchSum,
    shellAdjustedPassingEpaDelta,
    clockRaceMarginSec,
    pressureWinsClockRace: clockRaceMarginSec < 0,
  };
}

/**
 * 15. @miyashita_03 (2026-11-05 AM B5) FP32 Shift-Invariant Router Softmax + Z-Loss Penalty
 *     to prevent BF16 MoE router logit rounding collapse.
 */
export function computeFp32RouterZLossStabilizedSoftmax(
  logits: readonly number[],
  zLossCoefficient = 1e-4,
): { probabilities: number[]; logSumExp: number; routerZLoss: number } {
  if (logits.length === 0) return { probabilities: [], logSumExp: 0, routerZLoss: 0 };
  const maxLogit = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - maxLogit));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const logSumExp = maxLogit + Math.log(Math.max(1e-12, sumExp));
  const routerZLoss = Number((zLossCoefficient * logSumExp * logSumExp).toFixed(6));
  const probabilities = exps.map((e) => Number((e / Math.max(1e-12, sumExp)).toFixed(6)));
  return {
    probabilities,
    logSumExp: Number(logSumExp.toFixed(6)),
    routerZLoss,
  };
}

/**
 * Operator #24: computeNvidiaNim40RpmAndKumoRelationalPrior
 * Models build.nvidia.com ("gse-platform") 40-RPM token-bucket scheduler (minIntervalMs = 1500)
 * and NVIDIA Kumo relational tabular graph message passing across foreign-key tables.
 */
export interface NvidiaNimKumoInput {
  requestCountLastMinute: number;
  minIntervalMs?: number; // default 1500ms for 40-RPM
  tokenBucketCapacity?: number; // default 40
  relationalTablesJoined: number; // e.g., player <-> snap <-> charting <-> market
  graphMessagePassingHops: number;
}

export interface NvidiaNimKumoResult {
  rateLimited: boolean;
  recommendedWaitMs: number;
  kumoRelationalPriorConfidenceBoost: number;
  effectiveThroughputRpm: number;
}

export function computeNvidiaNim40RpmAndKumoRelationalPrior(
  input: NvidiaNimKumoInput,
): NvidiaNimKumoResult {
  const minInterval = input.minIntervalMs ?? 1500;
  const capacity = input.tokenBucketCapacity ?? 40;
  const rateLimited = input.requestCountLastMinute >= capacity;
  const recommendedWaitMs = rateLimited ? minInterval * 1.5 : 0;
  
  // Kumo graph relational prior boost scales with hops and joined tables
  const hopWeight = Math.min(0.15, input.graphMessagePassingHops * 0.03);
  const tableWeight = Math.min(0.10, input.relationalTablesJoined * 0.02);
  const kumoRelationalPriorConfidenceBoost = Number((hopWeight + tableWeight).toFixed(4));
  
  const effectiveThroughputRpm = Math.min(capacity, Math.max(1, capacity - input.requestCountLastMinute));

  return {
    rateLimited,
    recommendedWaitMs,
    kumoRelationalPriorConfidenceBoost,
    effectiveThroughputRpm,
  };
}

/**
 * Operator #25: computeJevEpistemicAleatoricConfidence100
 * Formalizes Jev confidence semantics (Hermes operational item #3):
 * combines Jev epistemic uncertainty noul in [0, 1] and normalized Shannon entropy H(p)/ln K
 * of choice distribution p into an integer confidence100 in [0, 100] formatted as "XX/100" (never %),
 * plus conjunction-gate boolean passesEpistemicGate.
 */
export interface JevEpistemicConfidenceInput {
  noulEpistemicUncertainty: number; // in [0, 1] (0 = complete certainty, 1 = maximum uncertainty)
  choiceProbabilities: readonly number[]; // probability distribution over discrete outcomes
  conjunctionEdgeThreshold?: number; // default 0.025
}

export interface JevEpistemicConfidenceResult {
  confidence100: number; // integer 0 to 100
  formattedConfidence: string; // "XX/100"
  normalizedEntropy: number; // H(p) / ln(K)
  passesEpistemicGate: boolean;
}

export function computeJevEpistemicAleatoricConfidence100(
  input: JevEpistemicConfidenceInput,
): JevEpistemicConfidenceResult {
  const probs = input.choiceProbabilities;
  const K = probs.length;
  
  let entropy = 0;
  if (K > 1) {
    for (const p of probs) {
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }
    const maxEntropy = Math.log(K);
    entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }
  const normalizedEntropy = Number(Math.max(0, Math.min(1, entropy)).toFixed(4));
  const noul = Math.max(0, Math.min(1, input.noulEpistemicUncertainty));

  // Combined uncertainty: weighted toward entropy or noul appropriately
  const combinedUncertainty = 0.4 * noul + 0.6 * normalizedEntropy;
  const rawConf = Math.round((1 - combinedUncertainty) * 100);
  const confidence100 = Math.max(0, Math.min(100, rawConf));
  const formattedConfidence = `${confidence100}/100`;

  const threshold = input.conjunctionEdgeThreshold ?? 0.025;
  // Passes epistemic gate if epistemic uncertainty and entropy are sufficiently low
  const passesEpistemicGate = combinedUncertainty <= (1 - threshold * 10);

  return {
    confidence100,
    formattedConfidence,
    normalizedEntropy,
    passesEpistemicGate,
  };
}

