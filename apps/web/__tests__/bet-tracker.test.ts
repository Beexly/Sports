import { describe, it, expect } from "vitest";
import {
  profitFromBet,
  calculateBetStats,
  buildPnlSeries,
  analyzeDrawdown,
  sharpeBetting,
  sortinoBetting,
  rollingWinRate,
  rollingRoi,
  betsPerDay,
  longestWinStreak,
  longestLossStreak,
  currentStreak,
  profitByMonth,
  profitBySport,
  clvCapture,
  expectedValuePerUnit,
  minimumSampleForSignificance,
  type Bet,
  type BetResult,
} from "@/lib/analytics/bet-tracker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBet(
  overrides: Partial<Bet> & { result: BetResult }
): Bet {
  return {
    id: "bet-" + Math.random().toString(36).slice(2),
    stake: 1,
    decimalOdds: 1.909,
    settledAt: Date.now(),
    ...overrides,
  };
}

const DAY = 86400000;
const BASE_TS = new Date("2025-01-15T12:00:00Z").getTime();

// ---------------------------------------------------------------------------
// profitFromBet
// ---------------------------------------------------------------------------

describe("profitFromBet", () => {
  it("returns stake * (odds - 1) on win", () => {
    const bet = makeBet({ result: "win", stake: 2, decimalOdds: 2.0 });
    expect(profitFromBet(bet)).toBeCloseTo(2.0);
  });

  it("returns correct profit for -110 odds (1.909) win with 1 unit", () => {
    const bet = makeBet({ result: "win", stake: 1, decimalOdds: 1.909 });
    expect(profitFromBet(bet)).toBeCloseTo(0.909);
  });

  it("returns -stake on loss", () => {
    const bet = makeBet({ result: "loss", stake: 3, decimalOdds: 2.5 });
    expect(profitFromBet(bet)).toBe(-3);
  });

  it("returns 0 on push", () => {
    const bet = makeBet({ result: "push", stake: 1.5, decimalOdds: 1.909 });
    expect(profitFromBet(bet)).toBe(0);
  });

  it("returns 0 on no-action", () => {
    const bet = makeBet({ result: "no-action", stake: 1, decimalOdds: 2.0 });
    expect(profitFromBet(bet)).toBe(0);
  });

  it("handles large stake correctly", () => {
    const bet = makeBet({ result: "win", stake: 10, decimalOdds: 3.0 });
    expect(profitFromBet(bet)).toBeCloseTo(20);
  });
});

// ---------------------------------------------------------------------------
// calculateBetStats
// ---------------------------------------------------------------------------

describe("calculateBetStats", () => {
  it("returns zeros and NaN for empty array", () => {
    const stats = calculateBetStats([]);
    expect(stats.totalBets).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.pushes).toBe(0);
    expect(Number.isNaN(stats.winRate)).toBe(true);
    expect(Number.isNaN(stats.roi)).toBe(true);
    expect(stats.netUnits).toBe(0);
    expect(stats.totalStaked).toBe(0);
    expect(Number.isNaN(stats.avgOdds)).toBe(true);
    expect(Number.isNaN(stats.breakEvenWinRate)).toBe(true);
  });

  it("counts wins, losses, pushes correctly", () => {
    const bets: Bet[] = [
      makeBet({ result: "win" }),
      makeBet({ result: "win" }),
      makeBet({ result: "loss" }),
      makeBet({ result: "push" }),
    ];
    const stats = calculateBetStats(bets);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.pushes).toBe(1);
    expect(stats.totalBets).toBe(4);
  });

  it("computes winRate as wins / (wins + losses)", () => {
    const bets: Bet[] = [
      makeBet({ result: "win" }),
      makeBet({ result: "win" }),
      makeBet({ result: "loss" }),
    ];
    const stats = calculateBetStats(bets);
    expect(stats.winRate).toBeCloseTo(2 / 3);
  });

  it("winRate is NaN when only pushes", () => {
    const bets: Bet[] = [
      makeBet({ result: "push" }),
      makeBet({ result: "push" }),
    ];
    expect(Number.isNaN(calculateBetStats(bets).winRate)).toBe(true);
  });

  it("computes netUnits correctly", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0 }),
    ];
    const stats = calculateBetStats(bets);
    expect(stats.netUnits).toBeCloseTo(0); // +1 - 1 = 0
  });

  it("computes roi as netUnits / totalStaked", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0 }),
    ];
    const stats = calculateBetStats(bets);
    expect(stats.roi).toBeCloseTo(0);
  });

  it("roi is NaN when only no-action bets", () => {
    const bets: Bet[] = [
      makeBet({ result: "no-action" }),
    ];
    expect(Number.isNaN(calculateBetStats(bets).roi)).toBe(true);
  });

  it("computes avgOdds over wins+losses only", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", decimalOdds: 2.0 }),
      makeBet({ result: "loss", decimalOdds: 1.5 }),
      makeBet({ result: "push", decimalOdds: 3.0 }), // should not count
    ];
    const stats = calculateBetStats(bets);
    expect(stats.avgOdds).toBeCloseTo(1.75);
  });

  it("computes breakEvenWinRate = 1 / avgOdds", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", decimalOdds: 2.0 }),
      makeBet({ result: "loss", decimalOdds: 2.0 }),
    ];
    const stats = calculateBetStats(bets);
    expect(stats.breakEvenWinRate).toBeCloseTo(0.5);
  });

  it("computes positive roi when winning", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0 }),
    ];
    const stats = calculateBetStats(bets);
    expect(stats.roi).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// buildPnlSeries
