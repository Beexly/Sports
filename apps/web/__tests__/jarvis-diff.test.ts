import { describe, it, expect } from "vitest";
import { diffJarvis, summarizeJarvisDiff } from "@/lib/cockpit/jarvis-diff";
import { synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

const NOW = new Date("2026-05-18T12:00:00Z");

function inputAt(offsetMin = 0, overrides: Partial<JarvisInput> = {}): JarvisInput {
  const at = new Date(NOW.getTime() + offsetMin * 60 * 1000);
  return {
    now: at,
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
    ingestion: {
      lastAttemptAt: new Date(at.getTime() - 60 * 60 * 1000),
      lastSuccessAt: new Date(at.getTime() - 60 * 60 * 1000),
      lastWasSuccess: true,
      recentFailureCount: 0,
    },
    settlement: {
      lastSettlementAt: new Date(at.getTime() - 2 * 60 * 60 * 1000),
      settledIn24h: 12,
      pendingPickCount: 0,
    },
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
    ...overrides,
  };
}

describe("diffJarvis", () => {
  it("returns no changes when both assessments are identical", () => {
    const a = synthesizeJarvis(inputAt(0));
    const b = synthesizeJarvis(inputAt(0));
    const diff = diffJarvis(a, b);
    expect(diff.hasChanges).toBe(false);
    expect(diff.sectionalChanges).toHaveLength(0);
    expect(diff.warningCountChanges).toHaveLength(0);
    expect(summarizeJarvisDiff(diff)).toBe("");
  });

  it("treats a null previous as a brand-new assessment (everything new)", () => {
    const curr = synthesizeJarvis(inputAt(0));
    const diff = diffJarvis(null, curr);
    expect(diff.hasChanges).toBe(true);
    expect(diff.launchStatusChanged).toBe(true);
    expect(diff.sectionalChanges.length).toBe(11);
  });

  it("detects launchStatus + sectional changes when ingestion goes stale", () => {
    const prev = synthesizeJarvis(inputAt(0));
    const curr = synthesizeJarvis(
      inputAt(60, {
        ingestion: {
          lastAttemptAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
          lastSuccessAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
          lastWasSuccess: true,
          recentFailureCount: 0,
        },
      })
    );
    const diff = diffJarvis(prev, curr);
    expect(diff.hasChanges).toBe(true);
    expect(diff.launchStatusChanged).toBe(true);
    expect(
      diff.sectionalChanges.some((c) => c.key === "ingestionStatus" && c.current === "RED")
    ).toBe(true);
  });

  it("captures new and cleared safety warnings as sets", () => {
    // Force a safety warning in current: closed perf gate + live public picks.
    const policyClosed = evaluatePublicPerformancePolicy({
      canExposePerformanceStats: false,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 100,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalWins: 55,
      canonicalLosses: 40,
      canonicalPushes: 5,
    });
    const prev = synthesizeJarvis(inputAt(0));
    const curr = synthesizeJarvis(
      inputAt(60, {
        gates: {
          ...inputAt(0).gates,
          canExposePerformanceStats: false,
        },
        performancePolicy: policyClosed,
      })
    );
    const diff = diffJarvis(prev, curr);
    expect(diff.newSafetyWarnings.length).toBeGreaterThan(0);
    // Reverse direction: warnings cleared.
    const back = diffJarvis(curr, prev);
    expect(back.clearedSafetyWarnings.length).toBeGreaterThan(0);
  });

  it("captures added/cleared external config keys symmetrically", () => {
    const prev = synthesizeJarvis(inputAt(0, { externalConfigMissing: ["STRIPE_SECRET_KEY"] }));
    const curr = synthesizeJarvis(inputAt(60, { externalConfigMissing: ["STRIPE_SECRET_KEY", "THE_ODDS_API_KEY"] }));
    const diff = diffJarvis(prev, curr);
    expect(diff.newExternalConfig).toEqual(["THE_ODDS_API_KEY"]);
    expect(diff.clearedExternalConfig).toEqual([]);
  });

  it("summarizeJarvisDiff emits a compact one-line summary or empty", () => {
    const a = synthesizeJarvis(inputAt(0));
    const b = synthesizeJarvis(inputAt(0));
    expect(summarizeJarvisDiff(diffJarvis(a, b))).toBe("");
    const c = synthesizeJarvis(
      inputAt(60, {
        ingestion: {
          lastAttemptAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
          lastSuccessAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
          lastWasSuccess: true,
          recentFailureCount: 0,
        },
      })
    );
    const summary = summarizeJarvisDiff(diffJarvis(a, c));
    expect(summary).toMatch(/sectional|launchStatus/);
  });
});
