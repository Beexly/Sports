import { describe, it, expect } from "vitest";
import {
  attentionRow,
  trajectoryAttention,
  smoothAttention,
} from "./2305-14612-acl-risk-video-scoring.js";

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

describe("attvideo", () => {
  it("attentionRow is a convex combination of values", () => {
    const q = [1, 0];
    const K = [[1, 0], [0, 1]];
    const V = [[10, 0], [0, 10]];
    const out = attentionRow(q, K, V);
    expect(out[0]!).toBeGreaterThan(out[1]!);
    expect(Math.abs(out[0]! + out[1]! - 10)).toBeLessThan(1e-6);
  });
  it("trajectoryAttention weights sum to 1", () => {
    const traj = [[1, 0], [0, 1], [1, 1]];
    const w = trajectoryAttention(traj, 0);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w[0]!).toBeGreaterThan(w[1]!);
  });
  it("smoothAttention averages locally", () => {
    const w = smoothAttention([0, 0, 1, 0, 0], 1);
    expect(w[2]!).toBeCloseTo(1 / 3, 10);
  });
});
