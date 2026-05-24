import { describe, it, expect } from "vitest";
import {
  computeLineMovementScore,
  computeRestAdvantageScore,
  computeHistoricalFormScore,
  computeDataQuality,
  computeHeadToHeadScore,
  computeVenueFormScore,
  computeCrossMarketScore,
  computeScheduleStressScore,
  computeUncertaintyPenalty,
  computeGameContext,
} from "../game-context";
import type { AtsFormBucket, GameContextInput } from "../game-context";

// ============================================================
// computeLineMovementScore
// ============================================================

describe("computeLineMovementScore", () => {
  it("returns zero score and null delta when opening line is missing", () => {
    const result = computeLineMovementScore(null, -3.5, "SPREAD", "HOME");
    expect(result.score).toBe(0);
    expect(result.delta).toBeNull();
    expect(result.factor).toBeNull();
  });

  it("returns zero score and null delta when current line is missing", () => {
    const result = computeLineMovementScore(-3.5, null, "SPREAD", "HOME");
    expect(result.score).toBe(0);
    expect(result.delta).toBeNull();
    expect(result.factor).toBeNull();
  });

  it("returns zero score when line is unchanged (delta < 0.1)", () => {
    const result = computeLineMovementScore(-3.5, -3.5, "SPREAD", "HOME");
    expect(result.score).toBe(0);
    expect(result.delta).toBe(0);
    expect(result.factor?.impact).toBe("neutral");
  });

  it("positive score for HOME when line moves negative (home favored more)", () => {
    const result = computeLineMovementScore(-3.5, -6.5, "SPREAD", "HOME");
    expect(result.score).toBeGreaterThan(0);
    expect(result.delta).toBeCloseTo(-3, 5);
    expect(result.factor?.impact).toBe("positive");
  });

  it("negative score for HOME when line moves positive (fade)", () => {
    const result = computeLineMovementScore(-3.5, -1.5, "SPREAD", "HOME");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
  });

  it("positive score for AWAY when line moves positive", () => {
    const result = computeLineMovementScore(-3.5, -1.5, "SPREAD", "AWAY");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.impact).toBe("positive");
  });

  it("positive score for OVER when total moves up", () => {
    const result = computeLineMovementScore(47.5, 49.5, "TOTAL", "OVER");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.impact).toBe("positive");
  });

  it("negative score for OVER when total moves down", () => {
    const result = computeLineMovementScore(47.5, 45.5, "TOTAL", "OVER");
    expect(result.score).toBeLessThan(0);
  });

  it("positive score for UNDER when total moves down", () => {
    const result = computeLineMovementScore(47.5, 45.5, "TOTAL", "UNDER");
    expect(result.score).toBeGreaterThan(0);
  });

  it("score is clamped to max 15", () => {
    // A 30-point line move would saturate the signal
    const result = computeLineMovementScore(0, -30, "SPREAD", "HOME");
    expect(result.score).toBeLessThanOrEqual(15);
  });

  it("score is clamped to min -15", () => {
    const result = computeLineMovementScore(0, 30, "SPREAD", "HOME");
    expect(result.score).toBeGreaterThanOrEqual(-15);
  });

  it("no side provided for SPREAD yields confirmsPick=false", () => {
    const result = computeLineMovementScore(-3.5, -6.5, "SPREAD");
    // Without a pickedSide the movement does not confirm either side
    expect(result.score).toBeLessThanOrEqual(0);
  });
});

// ============================================================
// computeRestAdvantageScore
// ============================================================

