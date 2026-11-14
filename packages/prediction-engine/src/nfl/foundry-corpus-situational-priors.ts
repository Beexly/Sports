/**
 * foundry-corpus-situational-priors.ts
 *
 * Pure deterministic Stage-2 Foundry Corpus Situational Priors module wired into
 * `zero-orphan-expected-metrics-bridge.ts` and `@sports/prediction-engine`.
 *
 * Encodes Empirical-Bayes Positive-Part James-Stein shrinkage over the 6 physical
 * situational families (`pressure`, `weather`, `restFatigue`, `coveragePersonnel`,
 * `qbSkillScript`, `marketMicrostructure`) using strictly verified counts from
 * Sovereign Primitives, 4-branch GCP Shard B XML syntheses, and Google Drive masters.
 *
 * Strictly zero Node FS runtime dependencies (safe for Next.js / Edge / browser bundles),
 * strictly bounded (`|deltaLogOdds| <= 0.35`, family prob modulation in `[-0.015, 0.015]`),
 * and strictly zero NaNs or fabricated edge numbers.
 */

export type CorpusSituationalFamily =
  | "pressure"
  | "weather"
  | "restFatigue"
  | "coveragePersonnel"
  | "qbSkillScript"
  | "marketMicrostructure";

export const CORPUS_SITUATIONAL_FAMILIES: readonly CorpusSituationalFamily[] = [
  "pressure",
  "weather",
  "restFatigue",
  "coveragePersonnel",
  "qbSkillScript",
  "marketMicrostructure",
] as const;

export const JAMES_STEIN_PRIOR_BASE_N = 12;
export const MAX_ABS_CORPUS_LOG_ODDS = 0.35;
export const MAX_CORPUS_FAMILY_PROB_MODULATION = 0.015;

export interface CorpusFamilyBaselineEvidence {
  readonly sovereignPrimitives: number;
  readonly shardBDocs: number;
  readonly driveMasterRecords: number;
  readonly priorWeightLogOdds: number;
}

/**
 * Snapshot compiled from Wave 15 verified corpus:
 * Sovereign (1,064 books / 14,667 primitives / 3,405 traces) +
 * GCP Shard B (7,846 markdown files / 8,143 routed docs / 26,723 equations) +
 * Drive Masters (1,042,184 indexed records) + Motif Sweep (9,944 X/IG records).
 * Matches `empirical_bayes_six_family_priors` in `07_corpus_wired_calibration_and_hold_gate_receipt.json`.
 */
export const FOUNDRY_CORPUS_BASELINE_SNAPSHOT: Readonly<
  Record<CorpusSituationalFamily, CorpusFamilyBaselineEvidence>
> = {
  pressure: {
    sovereignPrimitives: 560,
    shardBDocs: 297,
    driveMasterRecords: 3007,
    priorWeightLogOdds: 0.137048,
  },
  weather: {
    sovereignPrimitives: 803,
    shardBDocs: 5197,
    driveMasterRecords: 1704,
    priorWeightLogOdds: 0.178466,
  },
  restFatigue: {
    sovereignPrimitives: 1564,
    shardBDocs: 644,
    driveMasterRecords: 2325,
    priorWeightLogOdds: 0.16654,
  },
  coveragePersonnel: {
    sovereignPrimitives: 1013,
    shardBDocs: 485,
    driveMasterRecords: 3210,
    priorWeightLogOdds: 0.15429,
  },
  qbSkillScript: {
    sovereignPrimitives: 9231,
    shardBDocs: 143,
    driveMasterRecords: 7176,
    priorWeightLogOdds: 0.219027,
  },
  marketMicrostructure: {
    sovereignPrimitives: 1496,
    shardBDocs: 1080,
    driveMasterRecords: 1024762,
    priorWeightLogOdds: 0.246823,
  },
} as const;

export const CORPUS_SNAPSHOT_METADATA = {
  sovereignBooksLoaded: 1064,
  sovereignPrimitivesRouted: 14667,
  sovereignTracesRouted: 3405,
  shardBDocsRouted: 8143,
  shardBMarkdownFiles: 7846,
  driveMasterRecordsIndexed: 1042184,
  motifSweepTotalRecords: 9944,
  oofNRows: 4823,
  oofBrierRaw: 0.261209,
  oofBrierCalibrated: 0.247983,
  oofEce: 0.022581,
  calibrationVerified: false,
} as const;

