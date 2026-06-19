import { describe, expect, it } from "vitest";

import {
  bankrollStats,
  breakEvenProb,
  expectedValue,
  fibonacciAt,
  fibonacciStake,
  kellyStake,
  levelStake,
  percentageBankroll,
  roi,
} from "../lib/math/staking";

// ─── levelStake ─────────────────────────────────────────────────────────────

describe("levelStake", () => {
  it("returns the exact amount passed in", () => {
    expect(levelStake(50).stake).toBe(50);
  });

  it("returns riskLevel LOW", () => {
    expect(levelStake(100).riskLevel).toBe("LOW");
  });

  it("returns stake=0 for amount=0", () => {
    expect(levelStake(0).stake).toBe(0);
  });

  it("includes amount in rationale string", () => {
    const r = levelStake(25);
    expect(r.rationale).toContain("25");
  });

  it("throws for negative amount", () => {
    expect(() => levelStake(-1)).toThrow(RangeError);
  });
});

// ─── percentageBankroll ─────────────────────────────────────────────────────

describe("percentageBankroll", () => {
  it("2% of 1000 = 20", () => {
    expect(percentageBankroll(1000, 2).stake).toBeCloseTo(20, 10);
  });

  it("returns LOW for 2%", () => {
    expect(percentageBankroll(1000, 2).riskLevel).toBe("LOW");
  });

  it("returns MEDIUM for 3%", () => {
    expect(percentageBankroll(1000, 3).riskLevel).toBe("MEDIUM");
  });

  it("returns HIGH for 7%", () => {
    expect(percentageBankroll(1000, 7).riskLevel).toBe("HIGH");
  });

  it("returns VERY_HIGH for 15%", () => {
    expect(percentageBankroll(1000, 15).riskLevel).toBe("VERY_HIGH");
  });

  it("5% of 2000 = 100", () => {
    expect(percentageBankroll(2000, 5).stake).toBeCloseTo(100, 10);
  });

  it("throws for invalid pct > 100", () => {
    expect(() => percentageBankroll(1000, 101)).toThrow(RangeError);
  });
});

// ─── kellyStake ─────────────────────────────────────────────────────────────

describe("kellyStake", () => {
  it("returns stake=0 when edge is negative (50% at 1.909 odds)", () => {
    // break-even for 1.909 is ~52.4%; 50% win prob → no bet
    const result = kellyStake({ bankroll: 1000, winProb: 0.5, decimalOdds: 1.909 });
    expect(result.stake).toBe(0);
  });

  it("returns riskLevel LOW when stake is 0", () => {
    const result = kellyStake({ bankroll: 1000, winProb: 0.5, decimalOdds: 1.909 });
    expect(result.riskLevel).toBe("LOW");
  });

  it("returns stake > 0 for positive edge", () => {
    // 60% win prob at decimal 2.0 (even money) → clear positive edge
    const result = kellyStake({ bankroll: 1000, winProb: 0.6, decimalOdds: 2.0 });
    expect(result.stake).toBeGreaterThan(0);
  });

  it("quarter Kelly stake is 25% of full Kelly stake", () => {
    const full = kellyStake({ bankroll: 1000, winProb: 0.6, decimalOdds: 2.0, fraction: 1.0 });
    const quarter = kellyStake({ bankroll: 1000, winProb: 0.6, decimalOdds: 2.0, fraction: 0.25 });
    expect(quarter.stake).toBeCloseTo(full.stake * 0.25, 8);
  });

  it("default fraction is 0.25 (quarter Kelly)", () => {
    const defaultResult = kellyStake({ bankroll: 1000, winProb: 0.6, decimalOdds: 2.0 });
    const explicitQuarter = kellyStake({ bankroll: 1000, winProb: 0.6, decimalOdds: 2.0, fraction: 0.25 });
    expect(defaultResult.stake).toBeCloseTo(explicitQuarter.stake, 10);
  });

  it("full Kelly (fraction=1) is larger than quarter Kelly (fraction=0.25)", () => {
    const full = kellyStake({ bankroll: 1000, winProb: 0.6, decimalOdds: 2.0, fraction: 1.0 });
    const quarter = kellyStake({ bankroll: 1000, winProb: 0.6, decimalOdds: 2.0, fraction: 0.25 });
    expect(full.stake).toBeGreaterThan(quarter.stake);
  });

  it("throws for invalid winProb > 1", () => {
    expect(() => kellyStake({ bankroll: 1000, winProb: 1.1, decimalOdds: 2.0 })).toThrow(RangeError);
  });
});

