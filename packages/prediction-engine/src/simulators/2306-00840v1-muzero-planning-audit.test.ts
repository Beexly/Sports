import { describe, it, expect } from "vitest";
import {
  emaUpdate,
  cosineMomentum,
  latentTransition,
  noveltyScore,
} from "./2306-00840v1-muzero-planning-audit.js";

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

describe("worldmodel", () => {
  it("emaUpdate tracks the target with momentum", () => {
    const out = emaUpdate([0, 0], [1, 2], 0.9);
    expect(out[0]).toBeCloseTo(0.1, 10);
    expect(out[1]).toBeCloseTo(0.2, 10);
  });
  it("cosineMomentum ramps from base to max", () => {
    expect(cosineMomentum(0, 100, 0.9)).toBeCloseTo(0.9, 8);
    expect(cosineMomentum(100, 100, 0.9)).toBeCloseTo(1, 8);
  });
  it("noveltyScore flags out-of-distribution episodes", () => {
    const base = [0.1, 0.12, 0.09, 0.11, 0.1];
    expect(noveltyScore(0.5, base)).toBeGreaterThan(3);
    expect(Math.abs(noveltyScore(0.1, base))).toBeLessThan(1.5);
  });
});