/**
 * 6x6 symmetric positive-definite correlation matrix regularized via
 * 0.9 * DEFAULT_SIX_FAMILY_CORRELATION_MATRIX + 0.1 * I to reflect effective
 * rank expansion across Wave 15 Sovereign + Shard B + Drive + Motif corpora.
 */
export const CORPUS_REGULARIZED_SIX_FAMILY_CORRELATION_MATRIX: readonly (readonly number[])[] = [
  [1.0, 0.162, 0.108, 0.198, 0.18, 0.045],
  [0.162, 1.0, 0.09, 0.072, 0.054, 0.018],
  [0.108, 0.09, 1.0, 0.135, 0.108, 0.027],
  [0.198, 0.072, 0.135, 1.0, 0.225, 0.036],
  [0.18, 0.054, 0.108, 0.225, 1.0, 0.054],
  [0.045, 0.018, 0.027, 0.036, 0.054, 1.0],
];

export interface FoundryCorpusSituationalInput {
  readonly pressureSignalZ?: number;
  readonly weatherDisruptionZ?: number;
  readonly restFatigueZ?: number;
  readonly coverageMismatchZ?: number;
  readonly qbScriptStabilityZ?: number;
  readonly microstructureDislocationZ?: number;
  readonly observedSampleSizeN?: number;
  readonly collinearCrossLayerVetoes?: number;
}

export interface FoundryCorpusSituationalReceipt {
  readonly rawFamilyLogOdds: Readonly<Record<CorpusSituationalFamily, number>>;
  readonly shrunkFamilyLogOdds: Readonly<Record<CorpusSituationalFamily, number>>;
  readonly familyProbModulations: Readonly<Record<CorpusSituationalFamily, number>>;
  readonly combinedLogOddsDelta: number;
  readonly effectiveSampleSizeN: number;
  readonly shrinkageFactor: number;
  readonly vetoDampingFactor: number;
  readonly allFiniteNonNan: boolean;
}

function finiteOrZero(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, limit: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-limit, Math.min(limit, value));
}

export function computePositivePartJamesSteinShrinkage(
  sampleSizeN: number,
  priorBaseN: number = JAMES_STEIN_PRIOR_BASE_N,
): number {
  if (!Number.isFinite(sampleSizeN) || sampleSizeN <= 0 || priorBaseN < 0) {
    return 0;
  }
  return Number((sampleSizeN / (sampleSizeN + priorBaseN)).toFixed(6));
}

/**
 * Evaluate bounded Foundry corpus situational priors with James-Stein shrinkage
 * and cross-layer veto damping for safe integration into the Zero-Orphan overlay.
 */
