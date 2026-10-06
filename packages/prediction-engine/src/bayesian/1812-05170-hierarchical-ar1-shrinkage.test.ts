import { describe, it, expect } from "vitest";
import {
  shrinkEstimate,
  fitVarianceComponents,
  ar1Update,
  ar1Forecast,
  mse,
  hierarchicalGate,
} from "./1812-05170-hierarchical-ar1-shrinkage.js";

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

describe("hierarchical ar1 shrinkage", () => {
  it("shrinkage beats raw group means on hierarchical data", () => {
    const rand = mulberry32(17);
    const groups: number[][] = [];
    const truths: number[] = [];
    for (let g = 0; g < 20; g++) {
      const mu = randn(rand); // varBetween = 1
      truths.push(mu);
      const obs = Array.from({ length: 15 }, () => mu + randn(rand)); // varWithin = 1
      groups.push(obs);
    }
    const vc = fitVarianceComponents(groups);
    expect(vc.varBetween).toBeGreaterThan(0.3);
    expect(vc.varBetween).toBeLessThan(3);
    const raw = groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
    const shrunk = groups.map((g, i) => {
      const m = g.reduce((a, b) => a + b, 0) / g.length;
      return shrinkEstimate(m, vc.grandMean, vc.varWithin / g.length, vc.varBetween);
    });
    expect(mse(shrunk, truths)).toBeLessThan(mse(raw, truths));
  });
  it("shrinkEstimate interpolates between raw and pooled", () => {
    expect(shrinkEstimate(10, 0, 0, 1)).toBeCloseTo(10, 10); // no within noise -> raw
    expect(shrinkEstimate(10, 0, 1, 0)).toBeCloseTo(0, 10); // no between spread -> pooled
  });
  it("AR(1) filter tracks a momentum process better than raw observations", () => {
    const rand = mulberry32(18);
    const phi = 0.9;
    const stateVar = 0.25;
    const obsVar = 1;
    let x = 0;
    let s = { level: 0, variance: 1 };
    const errsFilt: number[] = [];
    const errsRaw: number[] = [];
    for (let t = 0; t < 300; t++) {
      x = phi * x + randn(rand) * Math.sqrt(stateVar);
      const y = x + randn(rand) * Math.sqrt(obsVar);
      const f = ar1Forecast(s, phi, stateVar);
      // forecast next x from current state, then update
      s = ar1Update(s, y, phi, stateVar, obsVar);
      void f;
      errsFilt.push(s.level - x);
      errsRaw.push(y - x);
    }
    const mseF = errsFilt.reduce((a, b) => a + b * b, 0) / errsFilt.length;
    const mseR = errsRaw.reduce((a, b) => a + b * b, 0) / errsRaw.length;
    expect(mseF).toBeLessThan(mseR * 0.8);
    // posterior variance contracts below the prior
    expect(s.variance).toBeLessThan(1);
  });
  it("gate logic", () => {
    expect(hierarchicalGate(0.01, 0.7, 0.97)).toBe("ADAPT");
    expect(hierarchicalGate(0.01, 0.0, 0.5)).toBe("REJECT");
    expect(hierarchicalGate(0.001, 0.7, 0.97)).toBe("REJECT");
  });
});
