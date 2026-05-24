import { describe, it, expect } from "vitest";
import { createJarvisHistory, snapshotFromAssessment, sharedJarvisHistory } from "@/lib/cockpit/jarvis-history";
import { synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

const NOW = new Date("2026-05-18T12:00:00Z");

function input(offsetMin = 0): JarvisInput {
  const at = new Date(NOW.getTime() + offsetMin * 60 * 1000);
  const policy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: true,
    minSettledPicksForLearning: 25,
    canonicalSettledCount: 100,
    bootstrapCount: 0,
    pendingCount: 0,
    canonicalWins: 55,
    canonicalLosses: 40,
    canonicalPushes: 5,
  });
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
    performancePolicy: policy,
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
  };
}

describe("createJarvisHistory ring buffer", () => {
  it("starts empty", () => {
    const h = createJarvisHistory(5);
    expect(h.size()).toBe(0);
    expect(h.recent()).toEqual([]);
  });

  it("rejects non-positive capacities at construction", () => {
    expect(() => createJarvisHistory(0)).toThrow();
    expect(() => createJarvisHistory(-1)).toThrow();
    expect(() => createJarvisHistory(Number.NaN)).toThrow();
  });

  it("pushes assessments and orders recent() newest-first", () => {
    const h = createJarvisHistory(10);
    const a1 = synthesizeJarvis(input(0));
    const a2 = synthesizeJarvis(input(30));
    const a3 = synthesizeJarvis(input(60));
    h.push(a1);
    h.push(a2);
    h.push(a3);
    expect(h.size()).toBe(3);
    const recent = h.recent();
    expect(recent[0]!.assessedAt).toBe(a3.assessedAt);
    expect(recent[1]!.assessedAt).toBe(a2.assessedAt);
    expect(recent[2]!.assessedAt).toBe(a1.assessedAt);
  });

  it("drops oldest entries when capacity is exceeded", () => {
    const h = createJarvisHistory(2);
    const a1 = synthesizeJarvis(input(0));
    const a2 = synthesizeJarvis(input(30));
    const a3 = synthesizeJarvis(input(60));
    h.push(a1);
    h.push(a2);
    h.push(a3);
    expect(h.size()).toBe(2);
    const recent = h.recent();
    expect(recent.map((s) => s.assessedAt)).toEqual([a3.assessedAt, a2.assessedAt]);
  });

  it("recent(n) returns at most n entries", () => {
    const h = createJarvisHistory(10);
    for (let i = 0; i < 5; i++) h.push(synthesizeJarvis(input(i * 10)));
    expect(h.recent(3).length).toBe(3);
    expect(h.recent(100).length).toBe(5);
  });

  it("clear() empties the buffer", () => {
    const h = createJarvisHistory(5);
    h.push(synthesizeJarvis(input(0)));
    h.clear();
    expect(h.size()).toBe(0);
    expect(h.recent()).toEqual([]);
  });

  it("recent(0) returns all entries (0 is not a positive n — falls back to buf.length)", () => {
    const h = createJarvisHistory(10);
    h.push(synthesizeJarvis(input(0)));
    h.push(synthesizeJarvis(input(30)));
    h.push(synthesizeJarvis(input(60)));
    // n=0 fails the `n > 0` check so take = buf.length = 3
    expect(h.recent(0).length).toBe(3);
  });

  it("float capacity is floored: createJarvisHistory(2.7) keeps at most 2 entries", () => {
    const h = createJarvisHistory(2.7);
    h.push(synthesizeJarvis(input(0)));
    h.push(synthesizeJarvis(input(30)));
    h.push(synthesizeJarvis(input(60)));
    // capacity is Math.floor(2.7) = 2
    expect(h.size()).toBe(2);
  });

  it("rejects Infinity capacity", () => {
    expect(() => createJarvisHistory(Infinity)).toThrow();
  });

  it("snapshotFromAssessment captures the headline fields and counts", () => {
    const a = synthesizeJarvis(input(0));
    const s = snapshotFromAssessment(a);
    expect(s.launchStatus).toBe(a.launchStatus);
    expect(s.ingestionStatus).toBe(a.ingestionStatus);
    expect(s.safetyWarningCount).toBe(a.safetyWarnings.length);
    expect(s.externalConfigCount).toBe(a.externalConfigWarnings.length);
    expect(s.recommendedActionCount).toBe(a.recommendedNextActions.length);
  });
});

describe("sharedJarvisHistory()", () => {
  it("returns the same instance across calls (singleton)", () => {
    const a = sharedJarvisHistory();
    const b = sharedJarvisHistory();
    expect(a).toBe(b);
  });

  it("is independent from a freshly-created buffer", () => {
    const a = sharedJarvisHistory();
    const c = createJarvisHistory(5);
    expect(a).not.toBe(c);
  });

  it("survives across createJarvisHistory calls (no side effects on the shared buffer)", () => {
    const before = sharedJarvisHistory().size();
    createJarvisHistory(3); // unrelated buffer, should not touch shared
    const after = sharedJarvisHistory().size();
    expect(after).toBe(before);
  });
});
