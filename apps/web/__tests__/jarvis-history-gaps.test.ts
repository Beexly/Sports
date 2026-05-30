/**
 * Targeted coverage for createJarvisHistory branches not reached by
 * jarvis-history.test.ts.
 *
 * The primary test covers: starts empty, invalid capacity throws, push/recent
 * ordering, capacity overflow, recent(n) for valid n, clear(), sharedJarvisHistory.
 *
 * This file covers:
 *   - recent(0)  → n=0 is not > 0, so falls back to buf.length (all entries)
 *   - recent(-1) → n<0 is not > 0, so falls back to buf.length
 *   - recent(NaN) → typeof NaN==="number" but NaN>0 is false → buf.length
 *   - recent(2.5) → Math.floor(2.5) = 2 (fractional n is floored)
 *   - createJarvisHistory(2.7) → Math.floor(2.7) = 2 (float capacity floored)
 *   - createJarvisHistory(NaN) and createJarvisHistory(-0.5) → throws
 */

import { describe, it, expect } from "vitest";
import { createJarvisHistory } from "@/lib/cockpit/jarvis-history";
import { synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

const NOW = new Date("2026-05-22T12:00:00Z");

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

// ============================================================
// recent(0) and recent(negative) → falls back to buf.length
// ============================================================

describe("createJarvisHistory.recent — non-positive n falls back to all entries", () => {
  it("recent(0) returns all entries (0 is not > 0)", () => {
    const h = createJarvisHistory(10);
    h.push(synthesizeJarvis(input(0)));
    h.push(synthesizeJarvis(input(1)));
    h.push(synthesizeJarvis(input(2)));

    expect(h.recent(0)).toHaveLength(3);
  });

  it("recent(-1) returns all entries (negative is not > 0)", () => {
    const h = createJarvisHistory(10);
    h.push(synthesizeJarvis(input(0)));
    h.push(synthesizeJarvis(input(1)));

    expect(h.recent(-1)).toHaveLength(2);
  });

  it("recent(-100) returns all entries", () => {
    const h = createJarvisHistory(10);
    for (let i = 0; i < 4; i++) h.push(synthesizeJarvis(input(i)));

    expect(h.recent(-100)).toHaveLength(4);
  });
});

// ============================================================
// recent(NaN) → typeof NaN === "number" but NaN > 0 is false → buf.length
// ============================================================

describe("createJarvisHistory.recent — NaN n falls back to all entries", () => {
  it("recent(NaN) returns all entries (NaN > 0 is false)", () => {
    const h = createJarvisHistory(10);
    h.push(synthesizeJarvis(input(0)));
    h.push(synthesizeJarvis(input(1)));

    expect(h.recent(NaN)).toHaveLength(2);
  });
});

// ============================================================
// recent(float) → Math.floor(n) applied
// ============================================================

describe("createJarvisHistory.recent — fractional n is floored", () => {
  it("recent(2.5) returns 2 entries (Math.floor(2.5) = 2)", () => {
    const h = createJarvisHistory(10);
    for (let i = 0; i < 5; i++) h.push(synthesizeJarvis(input(i)));

    expect(h.recent(2.5)).toHaveLength(2);
  });

  it("recent(1.9) returns 1 entry (Math.floor(1.9) = 1)", () => {
    const h = createJarvisHistory(10);
    h.push(synthesizeJarvis(input(0)));
    h.push(synthesizeJarvis(input(1)));
    h.push(synthesizeJarvis(input(2)));

    expect(h.recent(1.9)).toHaveLength(1);
  });
});

// ============================================================
// createJarvisHistory(float capacity) → Math.floor applied
// ============================================================

describe("createJarvisHistory — float capacity is floored", () => {
  it("capacity 2.7 behaves as capacity 2 (floor to integer)", () => {
    const h = createJarvisHistory(2.7);
    h.push(synthesizeJarvis(input(0)));
    h.push(synthesizeJarvis(input(1)));
    h.push(synthesizeJarvis(input(2))); // would exceed 3, but capacity is 2
    expect(h.size()).toBe(2);
  });

  it("capacity 5.99 behaves as capacity 5", () => {
    const h = createJarvisHistory(5.99);
    for (let i = 0; i < 6; i++) h.push(synthesizeJarvis(input(i)));
    expect(h.size()).toBe(5);
  });
});

// ============================================================
// createJarvisHistory — invalid capacities throw
// ============================================================

describe("createJarvisHistory — invalid capacity throws", () => {
  it("throws for NaN capacity", () => {
    expect(() => createJarvisHistory(NaN)).toThrow(/positive integer/);
  });

  it("throws for 0 capacity", () => {
    expect(() => createJarvisHistory(0)).toThrow(/positive integer/);
  });

  it("throws for negative float capacity", () => {
    expect(() => createJarvisHistory(-0.5)).toThrow(/positive integer/);
  });

  it("throws for -Infinity", () => {
    expect(() => createJarvisHistory(-Infinity)).toThrow(/positive integer/);
  });
});
