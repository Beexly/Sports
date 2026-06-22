/**
 * GSE Data Excellence System — typed contracts for "impeccable data".
 *
 * "Impeccable" does NOT mean perfect. Sports, fantasy, and market data is messy,
 * delayed, licensed, contradicted, stale, probabilistic, and uncertain.
 * Impeccable means: source-aware, timestamped, versioned, rights-aware,
 * confidence-scored, freshness-scored, contradiction-aware, model-aware,
 * replayable, auditable, explainable — and never overstated.
 *
 * This module is the data layer's source of truth for SHAPES and SCORES. It
 * aligns its rights posture to the existing scraping registry
 * (`apps/web/lib/scraping/source-rights-registry.ts`) by importing its
 * {@link SourceRightsStatus} type — there is exactly one rights vocabulary in
 * the codebase, and this is downstream of it, not a fork.
 *
 * Companion doc: docs/research/GSE_2026_DATA_EXCELLENCE_SYSTEM.md
 */

import type { SourceRightsStatus } from "@/lib/scraping/source-rights-registry";
import {
  type GseScore,
  makeScore,
  weightedAverage,
  clampScore,
} from "./gse-scoring-systems";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Data Source Registry record
// ─────────────────────────────────────────────────────────────────────────────

export type SourceDomain =
  | "odds"
  | "scores"
  | "schedule"
  | "injury"
  | "depth_chart"
  | "weather"
  | "play_by_play"
  | "advanced_stats"
  | "ownership"
  | "projection"
  | "news"
  | "beat_report"
  | "fantasy_platform"
  | "open_dataset"
  | "other";

export type FeedHealth = "healthy" | "degraded" | "stale" | "broken" | "unknown";

/**
 * A registry record describing a data source's identity, rights, freshness
 * expectation, reliability, and fallback. This is the metadata that lets every
 * downstream item be judged. Reliability/accuracy are 0..100; cost is a coarse
 * band so we never imply a precise figure we cannot back.
 */
