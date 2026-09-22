import { describe, expect, it } from "vitest";
import {
  STEAM_NULL_P_MOVE_GT_1,
  isLargeLineMove,
  normalCdf,
  probOverWinTotal,
  simulateSeasonWinTotals,
  spreadToWinProb,
  steamNullExceedanceRate,
} from "./spread-winprob-map";

describe("spread-winprob-map", () => {
  it("Φ(0) = 0.5 and favorites get > 0.5", () => {
    expect(spreadToWinProb(0)).toBeCloseTo(0.5, 8); // A&S erf approx, ±1e-7
    expect(spreadToWinProb(7)).toBeGreaterThan(0.69);
    expect(spreadToWinProb(-7)).toBeLessThan(0.31);
  });

  it("normalCdf matches known values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
  });

  it("rejects non-finite spread", () => {
    expect(() => spreadToWinProb(NaN)).toThrow();
  });

  it("season simulator concentrates around expected wins", () => {
    // 17 games at p=1 -> always 17 wins
    const dist = simulateSeasonWinTotals(new Array(17).fill(1), 100, () => 0.5);
    expect(dist.get(17)).toBe(100);
  });

  it("prob over win total is monotone in the line", () => {
    const probs = new Array(17).fill(0.5);
    const lo = probOverWinTotal(probs, 5, 2000, () => 0.4);
    const hi = probOverWinTotal(probs, 12, 2000, () => 0.4);
    expect(lo).toBeGreaterThanOrEqual(hi);
  });

  it("steam null constant is the paper's 0.20", () => {
    expect(STEAM_NULL_P_MOVE_GT_1).toBeCloseTo(0.2, 12);
    expect(isLargeLineMove(1.5)).toBe(true);
    expect(isLargeLineMove(0.5)).toBe(false);
    expect(steamNullExceedanceRate([0.5, 1.5, -2, 0.2])).toBeCloseTo(0.5, 12);
    expect(steamNullExceedanceRate([])).toBe(0);
  });
});