export function evaluateFoundryCorpusSituationalPriors(
  input: FoundryCorpusSituationalInput = {},
): FoundryCorpusSituationalReceipt {
  const effectiveSampleSizeN = Math.max(
    1,
    Math.round(finiteOrZero(input.observedSampleSizeN) || 24),
  );
  const shrinkageFactor = computePositivePartJamesSteinShrinkage(effectiveSampleSizeN);
  const vetoes = Math.max(0, Math.floor(finiteOrZero(input.collinearCrossLayerVetoes)));
  const vetoDampingFactor = Number(Math.max(0.25, Math.pow(0.85, vetoes)).toFixed(6));

  const zScores: Record<CorpusSituationalFamily, number> = {
    pressure: clamp(finiteOrZero(input.pressureSignalZ), 3.0),
    weather: clamp(finiteOrZero(input.weatherDisruptionZ), 3.0),
    restFatigue: clamp(finiteOrZero(input.restFatigueZ), 3.0),
    coveragePersonnel: clamp(finiteOrZero(input.coverageMismatchZ), 3.0),
    qbSkillScript: clamp(finiteOrZero(input.qbScriptStabilityZ), 3.0),
    marketMicrostructure: clamp(finiteOrZero(input.microstructureDislocationZ), 3.0),
  };

  const rawFamilyLogOdds: Record<CorpusSituationalFamily, number> = {
    pressure: 0,
    weather: 0,
    restFatigue: 0,
    coveragePersonnel: 0,
    qbSkillScript: 0,
    marketMicrostructure: 0,
  };
  const shrunkFamilyLogOdds: Record<CorpusSituationalFamily, number> = {
    pressure: 0,
    weather: 0,
    restFatigue: 0,
    coveragePersonnel: 0,
    qbSkillScript: 0,
    marketMicrostructure: 0,
  };
  const familyProbModulations: Record<CorpusSituationalFamily, number> = {
    pressure: 0,
    weather: 0,
    restFatigue: 0,
    coveragePersonnel: 0,
    qbSkillScript: 0,
    marketMicrostructure: 0,
  };

  let sumShrunk = 0;
  for (const fam of CORPUS_SITUATIONAL_FAMILIES) {
    const baseline = FOUNDRY_CORPUS_BASELINE_SNAPSHOT[fam];
    const rawLogOdds = clamp(
      zScores[fam] * baseline.priorWeightLogOdds,
      MAX_ABS_CORPUS_LOG_ODDS,
    );
    const shrunk = clamp(
      rawLogOdds * shrinkageFactor * vetoDampingFactor,
      MAX_ABS_CORPUS_LOG_ODDS,
    );
    const probMod = clamp(shrunk * 0.12, MAX_CORPUS_FAMILY_PROB_MODULATION);
    rawFamilyLogOdds[fam] = Number(rawLogOdds.toFixed(6));
    shrunkFamilyLogOdds[fam] = Number(shrunk.toFixed(6));
    familyProbModulations[fam] = Number(probMod.toFixed(6));
    sumShrunk += shrunk;
  }

  const combinedLogOddsDelta = Number(
    clamp(sumShrunk, MAX_ABS_CORPUS_LOG_ODDS).toFixed(6),
  );

  return {
    rawFamilyLogOdds,
    shrunkFamilyLogOdds,
    familyProbModulations,
    combinedLogOddsDelta,
    effectiveSampleSizeN,
    shrinkageFactor,
    vetoDampingFactor,
    allFiniteNonNan: Number.isFinite(combinedLogOddsDelta),
  };
}

export interface NflRuleOperatorSpec {
  readonly code: string;
  readonly summary: string;
  readonly impactChannel: "kickoff_field_position" | "comeback_onside" | "replay_variance";
  readonly logOddsScale: number;
}

export const NFL_2026_PLAYING_RULES_OPERATORS: {
  readonly sourceBookId: string;
  readonly rules: readonly NflRuleOperatorSpec[];
} = {
  sourceBookId: "64f765ba0a849b1d",
  rules: [
    {
      code: "6-1-3",
      summary: "Dynamic kickoff setup zone alignment constraints reducing blind return collisions.",
      impactChannel: "kickoff_field_position",
      logOddsScale: 0.018,
    },
    {
      code: "6-1-5",
      summary: "50-yard line kickoff dead-ball touchback spot modification shifting starting EPA.",
      impactChannel: "kickoff_field_position",
      logOddsScale: 0.022,
    },
    {
      code: "6-1-6",
      summary: "Declared onside kick permitted at any game time rather than 4th-quarter only.",
      impactChannel: "comeback_onside",
      logOddsScale: 0.026,
    },
    {
      code: "19-2",
      summary: "Expanded League Replay Official objective intervention reducing officiating spot variance.",
      impactChannel: "replay_variance",
      logOddsScale: 0.012,
    },
  ],
} as const;

export const SPORTS_PSYCHOLOGY_PRESSURE_OPERATORS = {
  sourceBookIds: [
    "4f750a0c8577fe9a", // Brian Cain Mental Game of Football
    "7e5b2d626cb5c46f", // Sports Psychology ISBN-53
    "aad3618821cc9e26", // Mind Gym (Gary Mack)
    "e2e0f698eee97fdc", // Mark Nesti Psychology in Football
    "6cf36a29e51c0a02", // Hidden Game of Football (Carroll)
    "d38c2cd65c3f310d", // Analytic Methods in Sports 3rd Ed (Severini)
  ] as readonly string[],
  yerkesDodsonOverarousalWeight: -0.028,
  firstCareerStartComposureScale: -0.032,
  hostileRoadCadenceWeight: -0.019,
  clutchLeverageExecutionWeight: 0.024,
} as const;

