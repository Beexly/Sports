/**
 * Durable calibration metrics + eligibility streak + publish receipt.
 * JarvisMemoryEvent-backed (multi-isolate). Never invents metrics.
 */

import { db, isStubMode } from "@sports/db";
import {
  evaluateCalibrationEligibility,
  type CalibrationEligibilityReport,
  type EligibilityStatus,
  type LiveCalibrationMetrics,
  type MurphyTerms,
} from "@/lib/ops/calibration-eligibility";
import {
  resolveCalibrationPublishPolicy,
  type PublishPolicyResult,
} from "@/lib/ops/calibration-publish-policy";
import {
  buildDurableMetricsFromSamples,
  CANONICAL_LEARNING_PICK_WHERE,
  picksToCalibrationSamples,
} from "@/lib/ops/compute-live-calibration-metrics";
import type { CalibrationExclusionCounts } from "@/lib/calibration/proven-path-rows";
import type { MarketAnchoredPBasis } from "@/lib/calibration/live-calibration-p";
import type { CalibrationSliceMetrics } from "@/lib/calibration/metric-slices";
import type { MetricCi95 } from "@/lib/calibration/bootstrap-metric-ci";
import {
  loadPublishTimeMarketPResolver,
  oddsTableStatsNote,
  type MarketPSources,
  type OddsTableMarketPStats,
} from "@/lib/calibration/publish-time-market-p-loader";

export const CAL_METRICS_SCOPE = "ops.calibration.metrics";
export const CAL_ELIGIBILITY_SCOPE = "ops.calibration.eligibility";
export const CAL_PUBLISH_SCOPE = "ops.calibration.publish-receipt";
/**
 * Post-publish drift marker (2026-09-05). Written when the eligibility streak
 * falls (GREEN to RED, or a building streak resetting) while a publish receipt
 * says the calibration claim is live; a later GREEN writes a cleared marker.
 * Same append-only JarvisMemoryEvent pattern as the streak: latest row wins.
 */
export const CAL_DRIFT_SCOPE = "ops.calibration.drift";

export interface DurableMetricsPayload {
  readonly generatedAt: string;
  readonly gitSha: string | null;
  readonly n: number;
  readonly status: "ok" | "collecting";
  readonly modelVersion: string | null;
  readonly dateRange: string | null;
  readonly overall: {
    readonly brier: number;
    readonly ece: number;
    readonly mce: number;
    readonly murphy: MurphyTerms;
  } | null;
  /**
   * v5.2.8 Phase 2 fields (2026-09-05). Optional because artifacts persisted
   * before this date carry none of them; readers treat absence as "not measured".
   */
  /**
   * Which sample definition the floors were scored on. Absent on pre-Phase-2
   * artifacts; "market_anchored" on artifacts persisted 2026-09-05/06 (v1);
   * MARKET_ANCHORED_P_BASIS ("market_anchored_v2", C-110 single-book samples
   * included) on everything written since.
   */
  readonly pBasis?: MarketAnchoredPBasis | "market_anchored";
  /** Settled WIN/LOSS picks left out of the sample, by reason. */
  readonly exclusions?: CalibrationExclusionCounts;
  /** WP-28: how many scored probabilities came from receipts versus the odds table. */
  readonly pSources?: MarketPSources;
  /** WP-28: odds-table recompute coverage (candidates, one query, resolved, unresolved by reason). */
  readonly marketPFromOddsTable?: OddsTableMarketPStats;
  readonly bySport?: readonly CalibrationSliceMetrics[];
  readonly byModelVersion?: readonly CalibrationSliceMetrics[];
  /** Per pick type; the pooled sample holds every market with a market-anchored p. */
  readonly byMarket?: readonly CalibrationSliceMetrics[];
  /** Seeded percentile bootstrap (bootstrap-metric-ci.ts); null below two samples. */
  readonly brierCi95?: MetricCi95 | null;
  readonly eceCi95?: MetricCi95 | null;
  readonly notes?: readonly string[];
}

