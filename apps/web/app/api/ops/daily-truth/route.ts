/**
 * Daily-truth ops surface — ONE JSON report per 24h window assembled from
 * loaders that ALREADY exist. No invented fields; every number carries its
 * denominator and an honest `null` + reason when unmeasurable.
 *
 * Gating: Bearer CRON_SECRET via the SAME timing-safe pattern used by
 * apps/web/app/api/ops/public-surface-truth/route.ts (hasOpsAuth).
 *
 * NOT wired into vercel.json crons here — the owner wires the cron schedule
 * when prod is back (prepare-not-flip).
 *
 * This route is READ-ONLY — it never writes to any table.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db, isStubMode } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  loadSettlementHealth,
  SETTLEMENT_DEFAULT_GRACE_HOURS,
} from "@/lib/performance/settlement-health";
import { loadClvCoverage } from "@/lib/performance/clv-coverage";
import { type LoadablePerformanceClient } from "@/lib/performance/public-performance-policy";
import { loadCalibrationOpsSurface } from "@/lib/ops/calibration-eligibility-durable";
import { assessSchedulerLiveness } from "@/lib/ops/scheduler-liveness";
import { loadCanonicalSamplePosture } from "@/lib/ops/canonical-sample-posture";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Timing-safe Bearer CRON_SECRET check — mirrors hasOpsAuth in
 * public-surface-truth/route.ts exactly. Returns true only when the header
 * is `Authorization: Bearer <CRON_SECRET>` and the two are equal-length.
 */
function hasOpsAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  try {
    const a = Buffer.from(auth);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Canonical, non-seed pick filter shared by the last-24h and lifetime counts. */
const CANONICAL_NON_SEED = {
  isPublished: true,
  isBootstrap: false,
  NOT: { modelVersion: { contains: "seed" } },
} as const;

// Settled result enum values from the PickResult Prisma enum.
// Mutable array (not `as const`) so it satisfies Prisma's PickResult[] type.
const SETTLED_RESULTS: ("WIN" | "LOSS" | "PUSH")[] = ["WIN", "LOSS", "PUSH"];

/**
 * Assemble one daily-truth report for the last 24h from loaders that already
 * exist. Every field that cannot be measured returns `null` with a `reason`
 * string — nothing is ever fabricated or zero-filled.
 */
export async function GET(request: Request) {
  if (!hasOpsAuth(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const isoYesterday = yesterday.toISOString();

  const gates = getReadinessGates();
  const deploymentSha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    null;

  const stubbed = isStubMode();
  const dbClient = db as unknown as LoadablePerformanceClient;

  // ── Settlement health (lifetime leading indicator) ───────────────────
  let settlement: { health: string; commencedTotal: number; overduePending: number; graceHours: number } | null = null;
  let settlementReason: string | null = null;
  if (stubbed) {
    settlementReason = "Stub DB mode — settlement health not measurable.";
  } else {
    try {
      const s = await loadSettlementHealth(dbClient, {
        graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS,
      });
      settlement = {
        health: s.health,
        commencedTotal: s.commencedTotal,
        overduePending: s.overduePending,
        graceHours: s.graceHours,
      };
    } catch (err) {
      settlementReason = `loadSettlementHealth failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Settled counts + delta (today vs yesterday, last 24h each) ────────
  // Canonical non-seed picks that settled in each 24h window.
  let todaySettled: number | null = null;
  let yesterdaySettled: number | null = null;
  let settledCountReason: string | null = null;
  if (stubbed) {
    settledCountReason = "Stub DB mode — settled counts not measurable.";
  } else {
    try {
      const count = db.pick.count.bind(db.pick);
      [todaySettled, yesterdaySettled] = await Promise.all([
        count({
          where: { ...CANONICAL_NON_SEED, result: { in: SETTLED_RESULTS }, settledAt: { gte: yesterday, lt: now } },
        }),
        count({
          where: {
            ...CANONICAL_NON_SEED,
            result: { in: SETTLED_RESULTS },
            settledAt: {
              gte: new Date(yesterday.getTime() - 24 * 60 * 60 * 1000),
              lt: yesterday,
            },
          },
        }),
      ]);
    } catch (err) {
      settledCountReason = `DB query failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Picks published in last 24h ─────────────────────────────────────
  let publishedToday: number | null = null;
  let publishedTodayReason: string | null = null;
  if (stubbed) {
    publishedTodayReason = "Stub DB mode — no pick table to query.";
  } else {
    try {
      publishedToday = await db.pick.count({
        where: {
          ...CANONICAL_NON_SEED,
          generatedAt: { gte: yesterday },
        },
      });
    } catch (err) {
      publishedTodayReason = `DB query failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Win rate over settled (last 24h) ────────────────────────────────
  // No existing loader computes a 24h-windowed win rate (loadPublicPerformancePolicy
  // reports lifetime canonical counts). We query wins/losses/pushes over the
  // last-24h settled window directly, reusing the SAME canonical filter so the
  // 24h win rate is consistent with the lifetime canonical posture.
  let winRate24h: number | null = null;
  let winRate24hWins: number | null = null;
  let winRate24hLosses: number | null = null;
  let winRate24hPushes: number | null = null;
  let winRate24hReason: string | null = null;
  if (stubbed) {
    winRate24hReason = "Stub DB mode — win rate not measurable.";
  } else {
    try {
      const count = db.pick.count.bind(db.pick);
      const baseWhere = {
        ...CANONICAL_NON_SEED,
        result: { in: SETTLED_RESULTS },
        settledAt: { gte: yesterday, lt: now },
      };
      const [wins, losses, pushes] = await Promise.all([
        count({ where: { ...baseWhere, result: "WIN" } }),
        count({ where: { ...baseWhere, result: "LOSS" } }),
        count({ where: { ...baseWhere, result: "PUSH" } }),
      ]);
      winRate24hWins = wins;
      winRate24hLosses = losses;
      winRate24hPushes = pushes;
      const eligible = wins + losses;
      winRate24h = eligible > 0 ? Math.round((wins / eligible) * 1000) / 10 : null;
      winRate24hReason =
        eligible === 0
          ? `No WIN/LOSS picks settled in the last 24h (wins=${wins}, losses=${losses}, pushes=${pushes}). Win rate undefined.`
          : null;
    } catch (err) {
      winRate24hReason = `DB query failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── CLV coverage ────────────────────────────────────────────────────
  // loadClvCoverage returns its own NO_DATA / DEGRADED / CRITICAL band and
  // an honest null coverageRatePct when there are no settled canonical picks.
  let clvCoverage: Awaited<ReturnType<typeof loadClvCoverage>> | null = null;
  let clvCoverageReason: string | null = null;
  if (stubbed) {
    clvCoverageReason = "Stub DB mode — CLV coverage not measurable.";
  } else {
    try {
      clvCoverage = await loadClvCoverage(db as never);
    } catch (err) {
      clvCoverageReason = `loadClvCoverage failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Canonical sample posture (lifetime, for context) ────────────────
  // Reuses loadCanonicalSamplePosture which in turn reuses
  // loadPublicPerformancePolicy — the SAME definition of canonical settled
  // so the daily 24h counts above are consistent with the lifetime numbers.
  // MUST be computed before calibration (which reads canonicalSettled from it).
  let canonicalSample: Awaited<ReturnType<typeof loadCanonicalSamplePosture>> | null = null;
  let canonicalSampleReason: string | null = null;
  if (stubbed) {
    canonicalSampleReason = "Stub DB mode — canonical sample not measurable.";
  } else if (settlement === null) {
    canonicalSampleReason = "Settlement health unavailable — canonical sample posture requires commencedTotal. See settlement.reason.";
  } else {
    try {
      canonicalSample = await loadCanonicalSamplePosture(dbClient, {
        commencedTotal: settlement.commencedTotal,
        canExposePerformanceStats: gates.canExposePerformanceStats,
        minSettledPicksForLearning: gates.minSettledPicksForLearning,
      });
    } catch (err) {
      canonicalSampleReason = `loadCanonicalSamplePosture failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Calibration drift ───────────────────────────────────────────────
  // Reuse loadCalibrationOpsSurface — it returns eligibility + publish policy
  // from the durable jarvisMemoryEvent store (metrics, snap, receipt).
  // Requires canonicalSettled from canonicalSample (computed above).
  let calibration: Record<string, unknown> | null = null;
  let calibrationReason: string | null = null;
  if (canonicalSample === null && canonicalSampleReason !== null) {
    // canonicalSampleReason already set above — propagate it.
  } else if (canonicalSample === null) {
    calibrationReason = "Canonical sample posture unavailable — calibration eligibility cannot be evaluated (needs canonicalSettled + settlementHealthy).";
  } else {
    try {
      const cal = await loadCalibrationOpsSurface({
        canonicalSettled: canonicalSample.canonicalSettled,
        minSettledForLearning: gates.minSettledPicksForLearning,
        settlementHealthy: settlement?.health === "HEALTHY",
      });
      calibration = {
        metricsGeneratedAt: cal.metrics?.generatedAt ?? null,
        metricsN: cal.metrics?.n ?? null,
        metricsStatus: cal.metrics?.status ?? "collecting",
        metricsBrier: cal.metrics?.overall?.brier ?? null,
        metricsEce: cal.metrics?.overall?.ece ?? null,
        eligibilityStatus: cal.eligibility.status,
        eligibilityStreak: cal.eligibility.consecutiveGreen,
        publishPublished: cal.publish.published,
        publishSource: cal.publish.source,
        publishAutoPublish: cal.publish.autoPublish,
      };
    } catch (err) {
      calibrationReason = `loadCalibrationOpsSurface failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Scheduler liveness ──────────────────────────────────────────────
  // Reuse assessSchedulerLiveness — never throws, returns its own 'unknown'
  // band when the DB has no rows.
  const schedulerLiveness = await assessSchedulerLiveness().catch(() => ({
    status: "unknown" as const,
    lastAnyIngestionSuccessAt: null,
    ageMinutes: null,
    tightestExpectedGapMinutes: 15,
    degradedThresholdMinutes: 60,
    deadThresholdMinutes: 180,
    operatorHint: "assessSchedulerLiveness threw — could not assess.",
  }));

  return NextResponse.json(
    {
      ok: true,
      detail: "operator",
      generatedAt: now.toISOString(),
      window: {
        since: isoYesterday,
        until: now.toISOString(),
        label: "last-24h",
      },
      deployment: {
        sha: deploymentSha,
        gitSha: process.env.GIT_SHA?.trim() || null,
      },
      // Picks published in last 24h
      published: {
        today: publishedToday,
        ...(publishedTodayReason ? { reason: publishedTodayReason } : { reason: null }),
      },
      // Win rate over settled (last 24h)
      winRate: {
        rate: winRate24h,
        wins: winRate24hWins,
        losses: winRate24hLosses,
        pushes: winRate24hPushes,
        eligibleForRate:
          winRate24hWins !== null && winRate24hLosses !== null
            ? winRate24hWins + winRate24hLosses
            : null,
        ...(winRate24hReason ? { reason: winRate24hReason } : { reason: null }),
      },
      // Settled counts + delta (today vs yesterday)
      settled: {
        today: todaySettled,
        yesterday: yesterdaySettled,
        delta:
          todaySettled !== null && yesterdaySettled !== null
            ? todaySettled - yesterdaySettled
            : null,
        ...(settledCountReason ? { reason: settledCountReason } : { reason: null }),
      },
      // CLV coverage (lifetime canonical)
      clv: clvCoverage
        ? {
            settledEligible: clvCoverage.settledEligible,
            graded: clvCoverage.graded,
            uncovered: clvCoverage.uncovered,
            coverageRatePct: clvCoverage.coverageRatePct,
            health: clvCoverage.health,
            latestGradedAt: clvCoverage.latestGradedAt,
          }
        : { ...(clvCoverageReason ? { reason: clvCoverageReason } : {}) },
      // Settlement health (lifetime leading indicator)
      settlement: settlement ?? (settlementReason ? { reason: settlementReason } : null),
      // Calibration drift (lifetime eligibility + publish policy)
      calibration: calibration ?? (calibrationReason ? { reason: calibrationReason } : null),
      // Scheduler liveness
      scheduler: schedulerLiveness,
      // Canonical sample posture (lifetime context)
      canonicalSample:
        canonicalSample ?? (canonicalSampleReason ? { reason: canonicalSampleReason } : null),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
