import { describe, expect, it } from "vitest";
import { signalMetricVector, synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { probeJarvisLayers } from "@/lib/cockpit/jarvis-layer-probes";
import {
  clearFreeSpineCache,
  freeSpineLiveScore,
  isFreeSpineEmptySlate,
  writeFreeSpineCache,
} from "@/lib/data-sources/free-spine-cache";
import { externalConfigMissing } from "@/lib/cockpit/jarvis-data";

const NOW = new Date("2026-05-18T12:00:00Z");

function base(over: Partial<JarvisInput> = {}): JarvisInput {
  const gates = {
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: true,
    canExposePublicPicks: true,
    canPromoteFeaturedPicks: true,
    canExposePerformanceStats: true,
    canPublishContent: true,
    canLearnFromOutcomes: true,
    canApplyCalibrationAdjustments: false as const,
    isBootstrapMode: false,
    minSettledPicksForLearning: 25,
  };
  const policy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: true,
    minSettledPicksForLearning: 25,
    canonicalSettledCount: 100,
    bootstrapCount: 10,
    pendingCount: 0,
    canonicalWins: 55,
    canonicalLosses: 40,
    canonicalPushes: 5,
    recentTotalCount: 20,
    recentBootstrapCount: 0,
  });
  return {
    now: NOW,
    gates,
    performancePolicy: policy,
    ingestion: {
      lastAttemptAt: new Date(NOW.getTime() - 3600_000),
      lastSuccessAt: new Date(NOW.getTime() - 3600_000),
      lastWasSuccess: true,
      recentFailureCount: 0,
    },
    settlement: {
      lastSettlementAt: new Date(NOW.getTime() - 2 * 3600_000),
      settledIn24h: 12,
      pendingPickCount: 0,
      settlementRunCount24h: 3,
      settlementSource: "settlement_run",
    },
    history: {
      canonicalSettledCount: 100,
      bootstrapSettledCount: 10,
      canonicalPendingCount: 0,
      winCount: 55,
      lossCount: 40,
      pushCount: 5,
      voidCount: 1,
      publishedCount: 110,
      featuredCount: 8,
      canonicalEligibleForPublic: 100,
      canonicalExcludedFromPublic: 10,
    },
    signal: {
      snapshotCoveragePct: 0.95,
      signalCoveragePct: 0.9,
      averageDataQualityScore: 0.9,
      modelVersionsActive: ["v5"],
      gameSignalCoveragePct: 0.88,
      featureMatrixCoveragePct: 0.91,
      freeMultiSourceScore: 1,
      freeSpineLiveScore: 0.85,
    },
    layers: {
      trustClaims: "implemented",
      performanceGating: "implemented",
      promotions: "implemented",
      dailyBrief: "implemented",
      calibration: "partial",
      cockpit: "implemented",
      contentEngine: "implemented",
      ciHardening: "partial",
    },
    externalConfigMissing: [],
    ...over,
  };
}

describe("weak spot: signal multi-metric matrix", () => {
  it("signalMetricVector includes game + free multi-source + spine", () => {
    const v = signalMetricVector(base().signal);
    expect(v.length).toBeGreaterThanOrEqual(5);
  });

  it("low free multi-source pulls signal tile to RED", () => {
    const a = synthesizeJarvis(
      base({
        signal: {
          snapshotCoveragePct: 0.99,
          signalCoveragePct: 0.99,
          averageDataQualityScore: 0.99,
          modelVersionsActive: ["v5"],
          freeMultiSourceScore: 0.2,
        },
      }),
    );
    expect(a.signalCoverageStatus).toBe("RED");
  });
});

describe("weak spot: settlement run source", () => {
  it("settlement_run source stays GREEN when fresh", () => {
    const a = synthesizeJarvis(base());
    expect(a.settlementStatus).toBe("GREEN");
  });

  it("pick.settledAt fallback with pending warns in safety", () => {
    const a = synthesizeJarvis(
      base({
        settlement: {
          lastSettlementAt: new Date(NOW.getTime() - 2 * 3600_000),
          settledIn24h: 1,
          pendingPickCount: 5,
          settlementRunCount24h: 0,
          settlementSource: "pick.settledAt",
        },
      }),
    );
    expect(a.safetyWarnings.some((w) => w.includes("SettlementRun"))).toBe(true);
  });
});

