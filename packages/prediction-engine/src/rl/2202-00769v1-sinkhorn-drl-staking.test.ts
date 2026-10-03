import { describe, it, expect } from "vitest";
import {
  wasserstein1d,
  entropicTransportCost,
  scalarizeReturn,
  riskPriceUpdate,
} from "./2202-00769v1-sinkhorn-drl-staking.js";

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

describe("wasserstein", () => {
  it("w1 is 0 for identical samples and grows with shift", () => {
    const rand = mulberry32(231);
    const a = Array.from({ length: 500 }, () => randn(rand));
    const b = a.map((x) => x + 2);
    expect(wasserstein1d(a, a)).toBe(0);
    expect(wasserstein1d(a, b)).toBeGreaterThan(1.5);
  });
  it("scalarizeReturn penalizes drawdown", () => {
    expect(scalarizeReturn([1, 0.1, 0.5], 2, 0.5)).toBeGreaterThan(scalarizeReturn([1, 1, 0.5], 2, 0.5));
  });
});