/**
 * Sample definition a metrics artifact (and the streak counted on it) belongs
 * to. "legacy" is every artifact and snap persisted before v5.2.8 Phase 2
 * (scored on the confidence/blend hierarchy); "market_anchored" is Phase 2 as
 * first shipped (two-or-more-book recompute only); "market_anchored_v2" adds
 * the C-110 single-book samples. A streak counted under one tag never seeds
 * another (consecutiveGreenPriorForBasis), so the v1 to v2 move restarted the
 * streak from 0 with streakResetFromBasis "market_anchored" on the first v2 snap.
 */
export type CalibrationPBasis = MarketAnchoredPBasis | "market_anchored" | "legacy";

export function metricsPBasis(m: DurableMetricsPayload | null | undefined): CalibrationPBasis {
  return m?.pBasis ?? "legacy";
}

export function snapPBasis(snap: EligibilityDurableSnap | null | undefined): CalibrationPBasis {
  return snap?.pBasis ?? "legacy";
}

export interface EligibilityDurableSnap {
  readonly evaluatedAt: string;
  readonly metricsGeneratedAt: string | null;
  readonly report: CalibrationEligibilityReport;
  /**
   * Sample definition this evaluation (and its streak) was counted under.
   * Absent on snaps persisted before 2026-09-05; read as "legacy".
   */
  readonly pBasis?: CalibrationPBasis;
  /**
   * Set when the prior snap was counted under a different basis and the
   * streak therefore restarted from 0 on this evaluation; null otherwise.
   */
  readonly streakResetFromBasis?: CalibrationPBasis | null;
}

/**
 * The streak a new evaluation may build on. A GREEN run counted under one
 * sample definition never seeds the streak of another: when the prior snap's
 * basis differs from the current artifact's, the prior is 0 and the reset is
 * recorded on the new snap. Floors and the streak length are untouched.
 */
export function consecutiveGreenPriorForBasis(
  priorSnap: EligibilityDurableSnap | null,
  currentBasis: CalibrationPBasis,
): { readonly consecutiveGreenPrior: number; readonly streakResetFromBasis: CalibrationPBasis | null } {
  if (!priorSnap) return { consecutiveGreenPrior: 0, streakResetFromBasis: null };
  const priorBasis = snapPBasis(priorSnap);
  if (priorBasis !== currentBasis) {
    return { consecutiveGreenPrior: 0, streakResetFromBasis: priorBasis };
  }
  return {
    consecutiveGreenPrior: priorSnap.report.runMeetsFloors === true ? priorSnap.report.consecutiveGreen : 0,
    streakResetFromBasis: null,
  };
}

export interface PublishReceipt {
  readonly published: boolean;
  readonly at: string;
  readonly source: string;
  readonly note: string;
}

/**
 * Durable post-publish drift marker. `active: true` while the calibration claim
 * that was published has fallen below the floors; a GREEN evaluation appends an
 * `active: false` row (the clear). `since` is pinned at the first observation
 * and is not re-minted while the drift stays open.
 */
export interface CalibrationDriftMarker {
  readonly active: boolean;
  /** First observation of this drift episode (ISO). */
  readonly since: string;
  /** When this row was written (ISO). */
  readonly observedAt: string;
  readonly previousStatus: EligibilityStatus;
  readonly currentStatus: EligibilityStatus;
  /** Prior streak length before this evaluation and the streak after it. */
  readonly previousConsecutiveGreen: number;
  readonly currentConsecutiveGreen: number;
  /** Floor comparisons that failed on the drifting run (from the report's own floors). */
  readonly failingFloors: readonly string[];
  /** Every eligibility reason on the drifting run (floors, settlement, sample). */
  readonly reasons: readonly string[];
  /** The publish receipt in effect when the drift was observed. */
  readonly publishedAt: string | null;
  readonly publishedSource: string | null;
  /** Metrics artifact that produced the drifting evaluation. */
  readonly metricsGeneratedAt: string | null;
  readonly clearedAt: string | null;
  readonly note: string;
}

/** Public-surface view of an open drift; null when no drift is open. */
export interface CalibrationDriftPosture {
  readonly since: string;
  readonly previousStatus: EligibilityStatus;
  readonly currentStatus: EligibilityStatus;
  readonly failingFloors: readonly string[];
  readonly reasons: readonly string[];
  readonly publishedAt: string | null;
  readonly observedAt: string;
  readonly operatorHint: string;
}

