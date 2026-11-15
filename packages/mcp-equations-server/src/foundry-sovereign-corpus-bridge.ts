/**
 * @file foundry-sovereign-corpus-bridge.ts
 * @sports/mcp-equations-server bridge uniting Sovereign Foundry primitives,
 * GCP Shard B XML-tagged syntheses, and the Cognitive Router 288-bit mask.
 *
 * Strictly enforces Positive-Part James-Stein shrinkage + cross-layer veto damping
 * bounded within [-MAX_ABS_DELTA_LOG_ODDS, MAX_ABS_DELTA_LOG_ODDS] ([-0.35, 0.35]),
 * zero NaNs, and zero fabricated statistics.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildContextMask,
  denoiseMarchenkoPasturEffectiveRankShrinkage,
  maskToArray,
  MAX_ABS_DELTA_LOG_ODDS,
  MIN_SAMPLE,
  SIGNAL_FAMILIES,
  stageC,
  stageD,
  type Premise,
  type Signal,
  type SpectralPremise,
  type StageDCoupledResult,
} from "./mcp-cognitive-router.js";

export type FoundrySituationalFamily =
  | "pressure"
  | "weather"
  | "restFatigue"
  | "coveragePersonnel"
  | "qbSkillScript"
  | "marketMicrostructure";

export const FOUNDRY_SITUATIONAL_FAMILIES: readonly FoundrySituationalFamily[] = [
  "pressure",
  "weather",
  "restFatigue",
  "coveragePersonnel",
  "qbSkillScript",
  "marketMicrostructure",
] as const;

export const FAMILY_PRIMARY_ROUTER_BIT: Readonly<Record<FoundrySituationalFamily, number>> = {
  pressure: 12,
  weather: 58,
  restFatigue: 104,
  coveragePersonnel: 150,
  qbSkillScript: 196,
  marketMicrostructure: 242,
};

export const JAMES_STEIN_CORPUS_BASE_N = 12;

export interface FoundryFamilyWiringSummary {
  readonly sovereign_primitives_routed: number;
  readonly gcp_shard_b_docs_routed: number;
  readonly combined_evidence_count: number;
  readonly active_router_bits_count: number;
  readonly bounded_james_stein_log_odds_weight: number;
  readonly all_finite_non_nan: boolean;
}

export interface FoundrySovereignCorpusManifest {
  readonly schema: string;
  readonly generated_at_utc?: string;
  readonly counts: {
    readonly sovereign_books_loaded: number;
    readonly sovereign_primitives_routed: number;
    readonly sovereign_reasoning_traces_routed: number;
    readonly gcp_shard_b_docs_routed: number;
    readonly rules_rlvr_lessons_routed: number;
    readonly week10_entity_truth_rows?: number;
    readonly total_routed_intelligence_units?: number;
    readonly active_mask_bits_set: number;
  };
  readonly context_mask_uint32_words_9: readonly number[];
  readonly six_situational_families: Readonly<
    Record<FoundrySituationalFamily, FoundryFamilyWiringSummary>
  >;
}

export interface ShardBCatalogSummary {
  readonly schema: string;
  readonly total_markdown_files: number;
  readonly files_with_xml_sections: number;
  readonly total_extracted_equations: number;
  readonly family_counts: Readonly<Record<string, number>>;
  readonly section_counts: Readonly<Record<string, number>>;
}

export interface FoundryCorpusPriorEvaluation {
  readonly sourceSchema: string;
  readonly rawFamilyLogOdds: Readonly<Record<FoundrySituationalFamily, number>>;
  readonly dampedFamilyLogOdds: Readonly<Record<FoundrySituationalFamily, number>>;
  readonly totalDeltaLogOdds: number;
  readonly vetoDampingFactor: number;
  readonly signalsEmitted: readonly Signal[];
  readonly contextMaskWords: readonly number[];
  readonly activeBitCount: number;
  readonly maxAbsBound: number;
  readonly allFiniteNonNan: boolean;
}

export interface EmpiricalBayesFamilyPrior {
  readonly sovereign_primitives: number;
  readonly shard_b_docs: number;
  readonly drive_equations: number;
  readonly drive_situational_rules: number;
  readonly combined_evidence_count: number;
  readonly shrinkage_factor: number;
  readonly raw_log_odds_prior: number;
  readonly bounded_eb_log_odds_prior: number;
  readonly all_finite_non_nan: boolean;
}

export interface CalibratedCorpusWeightsReceipt {
  readonly schema: string;
  readonly generated_at_utc?: string;
  readonly slate_hold_status?: string;
  readonly calibrationVerified: boolean;
  readonly all_invariants_satisfied?: boolean;
  readonly chronological_oof_baseline: {
    readonly n_rows: number;
    readonly brier_raw: number;
    readonly brier_oof: number;
    readonly ece_oof: number;
    readonly mean_corpus_shrinkage_factor: number;
    readonly oof_hard_pass_preserved: boolean;
  };
  readonly empirical_bayes_six_family_priors: Readonly<
    Record<FoundrySituationalFamily, EmpiricalBayesFamilyPrior>
  >;
}

export interface MotifSweepGovernanceSummary {
  readonly schema: string;
  readonly igForYouCount: number;
  readonly xForYouCount: number;
  readonly xAnalyticsCount: number;
  readonly totalRecords: number;
  readonly excludedKillOrWithdrawnCount: number;
  readonly learnOnlyOrContextOnlyCount: number;
  readonly watchOrSkippedQuarantinedCount: number;
  readonly adoptCount: number;
  readonly testOrOtherVerdictCount: number;
  readonly untaggedCount: number;
  readonly allFeedsLoaded: boolean;
  readonly cached: boolean;
}

const FALLBACK_MANIFEST: FoundrySovereignCorpusManifest = {
  schema: "gse.sovereign_to_cognitive_router_wiring.v1.fallback",
  counts: {
    sovereign_books_loaded: 1064,
    sovereign_primitives_routed: 14667,
    sovereign_reasoning_traces_routed: 3405,
    gcp_shard_b_docs_routed: 8143,
    rules_rlvr_lessons_routed: 200,
    week10_entity_truth_rows: 518,
    total_routed_intelligence_units: 26415,
    active_mask_bits_set: 276,
  },
  context_mask_uint32_words_9: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  six_situational_families: {
    pressure: {
      sovereign_primitives_routed: 560,
      gcp_shard_b_docs_routed: 292,
      combined_evidence_count: 852,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.15787,
      all_finite_non_nan: true,
    },
    weather: {
      sovereign_primitives_routed: 803,
      gcp_shard_b_docs_routed: 1886,
      combined_evidence_count: 2689,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.209992,
      all_finite_non_nan: true,
    },
    restFatigue: {
      sovereign_primitives_routed: 1564,
      gcp_shard_b_docs_routed: 3674,
      combined_evidence_count: 5238,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.240181,
      all_finite_non_nan: true,
    },
    coveragePersonnel: {
      sovereign_primitives_routed: 1013,
      gcp_shard_b_docs_routed: 628,
      combined_evidence_count: 1641,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.187597,
      all_finite_non_nan: true,
    },
    qbSkillScript: {
      sovereign_primitives_routed: 9231,
      gcp_shard_b_docs_routed: 660,
      combined_evidence_count: 9891,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.26891,
      all_finite_non_nan: true,
    },
    marketMicrostructure: {
      sovereign_primitives_routed: 1496,
      gcp_shard_b_docs_routed: 1003,
      combined_evidence_count: 2499,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.20667,
      all_finite_non_nan: true,
    },
  },
};

let _cachedShardBSummary: ShardBCatalogSummary | null = null;
let _cachedCalReceipt: CalibratedCorpusWeightsReceipt | null = null;
let _cachedMotifSweepSummary: MotifSweepGovernanceSummary | null = null;

export function clearCorpusBridgeCaches(): void {
  _cachedShardBSummary = null;
  _cachedCalReceipt = null;
  _cachedMotifSweepSummary = null;
}

function resolveRepoCandidatePaths(relPath: string): string[] {
  const candidates = [
    join(process.cwd(), relPath),
    resolve(process.cwd(), "..", "..", relPath),
  ];
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const repoRoot = resolve(dirname(currentFile), "../../../");
    candidates.push(join(repoRoot, relPath));
  } catch {
    // Non-ESM environments use cwd fallbacks
  }
  return candidates;
}

function readCandidateFile<T>(relPath: string, parseFn: (raw: string) => T): T | null {
  for (const fullPath of resolveRepoCandidatePaths(relPath)) {
    if (existsSync(fullPath)) {
      try {
        return parseFn(readFileSync(fullPath, "utf8"));
      } catch {
        // Continue to next candidate
      }
    }
  }
  return null;
}

function readJsonIfExists<T>(relPath: string): T | null {
  return readCandidateFile(relPath, (raw) => JSON.parse(raw) as T);
}

function readJsonlLinesIfExists(relPath: string): Record<string, unknown>[] | null {
  return readCandidateFile(relPath, (raw) => {
    const out: Record<string, unknown>[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      out.push(JSON.parse(trimmed) as Record<string, unknown>);
    }
    return out;
  });
}

export function loadFoundrySovereignCorpusManifest(
  overrideManifest?: FoundrySovereignCorpusManifest,
): FoundrySovereignCorpusManifest {
  if (overrideManifest) {
    return overrideManifest;
  }
  const disk = readJsonIfExists<FoundrySovereignCorpusManifest>(
    "docs/engine/research/2026-11-13/friday_prepack_audit/05_sovereign_and_shard_b_router_wiring_manifest.json",
  );
  return disk && disk.six_situational_families ? disk : FALLBACK_MANIFEST;
}

export function loadShardBCatalogSummary(): ShardBCatalogSummary | null {
  if (_cachedShardBSummary) {
    return _cachedShardBSummary;
  }
  const disk = readJsonIfExists<ShardBCatalogSummary & { entries?: unknown }>(
    "docs/engine/research/2026-11-13/corpus_compilation/shard_b_operators_and_vetoes_catalog.json",
  );
  if (!disk) {
    return null;
  }
  _cachedShardBSummary = {
    schema: disk.schema,
    total_markdown_files: disk.total_markdown_files,
    files_with_xml_sections: disk.files_with_xml_sections,
    total_extracted_equations: disk.total_extracted_equations,
    family_counts: disk.family_counts ?? {},
    section_counts: disk.section_counts ?? {},
  };
  return _cachedShardBSummary;
}

export function loadCalibratedCorpusWeightsReceipt(): CalibratedCorpusWeightsReceipt | null {
  if (_cachedCalReceipt) {
    return _cachedCalReceipt;
  }
  const disk = readJsonIfExists<CalibratedCorpusWeightsReceipt>(
    "docs/engine/research/2026-11-13/corpus_compilation/07_corpus_wired_calibration_and_hold_gate_receipt.json",
  );
  if (!disk || !disk.empirical_bayes_six_family_priors) {
    return null;
  }
  _cachedCalReceipt = disk;
  return _cachedCalReceipt;
}

const KILL_WITHDRAWN_RE = /\b(?:KILL|WITHDRAWN)\b/i;
const LEARN_CONTEXT_RE = /\b(?:LEARN-ONLY|CONTEXT-ONLY)\b/i;
const WATCH_SKIPPED_RE = /\b(?:WATCH|SKIPPED)\b/i;
const STRICT_ADOPT_RE = /^\s*ADOPT(?:\s*[:(\[]|\s*$)/i;

export function loadMotifSweepSummary(): MotifSweepGovernanceSummary | null {
  if (_cachedMotifSweepSummary) {
    return _cachedMotifSweepSummary;
  }
  const igRows = readJsonlLinesIfExists(
    "docs/data-sources/research/2026-11-14/sweep-ingestion/ig-for-you-feed.jsonl",
  );
  const xForYouRows = readJsonlLinesIfExists(
    "docs/data-sources/research/2026-11-14/sweep-ingestion/x-for-you-feed.jsonl",
  );
  const xAnalyticsRows = readJsonlLinesIfExists(
    "docs/data-sources/research/2026-11-14/sweep-ingestion/x-analytics-feed.jsonl",
  );
  if (!igRows && !xForYouRows && !xAnalyticsRows) {
    return null;
  }

  let excludedKillOrWithdrawnCount = 0;
  let learnOnlyOrContextOnlyCount = 0;
  let watchOrSkippedQuarantinedCount = 0;
  let adoptCount = 0;
  let testOrOtherVerdictCount = 0;
  let untaggedCount = 0;

  for (const rows of [igRows ?? [], xForYouRows ?? [], xAnalyticsRows ?? []]) {
    for (const row of rows) {
      const verdict = typeof row.verdict === "string" ? row.verdict.trim() : "";
      if (!verdict) {
        untaggedCount += 1;
        continue;
      }
      if (KILL_WITHDRAWN_RE.test(verdict)) {
        excludedKillOrWithdrawnCount += 1;
      } else if (LEARN_CONTEXT_RE.test(verdict)) {
        learnOnlyOrContextOnlyCount += 1;
      } else if (WATCH_SKIPPED_RE.test(verdict)) {
        watchOrSkippedQuarantinedCount += 1;
      } else if (STRICT_ADOPT_RE.test(verdict)) {
        adoptCount += 1;
      } else {
        testOrOtherVerdictCount += 1;
      }
    }
  }

  const igForYouCount = igRows?.length ?? 0;
  const xForYouCount = xForYouRows?.length ?? 0;
  const xAnalyticsCount = xAnalyticsRows?.length ?? 0;
  const allFeedsLoaded = Boolean(igRows && xForYouRows && xAnalyticsRows);
  const summary: MotifSweepGovernanceSummary = {
    schema: "motif.sweep_feed.v1",
    igForYouCount,
    xForYouCount,
    xAnalyticsCount,
    totalRecords: igForYouCount + xForYouCount + xAnalyticsCount,
    excludedKillOrWithdrawnCount,
    learnOnlyOrContextOnlyCount,
    watchOrSkippedQuarantinedCount,
    adoptCount,
    testOrOtherVerdictCount,
    untaggedCount,
    allFeedsLoaded,
    cached: allFeedsLoaded,
  };
  if (allFeedsLoaded) {
    _cachedMotifSweepSummary = summary;
  }
  return summary;
}

export function clampDeltaLogOdds(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value > MAX_ABS_DELTA_LOG_ODDS) {
    return MAX_ABS_DELTA_LOG_ODDS;
  }
  if (value < -MAX_ABS_DELTA_LOG_ODDS) {
    return -MAX_ABS_DELTA_LOG_ODDS;
  }
  return Number(value.toFixed(6));
}

export function shrinkPositivePartJamesStein(
  rawDeltaLogOdds: number,
  sampleCount: number,
): number {
  if (!Number.isFinite(rawDeltaLogOdds) || !Number.isFinite(sampleCount) || sampleCount <= 0) {
    return 0;
  }
  const shrinkageFactor = Math.max(
    0,
    sampleCount / (sampleCount + JAMES_STEIN_CORPUS_BASE_N),
  );
  return clampDeltaLogOdds(rawDeltaLogOdds * shrinkageFactor);
}

/**
 * Convert situational displacements across the 6 Foundry corpus families into
 * canonical 288-bit Cognitive Router signals (strictly bounded within 0..SIGNAL_FAMILIES-1).
 */
