// Tests for physics/0607166 Kelly backtest (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  kellyFraction,
  probEdge,
  halfKellyBacktest,
  flatBacktest,
  kellyBacktestGatePasses,
  type BacktestPick,
} from "./physics-0607166-kelly-backtest.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("kellyFraction", () => {
  it("is zero without edge and positive with edge", () => {
    // Fair coin at 2.0: no edge.
    expect(kellyFraction(0.5, 2.0)).toBe(0);
    // 60% at 2.0: f = (1.2-1)/1 = 0.2.
    expect(kellyFraction(0.6, 2.0)).toBeCloseTo(0.2, 12);
    expect(probEdge(0.6, 0.55)).toBeCloseTo(0.05, 12);
  });
});

describe("halfKellyBacktest vs flatBacktest", () => {
  it("Kelly compounds an edge over many picks", () => {
    const rand = mulberry32(21);
    // Calibrated engine: true win prob = pHat, varying edge per pick.
    const picks: BacktestPick[] = Array.from({ length: 500 }, (_, i) => {
      const pHat = i % 2 === 0 ? 0.62 : 0.54;
      const won = rand() < pHat;
      return { pHat, q: 0.5, b: 1.91, won };
    });
    const kelly = halfKellyBacktest(picks);
    const meanStake = kelly.stakes.reduce((a, s) => a + s, 0) / kelly.stakes.length;
    const flat = flatBacktest(picks, meanStake);
    expect(kelly.logWealth).toBeGreaterThan(flat.logWealth);
    expect(kelly.stakes.every((s) => s >= 0)).toBe(true);
    const gate = kellyBacktestGatePasses(kelly, flat);
    expect(gate.logWealthLift).toBeGreaterThan(0);
    expect(gate.passes).toBe(true);
  });

  it("rejects when Kelly underperforms flat", () => {
    // Deterministic miscalibration: the engine is most confident (0.62)
    // on exactly the picks that lose, so Kelly overbets losers and
    // underperforms flat staking at the same average size.
    const picks: BacktestPick[] = Array.from({ length: 300 }, (_, i) => ({
      pHat: i % 2 === 0 ? 0.54 : 0.62,
      q: 0.5,
      b: 1.91,
      won: i % 2 === 0,
    }));
    const kelly = halfKellyBacktest(picks);
    const meanStake = kelly.stakes.reduce((a, s) => a + s, 0) / kelly.stakes.length;
    const flat = flatBacktest(picks, meanStake);
    expect(kelly.logWealth).toBeLessThan(flat.logWealth);
    expect(kellyBacktestGatePasses(kelly, flat).passes).toBe(false);
  });
});