/**
 * Floor comparisons that fail on a report, read against the report's own
 * floors (never a threshold defined here). Mirrors the evaluator's checks so a
 * drift marker names the exact floor that gave way.
 */
export function failingFloorsFromReport(report: CalibrationEligibilityReport): readonly string[] {
  const out: string[] = [];
  const f = report.floors;
  if (report.n < f.n) out.push(`n ${report.n} < ${f.n}`);
  if (report.brier == null || !Number.isFinite(report.brier)) out.push("brier missing");
  else if (report.brier > f.brier) out.push(`brier ${report.brier.toFixed(4)} > ${f.brier}`);
  if (report.ece == null || !Number.isFinite(report.ece)) out.push("ece missing");
  else if (report.ece > f.ece) out.push(`ece ${report.ece.toFixed(4)} > ${f.ece}`);
  const rel = report.murphy?.reliability;
  if (rel == null || !Number.isFinite(rel)) out.push("murphy reliability missing");
  else if (rel > f.murphyReliability) {
    out.push(`murphy reliability ${rel.toFixed(4)} > ${f.murphyReliability}`);
  }
  return out;
}

/**
 * Pure transition rule. Drift is raised only when a publish receipt says the
 * claim is live AND the streak fell: GREEN to RED, or a building streak
 * (consecutiveGreen > 0) resetting to 0. It is cleared by a GREEN evaluation.
 * Anything else leaves the marker untouched (an open drift stays open through
 * repeated RED runs; RED before any publish never raises one).
 */
export function detectCalibrationDriftTransition(input: {
  readonly prior: CalibrationEligibilityReport | null;
  readonly current: CalibrationEligibilityReport;
  readonly receipt: PublishReceipt | null;
  readonly openDrift: CalibrationDriftMarker | null;
  readonly metricsGeneratedAt: string | null;
  readonly now: Date;
}): CalibrationDriftMarker | null {
  const { prior, current, receipt, openDrift } = input;
  const nowIso = input.now.toISOString();

  if (current.status === "GREEN") {
    if (!openDrift) return null;
    return {
      ...openDrift,
      active: false,
      observedAt: nowIso,
      currentStatus: "GREEN",
      currentConsecutiveGreen: current.consecutiveGreen,
      metricsGeneratedAt: input.metricsGeneratedAt,
      clearedAt: nowIso,
      note: `Drift cleared: eligibility GREEN again (streak ${current.consecutiveGreen}/${current.streakRequired}).`,
    };
  }

  if (openDrift) return null;
  if (!prior || receipt?.published !== true) return null;

  const greenToRed = prior.status === "GREEN" && current.status === "RED";
  const streakReset = prior.consecutiveGreen > 0 && current.consecutiveGreen === 0;
  if (!greenToRed && !streakReset) return null;

  const failingFloors = failingFloorsFromReport(current);
  return {
    active: true,
    since: nowIso,
    observedAt: nowIso,
    previousStatus: prior.status,
    currentStatus: current.status,
    previousConsecutiveGreen: prior.consecutiveGreen,
    currentConsecutiveGreen: current.consecutiveGreen,
    failingFloors,
    reasons: current.reasons,
    publishedAt: receipt.at,
    publishedSource: receipt.source,
    metricsGeneratedAt: input.metricsGeneratedAt,
    clearedAt: null,
    note: greenToRed
      ? `Post-publish drift: eligibility GREEN to RED (${failingFloors.join("; ") || current.reasons.slice(0, 3).join("; ")}).`
      : `Post-publish drift: streak ${prior.consecutiveGreen} reset to 0 (${failingFloors.join("; ") || current.reasons.slice(0, 3).join("; ")}).`,
  };
}