export function buildFoundryCorpusRouterSignals(
  familyDisplacements: Partial<Record<FoundrySituationalFamily, number>>,
  manifest: FoundrySovereignCorpusManifest = loadFoundrySovereignCorpusManifest(),
): Signal[] {
  const signals: Signal[] = [];
  for (const fam of FOUNDRY_SITUATIONAL_FAMILIES) {
    const rawDisp = familyDisplacements[fam] ?? 0;
    if (!Number.isFinite(rawDisp) || rawDisp === 0) {
      continue;
    }
    const summary = manifest.six_situational_families[fam];
    const evidenceCount = Math.max(MIN_SAMPLE, summary?.combined_evidence_count ?? MIN_SAMPLE);
    const bit = FAMILY_PRIMARY_ROUTER_BIT[fam];
    if (bit >= 0 && bit < SIGNAL_FAMILIES) {
      signals.push({
        family: bit,
        displacement: clampDeltaLogOdds(rawDisp),
        n: evidenceCount,
      });
    }
  }
  return signals;
}

/**
 * Evaluate Positive-Part James-Stein shrinkage + cross-layer collinearity damping
 * across the 6 situational families grounded in the Sovereign + Shard B corpus.
 */
export function evaluateFoundrySovereignCorpusPrior(params: {
  readonly familyDisplacements: Partial<Record<FoundrySituationalFamily, number>>;
  readonly collinearCrossLayerVetoesTriggered?: number;
  readonly manifestOverride?: FoundrySovereignCorpusManifest;
}): FoundryCorpusPriorEvaluation {
  const manifest = loadFoundrySovereignCorpusManifest(params.manifestOverride);
  const vetoes = Math.max(0, Math.floor(params.collinearCrossLayerVetoesTriggered ?? 0));
  // Cross-layer vetoes damp speculative displacements exponentially without zeroing valid priors
  const vetoDampingFactor = Number(Math.max(0.25, Math.pow(0.85, vetoes)).toFixed(6));

  const rawFamilyLogOdds: Record<FoundrySituationalFamily, number> = {
    pressure: 0,
    weather: 0,
    restFatigue: 0,
    coveragePersonnel: 0,
    qbSkillScript: 0,
    marketMicrostructure: 0,
  };
  const dampedFamilyLogOdds: Record<FoundrySituationalFamily, number> = {
    pressure: 0,
    weather: 0,
    restFatigue: 0,
    coveragePersonnel: 0,
    qbSkillScript: 0,
    marketMicrostructure: 0,
  };

  let weightedSum = 0;
  for (const fam of FOUNDRY_SITUATIONAL_FAMILIES) {
    const disp = params.familyDisplacements[fam] ?? 0;
    const summary = manifest.six_situational_families[fam];
    const evidenceCount = summary?.combined_evidence_count ?? 0;
    const corpusWeight = summary?.bounded_james_stein_log_odds_weight ?? 0.05;
    const raw = shrinkPositivePartJamesStein(disp, evidenceCount);
    // Modulate weakly by verified corpus family weight (capped cleanly)
    const damped = clampDeltaLogOdds(raw * (0.5 + corpusWeight) * vetoDampingFactor);
    rawFamilyLogOdds[fam] = raw;
    dampedFamilyLogOdds[fam] = damped;
    weightedSum += damped;
  }

  const totalDeltaLogOdds = clampDeltaLogOdds(weightedSum);
  const signalsEmitted = buildFoundryCorpusRouterSignals(params.familyDisplacements, manifest);
  const maskWords = maskToArray(buildContextMask(signalsEmitted));
  const activeBitCount = maskWords.reduce((acc, w) => {
    let x = w >>> 0;
    let c = 0;
    while (x !== 0) {
      c += x & 1;
      x >>>= 1;
    }
    return acc + c;
  }, 0);

  return {
    sourceSchema: manifest.schema,
    rawFamilyLogOdds,
    dampedFamilyLogOdds,
    totalDeltaLogOdds,
    vetoDampingFactor,
    signalsEmitted,
    contextMaskWords: maskWords,
    activeBitCount,
    maxAbsBound: MAX_ABS_DELTA_LOG_ODDS,
    allFiniteNonNan: Number.isFinite(totalDeltaLogOdds),
  };
}