// ---------------------------------------------------------------------------

describe("buildPnlSeries", () => {
  it("returns empty array for empty input", () => {
    expect(buildPnlSeries([])).toEqual([]);
  });

  it("builds one point per bet", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "loss", settledAt: BASE_TS + DAY }),
    ];
    const series = buildPnlSeries(bets);
    expect(series).toHaveLength(2);
  });

  it("sorts by settledAt before computing", () => {
    const bets: Bet[] = [
      makeBet({ result: "loss", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
    ];
    const series = buildPnlSeries(bets);
    // First point should be the win (earlier timestamp)
    expect(series[0].cumulativeUnits).toBeCloseTo(1.0);
    // Second point: win + loss = 1 - 1 = 0
    expect(series[1].cumulativeUnits).toBeCloseTo(0);
  });

  it("cumulativeUnits accumulates correctly", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
    ];
    const series = buildPnlSeries(bets);
    expect(series[0].cumulativeUnits).toBeCloseTo(1.0);
    expect(series[1].cumulativeUnits).toBeCloseTo(2.0);
  });

  it("runningRoi is NaN for push-only bets", () => {
    const bets: Bet[] = [
      makeBet({ result: "push", settledAt: BASE_TS }),
    ];
    const series = buildPnlSeries(bets);
    expect(Number.isNaN(series[0].runningRoi)).toBe(true);
  });

  it("runningRoi is computed correctly", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
    ];
    const series = buildPnlSeries(bets);
    // netUnits=1, totalStaked=1 → roi=1
    expect(series[0].runningRoi).toBeCloseTo(1.0);
  });

  it("betIndex matches position in sorted order", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "loss", settledAt: BASE_TS + DAY }),
      makeBet({ result: "push", settledAt: BASE_TS + 2 * DAY }),
    ];
    const series = buildPnlSeries(bets);
    expect(series[0].betIndex).toBe(0);
    expect(series[1].betIndex).toBe(1);
    expect(series[2].betIndex).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// analyzeDrawdown
// ---------------------------------------------------------------------------

