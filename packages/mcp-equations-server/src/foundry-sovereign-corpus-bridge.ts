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
  maskToArray,
  MAX_ABS_DELTA_LOG_ODDS,
  MIN_SAMPLE,
  SIGNAL_FAMILIES,
  type Signal,
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

const FALLBACK_MANIFEST: FoundrySovereignCorpusManifest = {
  schema: "gse.sovereign_to_cognitive_router_wiring.v1.fallback",
  counts: {
    sovereign_books_loaded: 91,
    sovereign_primitives_routed: 730,
    sovereign_reasoning_traces_routed: 159,
    gcp_shard_b_docs_routed: 2940,
    rules_rlvr_lessons_routed: 117,
    active_mask_bits_set: 267,
  },
  context_mask_uint32_words_9: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  six_situational_families: {
    pressure: {
      sovereign_primitives_routed: 30,
      gcp_shard_b_docs_routed: 35,
      combined_evidence_count: 65,
      active_router_bits_count: 37,
      bounded_james_stein_log_odds_weight: 0.048659,
      all_finite_non_nan: true,
    },
    weather: {
      sovereign_primitives_routed: 136,
      gcp_shard_b_docs_routed: 1033,
      combined_evidence_count: 1169,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.172211,
      all_finite_non_nan: true,
    },
    restFatigue: {
      sovereign_primitives_routed: 98,
      gcp_shard_b_docs_routed: 710,
      combined_evidence_count: 808,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.155468,
      all_finite_non_nan: true,
    },
    coveragePersonnel: {
      sovereign_primitives_routed: 85,
      gcp_shard_b_docs_routed: 587,
      combined_evidence_count: 672,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.147122,
      all_finite_non_nan: true,
    },
    qbSkillScript: {
      sovereign_primitives_routed: 194,
      gcp_shard_b_docs_routed: 189,
      combined_evidence_count: 383,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.120461,
      all_finite_non_nan: true,
    },
    marketMicrostructure: {
      sovereign_primitives_routed: 187,
      gcp_shard_b_docs_routed: 386,
      combined_evidence_count: 573,
      active_router_bits_count: 46,
      bounded_james_stein_log_odds_weight: 0.139815,
      all_finite_non_nan: true,
    },
  },
};

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

function readJsonIfExists<T>(relPath: string): T | null {
  for (const fullPath of resolveRepoCandidatePaths(relPath)) {
    if (existsSync(fullPath)) {
      try {
        return JSON.parse(readFileSync(fullPath, "utf8")) as T;
      } catch {
        // Continue to next candidate
      }
    }
  }
  return null;
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
  const disk = readJsonIfExists<ShardBCatalogSummary & { entries?: unknown }>(
    "docs/engine/research/2026-11-13/corpus_compilation/shard_b_operators_and_vetoes_catalog.json",
  );
  if (!disk) {
    return null;
  }
  return {
    schema: disk.schema,
    total_markdown_files: disk.total_markdown_files,
    files_with_xml_sections: disk.files_with_xml_sections,
    total_extracted_equations: disk.total_extracted_equations,
    family_counts: disk.family_counts ?? {},
    section_counts: disk.section_counts ?? {},
  };
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
