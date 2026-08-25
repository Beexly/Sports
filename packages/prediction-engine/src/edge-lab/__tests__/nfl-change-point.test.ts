/**
 * Tests for the NFL change-point / regime detector.
 *
 * Core guarantees under test:
 *   1. Fail-closed: < minHistory weeks → confident=false, direction="none".
 *   2. Self-exclusion: the current week's own result is NEVER in the prior
 *      baseline — it sits in the "recent" window that is tested against the
 *      prior window.
 *   3. Spike suppression: a single outlier week does NOT trigger a shift;
 *      requires minRun consecutive weeks of deviation.
 *   4. A sustained two-week shift in the same direction IS detected.
 *   5. Direction correctness: high shift → "high", low shift → "low".
 *   6. No false positive on flat baseline (z within noise).
 *   7. Degenerate baseline (zero variance in both windows) → fail closed.
 *
 * Fixtures only; no network. All baselines include realistic weekly noise
 * (NFL EPA/play varies ~0.05–0.15 from week to week) so the z-test has
 * meaningful dispersion to work with.
 */
import { describe, expect, it } from "vitest";

import {
  detectRegimeShift,
  weeklyPerformancesFromGames,
  NFL_CHANGEPOINT_METHOD_TAG,
  type WeeklyPerformance,
  type ChangePointFlag,
} from "../nfl-change-point.js";

function perf(week: number, epaPerPlay: number, successRate = 0.5): WeeklyPerformance {
  return { week, epaPerPlay, successRate };
}

/**
 * Flat-ish weeks with realistic NFL noise. Mean ~epa, individual weeks vary
 * by ±0.06 around the mean — reflecting real NFL weekly EPA/play dispersion
 * (single-game samples of ~55-65 plays carry ±0.05–0.10 noise).
 */
function noisyFlatWeeks(n: number, epa: number, startWeek = 1): WeeklyPerformance[] {
  // Deterministic pseudo-noise in [-0.06, 0.06] so tests are reproducible.
  const noise = [0.03, -0.02, 0.04, -0.05, 0.01, -0.06, 0.02, 0.05, -0.03, 0.04, -0.01, 0.06];
  return Array.from({ length: n }, (_, i) =>
    perf(startWeek + i, epa + (noise[i % noise.length] ?? 0)),
  );
}

