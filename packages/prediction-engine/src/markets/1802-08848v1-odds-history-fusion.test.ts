import { describe, it, expect } from "vitest";
import {
  devig,
  convexFuse,
  fitFusionWeight,
  fusionGate,
} from "./1802-08848v1-odds-history-fusion.js";

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

describe("odds/history convex fusion", () => {
  it("devig removes the overround", () => {
    expect(devig([0.55, 0.5]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it("recovers the true mixture weight and beats both baselines", () => {
    const rand = mulberry32(5);
    const hist: number[][] = [];
    const odds: number[][] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const h = 0.3 + rand() * 0.4;
      const o = 0.3 + rand() * 0.4;
      hist.push([h, 1 - h]);
      odds.push([o, 1 - o]);
      // truth is a 50/50 convex combination of the two signals
      const pt = 0.5 * h + 0.5 * o;
      outcomes.push(rand() < pt ? 0 : 1);
    }
    const fit = fitFusionWeight(hist, odds, outcomes);
    expect(fit.p).toBeGreaterThan(0.3);
    expect(fit.p).toBeLessThan(0.7);
    expect(fit.fusedLogLoss).toBeLessThan(fit.histLogLoss - 0.001);
    expect(fit.fusedLogLoss).toBeLessThan(fit.oddsLogLoss - 0.001);
  });
  it("gate rejects a collapsed weight", () => {
    const fit = { p: 0.0, fusedLogLoss: 0.6, histLogLoss: 0.65, oddsLogLoss: 0.6 };
    expect(fusionGate(fit, 0.001)).toBe("REJECT");
  });
  it("convexFuse is a valid distribution", () => {
    const f = convexFuse([0.7, 0.3], [0.4, 0.6], 0.5);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(f.every((x) => x >= 0 && x <= 1)).toBe(true);
  });
});