export type SplitFieldCoverageCheckCode =
  | "MOD"
  | "MEG"
  | "Palms_2Read"
  | "Poach_Solo_3x1"
  | "Stubbie_Special"
  | "Cover6_QQH_Cover8_HQQ";

export interface SplitFieldCoverageCheckSpec {
  readonly code: SplitFieldCoverageCheckCode;
  readonly shellFamily: "quarters_split_field" | "trips_3x1_adjustment" | "half_field_hybrid";
  readonly logOddsScale: number;
  readonly explosivePassSuppressionWeight: number;
}

/**
 * Deterministic `[DERIVED KERNEL]` Split-Field Quarters Coverage operators.
 * Two delivered third-party split-field PDFs were 1-2 page download-bait stubs and failed
 * closed as INSUFFICIENT_SOURCE_ACCESS (`refusedStubBookIds`); coverage checks are wired
 * strictly as labeled derived kernels anchored to ingested Football Coaching / Progression
 * source fundamentals without fabricating quotes.
 */
export const SPLIT_FIELD_QUARTERS_COVERAGE_OPERATORS: {
  readonly derivationTag: "[DERIVED KERNEL]";
  readonly refusedStubBookIds: readonly string[];
  readonly groundedCoachingBookIds: readonly string[];
  readonly checks: readonly SplitFieldCoverageCheckSpec[];
} = {
  derivationTag: "[DERIVED KERNEL]",
  refusedStubBookIds: ["527e4d714a574106", "c3eb423c8b9f92fc"] as const,
  groundedCoachingBookIds: ["ed664ef4306ddb63", "6ebc61ec0f7d055c"] as const,
  checks: [
    {
      code: "MOD",
      shellFamily: "quarters_split_field",
      logOddsScale: 0.018,
      explosivePassSuppressionWeight: -0.014,
    },
    {
      code: "MEG",
      shellFamily: "quarters_split_field",
      logOddsScale: 0.014,
      explosivePassSuppressionWeight: -0.011,
    },
    {
      code: "Palms_2Read",
      shellFamily: "quarters_split_field",
      logOddsScale: 0.022,
      explosivePassSuppressionWeight: -0.016,
    },
    {
      code: "Poach_Solo_3x1",
      shellFamily: "trips_3x1_adjustment",
      logOddsScale: 0.024,
      explosivePassSuppressionWeight: -0.019,
    },
    {
      code: "Stubbie_Special",
      shellFamily: "trips_3x1_adjustment",
      logOddsScale: 0.020,
      explosivePassSuppressionWeight: -0.015,
    },
    {
      code: "Cover6_QQH_Cover8_HQQ",
      shellFamily: "half_field_hybrid",
      logOddsScale: 0.019,
      explosivePassSuppressionWeight: -0.013,
    },
  ],
} as const;

export interface SplitFieldCoverageOverlayInput {
  readonly offense3x1TripsRateZ?: number;
  readonly defenseSplitFieldQuartersRateZ?: number;
  readonly slotHorizontalStressZ?: number;
  readonly boundaryIsoExposureZ?: number;
  readonly verticalShotMismatchZ?: number;
}

export interface SplitFieldCoverageOverlayReceipt {
  readonly derivationTag: "[DERIVED KERNEL]";
  readonly coverageShellDeltaLogOdds: number;
  readonly explosivePassSuppressionDelta: number;
  readonly probModulation: number;
  readonly activeChecks: readonly SplitFieldCoverageCheckCode[];
  readonly allFiniteNonNan: boolean;
}

/**
 * Evaluate bounded `[DERIVED KERNEL]` Split-Field Quarters coverage shell adjustments
 * (`|coverageShellDeltaLogOdds| <= 0.35`, `|probModulation| <= 0.015`).
 */