export interface DataSourceRecord {
  readonly sourceId: string;
  readonly name: string;
  readonly domain: SourceDomain;
  readonly sourceType: string;
  /** Rights posture — same vocabulary as the scraping registry. */
  readonly rightsStatus: SourceRightsStatus;
  readonly allowedUsage: readonly string[];
  readonly prohibitedUsage: readonly string[];
  /** Expected max age before a record is considered stale, in minutes. */
  readonly freshnessExpectationMins: number;
  /** Typical update cadence, in minutes (informational). */
  readonly updateFrequencyMins: number;
  /** 0..100 — how reliable the source has been overall. */
  readonly reliabilityScore: number;
  /** 0..100 — measured historical accuracy where we can settle it. */
  readonly historicalAccuracy: number | null;
  readonly cost: "free" | "low" | "metered" | "licensed" | "unknown";
  /** 0..100 — how much a single-source failure would hurt (higher = more fragile). */
  readonly dependencyRisk: number;
  /** sourceId of a fallback, or null if there is no second source. */
  readonly fallbackSourceId: string | null;
  /** Whether facts derived from this source may appear on public surfaces. */
  readonly publicDisplayAllowed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Data Quality Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inputs to {@link scoreDataQuality}. All ratio fields are 0..1; reliability is
 * 0..100; counts are non-negative integers. `ageMins`/`freshnessExpectationMins`
 * derive the freshness ratio so the caller does not pre-compute it.
 */
export interface DataQualitySignals {
  /** Fraction of required fields present (0..1). */
  readonly completeness: number;
  /** Age of the item in minutes. */
  readonly ageMins: number;
  /** Max acceptable age in minutes (from the source record). */
  readonly freshnessExpectationMins: number;
  /** Internal consistency 0..1 (e.g. fields agree, no impossible values). */
  readonly consistency: number;
  /** Source reliability 0..100 (from the source record). */
  readonly sourceReliability: number;
  /** Independent confirmations of the same fact. */
  readonly confirmations: number;
  /** Active contradictions against this item. */
  readonly contradictions: number;
  /** Depth of the lineage chain captured (0 = unknown provenance). */
  readonly lineageDepth: number;
  /** Whether the intended use is within the source's rights. */
  readonly rightsSafe: boolean;
}

/**
 * Score a single data item's fitness to drive a decision (0..100, higher is
 * better). This measures FITNESS, never correctness — a perfect score on a fast,
 * complete, rights-clean item can still be factually wrong, which is why the
 * Evidence Engine layers contradiction and falsifiers on top.
 */
export function scoreDataQuality(s: DataQualitySignals): GseScore {
  const flags: string[] = [];

  const freshnessRatio =
    s.freshnessExpectationMins <= 0
      ? 0.5
      : Math.max(0, 1 - s.ageMins / s.freshnessExpectationMins);
  if (freshnessRatio < 0.34) flags.push("stale: past freshness expectation");

  if (s.completeness < 0.6) flags.push("incomplete: missing required fields");
  if (s.contradictions > 0) flags.push(`contradicted: ${s.contradictions} active contradiction(s)`);
  if (s.lineageDepth <= 0) flags.push("no lineage captured — provenance unknown");
  if (!s.rightsSafe) flags.push("rights risk: intended use may exceed source rights");

  // Confirmation lift saturates (diminishing returns past a few independent confirms).
  const confirmLift = Math.min(1, s.confirmations / 3);
  // Contradiction penalty grows but caps so one stale contradiction never zeroes a strong item.
  const contradictionPenalty = Math.min(0.6, s.contradictions * 0.2);

  const base = weightedAverage([
    { value: s.completeness * 100, weight: 1.5 },
    { value: freshnessRatio * 100, weight: 2.0 },
    { value: s.consistency * 100, weight: 1.5 },
    { value: clampScore(s.sourceReliability), weight: 2.0 },
    { value: confirmLift * 100, weight: 1.0 },
    { value: s.lineageDepth > 0 ? 100 : 30, weight: 0.5 },
  ]);

  let score = base * (1 - contradictionPenalty);
  if (!s.rightsSafe) score = Math.min(score, 49); // rights doubt caps fitness — never "fit" if we can't use it

  const confidence =
    s.lineageDepth > 0 && s.confirmations >= 1
      ? "well_supported"
      : s.lineageDepth > 0 || s.confirmations >= 1
        ? "supported"
        : "tentative";

  return makeScore("data_quality", score, {
    confidence,
    rationale: [
      `freshness ${(freshnessRatio * 100).toFixed(0)}% of window`,
      `completeness ${(s.completeness * 100).toFixed(0)}%`,
      `source reliability ${clampScore(s.sourceReliability)}`,
      `${s.confirmations} confirmation(s), ${s.contradictions} contradiction(s)`,
    ],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Source Integrity Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score how much a SOURCE (not an item) deserves trust over time. A trusted
 * brand can still be stale or wrong on a given item, so this never substitutes
 * for {@link scoreDataQuality} on the item itself.
 */
export function scoreSourceIntegrity(src: DataSourceRecord): GseScore {
  const flags: string[] = [];

  const rightsClean =
    src.rightsStatus.startsWith("approved_");
  if (!rightsClean) flags.push(`rights posture is ${src.rightsStatus} — not an approved status`);
  if (src.fallbackSourceId === null && src.dependencyRisk >= 60) {
    flags.push("single point of failure: high dependency risk with no fallback");
  }
  if (src.historicalAccuracy === null) flags.push("no settled accuracy history yet");

  const accuracyComponent = src.historicalAccuracy ?? Math.min(src.reliabilityScore, 60);
  const fallbackComponent = src.fallbackSourceId ? 100 : 40;
  const dependencyComponent = 100 - clampScore(src.dependencyRisk);

  const score = weightedAverage([
    { value: clampScore(src.reliabilityScore), weight: 2.0 },
    { value: clampScore(accuracyComponent), weight: 2.0 },
    { value: rightsClean ? 100 : 30, weight: 1.5 },
    { value: fallbackComponent, weight: 1.0 },
    { value: dependencyComponent, weight: 1.0 },
  ]);

  return makeScore("source_integrity", score, {
    confidence: src.historicalAccuracy === null ? "tentative" : "supported",
    rationale: [
      `reliability ${clampScore(src.reliabilityScore)}`,
      src.historicalAccuracy === null
        ? "accuracy history unestablished"
        : `historical accuracy ${src.historicalAccuracy}`,
      `dependency risk ${clampScore(src.dependencyRisk)}${src.fallbackSourceId ? " (fallback present)" : " (no fallback)"}`,
      `rights ${src.rightsStatus}`,
    ],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Calibration Health Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inputs to {@link scoreCalibrationHealth}. `calibrationError` is the mean gap
 * between stated confidence and realised frequency, 0..1 (lower is better).
 */
export interface CalibrationSignals {
  readonly settledSampleSize: number;
  /** 0..1 mean absolute calibration error (lower is better). */
  readonly calibrationError: number;
  /** 0..1 drift since the last calibration check (higher is worse). */
  readonly drift: number;
  /** Number of confidence bins that have enough samples to be meaningful. */
  readonly coveredBins: number;
}

/**
 * Score whether stated confidence matches realised outcomes. Honesty metric: a
 * small sample hard-caps the score so we never publish calibration we cannot
 * stand behind (mirrors the public-performance readiness gate).
 */
export function scoreCalibrationHealth(s: CalibrationSignals): GseScore {
  const flags: string[] = [];
  const MIN_PUBLISHABLE = 100;

  if (s.settledSampleSize < MIN_PUBLISHABLE) {
    flags.push(`sample ${s.settledSampleSize} < ${MIN_PUBLISHABLE} — not yet publishable`);
  }
  if (s.drift > 0.15) flags.push("calibration drifting since last check");
  if (s.coveredBins < 3) flags.push("too few covered confidence bins");

  const errorComponent = (1 - Math.min(1, s.calibrationError)) * 100;
  const driftComponent = (1 - Math.min(1, s.drift)) * 100;
  const sampleComponent = Math.min(100, (s.settledSampleSize / MIN_PUBLISHABLE) * 100);

  let score = weightedAverage([
    { value: errorComponent, weight: 2.5 },
    { value: driftComponent, weight: 1.5 },
    { value: sampleComponent, weight: 1.5 },
    { value: Math.min(100, s.coveredBins * 20), weight: 1.0 },
  ]);

  // Below the publishable floor, cap at "moderate" — the data exists internally
  // but is not strong enough to be a public claim.
  if (s.settledSampleSize < MIN_PUBLISHABLE) score = Math.min(score, 59);

  return makeScore("calibration_health", score, {
    confidence: s.settledSampleSize >= MIN_PUBLISHABLE ? "well_supported" : "tentative",
    rationale: [
      `sample ${s.settledSampleSize}`,
      `calibration error ${(s.calibrationError * 100).toFixed(0)}%`,
      `drift ${(s.drift * 100).toFixed(0)}%`,
      `${s.coveredBins} covered bins`,
    ],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Data Lineage
// ─────────────────────────────────────────────────────────────────────────────

export type LineageStage =
  | "raw_source"
  | "normalized_entity"
  | "feature"
  | "model_input"
  | "model_output"
  | "recommendation"
  | "user_decision"
  | "outcome"
  | "autopsy";

/** One hop in the provenance chain from raw source to autopsy. */
export interface DataLineageStep {
  readonly stage: LineageStage;
  readonly ref: string;
  readonly at: string; // ISO timestamp
  readonly sourceId?: string;
  readonly note?: string;
}

/** The canonical lineage order — used to validate a chain is well-formed. */
export const LINEAGE_ORDER: readonly LineageStage[] = [
  "raw_source",
  "normalized_entity",
  "feature",
  "model_input",
  "model_output",
  "recommendation",
  "user_decision",
  "outcome",
  "autopsy",
];

/**
 * Returns true when the steps are in non-decreasing lineage order (gaps allowed,
 * reversals not). A reversed chain means provenance was reconstructed wrong.
 */
export function isWellOrderedLineage(steps: readonly DataLineageStep[]): boolean {
  let lastIdx = -1;
  for (const step of steps) {
    const idx = LINEAGE_ORDER.indexOf(step.stage);
    if (idx < lastIdx) return false;
    lastIdx = idx;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Data Health Cockpit summary
// ─────────────────────────────────────────────────────────────────────────────

export interface DataHealthInput {
  readonly sources: readonly DataSourceRecord[];
  readonly feedHealth: Readonly<Record<string, FeedHealth>>;
  readonly openContradictions: number;
  readonly highRiskClaims: number;
  readonly unresolvedRightsDisputes: number;
}

export interface DataHealthSummary {
  readonly totalSources: number;
  readonly staleOrBroken: number;
  readonly singlePointsOfFailure: number;
  readonly nonApprovedRights: number;
  readonly openContradictions: number;
  readonly highRiskClaims: number;
  readonly unresolvedRightsDisputes: number;
  /** Overall data-health score (0..100, higher is better). */
  readonly health: GseScore;
}

/**
 * Summarise the data estate for the Data Health cockpit: count stale/broken
 * feeds, single points of failure, non-approved rights, and roll them into one
 * health score. Pure over its input — no DB, no I/O.
 */
export function summarizeDataHealth(input: DataHealthInput): DataHealthSummary {
  const total = input.sources.length;

  let staleOrBroken = 0;
  for (const s of input.sources) {
    const h = input.feedHealth[s.sourceId] ?? "unknown";
    if (h === "stale" || h === "broken") staleOrBroken += 1;
  }

  let spof = 0;
  for (const s of input.sources) {
    if (s.fallbackSourceId === null && s.dependencyRisk >= 60) spof += 1;
  }

  let nonApproved = 0;
  for (const s of input.sources) {
    if (!s.rightsStatus.startsWith("approved_")) nonApproved += 1;
  }

  const flags: string[] = [];
  if (staleOrBroken > 0) flags.push(`${staleOrBroken} stale/broken feed(s)`);
  if (spof > 0) flags.push(`${spof} single point(s) of failure`);
  if (nonApproved > 0) flags.push(`${nonApproved} source(s) without approved rights`);
  if (input.openContradictions > 0) flags.push(`${input.openContradictions} open contradiction(s)`);
  if (input.unresolvedRightsDisputes > 0) flags.push(`${input.unresolvedRightsDisputes} unresolved rights dispute(s)`);

  const freshComponent = total === 0 ? 0 : (1 - staleOrBroken / total) * 100;
  const spofComponent = total === 0 ? 0 : (1 - spof / total) * 100;
  const rightsComponent = total === 0 ? 0 : (1 - nonApproved / total) * 100;
  const contradictionComponent = Math.max(0, 100 - input.openContradictions * 10);
  const disputeComponent = Math.max(0, 100 - input.unresolvedRightsDisputes * 20);

  const health = makeScore(
    "data_quality",
    weightedAverage([
      { value: freshComponent, weight: 2.0 },
      { value: spofComponent, weight: 1.5 },
      { value: rightsComponent, weight: 2.0 },
      { value: contradictionComponent, weight: 1.5 },
      { value: disputeComponent, weight: 1.0 },
    ]),
    {
      confidence: total === 0 ? "speculative" : "supported",
      rationale: [
        `${total} sources`,
        `${staleOrBroken} stale/broken`,
        `${nonApproved} non-approved rights`,
        `${input.openContradictions} open contradictions`,
      ],
      flags,
    },
  );

  return {
    totalSources: total,
    staleOrBroken,
    singlePointsOfFailure: spof,
    nonApprovedRights: nonApproved,
    openContradictions: input.openContradictions,
    highRiskClaims: input.highRiskClaims,
    unresolvedRightsDisputes: input.unresolvedRightsDisputes,
    health,
  };
}