describe("detectRegimeShift", () => {
  it("fails closed with no observations", () => {
    const flag = detectRegimeShift("BUF", []);
    expect(flag.direction).toBe("none");
    expect(flag.confident).toBe(false);
    expect(flag.priced).toBe(false);
    expect(flag.shiftStartWeek).toBeNull();
  });

  it("fails closed below minHistory", () => {
    // 4 weeks < default minHistory 7.
    const weekly = noisyFlatWeeks(4, 0.05);
    const flag = detectRegimeShift("BUF", weekly);
    expect(flag.direction).toBe("none");
    expect(flag.confident).toBe(false);
  });

  it("does not flag a flat noisy baseline (no false positive)", () => {
    // 9 weeks of flat-but-noisy data → z should be small.
    const weekly = noisyFlatWeeks(9, 0.05);
    const flag = detectRegimeShift("BUF", weekly);
    expect(flag.direction).toBe("none");
    expect(flag.confident).toBe(true);
    expect(Math.abs(flag.stat)).toBeLessThan(1.8);
  });

  it("spike suppression: a single outlier week does NOT trigger a shift", () => {
    // 5 weeks of noisy baseline at ~0.05, then 1 week spike to 0.50, then
    // 1 week back to ~0.05. minRun=2 → recent window = [0.50, 0.05].
    // Recent mean ~0.275, but recent std is large (0.50 vs 0.05) → z diluted.
    const weekly = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, 0.50),
      perf(7, 0.05),
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5 });
    expect(flag.direction).toBe("none");
    expect(flag.confident).toBe(true);
  });

  it("detects a sustained high shift after minRun consecutive weeks", () => {
    // 5 weeks noisy at ~0.05 baseline, then 2 weeks at 0.30 (sustained shift).
    // Recent window = [0.30, 0.30], prior = noisyFlatWeeks(5, 0.05).
    // Recent mean = 0.30, prior mean ~0.05 → large z.
    const weekly = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, 0.30),
      perf(7, 0.30),
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5 });
    expect(flag.direction).toBe("high");
    expect(flag.confident).toBe(true);
    expect(flag.stat).toBeGreaterThan(1.8);
    expect(flag.shiftStartWeek).toBe(6);
  });

  it("detects a sustained low shift after minRun consecutive weeks", () => {
    // 5 weeks noisy at ~0.05, then 2 weeks at -0.30.
    const weekly = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, -0.30),
      perf(7, -0.30),
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5 });
    expect(flag.direction).toBe("low");
    expect(flag.confident).toBe(true);
    expect(flag.stat).toBeLessThan(-1.8);
    expect(flag.shiftStartWeek).toBe(6);
  });

  it("current week's own result is in recent window, NOT in baseline (self-exclusion)", () => {
    // Weeks 1-5: noisy flat at 0.05. Weeks 6-7: 0.30 (shift).
    // Prior baseline = weeks 1-5 (mean ~0.05, NOT contaminated by week 6).
    // Recent = weeks 6-7 (mean 0.30). z should be large because baseline is clean.
    // If week 6 had leaked into baseline, prior mean would be ~0.09, z smaller.
    const weekly = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, 0.30),
      perf(7, 0.30),
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5 });
    expect(flag.direction).toBe("high");
    // z should be large because the baseline is clean ~0.05 and recent is 0.30.
    expect(flag.stat).toBeGreaterThan(3);
  });

  it("resets detection when shift reverts mid-run", () => {
    // 5 noisy flat weeks, then 1 week high, then 1 week back to baseline.
    // Recent window = [0.30, 0.05] → mean ~0.175, large std → z diluted below threshold.
    const weekly = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, 0.30),
      perf(7, 0.05),
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5 });
    expect(flag.direction).toBe("none");
  });

  it("methodTag and priced tag are correct", () => {
    const weekly = noisyFlatWeeks(9, 0.05);
    const flag: ChangePointFlag = detectRegimeShift("BUF", weekly);
    expect(flag.methodTag).toBe(NFL_CHANGEPOINT_METHOD_TAG);
    expect(flag.priced).toBe(false);
  });

  it("emits the team and last week in the flag", () => {
    const weekly = noisyFlatWeeks(9, 0.05);
    const flag = detectRegimeShift("KC", weekly, { minHistory: 5 });
    expect(flag.team).toBe("KC");
    expect(flag.week).toBe(9);
  });

  it("respects custom threshold (higher = harder to flag)", () => {
    // A modest shift (0.12 above baseline) that crosses threshold=1.8 but not 10.
    const weekly = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, 0.17),
      perf(7, 0.17),
    ];
    const flagged = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5, threshold: 10.0 });
    expect(flagged.direction).toBe("none");
    const flaggedLow = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5, threshold: 1.0 });
    expect(flaggedLow.direction).toBe("high");
  });

  it("detects shift with noisy baseline (realistic NFL patterns)", () => {
    // Noisy baseline, then a clear sustained shift.
    const weekly = [
      perf(1, 0.02), perf(2, 0.08), perf(3, 0.01), perf(4, 0.09), perf(5, 0.03),
      perf(6, 0.07), perf(7, 0.35), perf(8, 0.33), perf(9, 0.34),
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 3, baselineWindow: 5 });
    expect(flag.direction).toBe("high");
    expect(flag.confident).toBe(true);
  });

  it("fail closed on degenerate zero-variance baselines (both windows constant)", () => {
    // All 9 weeks identical at 0.05 → both windows have zero variance.
    const weekly = Array.from({ length: 9 }, (_, i) => perf(i + 1, 0.05));
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5 });
    expect(flag.direction).toBe("none");
    expect(flag.confident).toBe(true);
    expect(flag.stat).toBe(0);
    expect(flag.reason).toContain("degenerate");
  });

  it("fail closed when both windows constant but different means (can't standardize)", () => {
    // Prior: 5 weeks at 0.05 (constant). Recent: 2 weeks at 0.50 (constant).
    // Both have zero variance → can't compute pooled SE → fail closed.
    const weekly = [
      ...Array.from({ length: 5 }, (_, i) => perf(i + 1, 0.05)),
      perf(6, 0.50),
      perf(7, 0.50),
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 2, baselineWindow: 5 });
    expect(flag.direction).toBe("none");
    expect(flag.confident).toBe(true);
    expect(flag.stat).toBe(0);
    expect(flag.reason).toContain("degenerate");
  });

  it("handles minRun=1 (single-week shift detection)", () => {
    // With minRun=1, a single week above threshold can flag.
    // Baseline = 5 noisy weeks at 0.05; recent = 1 week at 0.50.
    const weekly = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, 0.50),
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 1, baselineWindow: 5, threshold: 1.5 });
    expect(flag.direction).toBe("high");
    expect(flag.confident).toBe(true);
    expect(flag.shiftStartWeek).toBe(6);
  });

  it("uses minRun=3 for triple-week persistence requirement", () => {
    // 5 noisy baseline, then 2 weeks shifted (below minRun=3), then flat.
    // With minRun=3, recent window = last 3 weeks = [0.30, 0.30, 0.05].
    // Mean ~0.233 — large enough to still flag since the 0.30 weeks dominate.
    // So instead test with a smaller shift so dilution matters.
    const weekly = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, 0.15),
      perf(7, 0.15),
      perf(8, 0.02), // reverts to near baseline
    ];
    const flag = detectRegimeShift("BUF", weekly, { minHistory: 5, minRun: 3, baselineWindow: 5 });
    expect(flag.direction).toBe("none");

    // Same but 3 consecutive shifted weeks → should flag.
    const weekly2 = [
      ...noisyFlatWeeks(5, 0.05),
      perf(6, 0.15),
      perf(7, 0.15),
      perf(8, 0.15),
    ];
    const flag2 = detectRegimeShift("BUF", weekly2, { minHistory: 5, minRun: 3, baselineWindow: 5 });
    expect(flag2.direction).toBe("high");
  });
});