export function evaluateSplitFieldCoverageOverlay(
  input: SplitFieldCoverageOverlayInput = {},
): SplitFieldCoverageOverlayReceipt {
  const tripsZ = clamp(finiteOrZero(input.offense3x1TripsRateZ), 2.5);
  const splitZ = clamp(finiteOrZero(input.defenseSplitFieldQuartersRateZ), 2.5);
  const flatZ = clamp(finiteOrZero(input.slotHorizontalStressZ), 2.5);
  const isoZ = clamp(finiteOrZero(input.boundaryIsoExposureZ), 2.5);
  const seamZ = clamp(finiteOrZero(input.verticalShotMismatchZ), 2.5);

  const checks = SPLIT_FIELD_QUARTERS_COVERAGE_OPERATORS.checks;
  const c0 = checks[0]?.logOddsScale ?? 0;
  const c1 = checks[1]?.logOddsScale ?? 0;
  const c2 = checks[2]?.logOddsScale ?? 0;
  const c3 = checks[3]?.logOddsScale ?? 0;
  const c4 = checks[4]?.logOddsScale ?? 0;
  const c5 = checks[5]?.logOddsScale ?? 0;
  const rawShellDelta =
    splitZ * c0 + // MOD
    isoZ * c1 + // MEG
    flatZ * c2 + // Palms/2-Read
    tripsZ * c3 + // Poach/Solo vs 3x1
    (tripsZ * 0.5 + flatZ * 0.5) * c4 - // Stubbie/Special
    seamZ * c5; // Cover 6/8 seam vulnerability under vertical stress

  const coverageShellDeltaLogOdds = Number(
    clamp(rawShellDelta, MAX_ABS_CORPUS_LOG_ODDS).toFixed(6),
  );
  const e0 = checks[0]?.explosivePassSuppressionWeight ?? 0;
  const e3 = checks[3]?.explosivePassSuppressionWeight ?? 0;
  const e5 = checks[5]?.explosivePassSuppressionWeight ?? 0;
  const rawExplosiveDelta =
    splitZ * e0 +
    tripsZ * e3 -
    seamZ * e5;
  const explosivePassSuppressionDelta = Number(
    clamp(rawExplosiveDelta, MAX_CORPUS_FAMILY_PROB_MODULATION).toFixed(6),
  );
  const probModulation = Number(
    clamp(coverageShellDeltaLogOdds * 0.1, MAX_CORPUS_FAMILY_PROB_MODULATION).toFixed(6),
  );

  return {
    derivationTag: SPLIT_FIELD_QUARTERS_COVERAGE_OPERATORS.derivationTag,
    coverageShellDeltaLogOdds,
    explosivePassSuppressionDelta,
    probModulation,
    activeChecks: checks.map((c) => c.code),
    allFiniteNonNan:
      Number.isFinite(coverageShellDeltaLogOdds) &&
      Number.isFinite(explosivePassSuppressionDelta) &&
      Number.isFinite(probModulation),
  };
}

export interface RulebookAndPsychologyOverlayInput {
  readonly kickoffReturnVolatilityZ?: number;
  readonly declaredOnsideComebackNeedZ?: number;
  readonly yerkesDodsonArousalZ?: number;
  readonly firstCareerStartFlag?: boolean;
  readonly hostileRoadNoiseZ?: number;
  readonly clutchComposureEdgeZ?: number;
}

export interface RulebookAndPsychologyOverlayReceipt {
  readonly rulebookDeltaLogOdds: number;
  readonly psychologyDeltaLogOdds: number;
  readonly combinedProbDelta: number;
  readonly activeRuleCodes: readonly string[];
  readonly allFiniteNonNan: boolean;
}

/**
 * Deterministic bounded overlay combining verified 2026 NFL Rulebook structural changes
 * with sports-psychology pressure & composure operators (`|combinedProbDelta| <= 0.015`).
 */
