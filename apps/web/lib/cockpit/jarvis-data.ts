/**
 * Jarvis data loader.
 *
 * Pulls live evidence the synthesizer needs. Every DB call is wrapped
 * in .catch() so the cockpit always renders — even with no DB at all.
 *
 * Weak-spot closures (v1.3):
 *   1. Signal matrix: snapshot + feature flags + game signals + free multi-source + free-spine
 *   2. Settlement clock prefers SettlementRun, falls back to pick.settledAt
 *   3. Layers from probeJarvisLayers (live evidence), not hard-coded all-implemented
 *   4. Multi-source: pure matrix + free-spine-cache + Neon free-spine-durable (I3/I8)
 *   5. Neon dual-URL / DIRECT_URL / FORCE_REAL_PRISMA honesty in externalConfigMissing
 */

import { db, isStubMode } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  evaluatePublicPerformancePolicy,
  type PublicPerformancePolicy,
} from "@/lib/performance/public-performance-policy";
import { redundancyGaps, freeCoverageMatrix } from "@/lib/data-sources/source-router";
import { scoreSourceChain } from "@/lib/data-sources/multi-source-scores";
import {
  freeSpineLiveScore,
  isFreeSpineEmptySlate,
  readFreeSpineCache,
  writeFreeSpineCache,
} from "@/lib/data-sources/free-spine-cache";
import {
  freeSpineSnapAgeMs,
  freeSpineWithinSla,
  loadDurableFreeSpine,
} from "@/lib/data-sources/free-spine-durable";
import { probeJarvisLayers } from "@/lib/cockpit/jarvis-layer-probes";
import {
  synthesizeJarvis,
  type JarvisAssessment,
} from "@/lib/cockpit/jarvis";
import { loadSettlementHealth, SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import {
  planAutonomyCycle,
  autonomyActionsAsJarvisNext,
} from "@/lib/autonomy/operating-kernel";


const FEATURE_FLAG_KEYS = [
  "hadOddsSignal",
  "hadLineMovementSignal",
  "hadRestSignal",
  "hadScheduleSignal",
  "hadAtsFormSignal",
  "hadH2HSignal",
  "hadVenueSignal",
  "hadWeatherSignal",
  "hadInjurySignal",
  "hadRatingsSignal",
  "hadPlayerSignal",
  "hadOfficialsSignal",
  "hadVenueEnvironmentSignal",
  "hadPaceSignal",
  "hadMilestoneSignal",
] as const;

/** Env honesty: dual Neon URLs + auth + stripe. Free path does not need Odds key. */
export function externalConfigMissing(env: NodeJS.ProcessEnv = process.env): string[] {
  const missing: string[] = [];
  const need = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];
  for (const k of need) {
    const v = env[k];
    if (!v || v.trim() === "" || v.startsWith("changeme") || v === "stub" || v === "dev-noop") {
      missing.push(k);
    }
  }

  const dbUrl = env["DATABASE_URL"]?.trim() ?? "";
  const direct = env["DIRECT_URL"]?.trim() ?? "";
  const unpooled = env["DATABASE_URL_UNPOOLED"]?.trim() ?? env["POSTGRES_URL_NON_POOLING"]?.trim() ?? "";

  // Neon dual-URL: Prisma migrate/deploy needs unpooled DIRECT_URL.
  if (dbUrl && !dbUrl.startsWith("changeme") && dbUrl !== "stub") {
    if (!direct && !unpooled) {
      missing.push("DIRECT_URL");
    }
    // Heuristic: pooled neon often has -pooler. in host; direct should not be identical when unpooled exists.
    if (direct && unpooled && direct === dbUrl && dbUrl.includes("-pooler")) {
      missing.push("DIRECT_URL_UNPOOLED_MISMATCH");
    }
  }

  return missing;
}

function isNeonDualConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const dbUrl = env["DATABASE_URL"]?.trim() ?? "";
  const direct = env["DIRECT_URL"]?.trim() ?? env["DATABASE_URL_UNPOOLED"]?.trim() ?? "";
  if (!dbUrl || dbUrl === "stub" || dbUrl.startsWith("changeme")) return false;
  if (!direct || direct === "stub") return false;
  return true;
}

function freeMultiSourceScore(): number {
  const matrix = freeCoverageMatrix().filter((r) =>
    ["scores", "results", "odds", "standings", "schedules", "weather", "player_stats"].includes(
      r.need,
    ),
  );
  if (matrix.length === 0) return 0;
  const dual = matrix.filter((r) => r.clearedCount >= 2).length;
  return dual / matrix.length;
}

