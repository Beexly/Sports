/**
 * Durable calibration metrics + eligibility streak + publish receipt.
 * JarvisMemoryEvent-backed (multi-isolate). Never invents metrics.
 */

import { db, isStubMode } from "@sports/db";
import {
  evaluateCalibrationEligibility,
  type CalibrationEligibilityReport,
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

export const CAL_METRICS_SCOPE = "ops.calibration.metrics";
export const CAL_ELIGIBILITY_SCOPE = "ops.calibration.eligibility";
export const CAL_PUBLISH_SCOPE = "ops.calibration.publish-receipt";

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
  readonly notes?: readonly string[];
}

export interface EligibilityDurableSnap {
  readonly evaluatedAt: string;
  readonly metricsGeneratedAt: string | null;
  readonly report: CalibrationEligibilityReport;
}

export interface PublishReceipt {
  readonly published: boolean;
  readonly at: string;
  readonly source: string;
  readonly note: string;
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
      skippedDuplicate: true,
    };
  }

  const consecutiveGreenPrior =
    priorSnap?.report.runMeetsFloors === true
      ? priorSnap.report.consecutiveGreen
      : 0;

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
  });

  const receipt = await loadPublishReceipt();
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
        confidence: true,
        result: true,
        modelVersion: true,
        settledAt: true,
      },
      orderBy: { settledAt: "desc" },
      take: 2000,
    });
    const built = picksToCalibrationSamples(picks);
    const payload = buildDurableMetricsFromSamples({
      samples: built.samples,
      modelVersions: built.modelVersions,
      settledFrom: built.settledFrom,
      settledTo: built.settledTo,
      gitSha: process.env["VERCEL_GIT_COMMIT_SHA"] ?? process.env["GIT_SHA"] ?? null,
      notes: ["Seeded from ops-truth/read path when durable metrics missing."],
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
  if (priorSnap && priorSnap.metricsGeneratedAt === metricsAt) {
    eligibility = priorSnap.report;
  } else {
    const consecutiveGreenPrior =
      priorSnap?.report.runMeetsFloors === true
        ? priorSnap.report.consecutiveGreen
        : 0;
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
  if (
    metrics &&
    (!priorSnap || priorSnap.metricsGeneratedAt !== metrics.generatedAt)
  ) {
    await persistEligibilitySnap({
      evaluatedAt: new Date().toISOString(),
      metricsGeneratedAt: metrics.generatedAt,
      report: eligibility,
    });
  }

  return { metrics, eligibility, publish, receipt };
}
