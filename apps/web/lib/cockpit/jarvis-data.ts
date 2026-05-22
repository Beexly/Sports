/**
 * Jarvis data loader.
 *
 * Pulls live evidence the synthesizer needs. Every DB call is wrapped
 * in .catch() so the cockpit always renders — even with no DB at all.
 *
 * When DATABASE_URL is unset, @sports/db returns a stub that produces
 * empty results. The synthesizer correctly classifies that state as
 * "NOT_READY_DATA" with explicit blockers. We also append a safety
 * warning so the operator sees "stub mode active" front and center.
 */

import { db, isStubMode } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  evaluatePublicPerformancePolicy,
  type PublicPerformancePolicy,
} from "@/lib/performance/public-performance-policy";
import {
  synthesizeJarvis,
  type JarvisAssessment,
  type JarvisLayerStatuses,
} from "@/lib/cockpit/jarvis";

const LAYERS: JarvisLayerStatuses = {
  trustClaims: "implemented",
  performanceGating: "implemented",
  promotions: "implemented",
  dailyBrief: "implemented",
  calibration: "implemented",
  cockpit: "implemented",
  contentEngine: "implemented",
  ciHardening: "partial",
};

function externalConfigMissing(): string[] {
  const missing: string[] = [];
  const need = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "THE_ODDS_API_KEY",
    "ANTHROPIC_API_KEY",
  ];
  for (const k of need) {
    const v = process.env[k];
    if (!v || v.trim() === "" || v.startsWith("changeme") || v === "stub" || v === "dev-noop") {
      missing.push(k);
    }
  }
  return missing;
}