describe("computeRestAdvantageScore", () => {
  it("returns zero when all inputs are null/undefined (no data)", () => {
    const result = computeRestAdvantageScore(null, null, false, false, "HOME");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("applies B2B penalty when home is on back-to-back (HOME pick)", () => {
    const result = computeRestAdvantageScore(null, null, true, false, "HOME");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
  });

  it("applies B2B penalty when home is on back-to-back (AWAY pick)", () => {
    const result = computeRestAdvantageScore(null, null, true, false, "AWAY");
    // AWAY pick benefits when home is fatigued
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.impact).toBe("positive");
  });

  it("applies B2B penalty when away is on back-to-back (HOME pick)", () => {
    const result = computeRestAdvantageScore(null, null, false, true, "HOME");
    expect(result.score).toBeGreaterThan(0);
  });

  it("rest day differential positive for HOME when home has more rest", () => {
    const result = computeRestAdvantageScore(4, 2, false, false, "HOME");
    expect(result.score).toBeGreaterThan(0);
  });

  it("rest day differential negative for HOME when away has more rest", () => {
    const result = computeRestAdvantageScore(1, 4, false, false, "HOME");
    expect(result.score).toBeLessThan(0);
  });

  it("flips sign for AWAY pick", () => {
    const home = computeRestAdvantageScore(4, 1, false, false, "HOME");
    const away = computeRestAdvantageScore(4, 1, false, false, "AWAY");
    expect(home.score).toBeGreaterThan(0);
    expect(away.score).toBeLessThan(0);
  });

  it("returns zero when rest is equal (no advantage)", () => {
    const result = computeRestAdvantageScore(3, 3, false, false, "HOME");
    expect(result.score).toBe(0);
  });

  it("score is clamped to ±10", () => {
    const result = computeRestAdvantageScore(10, 0, false, false, "HOME");
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.score).toBeGreaterThanOrEqual(-10);
  });
});

// ============================================================
// computeHistoricalFormScore
// ============================================================

function form(wins: number, losses: number, pushes = 0): AtsFormBucket {
  return { wins, losses, pushes, sampleSize: wins + losses + pushes };
}

describe("computeHistoricalFormScore", () => {
  it("returns zero when form is null", () => {
    const result = computeHistoricalFormScore(null, "Home");
    expect(result.score).toBe(0);
    expect(result.atsPct).toBeNull();
  });

  it("returns zero when sample size is below minimum (5)", () => {
    const result = computeHistoricalFormScore(form(3, 1), "Home");
    expect(result.score).toBe(0);
    expect(result.atsPct).toBeNull();
  });

  it("returns zero when all games are pushes (decided=0)", () => {
    const result = computeHistoricalFormScore({ wins: 0, losses: 0, pushes: 10, sampleSize: 10 }, "Home");
    expect(result.score).toBe(0);
  });

  it("returns +10 for very strong ATS form (>=65%)", () => {
    const result = computeHistoricalFormScore(form(7, 3), "Home");
    expect(result.score).toBe(10);
    expect(result.factor?.impact).toBe("positive");
  });

  it("returns +5 for solid ATS form (58-64%)", () => {
    // 6 wins out of 10 = 60%
    const result = computeHistoricalFormScore(form(6, 4), "Home");
    expect(result.score).toBe(5);
  });

  it("returns -10 for very weak ATS form (<=35%)", () => {
    const result = computeHistoricalFormScore(form(3, 7), "Home");
    expect(result.score).toBe(-10);
    expect(result.factor?.impact).toBe("negative");
  });

  it("returns -5 for below-average ATS form (36-42%)", () => {
    // 4 wins out of 10 = 40%
    const result = computeHistoricalFormScore(form(4, 6), "Home");
    expect(result.score).toBe(-5);
  });

  it("returns neutral score for average ATS form (43-57%)", () => {
    // 5 wins out of 10 = 50%
    const result = computeHistoricalFormScore(form(5, 5), "Home");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });
});

// ============================================================
// computeDataQuality
// ============================================================

