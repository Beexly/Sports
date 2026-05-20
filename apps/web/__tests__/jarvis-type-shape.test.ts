import { describe, it, expect } from "vitest";
import { synthesizeJarvis, type JarvisAssessment, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

/**
 * Type-shape regression test.
 *
 * Asserts the runtime JarvisAssessment object contains every key the
 * cockpit + downstream consumers depend on. If a field is renamed or
 * dropped, this test fails before the integration falls over.
 */

const NOW = new Date("2026-05-18T12:00:00Z");

function fixture(): JarvisInput {
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
    performancePolicy: evaluatePublicPerformancePolicy({
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 100,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalWins: 55,
      canonicalLosses: 40,
      canonicalPushes: 5,
    }),
    ingestion: { lastAttemptAt: null, lastSuccessAt: null, lastWasSuccess: null, recentFailureCount: 0 },
    settlement: { lastSettlementAt: null, settledIn24h: 0, pendingPickCount: 0 },
    history: {
      canonicalSettledCount: 100,
      bootstrapSettledCount: 0,
      canonicalPendingCount: 0,
      winCount: 55,
      lossCount: 40,
      pushCount: 5,
      voidCount: 0,
      publishedCount: 100,
      featuredCount: 8,
      canonicalEligibleForPublic: 100,
      canonicalExcludedFromPublic: 0,
    },
    signal: {
      snapshotCoveragePct: 0.95,
      signalCoveragePct: 0.92,
      averageDataQualityScore: 0.9,
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

const REQUIRED_KEYS: ReadonlyArray<keyof JarvisAssessment> = [
  "assessedAt",
  "version",
  "launchStatus",
  "oneSentenceAssessment",
  "confidenceLevel",
  "publicSurfaceStatus",
  "customerDashboardStatus",
  "picksStatus",
  "performanceStatus",
  "cockpitStatus",
  "historicalPickStatus",
  "ingestionStatus",
  "settlementStatus",
  "canonicalHistoryStatus",
  "bootstrapStatus",
  "signalCoverageStatus",
  "readinessGateSummary",
  "safetyWarnings",
  "missingPhaseWarnings",
  "externalConfigWarnings",
  "recommendedNextActions",
  "phaseMatrix",
];

describe("JarvisAssessment runtime type shape", () => {
  it("contains every required key", () => {
    const a = synthesizeJarvis(fixture());
    for (const key of REQUIRED_KEYS) {
      expect(
        Object.prototype.hasOwnProperty.call(a, key),
        `JarvisAssessment is missing key: ${String(key)}`
      ).toBe(true);
    }
  });

  it("readinessGateSummary has the expected substructure", () => {
    const a = synthesizeJarvis(fixture());
    expect(a.readinessGateSummary).toHaveProperty("openCount");
    expect(a.readinessGateSummary).toHaveProperty("totalCount");
    expect(a.readinessGateSummary).toHaveProperty("closed");
    expect(Array.isArray(a.readinessGateSummary.closed)).toBe(true);
  });

  it("phaseMatrix entries have key, label, status", () => {
    const a = synthesizeJarvis(fixture());
    expect(a.phaseMatrix.length).toBe(9);
    for (const entry of a.phaseMatrix) {
      expect(entry).toHaveProperty("key");
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("status");
    }
  });

  it("warning lists are arrays of strings", () => {
    const a = synthesizeJarvis(fixture());
    for (const list of [a.safetyWarnings, a.missingPhaseWarnings, a.externalConfigWarnings, a.recommendedNextActions]) {
      expect(Array.isArray(list)).toBe(true);
      for (const v of list) expect(typeof v).toBe("string");
    }
  });

  it("confidenceLevel is one of the canonical three", () => {
    const a = synthesizeJarvis(fixture());
    expect(["LOW", "MEDIUM", "HIGH"]).toContain(a.confidenceLevel);
  });
});