describe("analyzeDrawdown", () => {
  it("maxDrawdown is 0 with no losses", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
    ];
    const dd = analyzeDrawdown(bets);
    expect(dd.maxDrawdownUnits).toBe(0);
    expect(dd.maxDrawdownPercent).toBe(0);
  });

  it("tracks max drawdown correctly", () => {
    // Win +1, Win +1, Loss -1 → peak=2, trough=1, drawdown=1
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", settledAt: BASE_TS + 2 * DAY, stake: 1, decimalOdds: 2.0 }),
    ];
    const dd = analyzeDrawdown(bets);
    expect(dd.maxDrawdownUnits).toBeCloseTo(1.0);
    expect(dd.peakUnits).toBeCloseTo(2.0);
  });

  it("computes maxDrawdownPercent relative to peak", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", settledAt: BASE_TS + 2 * DAY, stake: 1, decimalOdds: 2.0 }),
    ];
    const dd = analyzeDrawdown(bets);
    // drawdown=1, peak=2 → 50%
    expect(dd.maxDrawdownPercent).toBeCloseTo(50);
  });

  it("currentDrawdownUnits = peak - current", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
    ];
    const dd = analyzeDrawdown(bets);
    expect(dd.currentDrawdownUnits).toBeCloseTo(1.0);
    expect(dd.currentUnits).toBeCloseTo(0.0);
  });

  it("returns zero drawdown for empty bets", () => {
    const dd = analyzeDrawdown([]);
    expect(dd.maxDrawdownUnits).toBe(0);
    expect(dd.currentUnits).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sharpeBetting
// ---------------------------------------------------------------------------

describe("sharpeBetting", () => {
  it("returns NaN for empty bets", () => {
    const r = sharpeBetting([]);
    expect(Number.isNaN(r.sharpeRatio)).toBe(true);
    expect(Number.isNaN(r.avgReturnPerBet)).toBe(true);
    expect(Number.isNaN(r.stdDevPerBet)).toBe(true);
  });

  it("returns NaN sharpeRatio when all bets are wins (std dev = 0)", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
    ];
    const r = sharpeBetting(bets);
    expect(Number.isNaN(r.sharpeRatio)).toBe(true);
    expect(r.stdDevPerBet).toBe(0);
  });

  it("returns finite sharpe ratio for mixed results", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0 }),
    ];
    const r = sharpeBetting(bets);
    expect(Number.isFinite(r.sharpeRatio)).toBe(true);
  });

  it("ignores push and no-action bets", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "push", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "no-action", stake: 1, decimalOdds: 2.0 }),
    ];
    const betsNoExtras: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
    ];
    expect(sharpeBetting(bets).avgReturnPerBet).toBeCloseTo(
      sharpeBetting(betsNoExtras).avgReturnPerBet
    );
  });

  it("avgReturnPerBet is mean of profit/stake across settled bets", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }), // return = +1
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0 }), // return = -1
    ];
    const r = sharpeBetting(bets);
    expect(r.avgReturnPerBet).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// sortinoBetting
// ---------------------------------------------------------------------------

describe("sortinoBetting", () => {
  it("returns NaN for empty bets", () => {
    expect(Number.isNaN(sortinoBetting([]))).toBe(true);
  });

  it("returns NaN when all bets are wins (no downside)", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
    ];
    expect(Number.isNaN(sortinoBetting(bets))).toBe(true);
  });

  it("returns finite value for mixed results", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0 }),
    ];
    expect(Number.isFinite(sortinoBetting(bets))).toBe(true);
  });

  it("ignores push/no-action bets", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "push", stake: 1, decimalOdds: 2.0 }),
    ];
    const betsClean: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0 }),
    ];
    // Both should produce the same result (push doesn't affect sortino)
    const s1 = sortinoBetting(bets);
    const s2 = sortinoBetting(betsClean);
    if (Number.isFinite(s1) && Number.isFinite(s2)) {
      expect(s1).toBeCloseTo(s2);
    } else {
      expect(Number.isNaN(s1)).toBe(Number.isNaN(s2));
    }
  });
});

// ---------------------------------------------------------------------------
// rollingWinRate
// ---------------------------------------------------------------------------

describe("rollingWinRate", () => {
  it("returns empty array when window larger than settled bets", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
    ];
    expect(rollingWinRate(bets, 5)).toEqual([]);
  });

  it("returns correct length: settledBets - window + 1", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY }),
      makeBet({ result: "loss", settledAt: BASE_TS + 2 * DAY }),
      makeBet({ result: "win", settledAt: BASE_TS + 3 * DAY }),
    ];
    expect(rollingWinRate(bets, 3)).toHaveLength(2);
  });

  it("returns correct win rate in each window", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY }),
      makeBet({ result: "loss", settledAt: BASE_TS + 2 * DAY }),
    ];
    const rates = rollingWinRate(bets, 3);
    expect(rates).toHaveLength(1);
    expect(rates[0]).toBeCloseTo(2 / 3);
  });

  it("ignores push/no-action in settled count but they are excluded", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "push", settledAt: BASE_TS + DAY }),
      makeBet({ result: "loss", settledAt: BASE_TS + 2 * DAY }),
    ];
    // Only 2 settled bets → window of 2 → length 1
    const rates = rollingWinRate(bets, 2);
    expect(rates).toHaveLength(1);
    expect(rates[0]).toBeCloseTo(0.5); // 1W 1L
  });

  it("returns [1, 1] for all wins with window=1", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY }),
    ];
    const rates = rollingWinRate(bets, 1);
    expect(rates).toEqual([1, 1]);
  });
});