export function evaluateRulebookAndPsychologyOverlay(
  input: RulebookAndPsychologyOverlayInput = {},
): RulebookAndPsychologyOverlayReceipt {
  const kickoffZ = clamp(finiteOrZero(input.kickoffReturnVolatilityZ), 2.5);
  const onsideZ = clamp(finiteOrZero(input.declaredOnsideComebackNeedZ), 2.5);
  const arousalZ = clamp(finiteOrZero(input.yerkesDodsonArousalZ), 2.5);
  const noiseZ = clamp(finiteOrZero(input.hostileRoadNoiseZ), 2.5);
  const composureZ = clamp(finiteOrZero(input.clutchComposureEdgeZ), 2.5);
  const firstStart = input.firstCareerStartFlag ? 1 : 0;

  const r0 = NFL_2026_PLAYING_RULES_OPERATORS.rules[0]?.logOddsScale ?? 0;
  const r1 = NFL_2026_PLAYING_RULES_OPERATORS.rules[1]?.logOddsScale ?? 0;
  const r2 = NFL_2026_PLAYING_RULES_OPERATORS.rules[2]?.logOddsScale ?? 0;
  const ruleRaw =
    kickoffZ * (r0 + r1) * 0.5 +
    onsideZ * r2;
  const psychRaw =
    arousalZ * SPORTS_PSYCHOLOGY_PRESSURE_OPERATORS.yerkesDodsonOverarousalWeight +
    firstStart * SPORTS_PSYCHOLOGY_PRESSURE_OPERATORS.firstCareerStartComposureScale +
    noiseZ * SPORTS_PSYCHOLOGY_PRESSURE_OPERATORS.hostileRoadCadenceWeight +
    composureZ * SPORTS_PSYCHOLOGY_PRESSURE_OPERATORS.clutchLeverageExecutionWeight;

  const rulebookDeltaLogOdds = Number(clamp(ruleRaw, MAX_ABS_CORPUS_LOG_ODDS).toFixed(6));
  const psychologyDeltaLogOdds = Number(clamp(psychRaw, MAX_ABS_CORPUS_LOG_ODDS).toFixed(6));
  const combinedProbDelta = Number(
    clamp((rulebookDeltaLogOdds + psychologyDeltaLogOdds) * 0.1, MAX_CORPUS_FAMILY_PROB_MODULATION).toFixed(6),
  );

  const activeRuleCodes = NFL_2026_PLAYING_RULES_OPERATORS.rules.map((r) => r.code);
  return {
    rulebookDeltaLogOdds,
    psychologyDeltaLogOdds,
    combinedProbDelta,
    activeRuleCodes,
    allFiniteNonNan:
      Number.isFinite(rulebookDeltaLogOdds) &&
      Number.isFinite(psychologyDeltaLogOdds) &&
      Number.isFinite(combinedProbDelta),
  };
}

export interface UnifiedCorpusSituationalStackInput {
  readonly corpusPriors?: FoundryCorpusSituationalInput;
  readonly rulebookAndPsychology?: RulebookAndPsychologyOverlayInput;
  readonly splitFieldCoverage?: SplitFieldCoverageOverlayInput;
  readonly clusterRedundancyGamma?: number;
}

export interface UnifiedCorpusSituationalStackReceipt {
  readonly corpusPriorsReceipt: FoundryCorpusSituationalReceipt;
  readonly rulebookPsychologyReceipt: RulebookAndPsychologyOverlayReceipt;
  readonly splitFieldCoverageReceipt: SplitFieldCoverageOverlayReceipt;
  readonly spectralAttenuatedCoverageLogOdds: number;
  readonly jamesSteinShrinkageFactor: number;
  readonly unifiedClampedLogOddsDelta: number;
  readonly unifiedClampedProbModulation: number;
  readonly allFiniteNonNan: boolean;
}

/**
 * Pure Edge-safe Stage C/D composition across all 3 Foundry corpus situational stacks:
 * (1) 6-family Empirical-Bayes corpus priors,
 * (2) 2026 NFL Rulebook + Sports Psychology composure operators,
 * (3) `[DERIVED KERNEL]` Split-Field Quarters coverage checks (intra-cluster spectral
 *     attenuation `1 / sqrt(1 + gamma)` when `coveragePersonnel` also fires so coverage
 *     evidence is never double-counted),
 * followed by Positive-Part James-Stein coupling and hard `|Delta log-odds| <= 0.35` clamp.
 */