describe("weak spot: live layer probes", () => {
  it("stub mode marks cockpit partial", () => {
    const layers = probeJarvisLayers({
      trustClaimsWired: true,
      performanceGatingWired: true,
      promotionsWired: true,
      dailyBriefHasRows: null,
      calibrationAdjustmentsEnabled: false,
      canLearnFromOutcomes: true,
      cockpitWired: true,
      contentEngineDraftOnly: true,
      contentAutoPublishBlocked: true,
      ciGuardrailsPresent: true,
      freeMultiSourceCriticalGaps: 0,
      neonDualUrlConfigured: false,
      stubMode: true,
    });
    expect(layers.cockpit).toBe("partial");
    expect(layers.dailyBrief).toBe("unknown");
    expect(layers.ciHardening).toBe("partial");
  });
});

describe("weak spot: free-spine cache", () => {
  it("scores live probes and expires", () => {
    clearFreeSpineCache();
    expect(freeSpineLiveScore(null)).toBeNull();
    writeFreeSpineCache({
      probedAt: new Date().toISOString(),
      sportsProbed: 7,
      sportsWithGames: 5,
      criticalGaps: 0,
      requireSpend: 0,
      freeCovered: 40,
      live: [],
    });
    const s = freeSpineLiveScore(
      {
        probedAt: new Date().toISOString(),
        sportsProbed: 7,
        sportsWithGames: 5,
        criticalGaps: 0,
        requireSpend: 0,
        freeCovered: 40,
        live: [],
      },
    );
    expect(s).toBeCloseTo(5 / 7, 5);
  });

  // I5: offseason zero games is empty-labelled, not Critical/RED via score 0
  it("empty slate (0 games) returns null score and isFreeSpineEmptySlate", () => {
    const empty = {
      probedAt: new Date().toISOString(),
      sportsProbed: 7,
      sportsWithGames: 0,
      criticalGaps: 0,
      requireSpend: 0,
      freeCovered: 40,
      live: [],
    };
    expect(isFreeSpineEmptySlate(empty)).toBe(true);
    expect(freeSpineLiveScore(empty)).toBeNull();
    // must not drag signal min to 0
    const a = synthesizeJarvis(
      base({
        signal: {
          snapshotCoveragePct: 0.95,
          signalCoveragePct: 0.9,
          averageDataQualityScore: 0.9,
          modelVersionsActive: ["v5"],
          gameSignalCoveragePct: 0.88,
          featureMatrixCoveragePct: 0.91,
          freeMultiSourceScore: 1,
          // undefined freeSpineLiveScore (empty labelled)
        },
      }),
    );
    expect(a.signalCoverageStatus).not.toBe("RED");
  });

  it("stale snap beyond 120m does not score (I8 TTL on live score)", () => {
    const stale = {
      probedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h
      sportsProbed: 7,
      sportsWithGames: 5,
      criticalGaps: 0,
      requireSpend: 0,
      freeCovered: 40,
      live: [],
    };
    expect(freeSpineLiveScore(stale)).toBeNull();
  });
});

describe("weak spot: neon dual URL config", () => {
  it("flags DIRECT_URL when DATABASE_URL set alone", () => {
    const m = externalConfigMissing({
      DATABASE_URL: "postgresql://user:pass@ep-x-pooler.neon.tech/db",
      NEXTAUTH_SECRET: "x",
      GOOGLE_CLIENT_ID: "x",
      GOOGLE_CLIENT_SECRET: "x",
      STRIPE_SECRET_KEY: "x",
      STRIPE_WEBHOOK_SECRET: "x",
    } as unknown as NodeJS.ProcessEnv);
    expect(m).toContain("DIRECT_URL");
  });

  it("accepts dual URLs", () => {
    const m = externalConfigMissing({
      DATABASE_URL: "postgresql://user:pass@ep-x-pooler.neon.tech/db",
      DIRECT_URL: "postgresql://user:pass@ep-x.neon.tech/db",
      NEXTAUTH_SECRET: "x",
      GOOGLE_CLIENT_ID: "x",
      GOOGLE_CLIENT_SECRET: "x",
      STRIPE_SECRET_KEY: "x",
      STRIPE_WEBHOOK_SECRET: "x",
    } as unknown as NodeJS.ProcessEnv);
    expect(m).not.toContain("DIRECT_URL");
    expect(m).not.toContain("DATABASE_URL");
  });
});