// ─── fibonacciAt ────────────────────────────────────────────────────────────

describe("fibonacciAt", () => {
  it("fib(0) = 1", () => {
    expect(fibonacciAt(0)).toBe(1);
  });

  it("fib(1) = 1", () => {
    expect(fibonacciAt(1)).toBe(1);
  });

  it("fib(2) = 1 (staking convention: first three positions all yield 1)", () => {
    expect(fibonacciAt(2)).toBe(1);
  });

  it("fib(3) = 2", () => {
    expect(fibonacciAt(3)).toBe(2);
  });

  it("fib(4) = 3", () => {
    expect(fibonacciAt(4)).toBe(3);
  });

  it("fib(5) = 5", () => {
    expect(fibonacciAt(5)).toBe(5);
  });

  it("fib(6) = 8", () => {
    expect(fibonacciAt(6)).toBe(8);
  });

  it("fib(7) = 13", () => {
    expect(fibonacciAt(7)).toBe(13);
  });

  it("throws for negative n", () => {
    expect(() => fibonacciAt(-1)).toThrow(RangeError);
  });
});

// ─── fibonacciStake ─────────────────────────────────────────────────────────

describe("fibonacciStake", () => {
  it("lossStreak=0 → 1 unit (position 0 of Fibonacci sequence)", () => {
    const r = fibonacciStake({ unit: 10, lossStreak: 0 });
    expect(r.stake).toBe(10); // 10 × fib(0) = 10 × 1
  });

  it("lossStreak=3 → fib(3)=2 units", () => {
    const r = fibonacciStake({ unit: 10, lossStreak: 3 });
    expect(r.stake).toBe(20); // 10 × fib(3) = 10 × 2
  });

  it("lossStreak=5 → fib(5)=5 units", () => {
    const r = fibonacciStake({ unit: 5, lossStreak: 5 });
    expect(r.stake).toBe(25); // 5 × fib(5) = 5 × 5
  });

  it("maxN cap limits stake when lossStreak exceeds maxN", () => {
    // maxN=3, lossStreak=10 → effective position is 3 → fib(3)=3
    const capped = fibonacciStake({ unit: 10, lossStreak: 10, maxN: 3 });
    const uncapped = fibonacciStake({ unit: 10, lossStreak: 3, maxN: 3 });
    expect(capped.stake).toBe(uncapped.stake);
  });

  it("default maxN=8 caps at fib(8)=21 units", () => {
    const r = fibonacciStake({ unit: 1, lossStreak: 100 });
    expect(r.stake).toBe(fibonacciAt(8)); // fib(8) = 21 in staking convention
  });

  it("always returns VERY_HIGH riskLevel", () => {
    expect(fibonacciStake({ unit: 10, lossStreak: 0 }).riskLevel).toBe("VERY_HIGH");
    expect(fibonacciStake({ unit: 10, lossStreak: 5 }).riskLevel).toBe("VERY_HIGH");
  });

  it("rationale mentions capping when lossStreak exceeds maxN", () => {
    const r = fibonacciStake({ unit: 10, lossStreak: 20, maxN: 5 });
    expect(r.rationale).toContain("capped");
  });
});

// ─── expectedValue ──────────────────────────────────────────────────────────

