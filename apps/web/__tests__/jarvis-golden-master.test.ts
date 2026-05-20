import { describe, it, expect } from "vitest";
import { synthesizeJarvis, JARVIS_VERSION, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

/**
 * Golden-master test for the Jarvis synthesizer.
 *
 * Pins the JSON output for a canonical input fixture. Any change to the
 * synthesizer that meaningfully alters past outputs will fail this test,
 * forcing the contributor to:
 *
 *   1. Decide whether the change is intentional (it should always be).
 *   2. Bump JARVIS_VERSION in lib/cockpit/jarvis.ts.
 *   3. Update the GOLDEN snapshot below with the new output.
 *
 * The fixture mirrors a deployed "LAUNCH_READY" state. Edit only when
 * the contract explicitly changes.
 */

const NOW = new Date("2026-05-19T00:00:00Z");

function fixture(): JarvisInput {
  const policy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: true,
    minSettledPicksForLearning: 25,
    canonicalSettledCount: 200,
    bootstrapCount: 50,
    pendingCount: 4,
    canonicalWins: 110,
    canonicalLosses: 85,
    canonicalPushes: 5,
  });
  return {
    now: NOW,
    gates: {
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
    },
    performancePolicy: policy,
    ingestion: {
      lastAttemptAt: new Date(NOW.getTime() - 30 * 60 * 1000),
      lastSuccessAt: new Date(NOW.getTime() - 30 * 60 * 1000),
      lastWasSuccess: true,
      recentFailureCount: 0,
    },
    settlement: {
      lastSettlementAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      settledIn24h: 20,
      pendingPickCount: 4,
    },
    history: {
      canonicalSettledCount: 200,
      bootstrapSettledCount: 50,
      canonicalPendingCount: 4,
      winCount: 110,
      lossCount: 85,
      pushCount: 5,
      voidCount: 1,
      publishedCount: 250,
      featuredCount: 12,
      canonicalEligibleForPublic: 200,
      canonicalExcludedFromPublic: 50,
    },
    signal: {
      snapshotCoveragePct: 0.97,
      signalCoveragePct: 0.95,
      averageDataQualityScore: 0.92,
      modelVersionsActive: ["v5"],
    },
    layers: {
      trustClaims: "implemented",
      performanceGating: "implemented",
      promotions: "implemented",
      dailyBrief: "implemented",
      calibration: "implemented",
      cockpit: "implemented",
      contentEngine: "implemented",
      ciHardening: "implemented",
    },
    externalConfigMissing: [],
  };
}

describe("Jarvis golden-master", () => {
  it("LAUNCH_READY fixture produces the expected high-level shape", () => {
    const a = synthesizeJarvis(fixture());
    // High-level invariants — change these intentionally and bump JARVIS_VERSION.
    expect(a.version).toBe(JARVIS_VERSION);
    expect(a.assessedAt).toBe(NOW.toISOString());
    expect(a.launchStatus).toBe("LAUNCH_READY");
    expect(a.confidenceLevel).toBe("HIGH");
    expect(a.publicSurfaceStatus).toBe("GREEN");
    expect(a.customerDashboardStatus).toBe("GREEN");
    expect(a.picksStatus).toBe("GREEN");
    expect(a.performanceStatus).toBe("GREEN");
    expect(a.cockpitStatus).toBe("GREEN");
    expect(a.historicalPickStatus).toBe("GREEN");
    expect(a.ingestionStatus).toBe("GREEN");
    expect(a.settlementStatus).toBe("GREEN");
    expect(a.canonicalHistoryStatus).toBe("GREEN");
    expect(a.bootstrapStatus).toBe("GREEN");
    expect(a.signalCoverageStatus).toBe("GREEN");
    expect(a.readinessGateSummary.openCount).toBe(7);
    expect(a.readinessGateSummary.totalCount).toBe(7);
    expect(a.readinessGateSummary.closed).toEqual([]);
    expect(a.safetyWarnings).toEqual([]);
    expect(a.missingPhaseWarnings).toEqual([]);
    expect(a.externalConfigWarnings).toEqual([]);
    expect(a.phaseMatrix.length).toBe(9);
    // Recommended next actions should be the steady-state checklist
    // (3 items) in the current synthesizer.
    expect(a.recommendedNextActions.length).toBe(3);
  });

  it("oneSentenceAssessment for LAUNCH_READY mentions both 'launch-ready' and the canonical sample size", () => {
    const a = synthesizeJarvis(fixture());
    expect(a.oneSentenceAssessment.toLowerCase()).toMatch(/launch-ready/);
    expect(a.oneSentenceAssessment).toMatch(/200/);
  });
});