export function evaluateUnifiedCorpusSituationalStack(
  input: UnifiedCorpusSituationalStackInput = {},
): UnifiedCorpusSituationalStackReceipt {
  const corpusPriorsReceipt = evaluateFoundryCorpusSituationalPriors(input.corpusPriors ?? {});
  const rulebookPsychologyReceipt = evaluateRulebookAndPsychologyOverlay(
    input.rulebookAndPsychology ?? {},
  );
  const splitFieldCoverageReceipt = evaluateSplitFieldCoverageOverlay(
    input.splitFieldCoverage ?? {},
  );

  const gammaRaw = input.clusterRedundancyGamma ?? 0.85;
  const gamma = Number.isFinite(gammaRaw) && gammaRaw >= 0 ? gammaRaw : 0.85;
  const coverageClusterRank =
    Math.abs(corpusPriorsReceipt.shrunkFamilyLogOdds.coveragePersonnel) > 0 ? 1 : 0;
  const spectralAttenuation = 1 / Math.sqrt(1 + gamma * coverageClusterRank);
  const spectralAttenuatedCoverageLogOdds = Number(
    (splitFieldCoverageReceipt.coverageShellDeltaLogOdds * spectralAttenuation).toFixed(6),
  );

  const components = [
    corpusPriorsReceipt.combinedLogOddsDelta,
    rulebookPsychologyReceipt.rulebookDeltaLogOdds,
    rulebookPsychologyReceipt.psychologyDeltaLogOdds,
    spectralAttenuatedCoverageLogOdds,
  ];
  const d = components.filter((v) => Math.abs(v) > 0).length;
  const sumSq = components.reduce((acc, v) => acc + v * v, 0);
  const sigma2 = 0.0004;
  const jamesSteinShrinkageFactor =
    d >= 3 && sumSq > 1e-12
      ? Number(Math.max(0, 1 - ((d - 2) * sigma2) / sumSq).toFixed(6))
      : 1.0;

  const rawCombined =
    components.reduce((acc, v) => acc + v, 0) *
    jamesSteinShrinkageFactor *
    corpusPriorsReceipt.vetoDampingFactor;
  const unifiedClampedLogOddsDelta = Number(
    clamp(rawCombined, MAX_ABS_CORPUS_LOG_ODDS).toFixed(6),
  );
  const unifiedClampedProbModulation = Number(
    clamp(unifiedClampedLogOddsDelta * 0.1, MAX_CORPUS_FAMILY_PROB_MODULATION).toFixed(6),
  );

  const allFiniteNonNan =
    corpusPriorsReceipt.allFiniteNonNan &&
    rulebookPsychologyReceipt.allFiniteNonNan &&
    splitFieldCoverageReceipt.allFiniteNonNan &&
    Number.isFinite(spectralAttenuatedCoverageLogOdds) &&
    Number.isFinite(jamesSteinShrinkageFactor) &&
    Number.isFinite(unifiedClampedLogOddsDelta) &&
    Number.isFinite(unifiedClampedProbModulation);

  return {
    corpusPriorsReceipt,
    rulebookPsychologyReceipt,
    splitFieldCoverageReceipt,
    spectralAttenuatedCoverageLogOdds,
    jamesSteinShrinkageFactor,
    unifiedClampedLogOddsDelta,
    unifiedClampedProbModulation,
    allFiniteNonNan,
  };
}

export type Week10EntityDisposition =
  | "VERIFIED_ACTIVE"
  | "REMAPPED_ACTIVE_TEAM"
  | "BLOCKED_UNAVAILABLE"
  | "QUARANTINED_SOURCE_ANOMALY";

export interface Week10EntityReconciliationResult {
  readonly canonicalPlayer: string;
  readonly printedTeam: string | null;
  readonly authoritativeTeam: string | null;
  readonly disposition: Week10EntityDisposition;
  readonly eligibleForStage0: boolean;
  readonly note: string;
}

const WEEK10_ACTIVE_PLAYER_TEAM_MAP: Readonly<Record<string, string>> = {
  "greg dortch": "BUF",
  "kendrick bourne": "ARI",
  "kyler murray": "MIN",
  "k.murray": "MIN",
  "kirk cousins": "MIN",
  "k.cousins": "MIN",
  "jacoby brissett": "BAL",
  "j.brissett": "BAL",
  "j.j. mccarthy": "NYG",
  "j.mccarthy": "NYG",
  "josh downs": "KC",
  "j.downs": "KC",
  "keenan allen": "SF",
  "k.allen": "SF",
  "kenneth walker iii": "KC",
  "k.walker": "KC",
  "tyler allgeier": "ARI",
  "t.allgeier": "ARI",
  "myles garrett": "LAR",
  "jared verse": "CLE",
  "jeffery simmons": "CHI",
  "trent mcduffie": "LAR",
  "amani hooker": "BUF",
  "jessie bates": "JAX",
  "carson beck": "ARI",
  "kyle mccord": "MIA",
  "drew lock": "SEA",
  "fernando mendoza": "LV",
  "shedeur sanders": "CLE",
} as const;