/** Public-surface projection: the open marker's fields, or null when none is open. */
export function calibrationDriftPosture(
  marker: CalibrationDriftMarker | null,
): CalibrationDriftPosture | null {
  if (!marker || !marker.active) return null;
  return {
    since: marker.since,
    previousStatus: marker.previousStatus,
    currentStatus: marker.currentStatus,
    failingFloors: marker.failingFloors,
    reasons: marker.reasons,
    publishedAt: marker.publishedAt,
    observedAt: marker.observedAt,
    operatorHint: `Calibration drifted after publish (since ${marker.since}): ${
      marker.failingFloors.join("; ") || marker.reasons.slice(0, 3).join("; ")
    }. Performance claims must stay dark until eligibility is GREEN again.`,
  };
}

export function metricsToLive(m: DurableMetricsPayload | null): LiveCalibrationMetrics | null {
  if (!m) return null;
  if (m.status !== "ok" || !m.overall) {
    return {
      n: m.n,
      brier: null,
      ece: null,
      mce: null,
      murphy: null,
      modelVersion: m.modelVersion,
      dateRange: m.dateRange,
      generatedAt: m.generatedAt,
    };
  }
  return {
    n: m.n,
    brier: m.overall.brier,
    ece: m.overall.ece,
    mce: m.overall.mce,
    murphy: m.overall.murphy,
    modelVersion: m.modelVersion,
    dateRange: m.dateRange,
    generatedAt: m.generatedAt,
  };
}

export async function persistCalibrationMetrics(
  payload: DurableMetricsPayload,
): Promise<"ok" | "stub" | "error"> {
  if (isStubMode()) return "stub";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: CAL_METRICS_SCOPE,
        title: `Calibration metrics n=${payload.n} ${payload.status}`,
        summary: payload.overall
          ? `brier=${payload.overall.brier} ece=${payload.overall.ece} mce=${payload.overall.mce}`
          : "collecting",
        full_text: JSON.stringify(payload),
        source_type: "cron.calibration-metrics",
        source_timestamp: new Date(payload.generatedAt),
        actor: "system",
        owner: "system",
        confidence: 90,
        tags: ["calibration", "metrics", "internal"],
        metadata: payload as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

function parseJsonField(row: {
  full_text: string | null;
  metadata: unknown;
}): unknown {
  if (typeof row.metadata === "object" && row.metadata !== null) return row.metadata;
  if (row.full_text) {
    try {
      return JSON.parse(row.full_text);
    } catch {
      return null;
    }
  }
  return null;
}

export async function loadLatestCalibrationMetrics(): Promise<DurableMetricsPayload | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: CAL_METRICS_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
    });
    if (!row) return null;
    const raw = parseJsonField(row);
    if (!raw || typeof raw !== "object") return null;
    return raw as DurableMetricsPayload;
  } catch {
    return null;
  }
}

export async function loadLatestEligibilitySnap(): Promise<EligibilityDurableSnap | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: CAL_ELIGIBILITY_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
    });
    if (!row) return null;
    const raw = parseJsonField(row);
    if (!raw || typeof raw !== "object") return null;
    return raw as EligibilityDurableSnap;
  } catch {
    return null;
  }
}

export async function persistEligibilitySnap(
  snap: EligibilityDurableSnap,
): Promise<"ok" | "stub" | "error"> {
  if (isStubMode()) return "stub";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: CAL_ELIGIBILITY_SCOPE,
        title: `Eligibility ${snap.report.status} streak=${snap.report.consecutiveGreen}`,
        summary: snap.report.operatorHint,
        full_text: JSON.stringify(snap),
        source_type: "cron.calibration-metrics",
        source_timestamp: new Date(snap.evaluatedAt),
        actor: "system",
        owner: "system",
        confidence: 90,
        tags: ["calibration", "eligibility"],
        metadata: snap as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

export async function loadPublishReceipt(): Promise<PublishReceipt | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: CAL_PUBLISH_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
    });
    if (!row) return null;
    const raw = parseJsonField(row);
    if (!raw || typeof raw !== "object") return null;
    return raw as PublishReceipt;
  } catch {
    return null;
  }
}

