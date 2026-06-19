import { describe, it, expect } from "vitest";
import {
  kellyStake,
  kellyUnits,
  unitStake,
  flatStake,
  riskOfRuin,
  expectedGrowth,
  simulateGrowth,
  analyzeDrawdown,
  streakAnalysis,
  stopLossCheck,
  buildRiskProfile,
  payoutFromStake,
  profitFromStake,
  stakeForTargetProfit,
  cumulativeProfitLoss,
} from "@/lib/math/bankroll";

// ---------------------------------------------------------------------------
// kellyStake
// ---------------------------------------------------------------------------
describe("kellyStake", () => {
  it("returns a positive stake when there is an edge", () => {
    const stake = kellyStake(1000, 0.55, 1.909, 1.0);
    expect(stake).toBeGreaterThan(0);
  });

  it("returns 0 when the edge is negative", () => {
    expect(kellyStake(1000, 0.4, 1.909, 1.0)).toBe(0);
  });

  it("scales linearly with bankroll", () => {
    const s1 = kellyStake(1000, 0.55, 2.0, 1.0);
    const s2 = kellyStake(2000, 0.55, 2.0, 1.0);
    expect(s2).toBeCloseTo(s1 * 2, 6);
  });

  it("applies fraction correctly (half kelly gives half the stake)", () => {
    const full = kellyStake(1000, 0.55, 2.0, 1.0);
    const half = kellyStake(1000, 0.55, 2.0, 0.5);
    expect(half).toBeCloseTo(full * 0.5, 6);
  });

  it("returns 0 for winProb=0", () => {
    expect(kellyStake(1000, 0, 2.0, 1.0)).toBe(0);
  });

  it("returns 0 for decimalOdds <= 1 (no payout)", () => {
    expect(kellyStake(1000, 0.9, 1.0, 1.0)).toBe(0);
  });

  it("returns 0 for a break-even edge (win prob = implied prob)", () => {
    // decimalOdds=2.0 → break even at 0.5
    expect(kellyStake(1000, 0.5, 2.0, 1.0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// kellyUnits
// ---------------------------------------------------------------------------
describe("kellyUnits", () => {
  it("returns ~0.1 for coin-flip at +100 (even odds)", () => {
    // winProb=0.55, decimalOdds=2.0: k = (1*0.55 - 0.45)/1 = 0.10
    expect(kellyUnits(0.55, 2.0, 1.0)).toBeCloseTo(0.1, 6);
  });

  it("returns 0 for negative edge", () => {
    expect(kellyUnits(0.4, 2.0, 1.0)).toBe(0);
  });

  it("returns half-kelly when fraction=0.5", () => {
    const full = kellyUnits(0.55, 2.0, 1.0);
    const half = kellyUnits(0.55, 2.0, 0.5);
    expect(half).toBeCloseTo(full * 0.5, 6);
  });

  it("is clamped to [0, 1] even for extreme inputs", () => {
    const val = kellyUnits(0.99, 1.01, 1.0);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// unitStake
// ---------------------------------------------------------------------------
describe("unitStake", () => {
  it("returns 10 for 1% of a 1000 bankroll", () => {
    expect(unitStake(1000, 1.0)).toBe(10);
  });

  it("returns 25 for 2.5% of a 1000 bankroll", () => {
    expect(unitStake(1000, 2.5)).toBe(25);
  });

  it("scales with bankroll", () => {
    expect(unitStake(5000, 1.0)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// flatStake
// ---------------------------------------------------------------------------
describe("flatStake", () => {
  it("returns the unitSize regardless of bankroll", () => {
    expect(flatStake(1000, 50)).toBe(50);
    expect(flatStake(9999, 50)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// riskOfRuin
// ---------------------------------------------------------------------------
describe("riskOfRuin", () => {
  it("is very low with a meaningful edge and large bankroll", () => {
    // winRate=0.55, unitSize=10, maxLosses=100 → units=100 bets
    const ror = riskOfRuin(0.55, 10, 100);
    expect(ror).toBeLessThan(0.01);
  });

  it("is high without an edge", () => {
    const ror = riskOfRuin(0.45, 10, 10);
    expect(ror).toBeGreaterThan(0.5);
  });

  it("returns 1 for winRate <= 0.5", () => {
    expect(riskOfRuin(0.5, 10, 100)).toBe(1);
    expect(riskOfRuin(0.3, 10, 100)).toBe(1);
  });

  it("returns 0 for winRate = 1 (certainty of winning)", () => {
    expect(riskOfRuin(1.0, 10, 100)).toBe(0);
  });

  it("clamps result between 0 and 1", () => {
    const ror = riskOfRuin(0.6, 5, 50);
    expect(ror).toBeGreaterThanOrEqual(0);
    expect(ror).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// expectedGrowth
// ---------------------------------------------------------------------------
describe("expectedGrowth", () => {
  it("is negative or near zero for a coin flip (no edge)", () => {
    // p=0.5, odds=2.0 (even money), f=0.05 → should be ≤0 due to log asymmetry
    const g = expectedGrowth(0.5, 2.0, 0.05);
    expect(g).toBeLessThanOrEqual(0.001);
  });

  it("is positive for a positive edge", () => {
    const g = expectedGrowth(0.55, 2.0, 0.1);
    expect(g).toBeGreaterThan(0);
  });

  it("is negative for a very large bet fraction (overbetting)", () => {
    // Betting 100% at even odds with no edge → should lose
    const g = expectedGrowth(0.5, 2.0, 1.0);
    expect(g).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// simulateGrowth
// ---------------------------------------------------------------------------
describe("simulateGrowth", () => {
  it("returns an array of length bets+1", () => {
    const result = simulateGrowth(1000, 0.55, 2.0, 0.1, 10);
    expect(result).toHaveLength(11);
  });

  it("starts at the initial bankroll", () => {
    const result = simulateGrowth(1000, 0.55, 2.0, 0.1, 10);
    expect(result[0]).toBe(1000);
  });

  it("grows when there is a positive edge", () => {
    const result = simulateGrowth(1000, 0.55, 2.0, 0.1, 10);
    expect(result[result.length - 1]).toBeGreaterThan(1000);
  });

  it("shrinks when there is a negative edge", () => {
    const result = simulateGrowth(1000, 0.4, 2.0, 0.1, 10);
    expect(result[result.length - 1]).toBeLessThan(1000);
  });

  it("returns [bankroll] for 0 bets", () => {
    const result = simulateGrowth(500, 0.55, 2.0, 0.05, 0);
    expect(result).toEqual([500]);
  });
});

// ---------------------------------------------------------------------------
// analyzeDrawdown
// ---------------------------------------------------------------------------
describe("analyzeDrawdown", () => {
  it("computes max drawdown of 200 for [1000, 900, 800, 1100, 950]", () => {
    const dd = analyzeDrawdown([1000, 900, 800, 1100, 950]);
    expect(dd.maxDrawdown).toBeCloseTo(200, 6);
  });

  it("reports peakBalance = 1100", () => {
    const dd = analyzeDrawdown([1000, 900, 800, 1100, 950]);
    expect(dd.peakBalance).toBe(1100);
  });

  it("reports currentDrawdown = 150 (1100 → 950)", () => {
    const dd = analyzeDrawdown([1000, 900, 800, 1100, 950]);
    expect(dd.currentDrawdown).toBeCloseTo(150, 6);
  });

  it("returns zeros for an empty array", () => {
    const dd = analyzeDrawdown([]);
    expect(dd.maxDrawdown).toBe(0);
    expect(dd.peakBalance).toBe(0);
  });

  it("returns zero drawdown for a monotonically increasing series", () => {
    const dd = analyzeDrawdown([100, 200, 300, 400]);
    expect(dd.maxDrawdown).toBe(0);
    expect(dd.currentDrawdown).toBe(0);
  });

  it("reports maxDrawdownPct as a fraction of peak", () => {
    const dd = analyzeDrawdown([1000, 900, 800, 1100, 950]);
    // max DD of 200 from peak of 1000 → 0.20
    expect(dd.maxDrawdownPct).toBeCloseTo(0.2, 6);
  });
});

// ---------------------------------------------------------------------------
// streakAnalysis
// ---------------------------------------------------------------------------
describe("streakAnalysis", () => {
  it("correctly identifies streaks in a mixed series", () => {
    const s = streakAnalysis(["win", "win", "loss", "loss", "loss", "win"]);
    expect(s.longestWinStreak).toBe(2);
    expect(s.longestLossStreak).toBe(3);
    expect(s.currentStreak).toBe(1);
    expect(s.currentStreakType).toBe("win");
  });

  it("handles all wins", () => {
    const s = streakAnalysis(["win", "win", "win"]);
    expect(s.longestWinStreak).toBe(3);
    expect(s.longestLossStreak).toBe(0);
    expect(s.currentStreak).toBe(3);
    expect(s.currentStreakType).toBe("win");
  });

  it("handles all losses", () => {
    const s = streakAnalysis(["loss", "loss"]);
    expect(s.longestLossStreak).toBe(2);
    expect(s.longestWinStreak).toBe(0);
  });

  it("returns 'none' for empty input", () => {
    const s = streakAnalysis([]);
    expect(s.currentStreakType).toBe("none");
    expect(s.currentStreak).toBe(0);
  });

  it("resets streak on push", () => {
    const s = streakAnalysis(["win", "win", "push", "win"]);
    expect(s.longestWinStreak).toBe(2);
    expect(s.currentStreak).toBe(1);
    expect(s.currentStreakType).toBe("win");
  });
});

// ---------------------------------------------------------------------------
// stopLossCheck
// ---------------------------------------------------------------------------
describe("stopLossCheck", () => {
  it("returns true when drawdown exceeds stopLossPct", () => {
    // 30% drawdown vs 25% threshold
    expect(stopLossCheck(700, 1000, 25)).toBe(true);
  });

  it("returns false when drawdown is below stopLossPct", () => {
    // 20% drawdown vs 25% threshold
    expect(stopLossCheck(800, 1000, 25)).toBe(false);
  });

  it("returns false when balance equals start balance", () => {
    expect(stopLossCheck(1000, 1000, 10)).toBe(false);
  });

  it("returns false for startBalance <= 0", () => {
    expect(stopLossCheck(0, 0, 25)).toBe(false);
  });

  it("returns true for a 100% loss with any threshold > 0", () => {
    expect(stopLossCheck(0, 1000, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildRiskProfile
// ---------------------------------------------------------------------------
describe("buildRiskProfile", () => {
  it("kellyFull ≈ 0.1 for 55% at even odds", () => {
    const p = buildRiskProfile(1000, 0.55, 2.0);
    expect(p.kellyFull).toBeCloseTo(0.1, 6);
  });

  it("kellyHalf is half of kellyFull", () => {
    const p = buildRiskProfile(1000, 0.55, 2.0);
    expect(p.kellyHalf).toBeCloseTo(p.kellyFull * 0.5, 6);
  });

  it("kellyQuarter is one quarter of kellyFull", () => {
    const p = buildRiskProfile(1000, 0.55, 2.0);
    expect(p.kellyQuarter).toBeCloseTo(p.kellyFull * 0.25, 6);
  });

  it("dollarsPerUnit = bankroll / unitCount", () => {
    const p = buildRiskProfile(1000, 0.55, 2.0);
    expect(p.dollarsPerUnit).toBe(10);
  });

  it("unitPct is always 1.0", () => {
    const p = buildRiskProfile(5000, 0.6, 2.2);
    expect(p.unitPct).toBe(1.0);
  });

  it("unitsCount defaults to 100", () => {
    const p = buildRiskProfile(1000, 0.55, 2.0);
    expect(p.unitsCount).toBe(100);
  });

  it("accepts a custom unitCount", () => {
    const p = buildRiskProfile(1000, 0.55, 2.0, 50);
    expect(p.unitsCount).toBe(50);
    expect(p.dollarsPerUnit).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// payoutFromStake / profitFromStake / stakeForTargetProfit
// ---------------------------------------------------------------------------
describe("payoutFromStake", () => {
  it("returns stake * decimalOdds", () => {
    expect(payoutFromStake(100, 2.0)).toBe(200);
  });

  it("handles fractional odds", () => {
    expect(payoutFromStake(50, 1.5)).toBeCloseTo(75, 6);
  });
});

describe("profitFromStake", () => {
  it("returns stake * (decimalOdds - 1)", () => {
    expect(profitFromStake(100, 2.0)).toBe(100);
  });

  it("returns 0 for decimalOdds = 1 (no profit)", () => {
    expect(profitFromStake(100, 1.0)).toBe(0);
  });
});

describe("stakeForTargetProfit", () => {
  it("returns stake needed to hit target profit at even odds", () => {
    expect(stakeForTargetProfit(100, 2.0)).toBe(100);
  });

  it("returns 0 for decimalOdds <= 1 (no profit possible)", () => {
    expect(stakeForTargetProfit(100, 1.0)).toBe(0);
  });

  it("round-trips with profitFromStake", () => {
    const target = 75;
    const odds = 2.5;
    const stake = stakeForTargetProfit(target, odds);
    expect(profitFromStake(stake, odds)).toBeCloseTo(target, 6);
  });
});

// ---------------------------------------------------------------------------
// cumulativeProfitLoss
// ---------------------------------------------------------------------------
describe("cumulativeProfitLoss", () => {
  it("returns [100, 0] for [win, loss] at even odds with stake=100", () => {
    const result = cumulativeProfitLoss([100, 100], ["win", "loss"], [2.0, 2.0]);
    expect(result[0]).toBeCloseTo(100, 6);
    expect(result[1]).toBeCloseTo(0, 6);
  });

  it("push does not change P/L", () => {
    const result = cumulativeProfitLoss([100], ["push"], [2.0]);
    expect(result[0]).toBe(0);
  });

  it("accumulates across multiple bets", () => {
    const result = cumulativeProfitLoss(
      [100, 100, 100],
      ["win", "win", "loss"],
      [2.0, 2.0, 2.0],
    );
    expect(result[0]).toBeCloseTo(100, 6);
    expect(result[1]).toBeCloseTo(200, 6);
    expect(result[2]).toBeCloseTo(100, 6);
  });

  it("returns empty array for empty inputs", () => {
    const result = cumulativeProfitLoss([], [], []);
    expect(result).toEqual([]);
  });

  it("handles different odds per bet", () => {
    // win 100 at 3.0 → +200; loss 50 at 2.5 → -50; net = 150
    const result = cumulativeProfitLoss([100, 50], ["win", "loss"], [3.0, 2.5]);
    expect(result[0]).toBeCloseTo(200, 6);
    expect(result[1]).toBeCloseTo(150, 6);
  });
});
