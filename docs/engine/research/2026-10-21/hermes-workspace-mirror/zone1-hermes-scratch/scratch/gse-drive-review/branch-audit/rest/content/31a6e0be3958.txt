/**
 * Targeted unit tests for the individual exported pure functions in game-context.ts.
 *
 * The primary game-context.test.ts covers computeGameContext (the composite entry point).
 * This file directly unit-tests each sub-function for branch coverage.
 */

import { describe, it, expect } from "vitest";
import {
  computeLineMovementScore,
  computeRestAdvantageScore,
  computeDataQuality,
  computeHeadToHeadScore,
  computeVenueFormScore,
  computeCrossMarketScore,
  computeScheduleStressScore,
  computeUncertaintyPenalty,
} from "../game-context.js";

// ============================================================
// computeLineMovementScore
// ============================================================

describe("computeLineMovementScore", () => {
  it("returns zero when opening line is null", () => {
    const result = computeLineMovementScore(null, -3.5, "SPREAD", "HOME");
    expect(result.score).toBe(0);
    expect(result.delta).toBeNull();
    expect(result.factor).toBeNull();
  });

  it("returns zero when current line is null", () => {
    const result = computeLineMovementScore(-3.5, null, "SPREAD", "HOME");
    expect(result.score).toBe(0);
    expect(result.delta).toBeNull();
  });

  it("returns neutral factor when delta < 0.1 (stable line)", () => {
    const result = computeLineMovementScore(-3.5, -3.5, "SPREAD", "HOME");
    expect(result.score).toBe(0);
    expect(result.delta).toBe(0);
    expect(result.factor?.impact).toBe("neutral");
  });

  it("returns neutral factor when delta is 0.05 (below movement threshold)", () => {
    const result = computeLineMovementScore(-3.5, -3.45, "SPREAD", "HOME");
    expect(result.score).toBe(0);
    expect(result.factor?.impact).toBe("neutral");
  });

  // Spread picks
  it("SPREAD HOME: delta < 0 (line moved more negative) → positive score", () => {
    const result = computeLineMovementScore(-3.5, -5.5, "SPREAD", "HOME");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.impact).toBe("positive");
  });

  it("SPREAD HOME: delta > 0 (line moved less negative) → negative score", () => {
    const result = computeLineMovementScore(-3.5, -2.0, "SPREAD", "HOME");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
  });

  it("SPREAD AWAY: delta > 0 → positive score (away team being bet)", () => {
    const result = computeLineMovementScore(-3.5, -2.0, "SPREAD", "AWAY");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.impact).toBe("positive");
  });

  it("SPREAD AWAY: delta < 0 → negative score (home team being bet)", () => {
    const result = computeLineMovementScore(-3.5, -5.5, "SPREAD", "AWAY");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
  });

  // Total picks
  it("TOTAL OVER: delta > 0 (total rising) → positive score", () => {
    const result = computeLineMovementScore(48, 50, "TOTAL", "OVER");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.impact).toBe("positive");
  });

  it("TOTAL OVER: delta < 0 (total falling) → negative score", () => {
    const result = computeLineMovementScore(48, 46, "TOTAL", "OVER");
    expect(result.score).toBeLessThan(0);
  });

  it("TOTAL UNDER: delta < 0 (total falling) → positive score", () => {
    const result = computeLineMovementScore(48, 46, "TOTAL", "UNDER");
    expect(result.score).toBeGreaterThan(0);
  });

  it("TOTAL UNDER: delta > 0 (total rising) → negative score", () => {
    const result = computeLineMovementScore(48, 50, "TOTAL", "UNDER");
    expect(result.score).toBeLessThan(0);
  });

  it("score magnitude scales with delta size (3pt = max)", () => {
    const small = computeLineMovementScore(-3.5, -4.5, "SPREAD", "HOME"); // 1pt move
    const large = computeLineMovementScore(-3.5, -6.5, "SPREAD", "HOME"); // 3pt move
    expect(large.score).toBeGreaterThan(small.score);
  });

  it("factor description contains 'confirming' when delta confirms pick", () => {
    const result = computeLineMovementScore(-3.5, -5.5, "SPREAD", "HOME");
    expect(result.factor?.description).toContain("confirming");
  });

  it("factor description contains 'fading' when delta fades pick", () => {
    const result = computeLineMovementScore(-3.5, -2.0, "SPREAD", "HOME");
    expect(result.factor?.description).toContain("fading");
  });
});