function featureMatrixFromSnapshots(
  rows: ReadonlyArray<Record<string, boolean>>,
): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const row of rows) {
    let on = 0;
    for (const k of FEATURE_FLAG_KEYS) {
      if (row[k] === true) on += 1;
    }
    sum += on / FEATURE_FLAG_KEYS.length;
  }
  return sum / rows.length;
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
  const stub = isStubMode();

  const [
    lastSuccessIngestion,
    lastIngestionAny,
    recentFailureCount,
    lastFailedRun,
    lastSettlementPick,
    settledIn24h,
    lastSettlementRun,
    settlementRunCount24h,
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
    publishedCanonicalCount,
    avgDqRaw,
    modelVersions,
    featureSnapRows,
    gamesWithSignals,
    publishedGameIds,
    dailyBriefCount,
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
    db.ingestionRun
      .findFirst({
        where: { status: "FAILED" },
        orderBy: { startedAt: "desc" },
        select: { errorMessage: true },
      })
      .catch(() => null),
    db.pick
      .findFirst({
        where: { settledAt: { not: null } },
        orderBy: { settledAt: "desc" },
        select: { settledAt: true },
      })
      .catch(() => null),
    db.pick.count({ where: { settledAt: { gte: settlementSince } } }).catch(() => 0),
    // SettlementRun table — durable settle clock (weak spot #2)
    db.settlementRun
      .findFirst({
        orderBy: { startedAt: "desc" },
        select: { startedAt: true, source: true },
      })
      .catch(() => null),
    db.settlementRun
      .count({ where: { startedAt: { gte: settlementSince } } })
      .catch(() => 0),
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
    db.pick
      .count({
        where: { signalSnapshot: { isNot: null }, isPublished: true, isBootstrap: false },
      })
      .catch(() => 0),
    db.pick.count({ where: { isPublished: true, isBootstrap: false } }).catch(() => 0),
    db.game
      .aggregate({ _avg: { dataQualityScore: true } })
      .catch(() => ({ _avg: { dataQualityScore: 0 } } as { _avg: { dataQualityScore: number | null } })),
    db.pick
      .findMany({ distinct: ["modelVersion"], select: { modelVersion: true }, take: 10 })
      .catch(() => []),
    // Feature matrix sample (weak spot #1)
    db.pickSignalSnapshot
      .findMany({
        where: { pick: { isPublished: true, isBootstrap: false } },
        take: 200,
        select: {
          hadOddsSignal: true,
          hadLineMovementSignal: true,
          hadRestSignal: true,
          hadScheduleSignal: true,
          hadAtsFormSignal: true,
          hadH2HSignal: true,
          hadVenueSignal: true,
          hadWeatherSignal: true,
          hadInjurySignal: true,
          hadRatingsSignal: true,
          hadPlayerSignal: true,
          hadOfficialsSignal: true,
          hadVenueEnvironmentSignal: true,
          hadPaceSignal: true,
          hadMilestoneSignal: true,
        },
      })
      .catch(() => []),
    db.gameSignal
      .groupBy({ by: ["gameId"], _count: { _all: true } })
      .catch(() => [] as Array<{ gameId: string; _count: { _all: number } }>),
    db.pick
      .findMany({
        where: { isPublished: true, isBootstrap: false },
        distinct: ["gameId"],
        select: { gameId: true },
        take: 500,
      })
      .catch(() => [] as Array<{ gameId: string }>),
    db.dailyBrief
      .count()
      .catch(() => null as number | null),
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

  const totalPicks = publishedCanonicalCount;
  const snapshotPct = totalPicks > 0 ? Math.min(1, snapshotCoverageRaw / totalPicks) : 0;
  // dataQualityScore stored 0–100 → normalize 0..1
  const dqRaw = avgDqRaw._avg?.dataQualityScore ?? 0;
  const dq = typeof dqRaw === "number" ? (dqRaw > 1 ? dqRaw / 100 : dqRaw) : 0;

  const featureMatrixPct = featureMatrixFromSnapshots(
    featureSnapRows as Array<Record<string, boolean>>,
  );

  const publishedGameIdSet = new Set(
    (publishedGameIds as Array<{ gameId: string }>).map((g) => g.gameId),
  );
  const signalGameIds = new Set(
    (gamesWithSignals as Array<{ gameId: string }>).map((g) => g.gameId),
  );
  let gamesWithAnySignal = 0;
  for (const id of publishedGameIdSet) {
    if (signalGameIds.has(id)) gamesWithAnySignal += 1;
  }
  const gameSignalPct =
    publishedGameIdSet.size > 0 ? gamesWithAnySignal / publishedGameIdSet.size : 0;

  const multiScore = freeMultiSourceScore();
  // I3: process-local first; cold isolate → Neon durable (warm process cache).
  let spineCache = readFreeSpineCache();
  let spineSource: "process" | "durable" | "none" = spineCache ? "process" : "none";
  if (!spineCache) {
    try {
      const durable = await loadDurableFreeSpine();
      if (durable) {
        writeFreeSpineCache(durable);
        spineCache = durable;
        spineSource = "durable";
      }
    } catch {
      /* never block assessment */
    }
  }
  const spineLive = freeSpineLiveScore(spineCache);

  // Settlement clock: SettlementRun preferred (weak spot #2)
  let lastSettlementAt: Date | string | null = null;
  let settlementSource: "settlement_run" | "pick.settledAt" | "none" = "none";
  if (lastSettlementRun?.startedAt) {
    lastSettlementAt = lastSettlementRun.startedAt;
    settlementSource = "settlement_run";
  } else if (lastSettlementPick?.settledAt) {
    lastSettlementAt = lastSettlementPick.settledAt;
    settlementSource = "pick.settledAt";
  }

  const criticalGaps = redundancyGaps(2).filter((g) =>
    ["scores", "results", "odds", "player_stats"].includes(g.need),
  ).length;

  const layers = probeJarvisLayers({
    trustClaimsWired: true,
    performanceGatingWired: true,
    promotionsWired: true,
    dailyBriefHasRows: stub ? null : typeof dailyBriefCount === "number" ? dailyBriefCount > 0 : null,
    calibrationAdjustmentsEnabled: gates.canApplyCalibrationAdjustments,
    canLearnFromOutcomes: gates.canLearnFromOutcomes,
    cockpitWired: true,
    contentEngineDraftOnly: true,
    contentAutoPublishBlocked: !gates.canPublishContent || process.env["CONTENT_AUTO_PUBLISH"] !== "1",
    ciGuardrailsPresent: true,
    freeMultiSourceCriticalGaps: criticalGaps,
    neonDualUrlConfigured: isNeonDualConfigured(),
    stubMode: stub,
  });

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
      canApplyCalibrationAdjustments: gates.canApplyCalibrationAdjustments,
      isBootstrapMode: gates.isBootstrapMode,
      minSettledPicksForLearning: gates.minSettledPicksForLearning,
    },
    performancePolicy,
    ingestion: {
      lastAttemptAt: lastIngestionAny?.startedAt ?? null,
      lastSuccessAt: lastSuccessIngestion?.completedAt ?? null,
      lastWasSuccess: lastIngestionAny?.status === "SUCCESS",
      recentFailureCount,
      lastFailureReason: lastFailedRun?.errorMessage ?? null,
    },
    settlement: {
      lastSettlementAt,
      settledIn24h,
      pendingPickCount: canonicalPending,
      settlementRunCount24h,
      settlementSource,
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
      signalCoveragePct: featureMatrixPct > 0 ? featureMatrixPct : snapshotPct,
      averageDataQualityScore: dq,
      modelVersionsActive: modelVersions.map((m: { modelVersion: string }) => m.modelVersion),
      gameSignalCoveragePct: gameSignalPct,
      featureMatrixCoveragePct: featureMatrixPct,
      freeMultiSourceScore: multiScore,
      freeSpineLiveScore: spineLive ?? undefined,
    },
    layers,
    externalConfigMissing: externalConfigMissing(),
  });

  const safetyWarnings = [...synth.safetyWarnings];
  const demoSamplesActive = stub && (await import("@sports/db")).isDemoPicksEnabled();
  if (demoSamplesActive) {
    safetyWarnings.unshift(
      "DEMO_PICKS_ENABLED=true — /picks and /dashboard are rendering the " +
        "deterministic 10-pick sample slate, not live model output. All " +
        "samples are result=PENDING; no public performance claim is " +
        "produced. Unset DEMO_PICKS_ENABLED to switch to live picks."
    );
  }
  if (stub) {
    safetyWarnings.unshift(
      "DB stub mode is active — DATABASE_URL is unset or set to a sentinel value. " +
        "Jarvis is reading empty results from an in-memory stub; no live ingestion, " +
        "settlement, or history is being consulted. Point DATABASE_URL + DIRECT_URL at " +
        "gse-postgres and set FORCE_REAL_PRISMA=true to exit stub mode. Run npm run prove:neon."
    );
  }
  if (!isNeonDualConfigured() && !stub) {
    safetyWarnings.unshift(
      "Neon dual URLs incomplete — set DATABASE_URL (pooled) and DIRECT_URL (unpooled) from gse-postgres, then redeploy and prove:neon."
    );
  }

  const recommendedNextActions = [...synth.recommendedNextActions];
  try {
    if (criticalGaps > 0) {
      recommendedNextActions.unshift(
        `Multi-source gaps (${criticalGaps}): expand dual free paths for weak need×sport cells.`,
      );
    } else {
      recommendedNextActions.push(
        "Free multi-source critical coverage dual+ green — keep free settle + gamma + free-spine-health on schedule.",
      );
    }
    const singleScore = (["nfl", "mls"] as const).filter((s) => scoreSourceChain(s).length < 2);
    if (singleScore.length) {
      recommendedNextActions.push(
        `Live scoreboard single-adapter sports: ${singleScore.join(", ")} — dual free path preferred when legal free source exists.`,
      );
    }
    if (!spineCache) {
      // I5: missing cache is an operator action, not a safety Critical.
      recommendedNextActions.push(
        "No free-spine probe cache yet (process or Neon) — schedule free-spine-health; empty RAM alone is not Critical (I3 durable should warm).",
      );
    } else {
      const ageMs = freeSpineSnapAgeMs(spineCache, now.getTime());
      const ageMin = ageMs == null ? null : Math.round(ageMs / 60000);
      if (isFreeSpineEmptySlate(spineCache)) {
        recommendedNextActions.push(
          `Free-spine empty-labelled (${spineCache.sportsWithGames}/${spineCache.sportsProbed} sports with games, ${spineSource}${ageMin != null ? `, age ${ageMin}m` : ""}) — offseason/zero slate, not probe failure (I5).`,
        );
      } else {
        recommendedNextActions.push(
          `Last free-spine probe ${spineCache.probedAt} (${spineSource}${ageMin != null ? `, age ${ageMin}m` : ""}): ${spineCache.sportsWithGames}/${spineCache.sportsProbed} sports had games.`,
        );
      }
      // I8: durable snap age ≤ 120m on every cockpit load — operational, not public-safety Critical
      if (!freeSpineWithinSla(spineCache, now.getTime())) {
        recommendedNextActions.unshift(
          `Free-spine probe age ${ageMin ?? "?"}m exceeds 120m SLA (I8) — autonomy should RUN_FREE_SPINE_HEALTH.`,
        );
      }
    }
  } catch {
    /* never block assessment */
  }
  if (demoSamplesActive) {
    recommendedNextActions.unshift(
      "Unset DEMO_PICKS_ENABLED to switch /picks and /dashboard from sample data to live model output once ingestion is wired up."
    );
  }
  if (stub) {
    recommendedNextActions.unshift(
      "Set DATABASE_URL + DIRECT_URL (gse-postgres dual) and FORCE_REAL_PRISMA=true; run npm run prove:neon."
    );
  }

  // Autonomy kernel: prepend self-correcting priorities (settlement P0, gates, sample).
  try {
    if (!stub) {
      const sh = await loadSettlementHealth(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS }).catch(() => null);
      const envTrue = (k: string) => process.env[k]?.trim().toLowerCase() === "true";
      const autonomy = planAutonomyCycle({
        observedAt: now.toISOString(),
        deploymentSha:
          process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 12) ??
          process.env["GIT_COMMIT_SHA"]?.slice(0, 12) ??
          null,
        databaseOk: !stub,
        ingestionOk: lastSuccessIngestion != null,
        ingestionAgeMinutes: lastSuccessIngestion?.completedAt
          ? Math.round((now.getTime() - new Date(lastSuccessIngestion.completedAt).getTime()) / 60000)
          : null,
        freeSpineAgeMinutes: (() => {
          const ageMs = freeSpineSnapAgeMs(spineCache, now.getTime());
          return ageMs == null ? null : Math.round(ageMs / 60000);
        })(),
        settlementBand: sh?.health ?? "UNKNOWN",
        settlementOverdue: sh?.overduePending ?? null,
        settlementCommenced: sh?.commencedTotal ?? null,
        topRcaCause: null,
        rcaHeadline: sh && !sh.clean ? sh.operatorMessage : null,
        stpAutoEligible: null,
        stpExceptions: null,
        burnDraining: null,
        liveBoardEnabled: envTrue("LIVE_BOARD"),
        publicPicksEnabled: envTrue("PUBLIC_PICKS_ENABLED"),
        performanceStatsEnabled: envTrue("PERFORMANCE_STATS_ENABLED"),
        publishLedgerEnabled: envTrue("PUBLISH_LEDGER"),
        draftOnly: !envTrue("LIVE_BOARD"),
        boardSuppressed: true,
        openPicks: null,
        canonicalSettled: canonicalSettledCount,
        minSettledForLearning: gates.minSettledPicksForLearning,
      });
      const autoLines = autonomyActionsAsJarvisNext(autonomy, 5);
      for (let i = autoLines.length - 1; i >= 0; i--) {
        recommendedNextActions.unshift(autoLines[i]!);
      }
      if (autonomy.severity === "P0" || autonomy.severity === "P1") {
        safetyWarnings.unshift(
          `Autonomy ${autonomy.severity}: ${autonomy.headline} (honesty ${autonomy.introspection.honestyScore}/100).`,
        );
      }
    }
  } catch {
    /* never block assessment */
  }

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
    assessment,
    performancePolicy,
  };
}
