/**
 * Murphy diagrams + Diebold-Mariano tests — tests (arXiv 1902.04489).
 *
 * ACCEPTANCE GATE: on two known-different forecast sets the protocol
 * reproduces the known ranking with DM p < 0.05 and uniform Murphy dominance;
 * the integrated Murphy curve recovers the pinball delta (construction check).
 */
import { describe, expect, it } from "vitest";
import {
  dieboldMariano,
  elementaryScore,
  meanPinballDiff,
  murphyDiagram,
  pinballLoss,
} from "./murphy-diagram";

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

describe("elementaryScore", () => {
  it("integrates to the pinball loss (mixture representation)", () => {
    const tau = 0.75;
    const cases: [number, number][] = [
      [3, 5],
      [7, 2],
      [4, 4],
    ];
    for (const [q, y] of cases) {
      let integ = 0;
      const lo = Math.min(q, y) - 5;
      const hi = Math.max(q, y) + 5;
      const steps = 20000;
      const dth = (hi - lo) / steps;
      for (let k = 0; k < steps; k++) {
        const th = lo + (k + 0.5) * dth;
        integ += elementaryScore(q, y, th, tau) * dth;
      }
      expect(integ).toBeCloseTo(pinballLoss(y, q, tau), 2);
    }
  });
});

describe("murphyDiagram", () => {
  it("shows uniform dominance for a strictly better forecast set", () => {
    // Deterministic: perfect quantile vs a constant +2 bias. The elementary
    // difference is <= 0 at every theta and < 0 on [y, y+2).
    const actuals = [38, 42, 45, 50, 52];
    const qGood = [...actuals];
    const qBad = actuals.map((y) => y + 2);
    const tau = 0.5;
    const thetas = Array.from({ length: 31 }, (_, i) => 35 + i);
    const curve = murphyDiagram(actuals, qGood, qBad, tau, thetas);
    expect(curve.every((r) => r.diff <= 0)).toBe(true);
    expect(curve.some((r) => r.diff < 0)).toBe(true);
    // Integrated curve recovers the mean pinball difference.
    const pinDiff = meanPinballDiff(actuals, qGood, qBad, tau);
    expect(curve[0]?.integratedDiff).toBeCloseTo(pinDiff, 1);
    expect(pinDiff).toBeLessThan(0);
  });

  it("favors the tighter forecaster on average under noise", () => {
    const rand = mulberry32(31);
    const n = 600;
    const actuals: number[] = [];
    const qGood: number[] = [];
    const qBad: number[] = [];
    for (let i = 0; i < n; i++) {
      const y = 40 + 10 * (rand() + rand() + rand() - 1.5);
      actuals.push(y);
      qGood.push(y + (rand() - 0.5) * 2); // tight around truth
      qBad.push(y + (rand() - 0.5) * 12); // noisy
    }
    const tau = 0.5;
    const thetas = Array.from({ length: 41 }, (_, i) => 20 + i);
    const curve = murphyDiagram(actuals, qGood, qBad, tau, thetas);
    const meanDiff = curve.reduce((a, r) => a + r.diff, 0) / curve.length;
    expect(meanDiff).toBeLessThan(0);
    expect(meanPinballDiff(actuals, qGood, qBad, tau)).toBeLessThan(0);
  });

  it("is exactly zero for identical forecast sets", () => {
    const actuals = [1, 2, 3, 4];
    const q = [1.5, 2.5, 2.5, 4.5];
    const curve = murphyDiagram(actuals, q, q, 0.5, [0, 2, 4, 6]);
    expect(curve.every((r) => r.diff === 0)).toBe(true);
  });

  it("throws on degenerate input", () => {
    expect(() => murphyDiagram([], [], [], 0.5, [0])).toThrow();
    expect(() => murphyDiagram([1], [1], [1, 2], 0.5, [0])).toThrow();
    expect(() => murphyDiagram([1], [1], [1], 0.5, [])).toThrow();
  });
});

describe("dieboldMariano", () => {
  it("rejects equal accuracy for a clearly better forecaster", () => {
    const rand = mulberry32(37);
    const n = 400;
    const l1: number[] = [];
    const l2: number[] = [];
    for (let i = 0; i < n; i++) {
      const y = rand() * 10;
      l1.push(Math.abs(y - (y + (rand() - 0.5) * 1)));
      l2.push(Math.abs(y - (y + (rand() - 0.5) * 4)));
    }
    const r = dieboldMariano(l1, l2);
    expect(r.dm).toBeLessThan(0);
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.meanDiff).toBeLessThan(0);
  });

  it("does not reject for exchangeable loss series", () => {
    const rand = mulberry32(41);
    const n = 400;
    const l1: number[] = [];
    const l2: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.abs(rand() - 0.5);
      const b = Math.abs(rand() - 0.5);
      l1.push(a);
      l2.push(b);
    }
    const r = dieboldMariano(l1, l2);
    expect(r.pValue).toBeGreaterThan(0.05);
  });

  it("throws on degenerate input", () => {
    expect(() => dieboldMariano([1, 2], [1])).toThrow();
    expect(() => dieboldMariano([1, 2, 3], [1, 2, 3])).toThrow();
    expect(() => dieboldMariano(new Array(10).fill(1), new Array(10).fill(1))).toThrow();
  });
});
