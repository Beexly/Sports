/**
 * Internal calibration metrics job — writes ops artifact + durable eligibility.
 *
 * LAWS:
 * - CRON_SECRET auth only
 * - Settled graded picks only (never invent)
 * - ZERO auto PERFORMANCE_STATS env flips
 * - CALIBRATION_ADJUSTMENTS_ENABLED stays off
 * - Publish only via CALIBRATION_AUTO_PUBLISH / CALIBRATION_PUBLISHED policy
 * - confidence/100 treated as provisional p for live eligibility (documented)
 * - proven-path bake-off uses trueProb only for independent kinds (never edge-as-p,
 *   never confidence-echo rankingP as independent)
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  brierDecomposition,
  expectedCalibrationError,
  reliabilityCurve,
  getReadinessGates,
  type CalibrationSample,
} from "@sports/prediction-engine";
import { captureError } from "@/lib/observability/sentry";
import { db, isStubMode } from "@sports/db";
import {
  evaluateAndPersistEligibility,
  persistCalibrationMetrics,
  type DurableMetricsPayload,
} from "@/lib/ops/calibration-eligibility-durable";
import { loadSettlementHealth, SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { loadPublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { runOfflineBakeoff } from "@/lib/calibration/offline-bakeoff";
import { computeResolutionByGroup } from "@/lib/calibration/resolution-by-group";
import { buildHoldoutRankingReport } from "@/lib/calibration/holdout-ranking-report";
import { runCalibrationMapBakeoff } from "@/lib/calibration/calibration-map-bakeoff";
import { buildProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { toProvenPathPickRow } from "@/lib/calibration/proven-path-rows";
import { picksToHonestCalibrationSamples } from "@/lib/calibration/live-calibration-p";
import { persistProvenPathPlan } from "@/lib/ops/proven-path-durable";
import { backfillIndependentTrueProb } from "@sports/ingestion-pipeline";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function mceFromCurve(
  curve: readonly { meanForecast: number; observedRate: number; count: number }[],
): number {
  let mce = 0;
  for (const b of curve) {
    if (b.count <= 0) continue;
    mce = Math.max(mce, Math.abs(b.meanForecast - b.observedRate));
  }
  return mce;
}

function meanLogLoss(samples: readonly CalibrationSample[]): number | null {
  if (samples.length === 0) return null;
  let s = 0;
  for (const { p, y } of samples) {
    const pp = Math.min(1 - 1e-15, Math.max(1e-15, p));
    s += y === 1 ? -Math.log(pp) : -Math.log(1 - pp);
  }
  return s / samples.length;
}

function bss(
  bsModel: number,
  baseline: "half" | "climatology",
  baseRate: number,
): number | null {
  const bsBase =
    baseline === "half" ? 0.25 : Math.max(1e-12, baseRate * (1 - baseRate));
  if (!Number.isFinite(bsModel) || bsBase <= 0) return null;
  return (bsBase - bsModel) / bsBase;
}

async function loadSettledCalibrationSamples(): Promise<{
  samples: CalibrationSample[];
  groupedRows: import("@/lib/calibration/resolution-by-group").GroupedCalibRow[];
  provenRows: import("@/lib/calibration/proven-path-engine").ProvenPathPickRow[];
  notes: string[];
  modelVersions: string[];
  settledFrom: string | null;
  settledTo: string | null;
}> {
  const notes: string[] = [];
  try {
    const picks = await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS"] },
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      select: {
        confidence: true,
        factorBreakdown: true,
        result: true,
        modelVersion: true,
        settledAt: true,
        pickType: true,
        game: { select: { sport: { select: { key: true, name: true } } } },
      },
      orderBy: { settledAt: "desc" },
      take: 2000,
    });

    const honest = picksToHonestCalibrationSamples(
      picks.map((pick) => ({
        confidence: pick.confidence,
        result: pick.result ?? "",
        pickType: pick.pickType,
        factorBreakdown: pick.factorBreakdown,
        modelVersion: pick.modelVersion,
        settledAt: pick.settledAt,
      })),
    );
    const samples: CalibrationSample[] = honest.samples.map((s) => ({
      p: s.p,
      y: s.y,
    }));
    const groupedRows: import("@/lib/calibration/resolution-by-group").GroupedCalibRow[] = [];
    const provenRows: import("@/lib/calibration/proven-path-engine").ProvenPathPickRow[] = [];
    let independentCount = 0;
    for (const pick of picks) {
      if (typeof pick.confidence !== "number" || !Number.isFinite(pick.confidence)) continue;
      const proven = toProvenPathPickRow({
        confidence: pick.confidence,
        result: pick.result ?? "",
        pickType: pick.pickType,
        factorBreakdown: pick.factorBreakdown,
        game: pick.game,
      });
      if (proven) {
        provenRows.push(proven);
        if (proven.pIndependent != null) independentCount += 1;
        // Group resolution uses honest p when available (market/indep), else conf
        const honestP =
          proven.marketP ??
          proven.pIndependent ??
          Math.min(1, Math.max(0, pick.confidence / 100));
        groupedRows.push({
          groupKey: proven.groupKey,
          p: honestP,
          y: proven.y,
          marketP: proven.marketP ?? null,
        });
      }
    }
    const versions = new Set(honest.modelVersions);
    const minT = honest.settledFrom ? Date.parse(honest.settledFrom) : null;
    const maxT = honest.settledTo ? Date.parse(honest.settledTo) : null;
    notes.push(...honest.notes);
    notes.push(
      `Proven-path rows: ${provenRows.length}; with independent trueProb: ${independentCount} (never edge-as-p; never conf-echo rankingP as independent).`,
    );
    if (samples.length === 0) {
      notes.push("No settled non-seed WIN/LOSS picks eligible for learning yet.");
    }
    return {
      samples,
      groupedRows,
      provenRows,
      notes,
      modelVersions: [...versions],
      settledFrom: minT == null ? null : new Date(minT).toISOString(),
      settledTo: maxT == null ? null : new Date(maxT).toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    notes.push(`Settled pick load unavailable: ${msg}`);
    return {
      samples: [],
      groupedRows: [],
      provenRows: [],
      notes,
      modelVersions: [],
      settledFrom: null,
      settledTo: null,
    };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    // Enrich settled sample with retrospective independent trueProb before metrics.
    // Bounded batch; never invents; never rewrites results/confidence.
    let backfillNote = "backfill: skipped";
    try {
      const bf = await backfillIndependentTrueProb({
        limit: 150,
        logPrefix: "[cron:calibration-metrics:backfill-indep]",
      });
      backfillNote =
        `backfill updated=${bf.updated} scanned=${bf.scanned} already=${bf.alreadyPriced} ` +
        `noOpinion=${bf.skippedNoOpinion}`;
    } catch (bfErr) {
      backfillNote = `backfill error: ${bfErr instanceof Error ? bfErr.message : String(bfErr)}`;
      console.warn(`[cron:calibration-metrics] ${backfillNote}`);
    }

    const { samples, groupedRows, provenRows, notes, modelVersions, settledFrom, settledTo } =
      await loadSettledCalibrationSamples();
    notes.push(backfillNote);
    const generatedAt = new Date().toISOString();
    const gitSha =
      process.env["VERCEL_GIT_COMMIT_SHA"] ?? process.env["GIT_SHA"] ?? null;
    const modelVersion =
      modelVersions.length === 1
        ? modelVersions[0]!
        : modelVersions.length > 1
          ? `mixed:${modelVersions.slice(0, 4).join(",")}`
          : null;
    const dateRange =
      settledFrom && settledTo ? `${settledFrom.slice(0, 10)}…${settledTo.slice(0, 10)}` : null;

    const dir = path.join(process.cwd(), ".gse-local", "calibration");
    await mkdir(dir, { recursive: true }).catch(() => undefined);

    let payload: DurableMetricsPayload;

    if (samples.length === 0) {
      payload = {
        generatedAt,
        gitSha,
        n: 0,
        status: "collecting",
        modelVersion,
        dateRange,
        overall: null,
        notes: [
          ...notes,
          "Gates unchanged: no PERFORMANCE_STATS / LIVE_BOARD / CALIBRATION_ADJUSTMENTS env auto-flip.",
        ],
      };
    } else {
      const decomp = brierDecomposition(samples);
      const ece = expectedCalibrationError(samples);
      const curve = reliabilityCurve(samples);
      const mce = mceFromCurve(curve);
      const logLoss = meanLogLoss(samples);

      const filePayload = {
        generatedAt,
        gitSha,
        n: samples.length,
        status: "ok" as const,
        modelVersion,
        dateRange,
        overall: {
          brier: decomp.brier,
          murphy: {
            reliability: decomp.reliability,
            resolution: decomp.resolution,
            uncertainty: decomp.uncertainty,
            baseRate: decomp.baseRate,
            identityNote:
              "Binned Murphy split: reliability low = good cal; resolution high = discrimination; uncertainty = base-rate difficulty.",
          },
          brierDecomp: decomp,
          logLoss,
          ece,
          mce,
          bssHalf: bss(decomp.brier, "half", decomp.baseRate),
          bssClim: bss(decomp.brier, "climatology", decomp.baseRate),
          bssClose: null as number | null,
          reliabilityBins: curve,
        },
        notes: [
          ...notes,
          "Internal only until eligibility GREEN + publish policy.",
          "bssClose null until closing implied probabilities are joined.",
        ],
        temperatureT: null,
      };

      await writeFile(
        path.join(dir, "metrics.json"),
        JSON.stringify(filePayload, null, 2),
        "utf8",
      ).catch(() => undefined);

      payload = {
        generatedAt,
        gitSha,
        n: samples.length,
        status: "ok",
        modelVersion,
        dateRange,
        overall: {
          brier: decomp.brier,
          ece,
          mce,
          murphy: {
            reliability: decomp.reliability,
            resolution: decomp.resolution,
            uncertainty: decomp.uncertainty,
          },
        },
        notes: filePayload.notes,
      };
    }

    if (payload.status === "collecting") {
      await writeFile(
        path.join(dir, "metrics.json"),
        JSON.stringify(payload, null, 2),
        "utf8",
      ).catch(() => undefined);
    }

    await persistCalibrationMetrics(payload);

    // Offline Bayesian bake-off artifact (internal only; never publish/adjustments).
    if (payload.status === "ok" && samples.length >= 50) {
      try {
        const chrono = [...samples].reverse(); // settledAt desc → oldest first
        const bake = runOfflineBakeoff(chrono, 0.7);
        await writeFile(
          path.join(dir, "bayes-bakeoff.json"),
          JSON.stringify(bake, null, 2),
          "utf8",
        ).catch(() => undefined);
      } catch {
        /* R&D best-effort */
      }
    }

    try {
      const resArt = computeResolutionByGroup(groupedRows);
      await writeFile(
        path.join(dir, "resolution-by-group.json"),
        JSON.stringify(resArt, null, 2),
        "utf8",
      ).catch(() => undefined);
      const holdout = buildHoldoutRankingReport(
        groupedRows.map((r) => ({
          p: r.p,
          y: r.y,
          groupKey: r.groupKey,
          marketP: r.marketP,
        })),
      );
      await writeFile(
        path.join(dir, "holdout-ranking-report.json"),
        JSON.stringify(holdout, null, 2),
        "utf8",
      ).catch(() => undefined);
      await writeFile(
        path.join(dir, "selective-publish-sweep.json"),
        JSON.stringify(holdout.selectiveSweep, null, 2),
        "utf8",
      ).catch(() => undefined);
      const mapBake = runCalibrationMapBakeoff(samples.slice().reverse());
      await writeFile(
        path.join(dir, "calibration-map-bakeoff.json"),
        JSON.stringify(mapBake, null, 2),
        "utf8",
      ).catch(() => undefined);
      try {
        const plan = buildProvenPathPlan(provenRows);
        await persistProvenPathPlan(plan);
        await writeFile(
          path.join(dir, "proven-path-plan.json"),
          JSON.stringify(plan, null, 2),
          "utf8",
        ).catch(() => undefined);
      } catch {
        /* proven path best-effort */
      }
    } catch {
      /* ranking diagnostic best-effort */
    }

    // Sample + settlement for eligibility (canonical only)
    const gates = getReadinessGates();
    let canonicalSettled = 0;
    let settlementHealthy = false;
    if (!isStubMode()) {
      try {
        const policy = await loadPublicPerformancePolicy(db, {
          canExposePerformanceStats: false,
          minSettledPicksForLearning: gates.minSettledPicksForLearning,
        });
        canonicalSettled = policy.canonicalSettledCount;
      } catch {
        canonicalSettled = 0;
      }
      try {
        const s = await loadSettlementHealth(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS });
        settlementHealthy = s.health === "HEALTHY";
      } catch {
        settlementHealthy = false;
      }
    }

    const { eligibility, publish, skippedDuplicate } = await evaluateAndPersistEligibility({
      metrics: payload,
      canonicalSettled,
      minSettledForLearning: gates.minSettledPicksForLearning,
      settlementHealthy,
    });

    return NextResponse.json({
      ok: true,
      status: payload.status,
      n: payload.n,
      ece: payload.overall?.ece ?? null,
      mce: payload.overall?.mce ?? null,
      brier: payload.overall?.brier ?? null,
      eligibility: {
        status: eligibility.status,
        consecutiveGreen: eligibility.consecutiveGreen,
        streakRequired: eligibility.streakRequired,
        reasons: eligibility.reasons,
      },
      publish: {
        published: publish.published,
        source: publish.source,
        canExposePerformanceStats: publish.canExposePerformanceStats,
        autoPublish: publish.autoPublish,
      },
      skippedDuplicate,
      artifact: "durable:ops.calibration.metrics",
      provenPathRows: provenRows.length,
    });
  } catch (err) {
    captureError(err, { route: "cron/calibration-metrics" });
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "calibration metrics failed",
      },
      { status: 500 },
    );
  }
}
