import { describe, it, expect } from "vitest";
import {
  pearson,
  partialCorr,
  pcorPvalue,
  pcmciSkeletonS1,
} from "./2003-03685v2-pcmci-team-panel.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
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

describe("pcor", () => {
  it("partialCorr removes the confounder", () => {
    const rand = mulberry32(261);
    const n = 2000;
    const X: number[][] = [];
    for (let i = 0; i < n; i++) {
      const z = randn(rand);
      const x = z + randn(rand) * 0.3;
      const y = z + randn(rand) * 0.3;
      X.push([x, y, z]);
    }
    const rMarg = pearson(X.map((r) => r[0]!), X.map((r) => r[1]!));
    const rPart = partialCorr(X, 0, 1, [2]);
    expect(rMarg).toBeGreaterThan(0.7);
    expect(Math.abs(rPart)).toBeLessThan(0.15);
  });
  it("pcmciSkeletonS1 finds the lagged causal link", () => {
    const rand = mulberry32(262);
    const T = 600;
    const X: number[][] = [];
    let x = 0;
    let y = 0;
    for (let t = 0; t < T; t++) {
      const xn = 0.6 * x + randn(rand);
      const yn = 0.5 * x + 0.2 * y + randn(rand); // x -> y at lag 1
      x = xn; y = yn;
      X.push([x, y]);
    }
    const edges = pcmciSkeletonS1(X, 2, 0.01);
    const xy = edges.filter((e) => e.from === 0 && e.to === 1 && e.lag === 1);
    const yx = edges.filter((e) => e.from === 1 && e.to === 0);
    expect(xy.length).toBe(1);
    expect(yx.length).toBe(0);
  });
});