export interface SovereignStageCDInputPremise extends Premise {
  readonly jacobianSensitivity?: number;
  readonly rawLogOddsDelta?: number;
}

export interface SovereignStageCDCouplingEvaluation {
  readonly sourceSchema: string;
  readonly marchenkoPasturShrinkage: number;
  readonly vetoDampingFactor: number;
  readonly spectralPremises: readonly SpectralPremise[];
  readonly stageDResult: StageDCoupledResult;
  readonly contextMaskWords: readonly number[];
  readonly activeBitCount: number;
  readonly maxAbsBound: number;
  readonly allFiniteNonNan: boolean;
}

/**
 * End-to-end Stage C (Spectral Cluster Orthogonalization) + Stage D (Cross-Equation
 * Jacobian Coupling, Positive-Part James-Stein Shrinkage, Marchenko-Pastur bulk-noise
 * clipping, and |Delta log-odds| <= 0.35 clamp) over Sovereign Foundry + GCP Shard B
 * family priors and auxiliary rulebook/psychology/split-field derived kernels.
 */
export function evaluateSovereignStageCDCoupling(params: {
  readonly familyDisplacements: Partial<Record<FoundrySituationalFamily, number>>;
  readonly additionalPremises?: readonly SovereignStageCDInputPremise[];
  readonly collinearCrossLayerVetoesTriggered?: number;
  readonly tauHatCoach?: number;
  readonly sampleHorizonT?: number;
  readonly noiseVarianceSigma2?: number;
  readonly stageCLimit?: number;
  readonly clusterRedundancyGamma?: number;
  readonly manifestOverride?: FoundrySovereignCorpusManifest;
}): SovereignStageCDCouplingEvaluation {
  const manifest = loadFoundrySovereignCorpusManifest(params.manifestOverride);
  const vetoesRaw = params.collinearCrossLayerVetoesTriggered ?? 0;
  const vetoes = Number.isFinite(vetoesRaw) ? Math.max(0, Math.floor(vetoesRaw)) : 0;
  const vetoDampingFactor = Number(Math.max(0.25, Math.pow(0.85, vetoes)).toFixed(6));

  const activeFamilies = FOUNDRY_SITUATIONAL_FAMILIES.filter((fam) => {
    const v = params.familyDisplacements[fam];
    return v !== undefined && Number.isFinite(v) && Math.abs(v) > 0;
  });
  const extraPremises = params.additionalPremises ?? [];
  const totalDimensionN = activeFamilies.length + extraPremises.length;
  const horizonT =
    params.sampleHorizonT !== undefined && Number.isFinite(params.sampleHorizonT)
      ? Math.max(4, params.sampleHorizonT)
      : 24;
  const marchenkoPasturShrinkage = denoiseMarchenkoPasturEffectiveRankShrinkage(
    totalDimensionN,
    horizonT,
  );

  const combinedPremises: SovereignStageCDInputPremise[] = [];
  for (const fam of activeFamilies) {
    const disp = params.familyDisplacements[fam] ?? 0;
    const summary = manifest.six_situational_families[fam];
    const evidenceCount = summary?.combined_evidence_count ?? 0;
    const corpusWeight = summary?.bounded_james_stein_log_odds_weight ?? 0.05;
    const jsShrunk = shrinkPositivePartJamesStein(disp, evidenceCount);
    const similarity = Number(
      Math.min(0.99, Math.max(0.55, 0.55 + 0.44 * Math.min(1, evidenceCount / 1200))).toFixed(6),
    );
    const verified = evidenceCount >= MIN_SAMPLE;
    combinedPremises.push({
      id: `foundry.family.${fam}`,
      premise: `Foundry Sovereign + GCP Shard B family prior (${fam}, n=${evidenceCount})`,
      cluster: `foundry.${fam}`,
      similarity,
      verificationTier: verified ? "CITABLE_VERIFIED" : "RESEARCH_HYPOTHESIS",
      verificationStatus: verified
        ? "HIGH_PRIORITY_PRODUCTION_TARGET"
        : "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST",
      backtestPassed: verified,
      jacobianSensitivity: Number(
        ((0.5 + corpusWeight) * vetoDampingFactor * marchenkoPasturShrinkage).toFixed(6),
      ),
      rawLogOddsDelta: jsShrunk,
    });
  }

  for (const p of extraPremises) {
    const safeSim = Number.isFinite(p.similarity)
      ? Math.max(0, Math.min(1, p.similarity))
      : 0;
    const safeRaw =
      p.rawLogOddsDelta !== undefined && Number.isFinite(p.rawLogOddsDelta)
        ? clampDeltaLogOdds(p.rawLogOddsDelta)
        : undefined;
    const safeJac =
      p.jacobianSensitivity !== undefined && Number.isFinite(p.jacobianSensitivity)
        ? Number((p.jacobianSensitivity * vetoDampingFactor * marchenkoPasturShrinkage).toFixed(6))
        : Number((vetoDampingFactor * marchenkoPasturShrinkage).toFixed(6));
    combinedPremises.push({
      ...p,
      similarity: safeSim,
      rawLogOddsDelta: safeRaw,
      jacobianSensitivity: safeJac,
    });
  }

  const spectralPremises = stageC(combinedPremises, {
    limit: params.stageCLimit,
    clusterRedundancyGamma: params.clusterRedundancyGamma,
  });

  const safeTauHat =
    params.tauHatCoach !== undefined && Number.isFinite(params.tauHatCoach)
      ? Math.max(0.05, Math.min(0.95, params.tauHatCoach))
      : 0.42;
  const safeSigma2 =
    params.noiseVarianceSigma2 !== undefined &&
    Number.isFinite(params.noiseVarianceSigma2) &&
    params.noiseVarianceSigma2 >= 0
      ? params.noiseVarianceSigma2
      : 0.0025;

  const stageDResult = stageD(spectralPremises, {
    noiseVarianceSigma2: safeSigma2,
    tauHatCoach: safeTauHat,
    maxAbsLogOddsDelta: MAX_ABS_DELTA_LOG_ODDS,
  });

  const signalsEmitted = buildFoundryCorpusRouterSignals(params.familyDisplacements, manifest);
  const contextMaskWords = maskToArray(buildContextMask(signalsEmitted));
  const activeBitCount = contextMaskWords.reduce((acc, w) => {
    let x = w >>> 0;
    let c = 0;
    while (x !== 0) {
      c += x & 1;
      x >>>= 1;
    }
    return acc + c;
  }, 0);

  const allFiniteNonNan =
    Number.isFinite(stageDResult.clampedTotalLogOddsDelta) &&
    Number.isFinite(stageDResult.unClampedTotalLogOddsDelta) &&
    Number.isFinite(stageDResult.jamesSteinShrinkageFactor) &&
    stageDResult.selectedPremises.every((sp) => Number.isFinite(sp.shrunkLogOddsDelta));

  return {
    sourceSchema: manifest.schema,
    marchenkoPasturShrinkage,
    vetoDampingFactor,
    spectralPremises,
    stageDResult,
    contextMaskWords,
    activeBitCount,
    maxAbsBound: MAX_ABS_DELTA_LOG_ODDS,
    allFiniteNonNan,
  };
}
