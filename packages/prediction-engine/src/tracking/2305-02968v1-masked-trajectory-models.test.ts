import { describe, it, expect } from "vitest";
import {
  randomMask,
  maskedReconError,
  heteromodalLoss,
  focalPool,
} from "./2305-02968v1-masked-trajectory-models.js";

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

describe("mtm", () => {
  it("maskedReconError is lower for the true baseline than a shuffled one", () => {
    const rand = mulberry32(301);
    const xs = Array.from({ length: 100 }, (_, i) => [Math.sin(i / 10), Math.cos(i / 10)]);
    const mask = randomMask(100, 0.5, rand);
    const trueBase = (i: number): number[] => [Math.sin(i / 10), Math.cos(i / 10)];
    const badBase = (_i: number): number[] => [0, 0];
    expect(maskedReconError(xs, mask, trueBase)).toBeLessThan(maskedReconError(xs, mask, badBase));
  });
  it("heteromodalLoss ignores missing modalities", () => {
    expect(heteromodalLoss([1, 2, 3], [true, false, true])).toBeCloseTo(2, 10);
    expect(heteromodalLoss([1, 2, 3], [false, false, false])).toBe(0);
  });
  it("focalPool averages with focal weights", () => {
    const xs = [[1, 0], [0, 1], [1, 1]];
    const out = focalPool(xs, [1, 3], [1, 1]);
    expect(out.length).toBe(2);
    expect(out.every(Number.isFinite)).toBe(true);
  });
});