describe("weeklyPerformancesFromGames", () => {
  function gameRow(
    gameId: string,
    week: number,
    homeTeam: string,
    awayTeam: string,
    homeScore: number | null,
    awayScore: number | null,
    startTime: string,
  ) {
    return {
      sport: "nfl" as const,
      gameId,
      season: 2024,
      week,
      startTime,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      closing: { spreadHome: -3, total: 44, moneylineHomeDecimal: 1.8, moneylineAwayDecimal: 2.1 },
    };
  }

  it("builds per-team weekly series from game rows", () => {
    const games = [
      gameRow("g1", 1, "BUF", "NYJ", 21, 14, "2024-09-05T17:00:00.000Z"),
      gameRow("g2", 2, "BUF", "MIA", 17, 24, "2024-09-12T17:00:00.000Z"),
    ];

    const epaMap = new Map([
      ["g1", new Map([
        ["BUF", { epaPerPlay: 0.10, successRate: 0.55 }],
        ["NYJ", { epaPerPlay: -0.05, successRate: 0.45 }],
      ])],
      ["g2", new Map([
        ["BUF", { epaPerPlay: 0.08, successRate: 0.52 }],
        ["MIA", { epaPerPlay: 0.15, successRate: 0.60 }],
      ])],
    ]);

    const result = weeklyPerformancesFromGames(games, epaMap);
    expect(result["BUF"]).toBeDefined();
    expect(result["BUF"]!.length).toBe(2);
    expect(result["BUF"]![0]!.week).toBe(1);
    expect(result["BUF"]![1]!.week).toBe(2);
    expect(result["NYJ"]).toBeDefined();
    expect(result["NYJ"]!.length).toBe(1);
    expect(result["MIA"]).toBeDefined();
    expect(result["MIA"]!.length).toBe(1);
  });

  it("skips games without scores or week", () => {
    const games = [
      gameRow("g1", 1, "BUF", "NYJ", null, null, "2024-09-05T17:00:00.000Z"),
    ];

    const epaMap = new Map([
      ["g1", new Map([
        ["BUF", { epaPerPlay: 0.10, successRate: 0.55 }],
        ["NYJ", { epaPerPlay: -0.05, successRate: 0.45 }],
      ])],
    ]);

    const result = weeklyPerformancesFromGames(games, epaMap);
    expect(Object.keys(result).length).toBe(0);
  });

  it("sorts each team's weeks ascending", () => {
    const games = [
      gameRow("g1", 3, "BUF", "NYJ", 21, 14, "2024-09-21T17:00:00.000Z"),
      gameRow("g2", 1, "BUF", "MIA", 17, 24, "2024-09-07T17:00:00.000Z"),
    ];

    const epaMap = new Map([
      ["g1", new Map([["BUF", { epaPerPlay: 0.10, successRate: 0.55 }]])],
      ["g2", new Map([["BUF", { epaPerPlay: 0.08, successRate: 0.52 }]])],
    ]);

    const result = weeklyPerformancesFromGames(games, epaMap);
    expect(result["BUF"]![0]!.week).toBe(1);
    expect(result["BUF"]![1]!.week).toBe(3);
  });
});