describe("computeDataQuality", () => {
  it("returns penalty -15 for very low quality (< 30)", () => {
    // 0 bookmakers, 180 min stale, no markets = 0 quality
    const result = computeDataQuality(0, 180, false, false, false);
    expect(result.qualityScore).toBeLessThan(30);
    expect(result.penalty).toBe(-15);
    expect(result.factor?.impact).toBe("negative");
  });

  it("returns penalty -8 for limited quality (30-49)", () => {
    // 5 books = 20pts coverage, 90min = 0 freshness, 1 market = 10pts → ~30 quality
    const result = computeDataQuality(5, 90, true, false, false);
    expect(result.qualityScore).toBeGreaterThanOrEqual(30);
    expect(result.qualityScore).toBeLessThan(50);
    expect(result.penalty).toBe(-8);
  });

  it("returns no penalty for moderate quality (50-69)", () => {
    // 10 books = 40pts, 0min = 30pts freshness, no markets = 0 → 70 quality
    const result = computeDataQuality(10, 0, false, false, false);
    expect(result.qualityScore).toBe(70);
    expect(result.penalty).toBe(0);
  });

  it("returns full score (100) with perfect inputs", () => {
    const result = computeDataQuality(10, 0, true, true, true);
    expect(result.qualityScore).toBe(100);
    expect(result.penalty).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("market coverage adds 10pts per market", () => {
    const none = computeDataQuality(0, 0, false, false, false);
    const one = computeDataQuality(0, 0, true, false, false);
    const two = computeDataQuality(0, 0, true, true, false);
    const three = computeDataQuality(0, 0, true, true, true);
    expect(one.qualityScore - none.qualityScore).toBe(10);
    expect(two.qualityScore - none.qualityScore).toBe(20);
    expect(three.qualityScore - none.qualityScore).toBe(30);
  });
});

// ============================================================
// computeHeadToHeadScore
// ============================================================

describe("computeHeadToHeadScore", () => {
  it("returns zero when h2hForm is null", () => {
    const result = computeHeadToHeadScore(null);
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("returns zero when sample size is below 5", () => {
    const result = computeHeadToHeadScore(form(4, 0));
    expect(result.score).toBe(0);
  });

  it("returns +5 for very strong H2H form (>=70%)", () => {
    const result = computeHeadToHeadScore(form(7, 3));
    expect(result.score).toBe(5);
    expect(result.factor?.impact).toBe("positive");
  });

  it("returns +3 for good H2H form (60-69%)", () => {
    const result = computeHeadToHeadScore(form(6, 4));
    expect(result.score).toBe(3);
  });

  it("returns -5 for very poor H2H form (<=30%)", () => {
    const result = computeHeadToHeadScore(form(3, 7));
    expect(result.score).toBe(-5);
    expect(result.factor?.impact).toBe("negative");
  });

  it("returns -3 for below-average H2H form (31-40%)", () => {
    const result = computeHeadToHeadScore(form(4, 6));
    expect(result.score).toBe(-3);
  });

  it("returns 0 and null factor for neutral H2H form (41-59%)", () => {
    const result = computeHeadToHeadScore(form(5, 5));
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
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

  it("returns zero when sample size is below 5", () => {
    const result = computeVenueFormScore(form(3, 1), "Home");
    expect(result.score).toBe(0);
  });

  it("returns +5 for strong venue form (>=65%)", () => {
    const result = computeVenueFormScore(form(7, 3), "Home");
    expect(result.score).toBe(5);
    expect(result.factor?.impact).toBe("positive");
  });

  it("returns +3 for solid venue form (58-64%)", () => {
    const result = computeVenueFormScore(form(6, 4), "Home");
    expect(result.score).toBe(3);
  });

  it("returns -5 for poor venue form (<=35%)", () => {
    const result = computeVenueFormScore(form(3, 7), "Away");
    expect(result.score).toBe(-5);
  });

  it("returns -3 for below-average venue form (36-42%)", () => {
    const result = computeVenueFormScore(form(4, 6), "Home");
    expect(result.score).toBe(-3);
  });
});

// ============================================================
// computeCrossMarketScore
// ============================================================

describe("computeCrossMarketScore", () => {
  it("returns zero for TOTAL picks (not spread)", () => {
    const result = computeCrossMarketScore("OVER", 0.6, "TOTAL");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("returns zero for MONEYLINE market", () => {
    const result = computeCrossMarketScore("HOME", 0.6, "MONEYLINE");
    expect(result.score).toBe(0);
  });

  it("returns zero when mlFairProbHome is null", () => {
    const result = computeCrossMarketScore("HOME", null, "SPREAD");
    expect(result.score).toBe(0);
  });

  it("returns zero when ML has no conviction (prob close to 0.5)", () => {
    const result = computeCrossMarketScore("HOME", 0.51, "SPREAD");
    expect(result.score).toBe(0);
  });

  it("returns agree bonus when spread and ML both favor HOME", () => {
    const result = computeCrossMarketScore("HOME", 0.65, "SPREAD");
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor?.impact).toBe("positive");
  });

  it("returns agree bonus when spread and ML both favor AWAY", () => {
    const result = computeCrossMarketScore("AWAY", 0.35, "SPREAD");
    expect(result.score).toBeGreaterThan(0);
  });

  it("returns disagree penalty when spread picks HOME but ML favors AWAY", () => {
    const result = computeCrossMarketScore("HOME", 0.35, "SPREAD");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
  });

  it("returns disagree penalty when spread picks AWAY but ML favors HOME", () => {
    const result = computeCrossMarketScore("AWAY", 0.65, "SPREAD");
    expect(result.score).toBeLessThan(0);
  });
});

// ============================================================
// computeScheduleStressScore
// ============================================================

describe("computeScheduleStressScore", () => {
  it("returns zero for OVER/UNDER picks", () => {
    expect(computeScheduleStressScore(3, 1, "OVER").score).toBe(0);
    expect(computeScheduleStressScore(3, 1, "UNDER").score).toBe(0);
  });

  it("returns zero when either density is null", () => {
    expect(computeScheduleStressScore(null, 1, "HOME").score).toBe(0);
    expect(computeScheduleStressScore(3, null, "HOME").score).toBe(0);
  });

  it("returns zero when difference is less than 2", () => {
    const result = computeScheduleStressScore(3, 2, "HOME");
    expect(result.score).toBe(0);
  });

  it("negative for HOME pick when home team is more fatigued", () => {
    const result = computeScheduleStressScore(4, 1, "HOME");
    expect(result.score).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
  });

  it("positive for AWAY pick when home team is more fatigued", () => {
    const result = computeScheduleStressScore(4, 1, "AWAY");
    expect(result.score).toBeGreaterThan(0);
  });

  it("positive for HOME pick when away team is more fatigued", () => {
    const result = computeScheduleStressScore(1, 4, "HOME");
    expect(result.score).toBeGreaterThan(0);
  });

  it("score is clamped to ±5", () => {
    const result = computeScheduleStressScore(10, 0, "HOME");
    expect(result.score).toBeGreaterThanOrEqual(-5);
    expect(result.score).toBeLessThanOrEqual(5);
  });
});

// ============================================================
// computeUncertaintyPenalty
// ============================================================

describe("computeUncertaintyPenalty", () => {
  it("returns zero when no conflicts exist", () => {
    const result = computeUncertaintyPenalty(5, 5, 3, 4);
    expect(result.penalty).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("penalizes when line moves strongly against positive historical signal", () => {
    // lineMovementScore < -5 and historicalFormScore > 3
    const result = computeUncertaintyPenalty(-7, 5, 0, 0);
    expect(result.penalty).toBeLessThan(0);
    expect(result.factor?.impact).toBe("negative");
  });

  it("additional conflict when line < -8 and strong form", () => {
    const one = computeUncertaintyPenalty(-7, 5, 0, 0);
    const two = computeUncertaintyPenalty(-10, 7, 0, 0);
    // two conflicts should result in a larger (more negative) penalty
    expect(two.penalty).toBeLessThanOrEqual(one.penalty);
  });

  it("cross-market divergence compounds with line fade", () => {
    // crossMarketScore < 0 and lineMovementScore < -3
    const result = computeUncertaintyPenalty(-5, 0, 0, -3);
    expect(result.penalty).toBeLessThan(0);
  });

  it("penalty is clamped to -8 max", () => {
    // Three simultaneous conflicts
    const result = computeUncertaintyPenalty(-10, 7, 3, -3);
    expect(result.penalty).toBeGreaterThanOrEqual(-8);
  });
});

// ============================================================
// computeGameContext (integration)
// ============================================================

describe("computeGameContext", () => {
  const BASE_CONTEXT: GameContextInput = {
    openingSpread: -3.5,
    currentSpread: -5.5,
    openingTotal: 47.5,
    currentTotal: 49,
    restDaysHome: 4,
    restDaysAway: 2,
    isBackToBackHome: false,
    isBackToBackAway: false,
    homeAtsForm: form(7, 3),
    awayAtsForm: form(4, 6),
    homeAtsFormAtHome: form(6, 4),
    awayAtsFormAway: form(4, 6),
    headToHeadForm: form(6, 4),
    mlFairProbHome: 0.65,
    bookmakerCoverageMax: 10,
    dataFreshnessMinutes: 5,
    hasSpreadMarket: true,
    hasTotalMarket: true,
    hasH2HMarket: true,
    scheduleDensityHome: 2,
    scheduleDensityAway: 2,
  };

  it("returns all expected score keys", () => {
    const result = computeGameContext(BASE_CONTEXT, "SPREAD", "HOME");
    expect(typeof result.lineMovementScore).toBe("number");
    expect(typeof result.restAdvantageScore).toBe("number");
    expect(typeof result.historicalFormScore).toBe("number");
    expect(typeof result.dataQualityPenalty).toBe("number");
    expect(typeof result.dataQualityScore).toBe("number");
    expect(typeof result.headToHeadScore).toBe("number");
    expect(typeof result.venueFormScore).toBe("number");
    expect(typeof result.uncertaintyPenalty).toBe("number");
    expect(typeof result.crossMarketScore).toBe("number");
    expect(typeof result.scheduleStressScore).toBe("number");
    expect(Array.isArray(result.factors)).toBe(true);
  });

  it("factors array contains at least one entry when signals are active", () => {
    const result = computeGameContext(BASE_CONTEXT, "SPREAD", "HOME");
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("TOTAL market type skips rest advantage", () => {
    const result = computeGameContext(BASE_CONTEXT, "TOTAL", "OVER");
    expect(result.restAdvantageScore).toBe(0);
  });

  it("TOTAL market type skips historical form (no pickedSide)", () => {
    const result = computeGameContext(BASE_CONTEXT, "TOTAL", "OVER");
    expect(result.historicalFormScore).toBe(0);
  });

  it("TOTAL market type computes line movement from totalline", () => {
    const result = computeGameContext(BASE_CONTEXT, "TOTAL", "OVER");
    // openingTotal=47.5, currentTotal=49 → total went up = positive for OVER
    expect(result.lineMovementScore).toBeGreaterThan(0);
  });

  it("SPREAD market type computes line movement from spreadline", () => {
    const result = computeGameContext(BASE_CONTEXT, "SPREAD", "HOME");
    // line moved from -3.5 to -5.5 (more negative = home favored more) → positive for HOME
    expect(result.lineMovementScore).toBeGreaterThan(0);
  });

  it("data quality score is non-negative", () => {
    const result = computeGameContext(BASE_CONTEXT, "SPREAD", "HOME");
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.dataQualityScore).toBeLessThanOrEqual(100);
  });

  it("context with no spread data returns 0 for lineMovementScore in SPREAD mode", () => {
    const ctx: GameContextInput = { ...BASE_CONTEXT, openingSpread: null, currentSpread: null };
    const result = computeGameContext(ctx, "SPREAD", "HOME");
    expect(result.lineMovementScore).toBe(0);
  });
});

describe("computeVenueFormScore — neutral zone and decided=0 branches", () => {
  it("returns 0 and null factor for neutral venue form (43–57% ATS)", () => {
    // 5W–5L = 50% ATS — falls in the neutral zone (43–57%), score=0, factor=null
    const result = computeVenueFormScore({ wins: 5, losses: 5, pushes: 0, sampleSize: 10 }, "Home");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });

  it("returns 0 and null factor when all games are pushes (decided=0)", () => {
    // sampleSize >= 5 but wins + losses = 0 → decided=0 branch → early return
    const result = computeVenueFormScore({ wins: 0, losses: 0, pushes: 6, sampleSize: 6 }, "Away");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });
});

describe("computeHeadToHeadScore — decided=0 branch", () => {
  it("returns 0 and null atsPct when all H2H games are pushes (decided=0)", () => {
    // sampleSize >= 5 but wins + losses = 0 → decided=0 branch
    const result = computeHeadToHeadScore({ wins: 0, losses: 0, pushes: 5, sampleSize: 5 });
    expect(result.score).toBe(0);
    expect(result.atsPct).toBeNull();
    expect(result.factor).toBeNull();
  });
});

describe("computeRestAdvantageScore — both-B2B-active branch (net zero)", () => {
  it("returns 0 when both teams are on back-to-back (restScore cancels to zero)", () => {
    // isBackToBackHome=true → restScore -=8; isBackToBackAway=true → restScore +=8
    // net restScore=0 → returns { score: 0, factor: null }
    const result = computeRestAdvantageScore(null, null, true, true, "HOME");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
  });
});