// Loads live cockpit evidence and returns the canonical Jarvis payload.
export async function loadJarvisAssessment(): Promise<{
  assessment: JarvisAssessment;
  performancePolicy: PublicPerformancePolicy;
}> {
  const now = new Date();
  const gates = getReadinessGates();
  const recentSince = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const settlementSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    lastSuccessIngestion,
    lastIngestionAny,
    recentFailureCount,
    lastSettlement,
    settledIn24h,
    canonicalSettledCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    canonicalPending,
    bootstrapSettled,
    voidCount,
    publishedCount,
    featuredCount,
    recentTotal,
    recentBootstrap,
    snapshotCoverageRaw,
    avgDqRaw,
    modelVersions,
  ] = await Promise.all([
    db.ingestionRun
      .findFirst({
        where: { status: "SUCCESS" },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      })
      .catch(() => null),
    db.ingestionRun
      .findFirst({
        orderBy: { startedAt: "desc" },
        select: { startedAt: true, status: true },
      })
      .catch(() => null),
    db.ingestionRun
      .count({ where: { status: "FAILED", startedAt: { gte: settlementSince } } })
      .catch(() => 0),
    db.pick
      .findFirst({
        where: { settledAt: { not: null } },
        orderBy: { settledAt: "desc" },
        select: { settledAt: true },
      })
      .catch(() => null),
    db.pick.count({ where: { settledAt: { gte: settlementSince } } }).catch(() => 0),
    db.pick
      .count({
        where: {
          result: { in: ["WIN", "LOSS", "PUSH"] },
          isPublished: true,
          isBootstrap: false,
        },
      })
      .catch(() => 0),
    db.pick.count({ where: { result: "WIN", isPublished: true, isBootstrap: false } }).catch(() => 0),
    db.pick.count({ where: { result: "LOSS", isPublished: true, isBootstrap: false } }).catch(() => 0),
    db.pick.count({ where: { result: "PUSH", isPublished: true, isBootstrap: false } }).catch(() => 0),
    db.pick.count({ where: { result: "PENDING", isPublished: true, isBootstrap: false } }).catch(() => 0),
    db.pick.count({ where: { result: { in: ["WIN", "LOSS", "PUSH"] }, isBootstrap: true } }).catch(() => 0),
    db.pick.count({ where: { result: "VOID" } }).catch(() => 0),
    db.pick.count({ where: { isPublished: true } }).catch(() => 0),
    db.pick.count({ where: { isFeatured: true } }).catch(() => 0),
    db.pick.count({ where: { generatedAt: { gte: recentSince } } }).catch(() => 0),
    db.pick.count({ where: { generatedAt: { gte: recentSince }, isBootstrap: true } }).catch(() => 0),
    db.pick.count({ where: { signalSnapshot: { isNot: null } } }).catch(() => 0),
    db.game
      .aggregate({ _avg: { dataQualityScore: true } })
      .catch(() => ({ _avg: { dataQualityScore: 0 } } as { _avg: { dataQualityScore: number | null } })),
    db.pick
      .findMany({ distinct: ["modelVersion"], select: { modelVersion: true }, take: 10 })
      .catch(() => []),
  ]);

  const performancePolicy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: gates.canExposePerformanceStats,
    minSettledPicksForLearning: gates.minSettledPicksForLearning,
    canonicalSettledCount,
    bootstrapCount: bootstrapSettled,
    pendingCount: canonicalPending,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    recentTotalCount: recentTotal,
    recentBootstrapCount: recentBootstrap,
  });

  const totalPicks = publishedCount + canonicalPending;
  const snapshotPct = totalPicks > 0 ? Math.min(1, snapshotCoverageRaw / totalPicks) : 0;
  const dq = avgDqRaw._avg?.dataQualityScore ?? 0;

  const synth = synthesizeJarvis({
    now,
    gates: {
      canPersistCanonicalHistory: gates.canPersistCanonicalHistory,
      canUseDerivedHistory: gates.canUseDerivedHistory,
      canExposePublicPicks: gates.canExposePublicPicks,
      canPromoteFeaturedPicks: gates.canPromoteFeaturedPicks,
      canExposePerformanceStats: gates.canExposePerformanceStats,
      canPublishContent: gates.canPublishContent,
      canLearnFromOutcomes: gates.canLearnFromOutcomes,
      canApplyCalibrationAdjustments: false,
      isBootstrapMode: gates.isBootstrapMode,
      minSettledPicksForLearning: gates.minSettledPicksForLearning,
    },
    performancePolicy,
    ingestion: {
      lastAttemptAt: lastIngestionAny?.startedAt ?? null,
      lastSuccessAt: lastSuccessIngestion?.completedAt ?? null,
      lastWasSuccess: lastIngestionAny?.status === "SUCCESS",
      recentFailureCount,
    },
    settlement: {
      lastSettlementAt: lastSettlement?.settledAt ?? null,
      settledIn24h,
      pendingPickCount: canonicalPending,
    },
    history: {
      canonicalSettledCount,
      bootstrapSettledCount: bootstrapSettled,
      canonicalPendingCount: canonicalPending,
      winCount: canonicalWins,
      lossCount: canonicalLosses,
      pushCount: canonicalPushes,
      voidCount,
      publishedCount,
      featuredCount,
      canonicalEligibleForPublic: canonicalSettledCount,
      canonicalExcludedFromPublic: bootstrapSettled,
    },
    signal: {
      snapshotCoveragePct: snapshotPct,
      signalCoveragePct: snapshotPct,
      averageDataQualityScore: typeof dq === "number" ? dq : 0,
      modelVersionsActive: modelVersions.map((m: { modelVersion: string }) => m.modelVersion),
    },
    layers: LAYERS,
    externalConfigMissing: externalConfigMissing(),
  });

  // Augment with operational warnings the synthesizer doesn't see directly.
  const safetyWarnings = [...synth.safetyWarnings];

  // When demo samples are active, surface that explicitly so the operator
  // can tell "no data" apart from "deterministic sample data".
  const demoSamplesActive = isStubMode() && (await import("@sports/db")).isDemoPicksEnabled();
  if (demoSamplesActive) {
    safetyWarnings.unshift(
      "DEMO_PICKS_ENABLED=true — /picks and /dashboard are rendering the " +
        "deterministic 10-pick sample slate, not live model output. All " +
        "samples are result=PENDING; no public performance claim is " +
        "produced. Unset DEMO_PICKS_ENABLED to switch to live picks."
    );
  }
  if (isStubMode()) {
    safetyWarnings.unshift(
      "DB stub mode is active — DATABASE_URL is unset or set to a sentinel value. " +
        "Jarvis is reading empty results from an in-memory stub; no live ingestion, " +
        "settlement, or history is being consulted. Point DATABASE_URL at a real " +
        "Postgres and set FORCE_REAL_PRISMA=true to exit stub mode."
    );
  }

  const recommendedNextActions = [...synth.recommendedNextActions];
  if (demoSamplesActive) {
    recommendedNextActions.unshift(
      "Unset DEMO_PICKS_ENABLED to switch /picks and /dashboard from sample data to live model output once ingestion is wired up."
    );
  }
  if (isStubMode()) {
    recommendedNextActions.unshift(
      "Set DATABASE_URL to a real Postgres connection string and FORCE_REAL_PRISMA=true to exit stub mode."
    );
  }

  // Override picks/customer-dashboard tiles when sample data is rendering.
  // Without the override these tiles read UNKNOWN because no ingestion has
  // happened — accurate for live mode but misleading when the page IS
  // showing picks. Mark them AMBER so the operator sees "displayed, not
  // verified" instead of "no signal".
  let picksStatus = synth.picksStatus;
  let customerDashboardStatus = synth.customerDashboardStatus;
  if (demoSamplesActive) {
    picksStatus = "AMBER";
    customerDashboardStatus = "AMBER";
  }

  const assessment: JarvisAssessment = {
    ...synth,
    safetyWarnings,
    recommendedNextActions,
    picksStatus,
    customerDashboardStatus,
  };

  return {
    assessment: assessment,
    performancePolicy,
  };
}