// ---------------------------------------------------------------------------
// rollingRoi
// ---------------------------------------------------------------------------

describe("rollingRoi", () => {
  it("returns empty array when window larger than settled bets", () => {
    const bets: Bet[] = [makeBet({ result: "win", settledAt: BASE_TS })];
    expect(rollingRoi(bets, 5)).toEqual([]);
  });

  it("returns correct length", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", settledAt: BASE_TS + 2 * DAY, stake: 1, decimalOdds: 2.0 }),
    ];
    expect(rollingRoi(bets, 2)).toHaveLength(2);
  });

  it("computes correct roi in each window", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "loss", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
    ];
    const rois = rollingRoi(bets, 2);
    expect(rois).toHaveLength(1);
    // net = 1 - 1 = 0, staked = 2, roi = 0
    expect(rois[0]).toBeCloseTo(0);
  });

  it("positive roi in window of all wins", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS, stake: 1, decimalOdds: 2.0 }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY, stake: 1, decimalOdds: 2.0 }),
    ];
    const rois = rollingRoi(bets, 2);
    expect(rois[0]).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// betsPerDay
// ---------------------------------------------------------------------------

describe("betsPerDay", () => {
  it("returns 0 for empty array", () => {
    expect(betsPerDay([])).toBe(0);
  });

  it("returns bets.length for single day", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "loss", settledAt: BASE_TS + 1000 }), // same day, 1 second later
    ];
    // Both within same ms-range < 1 day
    const result = betsPerDay(bets);
    expect(result).toBeCloseTo(bets.length);
  });

  it("returns correct rate over multiple days", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY }),
      makeBet({ result: "win", settledAt: BASE_TS + 2 * DAY }),
    ];
    // dayRange = (2*DAY)/DAY + 1 = 3
    // betsPerDay = 3/3 = 1
    expect(betsPerDay(bets)).toBeCloseTo(1);
  });

  it("single bet → returns 1 / 1 = 1 (only 1 day)", () => {
    const bets: Bet[] = [makeBet({ result: "win", settledAt: BASE_TS })];
    expect(betsPerDay(bets)).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// longestWinStreak
// ---------------------------------------------------------------------------

describe("longestWinStreak", () => {
  it("returns 0 for empty array", () => {
    expect(longestWinStreak([])).toBe(0);
  });

  it("returns 0 for all losses", () => {
    const bets: Bet[] = [
      makeBet({ result: "loss", settledAt: BASE_TS }),
      makeBet({ result: "loss", settledAt: BASE_TS + DAY }),
    ];
    expect(longestWinStreak(bets)).toBe(0);
  });

  it("WWLWWW → longest streak is 3", () => {
    const results: BetResult[] = ["win", "win", "loss", "win", "win", "win"];
    const bets = results.map((r, i) =>
      makeBet({ result: r, settledAt: BASE_TS + i * DAY })
    );
    expect(longestWinStreak(bets)).toBe(3);
  });

  it("push/no-action don't break win streak", () => {
    const results: BetResult[] = ["win", "push", "win", "no-action", "win"];
    const bets = results.map((r, i) =>
      makeBet({ result: r, settledAt: BASE_TS + i * DAY })
    );
    expect(longestWinStreak(bets)).toBe(3);
  });

  it("handles single win", () => {
    const bets: Bet[] = [makeBet({ result: "win", settledAt: BASE_TS })];
    expect(longestWinStreak(bets)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// longestLossStreak
// ---------------------------------------------------------------------------

describe("longestLossStreak", () => {
  it("returns 0 for empty array", () => {
    expect(longestLossStreak([])).toBe(0);
  });

  it("LLWLL → longest streak is 2", () => {
    const results: BetResult[] = ["loss", "loss", "win", "loss", "loss"];
    const bets = results.map((r, i) =>
      makeBet({ result: r, settledAt: BASE_TS + i * DAY })
    );
    expect(longestLossStreak(bets)).toBe(2);
  });

  it("push/no-action don't break loss streak", () => {
    const results: BetResult[] = ["loss", "push", "loss", "no-action", "loss"];
    const bets = results.map((r, i) =>
      makeBet({ result: r, settledAt: BASE_TS + i * DAY })
    );
    expect(longestLossStreak(bets)).toBe(3);
  });

  it("returns 0 for all wins", () => {
    const bets: Bet[] = [
      makeBet({ result: "win", settledAt: BASE_TS }),
      makeBet({ result: "win", settledAt: BASE_TS + DAY }),
    ];
    expect(longestLossStreak(bets)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// currentStreak
// ---------------------------------------------------------------------------

describe("currentStreak", () => {
  it("returns null for empty array", () => {
    expect(currentStreak([])).toBeNull();
  });

  it("single win → {type: win, count: 1}", () => {
    const bets: Bet[] = [makeBet({ result: "win", settledAt: BASE_TS })];
    expect(currentStreak(bets)).toEqual({ type: "win", count: 1 });
  });

  it("last bets are wins → {type: win, count: N}", () => {
    const results: BetResult[] = ["loss", "win", "win", "win"];
    const bets = results.map((r, i) =>
      makeBet({ result: r, settledAt: BASE_TS + i * DAY })
    );
    expect(currentStreak(bets)).toEqual({ type: "win", count: 3 });
  });

  it("last bets are losses → {type: loss, count: N}", () => {
    const results: BetResult[] = ["win", "loss", "loss"];
    const bets = results.map((r, i) =>
      makeBet({ result: r, settledAt: BASE_TS + i * DAY })
    );
    expect(currentStreak(bets)).toEqual({ type: "loss", count: 2 });
  });

  it("push at end doesn't break win streak", () => {
    const results: BetResult[] = ["win", "win", "push"];
    const bets = results.map((r, i) =>
      makeBet({ result: r, settledAt: BASE_TS + i * DAY })
    );
    const streak = currentStreak(bets);
    expect(streak?.type).toBe("win");
    expect(streak?.count).toBe(2);
  });

  it("single loss → {type: loss, count: 1}", () => {
    const bets: Bet[] = [makeBet({ result: "loss", settledAt: BASE_TS })];
    expect(currentStreak(bets)).toEqual({ type: "loss", count: 1 });
  });
});

// ---------------------------------------------------------------------------
// profitByMonth
// ---------------------------------------------------------------------------

describe("profitByMonth", () => {
  it("returns empty object for empty array", () => {
    expect(profitByMonth([])).toEqual({});
  });

  it("groups bets by YYYY-MM", () => {
    const jan = new Date("2025-01-15T12:00:00Z").getTime();
    const feb = new Date("2025-02-10T12:00:00Z").getTime();
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0, settledAt: jan }),
      makeBet({ result: "loss", stake: 1, decimalOdds: 2.0, settledAt: feb }),
    ];
    const byMonth = profitByMonth(bets);
    expect(byMonth["2025-01"]).toBeCloseTo(1);
    expect(byMonth["2025-02"]).toBeCloseTo(-1);
  });

  it("accumulates multiple bets in same month", () => {
    const jan1 = new Date("2025-01-01T12:00:00Z").getTime();
    const jan2 = new Date("2025-01-20T12:00:00Z").getTime();
    const bets: Bet[] = [
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0, settledAt: jan1 }),
      makeBet({ result: "win", stake: 1, decimalOdds: 2.0, settledAt: jan2 }),
    ];
    const byMonth = profitByMonth(bets);
    expect(byMonth["2025-01"]).toBeCloseTo(2);
  });

  it("push bets contribute 0 to month", () => {
    const jan = new Date("2025-01-15T12:00:00Z").getTime();
    const bets: Bet[] = [
      makeBet({ result: "push", stake: 1, decimalOdds: 2.0, settledAt: jan }),
    ];
    const byMonth = profitByMonth(bets);
    expect(byMonth["2025-01"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// profitBySport
// ---------------------------------------------------------------------------

describe("profitBySport", () => {
  it("groups bets by sport correctly", () => {
    const bets: Bet[] = [
      { ...makeBet({ result: "win" }), id: "nba-1" },
      { ...makeBet({ result: "loss" }), id: "nba-2" },
      { ...makeBet({ result: "win" }), id: "nfl-1" },
    ];
    const getSport = (b: Bet) => b.id.split("-")[0];
    const bysSport = profitBySport(bets, getSport);
    expect(bysSport["nba"].totalBets).toBe(2);
    expect(bysSport["nfl"].totalBets).toBe(1);
  });

  it("returns BetStats for each sport", () => {
    const bets: Bet[] = [
      { ...makeBet({ result: "win", stake: 1, decimalOdds: 2.0 }), id: "nba-1" },
    ];
    const bysSport = profitBySport(bets, (b) => b.id.split("-")[0]);
    expect(bysSport["nba"].wins).toBe(1);
    expect(bysSport["nba"].netUnits).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// clvCapture
// ---------------------------------------------------------------------------

describe("clvCapture", () => {
  it("returns NaN when no CLV data", () => {
    const bets: Bet[] = [
      makeBet({ result: "win" }),
      makeBet({ result: "loss" }),
    ];
    expect(Number.isNaN(clvCapture(bets, () => null))).toBe(true);
  });

  it("returns correct average when all bets have CLV", () => {
    const bets: Bet[] = [
      makeBet({ result: "win" }),
      makeBet({ result: "loss" }),
    ];
    const clvMap: number[] = [0.1, 0.3];
    let i = 0;
    const avg = clvCapture(bets, () => clvMap[i++]);
    expect(avg).toBeCloseTo(0.2);
  });

  it("ignores bets with null CLV", () => {
    const bets: Bet[] = [
      makeBet({ result: "win" }),
      makeBet({ result: "loss" }),
      makeBet({ result: "win" }),
    ];
    const clvData: (number | null)[] = [0.1, null, 0.3];
    let i = 0;
    const avg = clvCapture(bets, () => clvData[i++]);
    expect(avg).toBeCloseTo(0.2);
  });

  it("returns NaN for empty bets array", () => {
    expect(Number.isNaN(clvCapture([], () => 0.1))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// expectedValuePerUnit
// ---------------------------------------------------------------------------

describe("expectedValuePerUnit", () => {
  it("returns positive EV for 0.55 win rate at 1.909 odds", () => {
    const ev = expectedValuePerUnit(0.55, 1.909);
    expect(ev).toBeGreaterThan(0);
  });

  it("returns negative EV for 0.45 win rate at 1.909 odds", () => {
    const ev = expectedValuePerUnit(0.45, 1.909);
    expect(ev).toBeLessThan(0);
  });

  it("returns 0 EV at break-even win rate (1/odds)", () => {
    const odds = 2.0;
    const breakEven = 1 / odds;
    const ev = expectedValuePerUnit(breakEven, odds);
    expect(ev).toBeCloseTo(0);
  });

  it("computes EV correctly: winRate * (odds-1) - (1-winRate)", () => {
    const wr = 0.6;
    const odds = 2.0;
    const expected = wr * (odds - 1) - (1 - wr) * 1;
    expect(expectedValuePerUnit(wr, odds)).toBeCloseTo(expected);
  });
});

// ---------------------------------------------------------------------------
// minimumSampleForSignificance
// ---------------------------------------------------------------------------

describe("minimumSampleForSignificance", () => {
  it("returns Infinity when win rate equals null hypothesis", () => {
    expect(minimumSampleForSignificance(0.5238)).toBe(Infinity);
  });

  it("returns Infinity when win rate below null hypothesis", () => {
    expect(minimumSampleForSignificance(0.50)).toBe(Infinity);
  });

  it("returns finite positive number for 0.55 win rate", () => {
    const n = minimumSampleForSignificance(0.55);
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThan(0);
  });

  it("higher win rate requires fewer samples", () => {
    const n55 = minimumSampleForSignificance(0.55);
    const n60 = minimumSampleForSignificance(0.60);
    expect(n60).toBeLessThan(n55);
  });

  it("returns at least 1", () => {
    expect(minimumSampleForSignificance(0.99)).toBeGreaterThanOrEqual(1);
  });

  it("accepts custom null hypothesis and alpha", () => {
    const n = minimumSampleForSignificance(0.60, 0.50, 0.05);
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThan(0);
  });
});
