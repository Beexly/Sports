import { describe, it, expect } from "vitest";
import {
  normalizeAdj,
  gcnLayer,
  gcnForward2,
  buildLeagueGraph,
} from "./2207-13191-gcn-win-prediction.js";

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

describe("gcn", () => {
  it("normalizeAdj is symmetric with rows summing sensibly", () => {
    const A = [[0, 1, 0], [1, 0, 1], [0, 1, 0]];
    const N = normalizeAdj(A);
    expect(N[0]![1]).toBeCloseTo(N[1]![0]!, 10);
    expect(N[0]![0]).toBeGreaterThan(0);
  });
  it("gcnForward2 outputs valid probabilities", () => {
    const rand = mulberry32(331);
    const X = Array.from({ length: 6 }, () => [rand(), rand(), rand()]);
    const A = [[0, 1, 0, 0, 0, 0], [1, 0, 1, 0, 0, 0], [0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0], [0, 0, 0, 1, 0, 1], [0, 0, 0, 0, 1, 0]];
    const W1 = Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => rand() - 0.5));
    const W2 = Array.from({ length: 4 }, () => Array.from({ length: 2 }, () => rand() - 0.5));
    const probs = gcnForward2(X, A, W1, W2, [0.5, -0.3]);
    expect(probs.length).toBe(6);
    expect(probs.every((p) => p > 0 && p < 1)).toBe(true);
  });
  it("buildLeagueGraph links teams and their previous games", () => {
    const A = buildLeagueGraph(2, 3, [[[0, 1]], [[0, 1]], [[0, 1]]]);
    expect(A[0]![1]).toBe(1); // opponents
    expect(A[2]![0]).toBe(1); // prev game self-edge
    expect(A[0]![4]).toBe(0); // no cross-team cross-time edge
  });
});
