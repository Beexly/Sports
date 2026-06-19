/**
 * Tests for pick-performance analytics library.
 * Pure unit tests — no network calls, no DB, no side effects.
 */

import { describe, it, expect } from "vitest";
import {
  pickProfit,
  pickReturn,
  impliedProbability,
  expectedValue,
  gradePickByClv,
  tierPerformance,
  performanceSummary,
  confidenceBuckets,
  topPicks,
  worstPicks,
  winRateBySport,
  streakFromPicks,
  recentForm,
  type PickRecord,
  type PickTier,
} from "@/lib/analytics/pick-performance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePick(overrides: Partial<PickRecord> = {}): PickRecord {
  return {
    id: "test-id",
    confidence: 55,
    tier: "edge",
    result: "win",
    americanOdds: -110,
    stake: 1,
    ev: 0.05,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// pickProfit
// ---------------------------------------------------------------------------

describe("pickProfit", () => {
  it("win at +150, 1 unit → 1.5", () => {
    const pick = makePick({ result: "win", americanOdds: 150, stake: 1 });
    expect(pickProfit(pick)).toBeCloseTo(1.5);
  });

  it("win at +200, 2 units → 4", () => {
    const pick = makePick({ result: "win", americanOdds: 200, stake: 2 });
    expect(pickProfit(pick)).toBeCloseTo(4);
  });

  it("win at -110, 1 unit → 100/110", () => {
    const pick = makePick({ result: "win", americanOdds: -110, stake: 1 });
    expect(pickProfit(pick)).toBeCloseTo(100 / 110);
  });

  it("win at -200, 1 unit → 0.5", () => {
    const pick = makePick({ result: "win", americanOdds: -200, stake: 1 });
    expect(pickProfit(pick)).toBeCloseTo(0.5);
  });

  it("win at even odds (100), 1 unit → 1", () => {
    const pick = makePick({ result: "win", americanOdds: 100, stake: 1 });
    expect(pickProfit(pick)).toBeCloseTo(1);
  });

  it("loss → -stake", () => {
    const pick = makePick({ result: "loss", americanOdds: -110, stake: 1 });
    expect(pickProfit(pick)).toBe(-1);
  });

  it("loss with 2 units → -2", () => {
    const pick = makePick({ result: "loss", americanOdds: 150, stake: 2 });
    expect(pickProfit(pick)).toBe(-2);
  });

  it("push → 0", () => {
    const pick = makePick({ result: "push", americanOdds: -110, stake: 1 });
    expect(pickProfit(pick)).toBe(0);
  });

  it("no-action → 0", () => {
    const pick = makePick({ result: "no-action", americanOdds: -110, stake: 1 });
    expect(pickProfit(pick)).toBe(0);
  });

  it("pending → 0", () => {
    const pick = makePick({ result: "pending", americanOdds: -110, stake: 1 });
    expect(pickProfit(pick)).toBe(0);
  });

  it("win at +100, fractional stake 0.5 → 0.5", () => {
    const pick = makePick({ result: "win", americanOdds: 100, stake: 0.5 });
    expect(pickProfit(pick)).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// pickReturn
// ---------------------------------------------------------------------------

describe("pickReturn", () => {
  it("win at +150, stake 1 → 2.5 (stake + profit)", () => {
    const pick = makePick({ result: "win", americanOdds: 150, stake: 1 });
    expect(pickReturn(pick)).toBeCloseTo(2.5);
  });

  it("win at -110, stake 1 → stake + 100/110", () => {
    const pick = makePick({ result: "win", americanOdds: -110, stake: 1 });
    expect(pickReturn(pick)).toBeCloseTo(1 + 100 / 110);
  });

  it("loss → 0", () => {
    const pick = makePick({ result: "loss", americanOdds: -110, stake: 1 });
    expect(pickReturn(pick)).toBe(0);
  });

  it("loss with higher stake → still 0", () => {
    const pick = makePick({ result: "loss", americanOdds: 200, stake: 5 });
    expect(pickReturn(pick)).toBe(0);
  });

  it("push → stake returned", () => {
    const pick = makePick({ result: "push", americanOdds: -110, stake: 2 });
    expect(pickReturn(pick)).toBe(2);
  });

  it("no-action → stake returned", () => {
    const pick = makePick({ result: "no-action", americanOdds: 150, stake: 3 });
    expect(pickReturn(pick)).toBe(3);
  });

  it("pending → stake returned", () => {
    const pick = makePick({ result: "pending", americanOdds: -200, stake: 1.5 });
    expect(pickReturn(pick)).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// impliedProbability
// ---------------------------------------------------------------------------

describe("impliedProbability", () => {
  it("+150 → 0.4", () => {
    expect(impliedProbability(150)).toBeCloseTo(0.4);
  });

  it("-150 → 0.6", () => {
    expect(impliedProbability(-150)).toBeCloseTo(0.6);
  });

  it("-110 → ~0.5238", () => {
    expect(impliedProbability(-110)).toBeCloseTo(110 / 210);
  });

  it("+100 → 0.5 (even odds)", () => {
    expect(impliedProbability(100)).toBeCloseTo(0.5);
  });

  it("-200 → 0.6667", () => {
    expect(impliedProbability(-200)).toBeCloseTo(200 / 300);
  });

  it("+300 → 0.25", () => {
    expect(impliedProbability(300)).toBeCloseTo(100 / 400);
  });

  it("result is between 0 and 1", () => {
    const prob = impliedProbability(-110);
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// expectedValue
// ---------------------------------------------------------------------------

describe("expectedValue", () => {
  it("positive EV at +150 with 60% confidence", () => {
    // profit_if_win = 1.5, profit_if_loss = -1
    // EV = 0.6 * 1.5 + 0.4 * (-1) = 0.9 - 0.4 = 0.5
    expect(expectedValue(0.6, 150)).toBeCloseTo(0.5);
  });

  it("negative EV at -110 with 50% confidence", () => {
    // profit_if_win = 100/110, profit_if_loss = -1
    // EV = 0.5 * (100/110) + 0.5 * (-1)
    const expected = 0.5 * (100 / 110) + 0.5 * -1;
    expect(expectedValue(0.5, -110)).toBeCloseTo(expected);
    expect(expectedValue(0.5, -110)).toBeLessThan(0);
  });

  it("zero EV: break-even probability at -110", () => {
    // break-even at implied prob 110/210
    const confidence = 110 / 210;
    const ev = expectedValue(confidence, -110);
    expect(Math.abs(ev)).toBeLessThan(0.001);
  });

  it("EV at +200 with 55% confidence", () => {
    // profit_if_win = 2, profit_if_loss = -1
    // EV = 0.55 * 2 + 0.45 * (-1) = 1.1 - 0.45 = 0.65
    expect(expectedValue(0.55, 200)).toBeCloseTo(0.65);
  });

  it("negative EV with low confidence", () => {
    expect(expectedValue(0.3, -110)).toBeLessThan(0);
  });

  it("high confidence at -110 yields positive EV", () => {
    expect(expectedValue(0.6, -110)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// gradePickByClv
// ---------------------------------------------------------------------------

describe("gradePickByClv", () => {
  it("CLV positive + win → grade A", () => {
    const pick = makePick({ result: "win", actualClv: 0.03 });
    const grade = gradePickByClv(pick);
    expect(grade.grade).toBe("A");
    expect(grade.clvPositive).toBe(true);
  });

  it("CLV positive + win → score >= 90", () => {
    const pick = makePick({ result: "win", actualClv: 0.01 });
    const grade = gradePickByClv(pick);
    expect(grade.score).toBeGreaterThanOrEqual(90);
  });

  it("CLV strongly positive (> 0.02) + win → score >= 95", () => {
    const pick = makePick({ result: "win", actualClv: 0.05 });
    const grade = gradePickByClv(pick);
    expect(grade.score).toBeGreaterThanOrEqual(95);
  });

  it("CLV positive + loss → grade B", () => {
    const pick = makePick({ result: "loss", actualClv: 0.02 });
    const grade = gradePickByClv(pick);
    expect(grade.grade).toBe("B");
  });

  it("CLV positive + loss → label includes 'Good Read'", () => {
    const pick = makePick({ result: "loss", actualClv: 0.02 });
    const grade = gradePickByClv(pick);
    expect(grade.label).toContain("Good Read");
  });

  it("CLV positive + loss → score 75", () => {
    const pick = makePick({ result: "loss", actualClv: 0.01 });
    const grade = gradePickByClv(pick);
    expect(grade.score).toBe(75);
  });

  it("CLV negative + win → grade B", () => {
    const pick = makePick({ result: "win", actualClv: -0.01 });
    const grade = gradePickByClv(pick);
    expect(grade.grade).toBe("B");
  });

  it("CLV negative + win → label 'Lucky Win'", () => {
    const pick = makePick({ result: "win", actualClv: -0.02 });
    const grade = gradePickByClv(pick);
    expect(grade.label).toBe("Lucky Win");
  });

  it("CLV negative + win → score 70", () => {
    const pick = makePick({ result: "win", actualClv: -0.01 });
    const grade = gradePickByClv(pick);
    expect(grade.score).toBe(70);
  });

  it("CLV negative + loss → grade D", () => {
    const pick = makePick({ result: "loss", actualClv: -0.03 });
    const grade = gradePickByClv(pick);
    expect(grade.grade).toBe("D");
  });

  it("CLV negative + loss → score 30", () => {
    const pick = makePick({ result: "loss", actualClv: -0.03 });
    const grade = gradePickByClv(pick);
    expect(grade.score).toBe(30);
  });

  it("no CLV data → grade C, label 'No CLV Data'", () => {
    const pick = makePick({ result: "win", actualClv: undefined });
    const grade = gradePickByClv(pick);
    expect(grade.grade).toBe("C");
    expect(grade.label).toBe("No CLV Data");
  });

  it("no CLV data → clvPositive false", () => {
    const pick = makePick({ result: "loss", actualClv: undefined });
    const grade = gradePickByClv(pick);
    expect(grade.clvPositive).toBe(false);
  });

  it("push → grade C, label 'Push'", () => {
    const pick = makePick({ result: "push", actualClv: 0.01 });
    const grade = gradePickByClv(pick);
    expect(grade.grade).toBe("C");
    expect(grade.label).toBe("Push");
  });

  it("push → score 50", () => {
    const pick = makePick({ result: "push", actualClv: 0.02 });
    const grade = gradePickByClv(pick);
    expect(grade.score).toBe(50);
  });

  it("CLV exactly 0 with win → grade B (Lucky Win)", () => {
    const pick = makePick({ result: "win", actualClv: 0 });
    const grade = gradePickByClv(pick);
    expect(grade.grade).toBe("B");
  });
});

// ---------------------------------------------------------------------------
// tierPerformance
// ---------------------------------------------------------------------------

describe("tierPerformance", () => {
  const picks: PickRecord[] = [
    makePick({ id: "1", tier: "apex", result: "win", americanOdds: -110, stake: 1, ev: 0.1, confidence: 70 }),
    makePick({ id: "2", tier: "apex", result: "win", americanOdds: -110, stake: 1, ev: 0.08, confidence: 72 }),
    makePick({ id: "3", tier: "apex", result: "loss", americanOdds: -110, stake: 1, ev: 0.05, confidence: 65 }),
    makePick({ id: "4", tier: "edge", result: "win", americanOdds: 150, stake: 1, ev: 0.15, confidence: 55 }),
    makePick({ id: "5", tier: "edge", result: "loss", americanOdds: 150, stake: 1, ev: -0.05, confidence: 45 }),
  ];

  it("correct win count for tier", () => {
    const perf = tierPerformance(picks, "apex");
    expect(perf.wins).toBe(2);
  });

  it("correct loss count for tier", () => {
    const perf = tierPerformance(picks, "apex");
    expect(perf.losses).toBe(1);
  });

  it("winRate = wins / (wins + losses)", () => {
    const perf = tierPerformance(picks, "apex");
    expect(perf.winRate).toBeCloseTo(2 / 3);
  });

  it("roi = sum(profit) / sum(stake)", () => {
    const perf = tierPerformance(picks, "apex");
    const profit = 100 / 110 + 100 / 110 - 1;
    const staked = 3;
    expect(perf.roi).toBeCloseTo(profit / staked);
  });

  it("avgEv = mean ev for tier picks", () => {
    const perf = tierPerformance(picks, "apex");
    expect(perf.avgEv).toBeCloseTo((0.1 + 0.08 + 0.05) / 3);
  });

  it("avgConfidence = mean confidence for tier picks", () => {
    const perf = tierPerformance(picks, "apex");
    expect(perf.avgConfidence).toBeCloseTo((70 + 72 + 65) / 3);
  });

  it("winRate null for empty tier", () => {
    const perf = tierPerformance(picks, "signal");
    expect(perf.winRate).toBeNull();
  });

  it("roi null for empty tier", () => {
    const perf = tierPerformance(picks, "signal");
    expect(perf.roi).toBeNull();
  });

  it("picks count = 0 for empty tier", () => {
    const perf = tierPerformance(picks, "signal");
    expect(perf.picks).toBe(0);
  });

  it("returns correct tier label", () => {
    const perf = tierPerformance(picks, "apex");
    expect(perf.tier).toBe("apex");
  });

  it("pushes counted separately from wins/losses", () => {
    const withPush: PickRecord[] = [
      ...picks,
      makePick({ id: "6", tier: "apex", result: "push", americanOdds: -110, stake: 1, ev: 0, confidence: 60 }),
    ];
    const perf = tierPerformance(withPush, "apex");
    expect(perf.pushes).toBe(1);
    expect(perf.wins).toBe(2);
    expect(perf.losses).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// performanceSummary
// ---------------------------------------------------------------------------

describe("performanceSummary", () => {
  const picks: PickRecord[] = [
    makePick({ id: "1", tier: "apex", result: "win", americanOdds: -110, stake: 1, ev: 0.1, confidence: 70, actualClv: 0.02 }),
    makePick({ id: "2", tier: "apex", result: "loss", americanOdds: -110, stake: 1, ev: 0.05, confidence: 65, actualClv: -0.01 }),
    makePick({ id: "3", tier: "edge", result: "win", americanOdds: 150, stake: 1, ev: 0.15, confidence: 55, actualClv: 0.03 }),
    makePick({ id: "4", tier: "edge", result: "push", americanOdds: -110, stake: 1, ev: 0, confidence: 50, actualClv: undefined }),
    makePick({ id: "5", tier: "signal", result: "pending", americanOdds: -110, stake: 1, ev: 0.03, confidence: 52 }),
  ];

  it("totalPicks includes all picks", () => {
    const summary = performanceSummary(picks);
    expect(summary.totalPicks).toBe(5);
  });

  it("settledPicks = wins + losses + pushes", () => {
    const summary = performanceSummary(picks);
    expect(summary.settledPicks).toBe(4); // 2 wins + 1 loss + 1 push
  });

  it("overallWinRate = wins / (wins + losses)", () => {
    const summary = performanceSummary(picks);
    expect(summary.overallWinRate).toBeCloseTo(2 / 3);
  });

  it("overallRoi computed over settled stakes", () => {
    const summary = performanceSummary(picks);
    const profit = 100 / 110 - 1 + 1.5; // apex loss and edge win
    // Only win/loss stakes count for roi: 3 stakes
    expect(summary.overallRoi).toBeCloseTo(profit / 3);
  });

  it("byTier includes only tiers with picks", () => {
    const summary = performanceSummary(picks);
    const tierNames = summary.byTier.map((t) => t.tier);
    expect(tierNames).toContain("apex");
    expect(tierNames).toContain("edge");
    expect(tierNames).toContain("signal");
    expect(tierNames).not.toContain("sharp");
  });

  it("avgEv computed across all picks", () => {
    const summary = performanceSummary(picks);
    const expectedAvgEv = (0.1 + 0.05 + 0.15 + 0 + 0.03) / 5;
    expect(summary.avgEv).toBeCloseTo(expectedAvgEv);
  });

  it("clvBeatRate = fraction of settled picks with clv > 0", () => {
    const summary = performanceSummary(picks);
    // settled with clv: pick1 (0.02 > 0), pick2 (-0.01 not > 0), pick3 (0.03 > 0), push (no clv)
    // clvSettledCount = 3, clvBeatCount = 2
    expect(summary.clvBeatRate).toBeCloseTo(2 / 3);
  });

  it("clvBeatRate null when no CLV data", () => {
    const noCLVPicks = picks.map((p) => ({ ...p, actualClv: undefined }));
    const summary = performanceSummary(noCLVPicks);
    expect(summary.clvBeatRate).toBeNull();
  });

  it("overallWinRate null when no settled picks", () => {
    const pending = [makePick({ result: "pending" })];
    const summary = performanceSummary(pending);
    expect(summary.overallWinRate).toBeNull();
  });

  it("overallRoi null when no staked picks", () => {
    const pending = [makePick({ result: "push" }), makePick({ result: "pending" })];
    const summary = performanceSummary(pending);
    // push doesn't contribute to staked
    expect(summary.overallRoi).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// confidenceBuckets
// ---------------------------------------------------------------------------

describe("confidenceBuckets", () => {
  const picks: PickRecord[] = [
    makePick({ id: "1", confidence: 10, result: "win" }),
    makePick({ id: "2", confidence: 15, result: "loss" }),
    makePick({ id: "3", confidence: 30, result: "win" }),
    makePick({ id: "4", confidence: 55, result: "win" }),
    makePick({ id: "5", confidence: 58, result: "loss" }),
    makePick({ id: "6", confidence: 85, result: "win" }),
    makePick({ id: "7", confidence: 90, result: "win" }),
  ];

  it("groups into correct buckets", () => {
    const buckets = confidenceBuckets(picks);
    const labels = buckets.map((b) => b.label);
    expect(labels).toContain("0-20%");
    expect(labels).toContain("20-40%");
    expect(labels).toContain("40-60%");
    expect(labels).toContain("80-100%");
  });

  it("only returns non-empty buckets", () => {
    const buckets = confidenceBuckets(picks);
    expect(buckets.every((b) => b.count > 0)).toBe(true);
  });

  it("0-20 bucket has 2 picks", () => {
    const buckets = confidenceBuckets(picks);
    const bucket = buckets.find((b) => b.label === "0-20%");
    expect(bucket?.count).toBe(2);
  });

  it("0-20 bucket winRate = 0.5 (1 win, 1 loss)", () => {
    const buckets = confidenceBuckets(picks);
    const bucket = buckets.find((b) => b.label === "0-20%");
    expect(bucket?.winRate).toBeCloseTo(0.5);
  });

  it("80-100 bucket winRate = 1.0 (all wins)", () => {
    const buckets = confidenceBuckets(picks);
    const bucket = buckets.find((b) => b.label === "80-100%");
    expect(bucket?.winRate).toBeCloseTo(1.0);
  });

  it("avgConfidence is mean of picks in bucket", () => {
    const buckets = confidenceBuckets(picks);
    const bucket = buckets.find((b) => b.label === "0-20%");
    expect(bucket?.avgConfidence).toBeCloseTo(12.5);
  });

  it("winRate null when no wins or losses in bucket", () => {
    const pushOnly: PickRecord[] = [
      makePick({ id: "p1", confidence: 30, result: "push" }),
    ];
    const buckets = confidenceBuckets(pushOnly);
    const bucket = buckets.find((b) => b.label === "20-40%");
    expect(bucket?.winRate).toBeNull();
  });

  it("custom bucket count works", () => {
    const allPicks = [
      makePick({ id: "a", confidence: 25, result: "win" }),
      makePick({ id: "b", confidence: 75, result: "loss" }),
    ];
    // 2 buckets: 0-50, 50-100
    const buckets = confidenceBuckets(allPicks, 2);
    expect(buckets.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// topPicks
// ---------------------------------------------------------------------------

describe("topPicks", () => {
  const picks: PickRecord[] = [
    makePick({ id: "1", ev: 0.3 }),
    makePick({ id: "2", ev: -0.1 }),
    makePick({ id: "3", ev: 0.5 }),
    makePick({ id: "4", ev: 0.1 }),
    makePick({ id: "5", ev: -0.2 }),
    makePick({ id: "6", ev: 0.4 }),
  ];

  it("returns only picks with EV > 0", () => {
    const top = topPicks(picks, 10);
    expect(top.every((p) => p.ev > 0)).toBe(true);
  });

  it("returns picks sorted by EV descending", () => {
    const top = topPicks(picks, 10);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].ev).toBeGreaterThanOrEqual(top[i].ev);
    }
  });

  it("respects n limit", () => {
    const top = topPicks(picks, 2);
    expect(top.length).toBe(2);
    expect(top[0].ev).toBeCloseTo(0.5);
    expect(top[1].ev).toBeCloseTo(0.4);
  });

  it("returns empty when no positive EV picks", () => {
    const negativePicks = picks.filter((p) => p.ev < 0);
    const top = topPicks(negativePicks, 5);
    expect(top).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// worstPicks
// ---------------------------------------------------------------------------

describe("worstPicks", () => {
  const picks: PickRecord[] = [
    makePick({ id: "1", ev: 0.3 }),
    makePick({ id: "2", ev: -0.1 }),
    makePick({ id: "3", ev: 0.5 }),
    makePick({ id: "4", ev: 0.1 }),
    makePick({ id: "5", ev: -0.3 }),
    makePick({ id: "6", ev: -0.2 }),
  ];

  it("returns picks sorted by EV ascending (most negative first)", () => {
    const worst = worstPicks(picks, 10);
    for (let i = 1; i < worst.length; i++) {
      expect(worst[i - 1].ev).toBeLessThanOrEqual(worst[i].ev);
    }
  });

  it("first entry has the most negative EV", () => {
    const worst = worstPicks(picks, 1);
    expect(worst[0].ev).toBeCloseTo(-0.3);
  });

  it("respects n limit", () => {
    const worst = worstPicks(picks, 3);
    expect(worst.length).toBe(3);
  });

  it("includes picks with positive EV if needed to fill n", () => {
    const worst = worstPicks(picks, 6);
    expect(worst.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// winRateBySport
// ---------------------------------------------------------------------------

describe("winRateBySport", () => {
  const picks = [
    { ...makePick({ id: "1", result: "win" }), sport: "NFL" },
    { ...makePick({ id: "2", result: "win" }), sport: "NFL" },
    { ...makePick({ id: "3", result: "loss" }), sport: "NFL" },
    { ...makePick({ id: "4", result: "win" }), sport: "NBA" },
    { ...makePick({ id: "5", result: "loss" }), sport: "NBA" },
    { ...makePick({ id: "6", result: "push" }), sport: "MLB" },
  ];

  it("computes win rate for NFL", () => {
    const rates = winRateBySport(picks);
    expect(rates["NFL"]).toBeCloseTo(2 / 3);
  });

  it("computes win rate for NBA", () => {
    const rates = winRateBySport(picks);
    expect(rates["NBA"]).toBeCloseTo(0.5);
  });

  it("returns null for sport with only pushes", () => {
    const rates = winRateBySport(picks);
    expect(rates["MLB"]).toBeNull();
  });

  it("returns all sports as keys", () => {
    const rates = winRateBySport(picks);
    expect(Object.keys(rates)).toContain("NFL");
    expect(Object.keys(rates)).toContain("NBA");
    expect(Object.keys(rates)).toContain("MLB");
  });
});

// ---------------------------------------------------------------------------
// streakFromPicks
// ---------------------------------------------------------------------------

describe("streakFromPicks", () => {
  it("3 wins at end → { type: 'win', length: 3 }", () => {
    const picks = [
      makePick({ id: "1", result: "loss" }),
      makePick({ id: "2", result: "win" }),
      makePick({ id: "3", result: "win" }),
      makePick({ id: "4", result: "win" }),
    ];
    const streak = streakFromPicks(picks);
    expect(streak.type).toBe("win");
    expect(streak.length).toBe(3);
  });

  it("push in the middle is ignored for streak count", () => {
    const picks = [
      makePick({ id: "1", result: "loss" }),
      makePick({ id: "2", result: "push" }),
      makePick({ id: "3", result: "win" }),
      makePick({ id: "4", result: "win" }),
    ];
    // push breaks the streak from picks perspective — it's not win or loss
    const streak = streakFromPicks(picks);
    expect(streak.type).toBe("win");
    expect(streak.length).toBe(2);
  });

  it("2 losses at end → { type: 'loss', length: 2 }", () => {
    const picks = [
      makePick({ id: "1", result: "win" }),
      makePick({ id: "2", result: "loss" }),
      makePick({ id: "3", result: "loss" }),
    ];
    const streak = streakFromPicks(picks);
    expect(streak.type).toBe("loss");
    expect(streak.length).toBe(2);
  });

  it("no settled picks → { type: 'none', length: 0 }", () => {
    const picks = [
      makePick({ id: "1", result: "push" }),
      makePick({ id: "2", result: "pending" }),
    ];
    const streak = streakFromPicks(picks);
    expect(streak.type).toBe("none");
    expect(streak.length).toBe(0);
  });

  it("empty array → { type: 'none', length: 0 }", () => {
    const streak = streakFromPicks([]);
    expect(streak.type).toBe("none");
    expect(streak.length).toBe(0);
  });

  it("pending at end doesn't break the streak", () => {
    const picks = [
      makePick({ id: "1", result: "win" }),
      makePick({ id: "2", result: "win" }),
      makePick({ id: "3", result: "pending" }),
    ];
    const streak = streakFromPicks(picks);
    // pending is skipped, underlying streak is win x2
    expect(streak.type).toBe("win");
    expect(streak.length).toBe(2);
  });

  it("single win → { type: 'win', length: 1 }", () => {
    const picks = [makePick({ id: "1", result: "win" })];
    const streak = streakFromPicks(picks);
    expect(streak.type).toBe("win");
    expect(streak.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// recentForm
// ---------------------------------------------------------------------------

describe("recentForm", () => {
  it("produces 'WLWWL' format from last 5 settled picks", () => {
    const picks = [
      makePick({ id: "1", result: "win" }),
      makePick({ id: "2", result: "loss" }),
      makePick({ id: "3", result: "win" }),
      makePick({ id: "4", result: "win" }),
      makePick({ id: "5", result: "loss" }),
    ];
    expect(recentForm(picks)).toBe("WLWWL");
  });

  it("returns empty string when no settled picks", () => {
    const picks = [makePick({ result: "pending" })];
    expect(recentForm(picks)).toBe("");
  });

  it("push shown as 'P'", () => {
    const picks = [
      makePick({ id: "1", result: "win" }),
      makePick({ id: "2", result: "push" }),
      makePick({ id: "3", result: "loss" }),
    ];
    expect(recentForm(picks)).toBe("WPL");
  });

  it("most recent is at the end", () => {
    const picks = [
      makePick({ id: "1", result: "loss" }),
      makePick({ id: "2", result: "win" }),
    ];
    const form = recentForm(picks);
    expect(form[form.length - 1]).toBe("W");
  });

  it("limits to n picks by default (5)", () => {
    const picks = Array.from({ length: 8 }, (_, i) =>
      makePick({ id: String(i), result: "win" })
    );
    expect(recentForm(picks).length).toBe(5);
  });

  it("uses custom n", () => {
    const picks = Array.from({ length: 8 }, (_, i) =>
      makePick({ id: String(i), result: "win" })
    );
    expect(recentForm(picks, 3)).toBe("WWW");
  });

  it("pending/no-action skipped in form", () => {
    const picks = [
      makePick({ id: "1", result: "win" }),
      makePick({ id: "2", result: "pending" }),
      makePick({ id: "3", result: "no-action" }),
      makePick({ id: "4", result: "loss" }),
    ];
    expect(recentForm(picks)).toBe("WL");
  });

  it("empty picks → empty string", () => {
    expect(recentForm([])).toBe("");
  });
});
