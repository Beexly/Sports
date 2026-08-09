/**
 * Internal calibration metrics job — writes ops artifact + durable eligibility.
 *
 * LAWS:
 * - CRON_SECRET auth only
 * - Settled graded picks only (never invent)
 * - ZERO auto PERFORMANCE_STATS env flips
 * - CALIBRATION_ADJUSTMENTS_ENABLED stays off
 * - Publish only via CALIBRATION_AUTO_PUBLISH / CALIBRATION_PUBLISHED policy
 * - confidence/100 treated as provisional p (documented)
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
import {
  buildDurableMetricsFromSamples,
  picksToCalibrationSamples,
} from "@/lib/ops/compute-live-calibration-metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function mceFromCurve(
  bins: Array<{ count: number; meanForecast: number; observedRate: number }>,
): number {
  let mce = 0;
  for (const b of bins) {
    if (b.count === 0) continue;
    mce = Math.max(mce, Math.abs(b.meanForecast - b.observedRate));
  }
  return mce;
}

function meanLogLoss(samples: readonly CalibrationSample[]): number {
  const eps = 1e-15;
  if (samples.length === 0) return NaN;
  let sum = 0;
  for (const s of samples) {
    const p = Math.min(1 - eps, Math.max(eps, s.p));
    sum += s.y === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return sum / samples.length;
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
      select: { confidence: true, result: true, modelVersion: true, settledAt: true },
      orderBy: { settledAt: "desc" },
      take: 2000,
    });

    const samples: CalibrationSample[] = [];
    const versions = new Set<string>();
    let minT: number | null = null;
    let maxT: number | null = null;
    for (const pick of picks) {
      if (typeof pick.confidence !== "number" || !Number.isFinite(pick.confidence)) continue;
      const p = Math.min(1, Math.max(0, pick.confidence / 100));
      samples.push({ p, y: pick.result === "WIN" ? 1 : 0 });
      if (pick.modelVersion) versions.add(pick.modelVersion);
      if (pick.settledAt) {
        const t = pick.settledAt.getTime();
        minT = minT == null ? t : Math.min(minT, t);
        maxT = maxT == null ? t : Math.max(maxT, t);
      }
    }

    notes.push(
      "p derived from confidence/100 (provisional). Spread/total may not be fair probabilities — internal only.",
    );
    if (samples.length === 0) {
      notes.push("No settled non-seed WIN/LOSS picks eligible for learning yet.");
    }
    return {
      samples,
      notes,
      modelVersions: [...versions],
      settledFrom: minT == null ? null : new Date(minT).toISOString(),
      settledTo: maxT == null ? null : new Date(maxT).toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    notes.push(`Settled pick load unavailable: ${msg}`);
    return { samples: [], notes, modelVersions: [], settledFrom: null, settledTo: null };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const { samples, notes, modelVersions, settledFrom, settledTo } =
      await loadSettledCalibrationSamples();
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
