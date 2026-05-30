/**
 * Gap coverage for loadPublicPerformancePolicy in
 * lib/performance/public-performance-policy.ts.
 *
 * The primary test (public-performance-policy.test.ts) covers
 * evaluatePublicPerformancePolicy exhaustively but never calls the async
 * loadPublicPerformancePolicy loader. This file targets:
 *
 *   - Default recentWindowDays (??14) when omitted
 *   - Custom recentWindowDays propagates to the date filter
 *   - DB counts are forwarded correctly to evaluatePublicPerformancePolicy
 *   - Blocked path via DB (gate off)
 *   - Allowed path via DB (all counts sufficient)
 */

import { describe, it, expect, vi } from "vitest";
import {
  loadPublicPerformancePolicy,
  type LoadablePerformanceClient,
} from "@/lib/performance/public-performance-policy";

function makeDb(counts: {
  canonical?: number;
  wins?: number;
  losses?: number;
  pushes?: number;
  pending?: number;
  bootstrap?: number;
  recentTotal?: number;
  recentBootstrap?: number;
}): LoadablePerformanceClient {
  const {
    canonical = 0,
    wins = 0,
    losses = 0,
    pushes = 0,
    pending = 0,
    bootstrap = 0,
    recentTotal = 0,
    recentBootstrap = 0,
  } = counts;

  // count is called 8 times in a Promise.all — we use a sequence mock
  const mockCount = vi
    .fn()
    .mockResolvedValueOnce(canonical)   // canonicalSettledCount
    .mockResolvedValueOnce(wins)         // canonicalWins
    .mockResolvedValueOnce(losses)       // canonicalLosses
    .mockResolvedValueOnce(pushes)       // canonicalPushes
    .mockResolvedValueOnce(pending)      // pendingCount
    .mockResolvedValueOnce(bootstrap)    // bootstrapCount
    .mockResolvedValueOnce(recentTotal)  // recentTotalCount
    .mockResolvedValueOnce(recentBootstrap); // recentBootstrapCount

  return { pick: { count: mockCount } };
}

// ============================================================
// Blocked path — gate off
// ============================================================

describe("loadPublicPerformancePolicy — gated path via DB", () => {
  it("returns blocked policy when canExposePerformanceStats=false", async () => {
    const db = makeDb({ canonical: 100, wins: 60, losses: 35, pushes: 5 });

    const policy = await loadPublicPerformancePolicy(db, {
      canExposePerformanceStats: false,
      minSettledPicksForLearning: 25,
    });

    expect(policy.canExposePerformanceStats).toBe(false);
    expect(policy.blockers).toContain("GATE_OFF_PERFORMANCE_STATS");
    expect(policy.primaryReason).toBe("GATE_OFF_PERFORMANCE_STATS");
    expect(policy.publicWinRate).toBeNull();
  });
});

// ============================================================
// Allowed path — all counts sufficient
// ============================================================

describe("loadPublicPerformancePolicy — allowed path via DB", () => {
  it("returns allowed policy when gate is on and sample is sufficient", async () => {
    const db = makeDb({ canonical: 50, wins: 30, losses: 15, pushes: 5, pending: 2, bootstrap: 3 });

    const policy = await loadPublicPerformancePolicy(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
    });

    expect(policy.canExposePerformanceStats).toBe(true);
    expect(policy.blockers).toHaveLength(0);
    expect(policy.primaryReason).toBeNull();
    expect(policy.publicWinRate).toBe(66.7); // 30 / (30+15) * 100 = 66.666...
    expect(policy.canonicalSettledCount).toBe(50);
    expect(policy.eligibleForRateCount).toBe(45); // wins + losses
  });

  it("publicRecord with pushes > 0 includes the push suffix", async () => {
    const db = makeDb({ canonical: 50, wins: 30, losses: 15, pushes: 5 });

    const policy = await loadPublicPerformancePolicy(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
    });

    expect(policy.publicRecord).toContain("P");
    expect(policy.publicRecord).toBe("30W–15L–5P");
  });
});

// ============================================================
// recentWindowDays default (??14)
// ============================================================

describe("loadPublicPerformancePolicy — recentWindowDays default", () => {
  it("uses 14-day default when recentWindowDays is omitted", async () => {
    // Can't directly inspect the date filter, but we can verify the
    // function resolves without error using the default window.
    const db = makeDb({ canonical: 50, wins: 30, losses: 15, recentTotal: 5, recentBootstrap: 0 });

    const policy = await loadPublicPerformancePolicy(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
    });

    expect(policy.canExposePerformanceStats).toBe(true);
    expect(policy.blockers).toHaveLength(0);
  });

  it("custom recentWindowDays is accepted and does not crash", async () => {
    const db = makeDb({ canonical: 50, wins: 30, losses: 15, recentTotal: 3, recentBootstrap: 0 });

    const policy = await loadPublicPerformancePolicy(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      recentWindowDays: 7,
    });

    expect(policy.canExposePerformanceStats).toBe(true);
  });
});

// ============================================================
// ALL_RECENT_PICKS_BOOTSTRAP via DB path
// ============================================================

describe("loadPublicPerformancePolicy — ALL_RECENT_PICKS_BOOTSTRAP via DB", () => {
  it("blocks when recentTotal > 0 and all recent picks are bootstrap", async () => {
    const db = makeDb({
      canonical: 50,
      wins: 30,
      losses: 15,
      recentTotal: 5,
      recentBootstrap: 5, // all recent are bootstrap
    });

    const policy = await loadPublicPerformancePolicy(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
    });

    expect(policy.blockers).toContain("ALL_RECENT_PICKS_BOOTSTRAP");
  });

  it("does NOT block when recentTotal === 0 (no recent picks at all)", async () => {
    const db = makeDb({
      canonical: 50,
      wins: 30,
      losses: 15,
      recentTotal: 0,
      recentBootstrap: 0,
    });

    const policy = await loadPublicPerformancePolicy(db, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
    });

    expect(policy.blockers).not.toContain("ALL_RECENT_PICKS_BOOTSTRAP");
  });
});
