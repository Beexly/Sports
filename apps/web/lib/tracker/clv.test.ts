import { describe, it, expect } from "vitest";
import { americanToDecimal, impliedProb, profit, clvOf, portfolio, calibration, type Bet } from "./clv";

const bet = (over: Partial<Bet> = {}): Bet => ({
  id: "b", date: "2026-01-01T00:00:00Z", sport: "NFL", event: "A @ B", market: "Spread",
  selection: "A -3", odds: -110, stake: 1, result: "pending", ...over,
});

describe("clv tracker math", () => {
  it("converts american odds to decimal and implied prob", () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0, 5);
    expect(americanToDecimal(-110)).toBeCloseTo(1.909, 2);
    expect(impliedProb(-110)).toBeCloseTo(0.5238, 3);
    expect(impliedProb(150)).toBeCloseTo(0.4, 3);
  });

  it("pays profit on a win, loses the stake on a loss, zero on push", () => {
    expect(profit(bet({ odds: 100, stake: 2, result: "win" }))).toBe(2);
    expect(profit(bet({ stake: 2, result: "loss" }))).toBe(-2);
    expect(profit(bet({ result: "push" }))).toBe(0);
  });

  it("flags beating the close when the market shortens your price", () => {
    // bet +150 (40%), closes +120 (~45.5%) → you beat the close
    const c = clvOf(bet({ odds: 150, closingOdds: 120 }))!;
    expect(c.beat).toBe(true);
    expect(c.pp).toBeGreaterThan(0);
  });

  it("flags reverse-CLV when the market drifts against you", () => {
    // bet -110 (52.4%), closes +110 (47.6%) → you got the worse number
    const c = clvOf(bet({ odds: -110, closingOdds: 110 }))!;
    expect(c.beat).toBe(false);
    expect(c.pp).toBeLessThan(0);
  });

  it("returns null CLV until a closing price is entered", () => {
    expect(clvOf(bet())).toBeNull();
  });

  it("computes a portfolio: record, ROI, CLV win rate", () => {
    const bets: Bet[] = [
      bet({ id: "1", odds: -110, stake: 1, result: "win", closingOdds: -130 }), // beat close
      bet({ id: "2", odds: -110, stake: 1, result: "loss", closingOdds: -120 }), // beat close
      bet({ id: "3", odds: 100, stake: 1, result: "win", closingOdds: 105 }), // reverse-clv
      bet({ id: "4", result: "pending" }),
    ];
    const p = portfolio(bets);
    expect(p.record).toBe("2-1");
    expect(p.settled).toBe(3);
    expect(p.pending).toBe(1);
    expect(p.staked).toBe(3);
    // profit: win(-110)=+0.91, loss=-1, win(+100)=+1 → +0.91
    expect(p.profit).toBeCloseTo(0.91, 2);
    expect(p.clvWinRate).toBe(67); // 2 of 3 beat the close
  });

  it("calibration buckets pair predicted vs actual win rate", () => {
    const bets: Bet[] = [
      bet({ id: "1", odds: -200, result: "win" }), // ~67%
      bet({ id: "2", odds: -200, result: "win" }),
      bet({ id: "3", odds: -200, result: "loss" }),
    ];
    const cal = calibration(bets);
    expect(cal.length).toBeGreaterThan(0);
    const top = cal[cal.length - 1]!;
    expect(top.n).toBe(3);
    expect(top.predicted).toBeGreaterThan(60);
    expect(top.actual).toBe(67); // 2 of 3 won
  });

  it("an empty book is all zeros, not NaN", () => {
    const p = portfolio([]);
    expect(p.roi).toBe(0);
    expect(p.brier).toBe(0);
    expect(p.clvWinRate).toBe(0);
  });
});