// ============================================================
// computeRestAdvantageScore
// ============================================================

describe("computeRestAdvantageScore", () => {
  it("returns zero when both rest days are null and no B2B flags", () => {
    const result = computeRestAdvantageScore(null, null, false, false, "HOME");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("HOME B2B → negative score for HOME pick (home disadvantaged)", () => {
    const result = computeRestAdvantageScore(null, null, true, false, "HOME");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.description).toContain("back-to-back");
  });

  it("AWAY B2B → positive score for HOME pick (away disadvantaged)", () => {
    const result = computeRestAdvantageScore(null, null, false, true, "HOME");
    expect(result.score).toBeGreaterThan(0);
  });

  it("HOME B2B flips to positive for AWAY pick", () => {
    const result = computeRestAdvantageScore(null, null, true, false, "AWAY");
    expect(result.score).toBeGreaterThan(0);
  });

  it("3 vs 1 rest days: positive for HOME pick (home has more rest)", () => {
    const result = computeRestAdvantageScore(3, 1, false, false, "HOME");
    expect(result.score).toBeGreaterThan(0);
  });

  it("1 vs 3 rest days: negative for HOME pick (away has more rest)", () => {
    const result = computeRestAdvantageScore(1, 3, false, false, "HOME");
    expect(result.score).toBeLessThan(0);
  });

  it("1 vs 3 rest days: positive for AWAY pick (away has more rest)", () => {
    const result = computeRestAdvantageScore(1, 3, false, false, "AWAY");
    expect(result.score).toBeGreaterThan(0);
  });

  it("equal rest days (3 vs 3): score is 0", () => {
    const result = computeRestAdvantageScore(3, 3, false, false, "HOME");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("1-day rest difference: score is non-zero but smaller than 2-day diff", () => {
    const one = computeRestAdvantageScore(3, 2, false, false, "HOME");
    const two = computeRestAdvantageScore(4, 2, false, false, "HOME");
    expect(Math.abs(two.score)).toBeGreaterThanOrEqual(Math.abs(one.score));
  });
});

// ============================================================
// computeDataQuality
// ============================================================

describe("computeDataQuality", () => {
  it("returns qualityScore 0 when called with all defaults", () => {
    const result = computeDataQuality(0, 90, false, false, false);
    expect(result.qualityScore).toBe(0);
  });

  it("coverage score scales linearly: 10 books = 40pts (max)", () => {
    const result = computeDataQuality(10, 90, false, false, false);
    // coverage=40, freshness=0 (90min), market=0 → total=40
    expect(result.qualityScore).toBe(40);
  });

  it("freshness score scales: 0 min = 30pts, 90 min = 0pts", () => {
    const fresh = computeDataQuality(0, 0, false, false, false);
    const stale = computeDataQuality(0, 90, false, false, false);
    expect(fresh.qualityScore).toBe(30);
    expect(stale.qualityScore).toBe(0);
  });

  it("each market type contributes 10pts to market score", () => {
    const none = computeDataQuality(0, 90, false, false, false);
    const spread = computeDataQuality(0, 90, true, false, false);
    const both = computeDataQuality(0, 90, true, true, false);
    const all = computeDataQuality(0, 90, true, true, true);
    expect(spread.qualityScore - none.qualityScore).toBe(10);
    expect(both.qualityScore - none.qualityScore).toBe(20);
    expect(all.qualityScore - none.qualityScore).toBe(30);
  });

  it("applies -15 penalty when qualityScore < 30", () => {
    // coverage=0 (0 books), freshness=0 (90min), market=0 → score=0 → penalty -15
    const result = computeDataQuality(0, 90, false, false, false);
    expect(result.penalty).toBe(-15);
    expect(result.factor?.name).toBe("Data Quality");
  });

  it("applies -8 penalty when qualityScore is in [30, 50)", () => {
    // 5 books = 20pts coverage, 90min = 0pts freshness, spread+total = 20pts → total=40
    const result = computeDataQuality(5, 90, true, true, false);
    expect(result.qualityScore).toBe(40);
    expect(result.penalty).toBe(-8);
  });

  it("no penalty when qualityScore is in [50, 70)", () => {
    // 8 books = 32pts coverage, 0min = 30pts freshness, spread = 10pts → total=72... let me recalc
    // Actually: 5 books = 20pts, 0min freshness = 30pts, spread+total = 20pts → 70 → no penalty
    const result = computeDataQuality(5, 0, true, true, false);
    expect(result.qualityScore).toBeGreaterThanOrEqual(50);
    expect(result.penalty).toBe(0);
  });

  it("no penalty when qualityScore is >= 70", () => {
    const result = computeDataQuality(10, 0, true, true, false);
    expect(result.penalty).toBe(0);
    expect(result.factor).toBeNull();
  });
});

// ============================================================
// computeHeadToHeadScore
// ============================================================

describe("computeHeadToHeadScore", () => {
  it("returns zero when form is null", () => {
    const result = computeHeadToHeadScore(null);
    expect(result.score).toBe(0);
    expect(result.atsPct).toBeNull();
  });

  it("returns zero when sampleSize < 5 (minimum sample gate)", () => {
    const result = computeHeadToHeadScore({ wins: 4, losses: 0, pushes: 0, sampleSize: 4 });
    expect(result.score).toBe(0);
  });

  it("returns zero when decided = 0 (all pushes)", () => {
    const result = computeHeadToHeadScore({ wins: 0, losses: 0, pushes: 5, sampleSize: 5 });
    expect(result.score).toBe(0);
    expect(result.atsPct).toBeNull();
  });

  it("atsPct >= 0.70 → score = 5 (strong H2H)", () => {
    // 7 wins, 1 loss = 87.5%
    const result = computeHeadToHeadScore({ wins: 7, losses: 1, pushes: 0, sampleSize: 8 });
    expect(result.score).toBe(5);
    expect(result.factor?.impact).toBe("positive");
  });

  it("atsPct >= 0.60 and < 0.70 → score = 3 (favorable H2H)", () => {
    // 3 wins, 2 losses = 60%
    const result = computeHeadToHeadScore({ wins: 3, losses: 2, pushes: 0, sampleSize: 5 });
    expect(result.score).toBe(3);
    expect(result.factor?.impact).toBe("positive");
  });

  it("atsPct <= 0.30 → score = -5 (poor H2H)", () => {
    // 1 win, 4 losses = 20%
    const result = computeHeadToHeadScore({ wins: 1, losses: 4, pushes: 0, sampleSize: 5 });
    expect(result.score).toBe(-5);
    expect(result.factor?.impact).toBe("negative");
  });

  it("atsPct <= 0.40 and > 0.30 → score = -3 (below average H2H)", () => {
    // 2 wins, 5 losses = 28.6%... that's ≤ 0.30, need 40%
    // 2 wins, 3 losses = 40% exactly
    const result = computeHeadToHeadScore({ wins: 2, losses: 3, pushes: 0, sampleSize: 5 });
    expect(result.score).toBe(-3);
    expect(result.factor?.impact).toBe("negative");
  });

  it("neutral ATS (0.41-0.59) → score = 0, factor = null", () => {
    // 3 wins, 4 losses = 42.9%
    const result = computeHeadToHeadScore({ wins: 3, losses: 4, pushes: 0, sampleSize: 7 });
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("provides atsPct as decimal fraction (not percentage)", () => {
    const result = computeHeadToHeadScore({ wins: 7, losses: 3, pushes: 0, sampleSize: 10 });
    expect(result.atsPct).toBeCloseTo(0.7, 5);
  });
});

// ============================================================
// computeVenueFormScore
// ============================================================

describe("computeVenueFormScore", () => {
  it("returns zero when form is null", () => {
    const result = computeVenueFormScore(null, "Home");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("returns zero when sampleSize < 5", () => {
    const result = computeVenueFormScore({ wins: 4, losses: 0, pushes: 0, sampleSize: 4 }, "Home");
    expect(result.score).toBe(0);
  });

  it("atsPct >= 0.65 → score = 5 (strong venue form)", () => {
    // 7 wins, 2 losses = 77.8%
    const result = computeVenueFormScore({ wins: 7, losses: 2, pushes: 0, sampleSize: 9 }, "Home");
    expect(result.score).toBe(5);
  });

  it("atsPct >= 0.58 and < 0.65 → score = 3", () => {
    // 8 wins, 5 losses = 61.5% ... let me use 7/12 = 58.3%
    const result = computeVenueFormScore({ wins: 7, losses: 5, pushes: 0, sampleSize: 12 }, "Away");
    expect(result.score).toBe(3);
  });

  it("atsPct <= 0.35 → score = -5 (poor venue form)", () => {
    // 1 wins, 5 losses = 16.7%
    const result = computeVenueFormScore({ wins: 1, losses: 5, pushes: 0, sampleSize: 6 }, "Home");
    expect(result.score).toBe(-5);
  });

  it("atsPct <= 0.42 and > 0.35 → score = -3", () => {
    // 2 wins, 5 losses = 28.6%... ≤0.35, need 0.36-0.42
    // 3 wins, 5 losses = 37.5%
    const result = computeVenueFormScore({ wins: 3, losses: 5, pushes: 0, sampleSize: 8 }, "Home");
    expect(result.score).toBe(-3);
  });

  it("factor name includes the venue label", () => {
    const homeResult = computeVenueFormScore({ wins: 7, losses: 2, pushes: 0, sampleSize: 9 }, "Home");
    const awayResult = computeVenueFormScore({ wins: 7, losses: 2, pushes: 0, sampleSize: 9 }, "Away");
    expect(homeResult.factor?.name).toContain("Home");
    expect(awayResult.factor?.name).toContain("Away");
  });
});

// ============================================================
// computeCrossMarketScore
// ============================================================

describe("computeCrossMarketScore", () => {
  it("returns zero when marketType is TOTAL", () => {
    const result = computeCrossMarketScore("OVER", 0.65, "TOTAL");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("returns zero when marketType is MONEYLINE", () => {
    const result = computeCrossMarketScore("HOME", 0.65, "MONEYLINE");
    expect(result.score).toBe(0);
  });

  it("returns zero when mlFairProbHome is null", () => {
    const result = computeCrossMarketScore("HOME", null, "SPREAD");
    expect(result.score).toBe(0);
  });

  it("returns zero when mlFairProbHome is undefined", () => {
    const result = computeCrossMarketScore("HOME", undefined, "SPREAD");
    expect(result.score).toBe(0);
  });

  it("returns zero when ML probability is too close to 50% (< 5% edge)", () => {
    // 0.52 → |0.52 - 0.5| = 0.02 < 0.05 → no signal
    const result = computeCrossMarketScore("HOME", 0.52, "SPREAD");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("AGREE: ML favors HOME + picked HOME → positive cross-market score", () => {
    // mlFairProbHome = 0.65 → ML favors home; pick = HOME → agree
    const result = computeCrossMarketScore("HOME", 0.65, "SPREAD");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.name).toBe("Cross-Market Alignment");
    expect(result.factor?.impact).toBe("positive");
  });

  it("AGREE: ML favors AWAY + picked AWAY → positive cross-market score", () => {
    // mlFairProbHome = 0.35 → ML favors away; pick = AWAY → agree
    const result = computeCrossMarketScore("AWAY", 0.35, "SPREAD");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.name).toBe("Cross-Market Alignment");
  });

  it("DISAGREE: ML favors HOME + picked AWAY → negative cross-market score", () => {
    const result = computeCrossMarketScore("AWAY", 0.65, "SPREAD");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.name).toBe("Cross-Market Divergence");
    expect(result.factor?.impact).toBe("negative");
  });

  it("DISAGREE: ML favors AWAY + picked HOME → negative cross-market score", () => {
    const result = computeCrossMarketScore("HOME", 0.35, "SPREAD");
    expect(result.score).toBeLessThan(0);
  });
});

// ============================================================
// computeScheduleStressScore
// ============================================================

describe("computeScheduleStressScore", () => {
  it("returns zero for OVER pick (totals are not side-specific)", () => {
    const result = computeScheduleStressScore(4, 1, "OVER");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("returns zero for UNDER pick", () => {
    const result = computeScheduleStressScore(4, 1, "UNDER");
    expect(result.score).toBe(0);
  });

  it("returns zero when home density is null", () => {
    const result = computeScheduleStressScore(null, 2, "HOME");
    expect(result.score).toBe(0);
  });

  it("returns zero when away density is null", () => {
    const result = computeScheduleStressScore(3, null, "HOME");
    expect(result.score).toBe(0);
  });

  it("returns zero when density difference < 2 (below threshold)", () => {
    // diff = 3-2 = 1 → below 2-game threshold
    const result = computeScheduleStressScore(3, 2, "HOME");
    expect(result.score).toBe(0);
  });

  it("returns zero when densities are equal", () => {
    const result = computeScheduleStressScore(3, 3, "HOME");
    expect(result.score).toBe(0);
  });

  it("HOME more fatigued (diff >= 2), HOME pick → negative score", () => {
    // Home played 4, Away played 1 → diff = 3 → home fatigued
    const result = computeScheduleStressScore(4, 1, "HOME");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
  });

  it("HOME more fatigued (diff >= 2), AWAY pick → positive score", () => {
    const result = computeScheduleStressScore(4, 1, "AWAY");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.impact).toBe("positive");
  });

  it("AWAY more fatigued (diff >= 2), HOME pick → positive score", () => {
    // Away played 4, Home played 1 → diff = -3 (home-away) → away fatigued
    const result = computeScheduleStressScore(1, 4, "HOME");
    expect(result.score).toBeGreaterThan(0);
  });

  it("AWAY more fatigued (diff >= 2), AWAY pick → negative score", () => {
    const result = computeScheduleStressScore(1, 4, "AWAY");
    expect(result.score).toBeLessThan(0);
  });

  it("score capped at SCHEDULE_STRESS_COMPONENT_MAX (5) in both directions", () => {
    const homeResult = computeScheduleStressScore(10, 1, "HOME");
    const awayResult = computeScheduleStressScore(10, 1, "AWAY");
    expect(homeResult.score).toBeGreaterThanOrEqual(-5);
    expect(awayResult.score).toBeLessThanOrEqual(5);
  });
});

// ============================================================
// computeUncertaintyPenalty
// ============================================================

describe("computeUncertaintyPenalty", () => {
  it("returns zero penalty when no conflicts present", () => {
    const result = computeUncertaintyPenalty(5, 3, 2, 4);
    expect(result.penalty).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("conflict 1: lineMovement < -5 AND formScore > 3 → penalty triggered", () => {
    // lineMovement = -6, formScore = 5, h2h = 0, cross = 0
    const result = computeUncertaintyPenalty(-6, 5, 0, 0);
    expect(result.penalty).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
    expect(result.factor?.name).toBe("Signal Conflict");
  });

  it("conflict 1: lineMovement < -5 AND h2hScore > 2 (h2h variant) → penalty triggered", () => {
    const result = computeUncertaintyPenalty(-6, 0, 3, 0);
    expect(result.penalty).toBeLessThan(0);
  });

  it("conflict 2: lineMovement < -8 AND formScore > 5 → additional penalty", () => {
    const oneConflict = computeUncertaintyPenalty(-6, 5, 0, 0);  // conflict 1 only
    const twoConflicts = computeUncertaintyPenalty(-9, 6, 0, 0); // conflict 1 + 2
    expect(twoConflicts.penalty).toBeLessThanOrEqual(oneConflict.penalty);
  });

  it("conflict 3: crossMarket < 0 AND lineMovement < -3 → additional penalty", () => {
    const noConflict = computeUncertaintyPenalty(-2, 0, 0, -2);   // cross neg but line mild
    const conflict3 = computeUncertaintyPenalty(-4, 0, 0, -2);    // cross neg + line < -3
    expect(conflict3.penalty).toBeLessThan(noConflict.penalty);
  });

  it("penalty is capped at UNCERTAINTY_PENALTY_MAX (-8) even with 3 conflicts", () => {
    // 3 conflicts: conflict 1 (-9<-5 && form=7>3), conflict 2 (-9<-8 && form=7>5),
    // conflict 3 (cross=-2<0 && line=-9<-3) → 3*-4=-12, clamped to -8
    const result = computeUncertaintyPenalty(-9, 7, 0, -2);
    expect(result.penalty).toBe(-8); // clamped at UNCERTAINTY_PENALTY_MAX
  });

  it("penalty capped at UNCERTAINTY_PENALTY_MAX (-8) for 2 conflicts", () => {
    // 2 conflicts → 2 * -4 = -8 (exactly at cap)
    const result = computeUncertaintyPenalty(-9, 6, 0, 0);
    // conflict 1: -9 < -5 && formScore=6 > 3 → yes
    // conflict 2: -9 < -8 && formScore=6 > 5 → yes
    // conflict 3: crossMarket=0 not < 0 → no
    expect(result.penalty).toBe(-8);
  });

  it("factor description includes conflict descriptions", () => {
    const result = computeUncertaintyPenalty(-6, 5, 0, 0);
    expect(result.factor?.description).toContain("Conflicting signals");
  });
});