const WEEK10_CANONICAL_NAMES: Readonly<Record<string, string>> = {
  "k.murray": "Kyler Murray",
  "k.cousins": "Kirk Cousins",
  "j.brissett": "Jacoby Brissett",
  "j.mccarthy": "J.J. McCarthy",
  "j.downs": "Josh Downs",
  "k.allen": "Keenan Allen",
  "k.walker": "Kenneth Walker III",
  "t.allgeier": "Tyler Allgeier",
} as const;

const WEEK10_UNAVAILABLE_PLAYERS_SET: ReadonlySet<string> = new Set([
  "micah parsons",
  "puka nacua",
  "davante adams",
  "brandon aiyuk",
  "jake ferguson",
  "aaron brewer",
  "zach sieler",
  "gardner minshew",
  "gardner minshew ii",
  "sam darnold",
  "jaxson dart",
  "lamar jackson",
  "tyler huntley",
  "malik willis",
  "dj moore",
]);

/**
 * Pure Edge-safe Stage-0 Gate-0A entity & sweep-CSV reconciliation helper (`GCP-LEV-04`).
 * Remaps earned-season stale team tags (e.g., `K.Murray` ARI->MIN, `K.Cousins` LV->MIN,
 * `J.Brissett` ARI->BAL, `J.McCarthy` MIN->NYG, `Josh Downs` IND->KC), blocks Week 10
 * OUT/IR/PUP players, and quarantines unverified source anomalies (`J.Daniels` @ `TB`).
 */
export function reconcileWeek10EntityAndAvailability(
  playerName: string,
  printedTeam?: string | null,
): Week10EntityReconciliationResult {
  const trimmed = playerName.trim().replace(/\s+/g, " ");
  const normKey = trimmed.toLowerCase().replace(/\.\s+/g, ".");
  const normTeamRaw = printedTeam ? printedTeam.trim().toUpperCase() : null;
  const normTeam =
    normTeamRaw === "LA" ? "LAR" : normTeamRaw === "WSH" ? "WAS" : normTeamRaw;

  if (normKey.includes("daniels") && normTeam === "TB") {
    return {
      canonicalPlayer: trimmed,
      printedTeam: normTeam,
      authoritativeTeam: null,
      disposition: "QUARANTINED_SOURCE_ANOMALY",
      eligibleForStage0: false,
      note: "Unverified second J.Daniels entry at TB in sfdata-qb-ryoe; quarantined fail-closed.",
    };
  }

  const canonicalPlayer =
    WEEK10_CANONICAL_NAMES[normKey] ??
    WEEK10_CANONICAL_NAMES[trimmed.toLowerCase()] ??
    trimmed;

  if (
    WEEK10_UNAVAILABLE_PLAYERS_SET.has(normKey) ||
    WEEK10_UNAVAILABLE_PLAYERS_SET.has(canonicalPlayer.toLowerCase())
  ) {
    return {
      canonicalPlayer,
      printedTeam: normTeam,
      authoritativeTeam: null,
      disposition: "BLOCKED_UNAVAILABLE",
      eligibleForStage0: false,
      note: "Blocked by Stage 0 Gate 0A (OUT / IR / PUP / Exempt for Week 10).",
    };
  }

  const authTeam =
    WEEK10_ACTIVE_PLAYER_TEAM_MAP[normKey] ??
    WEEK10_ACTIVE_PLAYER_TEAM_MAP[canonicalPlayer.toLowerCase()] ??
    normTeam;

  if (authTeam && normTeam && authTeam !== normTeam) {
    return {
      canonicalPlayer,
      printedTeam: normTeam,
      authoritativeTeam: authTeam,
      disposition: "REMAPPED_ACTIVE_TEAM",
      eligibleForStage0: true,
      note: `Remapped earned-season tag ${normTeam} to verified Week 10 active team ${authTeam}.`,
    };
  }

  return {
    canonicalPlayer,
    printedTeam: normTeam,
    authoritativeTeam: authTeam,
    disposition: "VERIFIED_ACTIVE",
    eligibleForStage0: Boolean(authTeam),
    note: "Verified active Week 10 team assignment.",
  };
}
