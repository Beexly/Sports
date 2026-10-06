import { describe, it, expect } from "vitest";
import {
  expectedPointsPerDrive,
  fairLiveTotal,
  calibrateLambda,
  priceOverUnder,
  hedgeDelta,
  pricerGate,
  normalCdf,
  PointMark,
} from "./1811-03931v1-riskneutral-inplay-pricer.js";

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
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const MARKS: PointMark[] = [
  { points: 7, prob: 0.22 },
  { points: 3, prob: 0.18 },
  { points: 0, prob: 0.6 },
];

describe("risk-neutral in-play pricer", () => {
  it("fair total matches Monte Carlo of the compound Poisson process", () => {
    const rand = mulberry32(14);
    const lambda = 0.09;
    const timeLeft = 30;
    const current = 24;
    const fair = fairLiveTotal(lambda, MARKS, timeLeft, current);
    let tot = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      // Poisson(lambda*timeLeft) drives via exponential interarrivals
      let t = 0;
      let pts = current;
      while (true) {
        t += -Math.log(1 - rand()) / lambda;
        if (t > timeLeft) break;
        const u = rand();
        pts += u < 0.22 ? 7 : u < 0.4 ? 3 : 0;
      }
      tot += pts;
    }
    expect(Math.abs(tot / N - fair.mean)).toBeLessThan(0.5);
    expect(fair.mean).toBeCloseTo(current + lambda * timeLeft * expectedPointsPerDrive(MARKS), 10);
  });
  it("calibrateLambda recovers the intensity implied by the market total", () => {
    const lam = calibrateLambda(48.5, MARKS, 30, 24);
    const fair = fairLiveTotal(lam, MARKS, 30, 24);
    expect(fair.mean).toBeCloseTo(48.5, 8);
    expect(lam).toBeGreaterThan(0);
  });
  it("over/under prices are arbitrage-free and monotone in the mean", () => {
    const a = priceOverUnder(49, 60, 47.5);
    expect(a.over + a.under).toBeCloseTo(1, 12);
    expect(a.over).toBeGreaterThan(0.55);
    const b = priceOverUnder(40, 60, 47.5);
    expect(b.over).toBeLessThan(a.over);
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });
  it("hedgeDelta offsets the book's directional exposure", () => {
    const dOver = hedgeDelta(48, 60, 47.5, "over", 100);
    const dUnder = hedgeDelta(48, 60, 47.5, "under", 100);
    expect(dOver).toBeLessThan(0); // short the over direction
    expect(dUnder).toBeGreaterThan(0);
    expect(Math.abs(dOver)).toBeCloseTo(Math.abs(dUnder), 10);
  });
  it("gate logic", () => {
    expect(pricerGate(0.2, 0.4)).toBe("ADOPT");
    expect(pricerGate(0.6, 0.4)).toBe("REJECT");
    expect(pricerGate(0.2, 0.1)).toBe("REJECT");
  });
});