export async function persistPublishReceipt(
  receipt: PublishReceipt,
): Promise<"ok" | "stub" | "error"> {
  if (isStubMode()) return "stub";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: CAL_PUBLISH_SCOPE,
        title: `Calibration publish=${receipt.published} (${receipt.source})`,
        summary: receipt.note,
        full_text: JSON.stringify(receipt),
        source_type: "ops.calibration-publish",
        source_timestamp: new Date(receipt.at),
        actor: "system",
        owner: "system",
        confidence: 95,
        tags: ["calibration", "publish"],
        metadata: receipt as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

/** Latest drift row (open or cleared); null when none was ever written. */
export async function loadCalibrationDrift(): Promise<CalibrationDriftMarker | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: CAL_DRIFT_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
    });
    if (!row) return null;
    const raw = parseJsonField(row);
    if (!raw || typeof raw !== "object") return null;
    return raw as CalibrationDriftMarker;
  } catch {
    return null;
  }
}

/** The open drift marker, or null when the latest row is a clear (or none exists). */
export async function loadActiveCalibrationDrift(): Promise<CalibrationDriftMarker | null> {
  const latest = await loadCalibrationDrift();
  return latest?.active === true ? latest : null;
}

export async function persistCalibrationDrift(
  marker: CalibrationDriftMarker,
): Promise<"ok" | "stub" | "error"> {
  if (isStubMode()) return "stub";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: CAL_DRIFT_SCOPE,
        title: marker.active
          ? `Calibration drift ${marker.previousStatus} to ${marker.currentStatus}`
          : "Calibration drift cleared",
        summary: marker.note,
        full_text: JSON.stringify(marker),
        source_type: "cron.calibration-metrics",
        source_timestamp: new Date(marker.observedAt),
        actor: "system",
        owner: "system",
        confidence: 90,
        tags: ["calibration", "drift", marker.active ? "open" : "cleared"],
        metadata: marker as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

/**
 * Shared by the cron and the read path (both persist a new eligibility snap):
 * apply the transition rule against the receipt in effect BEFORE this run's
 * publish policy ran, persist a marker when the rule says so, and return the
 * marker now open (or null).
 */
async function observeCalibrationDrift(input: {
  readonly prior: CalibrationEligibilityReport | null;
  readonly current: CalibrationEligibilityReport;
  readonly receipt: PublishReceipt | null;
  readonly metricsGeneratedAt: string | null;
}): Promise<CalibrationDriftMarker | null> {
  const openDrift = await loadActiveCalibrationDrift();
  const next = detectCalibrationDriftTransition({
    prior: input.prior,
    current: input.current,
    receipt: input.receipt,
    openDrift,
    metricsGeneratedAt: input.metricsGeneratedAt,
    now: new Date(),
  });
  if (!next) return openDrift;
  await persistCalibrationDrift(next);
  return next.active ? next : null;
}

export function streakRequiredFromEnv(env: Record<string, string | undefined> = process.env): number {
  const raw = env["CALIBRATION_ELIGIBILITY_STREAK"]?.trim();
  const n = raw ? parseInt(raw, 10) : 3;
  return Number.isFinite(n) && n >= 1 ? n : 3;
}

/**
 * Cron path: evaluate new metrics artifact, advance streak once, persist, auto-publish.
 */
export async function evaluateAndPersistEligibility(input: {
  readonly metrics: DurableMetricsPayload | null;
  readonly canonicalSettled: number;
  readonly minSettledForLearning: number;
  readonly settlementHealthy: boolean;
}): Promise<{
  eligibility: CalibrationEligibilityReport;
  publish: PublishPolicyResult;
  receipt: PublishReceipt | null;
  /** Open post-publish drift marker, or null. */
  drift: CalibrationDriftMarker | null;
  skippedDuplicate: boolean;
}> {
  const priorSnap = await loadLatestEligibilitySnap();
  const metricsAt = input.metrics?.generatedAt ?? null;

  // Idempotent: same metrics artifact already evaluated → reuse
  if (
    priorSnap &&
    metricsAt &&
    priorSnap.metricsGeneratedAt === metricsAt
  ) {
    const receipt = await loadPublishReceipt();
    const publish = resolveCalibrationPublishPolicy({
      eligibilityStatus: priorSnap.report.status,
      consecutiveGreen: priorSnap.report.consecutiveGreen,
      streakRequired: priorSnap.report.streakRequired,
      durablePublished: receipt?.published ?? null,
    });
    return {
      eligibility: priorSnap.report,
      publish,
      receipt,
      drift: await loadActiveCalibrationDrift(),
      skippedDuplicate: true,
    };
  }

  // A streak is counted under one sample definition only: a prior snap scored
  // on the retired confidence/blend hierarchy never seeds a market-anchored streak.
  const pBasis = metricsPBasis(input.metrics);
  const { consecutiveGreenPrior, streakResetFromBasis } = consecutiveGreenPriorForBasis(
    priorSnap,
    pBasis,
  );

  const eligibility = evaluateCalibrationEligibility({
    metrics: metricsToLive(input.metrics),
    canonicalSettled: input.canonicalSettled,
    minSettledForLearning: input.minSettledForLearning,
    settlementHealthy: input.settlementHealthy,
    consecutiveGreenPrior,
    streakRequired: streakRequiredFromEnv(),
  });

  await persistEligibilitySnap({
    evaluatedAt: new Date().toISOString(),
    metricsGeneratedAt: metricsAt,
    report: eligibility,
    pBasis,
    streakResetFromBasis,
  });

  const receipt = await loadPublishReceipt();
  // Drift is judged against the receipt in effect BEFORE this run's publish
  // policy runs: an auto-unpublish written below must not hide the transition.
  const drift = await observeCalibrationDrift({
    prior: priorSnap?.report ?? null,
    current: eligibility,
    receipt,
    metricsGeneratedAt: metricsAt,
  });
  const publish = resolveCalibrationPublishPolicy({
    eligibilityStatus: eligibility.status,
    consecutiveGreen: eligibility.consecutiveGreen,
    streakRequired: eligibility.streakRequired,
    durablePublished: receipt?.published ?? null,
  });

  let latestReceipt = receipt;
  if (publish.shouldPersistPublished) {
    latestReceipt = {
      published: true,
      at: new Date().toISOString(),
      source: publish.source,
      note: "Auto-publish: eligibility GREEN for required streak",
    };
    await persistPublishReceipt(latestReceipt);
  } else if (publish.shouldPersistUnpublished) {
    latestReceipt = {
      published: false,
      at: new Date().toISOString(),
      source: "unpublish",
      note: "Auto-unpublish: eligibility RED or floors failed",
    };
    await persistPublishReceipt(latestReceipt);
  }

  return {
    eligibility,
    publish,
    receipt: latestReceipt,
    drift,
    skippedDuplicate: false,
  };
}

/**
 * Ops-truth path: read-only load; recompute only if no durable eligibility.
 */
async function seedMetricsIfMissing(): Promise<DurableMetricsPayload | null> {
  if (isStubMode()) return null;
  try {
    const picks = await db.pick.findMany({
      where: CANONICAL_LEARNING_PICK_WHERE,
      select: {
        id: true,
        gameId: true,
        generatedAt: true,
        selection: true,
        confidence: true,
        pickType: true,
        factorBreakdown: true,
        // Publish-time market fair backs up a factor breakdown that lost it (proven-path-rows.ts).
        proofReceipt: { select: { marketFairProb: true } },
        // Sport key: three-way moneyline exclusion + bySport slice. Team names:
        // the WP-28 odds-table resolver needs the pick's side.
        game: {
          select: {
            homeTeamName: true,
            awayTeamName: true,
            sport: { select: { key: true } },
          },
        },
        result: true,
        modelVersion: true,
        settledAt: true,
      },
      orderBy: { settledAt: "desc" },
      take: 2000,
    });
    const rows = picks.map((pick) => ({
      id: pick.id,
      gameId: pick.gameId,
      generatedAt: pick.generatedAt,
      selection: pick.selection,
      homeTeamName: pick.game?.homeTeamName ?? null,
      awayTeamName: pick.game?.awayTeamName ?? null,
      confidence: pick.confidence,
      result: pick.result ?? "",
      modelVersion: pick.modelVersion,
      settledAt: pick.settledAt,
      pickType: pick.pickType,
      factorBreakdown: pick.factorBreakdown,
      proofReceipt: pick.proofReceipt,
      sportKey: pick.game?.sport?.key ?? null,
    }));
    // WP-28: one read-only odds query for the receipt-less moneyline picks.
    const oddsTable = await loadPublishTimeMarketPResolver(db, rows);
    const built = picksToCalibrationSamples(rows, { resolveMarketP: oddsTable.resolveMarketP });
    const payload = buildDurableMetricsFromSamples({
      samples: built.samples,
      taggedSamples: built.taggedSamples,
      exclusions: built.exclusions,
      bySource: built.bySource,
      marketPFromOddsTable: oddsTable.stats,
      modelVersions: built.modelVersions,
      settledFrom: built.settledFrom,
      settledTo: built.settledTo,
      gitSha: process.env["VERCEL_GIT_COMMIT_SHA"] ?? process.env["GIT_SHA"] ?? null,
      notes: [
        "Seeded from ops-truth/read path when durable metrics missing.",
        oddsTableStatsNote(oddsTable.stats),
      ],
    });
    await persistCalibrationMetrics(payload);
    return payload;
  } catch {
    return null;
  }
}

export async function loadCalibrationOpsSurface(input: {
  readonly canonicalSettled: number;
  readonly minSettledForLearning: number;
  readonly settlementHealthy: boolean;
}): Promise<{
  metrics: DurableMetricsPayload | null;
  eligibility: CalibrationEligibilityReport;
  publish: PublishPolicyResult;
  receipt: PublishReceipt | null;
  /** Open post-publish drift marker, or null. */
  drift: CalibrationDriftMarker | null;
}> {
  let metrics = await loadLatestCalibrationMetrics();
  // Seed only when never written — do not re-mint generatedAt on every ops hit.
  if (!metrics) {
    const seeded = await seedMetricsIfMissing();
    if (seeded) metrics = seeded;
  }
  const priorSnap = await loadLatestEligibilitySnap();
  const receipt = await loadPublishReceipt();
  const metricsAt = metrics?.generatedAt ?? null;

  let eligibility: CalibrationEligibilityReport;
  // Same basis rule as the cron path: a prior snap under another sample
  // definition seeds nothing, and the reset is recorded on the snap below.
  const pBasis = metricsPBasis(metrics);
  const { consecutiveGreenPrior, streakResetFromBasis } = consecutiveGreenPriorForBasis(
    priorSnap,
    pBasis,
  );
  if (priorSnap && priorSnap.metricsGeneratedAt === metricsAt) {
    eligibility = priorSnap.report;
  } else {
    // Read-only preview of next streak state without persisting
    eligibility = evaluateCalibrationEligibility({
      metrics: metricsToLive(metrics),
      canonicalSettled: input.canonicalSettled,
      minSettledForLearning: input.minSettledForLearning,
      settlementHealthy: input.settlementHealthy,
      consecutiveGreenPrior,
      streakRequired: streakRequiredFromEnv(),
    });
  }

  const publish = resolveCalibrationPublishPolicy({
    eligibilityStatus: eligibility.status,
    consecutiveGreen: eligibility.consecutiveGreen,
    streakRequired: eligibility.streakRequired,
    durablePublished: receipt?.published ?? null,
  });

  // Persist first evaluation of a new metrics artifact so consecutiveGreen advances on later reads/crons.
  let drift: CalibrationDriftMarker | null;
  if (
    metrics &&
    (!priorSnap || priorSnap.metricsGeneratedAt !== metrics.generatedAt)
  ) {
    await persistEligibilitySnap({
      evaluatedAt: new Date().toISOString(),
      metricsGeneratedAt: metrics.generatedAt,
      report: eligibility,
      pBasis,
      streakResetFromBasis,
    });
    // This read advanced the streak, so it is also where a fall is first seen.
    drift = await observeCalibrationDrift({
      prior: priorSnap?.report ?? null,
      current: eligibility,
      receipt,
      metricsGeneratedAt: metrics.generatedAt,
    });
  } else {
    drift = await loadActiveCalibrationDrift();
  }

  return { metrics, eligibility, publish, receipt, drift };
}