describe("expectedValue", () => {
  it("returns positive EV for high win prob and good odds", () => {
    // 60% chance at 2.0 decimal odds: EV = 0.6×1×10 - 0.4×10 = 6 - 4 = +2
    const ev = expectedValue({ stake: 10, winProb: 0.6, decimalOdds: 2.0 });
    expect(ev).toBeGreaterThan(0);
  });

  it("returns negative EV for 50% win prob below break-even odds", () => {
    // 50% at 1.909 odds (roughly -110): profit = 0.909 × 10 = 9.09; loss = 10
    // EV = 0.5×9.09 - 0.5×10 = 4.545 - 5 < 0
    const ev = expectedValue({ stake: 10, winProb: 0.5, decimalOdds: 1.909 });
    expect(ev).toBeLessThan(0);
  });

  it("returns 0 EV for exact break-even scenario", () => {
    // Break-even for 2.0 is 50%. At exactly 50%, EV should be ~0.
    const ev = expectedValue({ stake: 100, winProb: 0.5, decimalOdds: 2.0 });
    expect(ev).toBeCloseTo(0, 10);
  });
});

// ─── breakEvenProb ──────────────────────────────────────────────────────────

describe("breakEvenProb", () => {
  it("decimal 2.0 → 0.5 (50%)", () => {
    expect(breakEvenProb(2.0)).toBeCloseTo(0.5, 10);
  });

  it("-110 equivalent (~1.909) → ~0.524", () => {
    // 1/1.909 ≈ 0.524
    expect(breakEvenProb(1.909)).toBeCloseTo(0.524, 2);
  });

  it("higher odds → lower break-even probability", () => {
    expect(breakEvenProb(3.0)).toBeLessThan(breakEvenProb(2.0));
  });
});

// ─── roi ────────────────────────────────────────────────────────────────────

describe("roi", () => {
  it("1100 returns on 1000 staked → 10% (0.1)", () => {
    expect(roi(1100, 1000)).toBeCloseTo(0.1, 10);
  });

  it("returns negative for net loss", () => {
    // 900 returns on 1000 staked → -10%
    expect(roi(900, 1000)).toBeCloseTo(-0.1, 10);
  });

  it("returns 0 when totalStaked is 0", () => {
    expect(roi(0, 0)).toBe(0);
  });
});

// ─── bankrollStats ──────────────────────────────────────────────────────────

describe("bankrollStats", () => {
  it("basic stats: one win at 1.9 odds, one loss", () => {
    const stats = bankrollStats(1000, [
      { stake: 100, returns: 190 }, // win at 1.9 odds: profit +90
      { stake: 100, returns: 0 },   // loss: profit -100
    ]);
    // totalReturns=190, totalStaked=200, pnl=190-200=-10
    expect(stats.startingBankroll).toBe(1000);
    expect(stats.pnl).toBeCloseTo(-10, 10);
    expect(stats.currentBankroll).toBeCloseTo(990, 10);
  });

  it("pnlPct reflects pnl as fraction of starting bankroll", () => {
    const stats = bankrollStats(1000, [{ stake: 100, returns: 200 }]);
    // pnl = 100, pnlPct = 100/1000 = 0.1
    expect(stats.pnlPct).toBeCloseTo(0.1, 10);
  });

  it("all losses → negative pnl", () => {
    const stats = bankrollStats(1000, [
      { stake: 100, returns: 0 },
      { stake: 100, returns: 0 },
      { stake: 100, returns: 0 },
    ]);
    expect(stats.pnl).toBe(-300);
    expect(stats.currentBankroll).toBe(700);
    expect(stats.pnlPct).toBeCloseTo(-0.3, 10);
  });

  it("roi is computed correctly from total returns / total staked", () => {
    // 3 × {stake:100, returns:190} → totalStaked=300, totalReturns=570
    const stats = bankrollStats(1000, [
      { stake: 100, returns: 190 },
      { stake: 100, returns: 190 },
      { stake: 100, returns: 190 },
    ]);
    // roi = (570 - 300) / 300 = 270/300 = 0.9
    expect(stats.roi).toBeCloseTo(0.9, 10);
  });

  it("empty bets array → bankroll unchanged, pnl=0", () => {
    const stats = bankrollStats(500, []);
    expect(stats.currentBankroll).toBe(500);
    expect(stats.pnl).toBe(0);
    expect(stats.pnlPct).toBe(0);
  });
});
