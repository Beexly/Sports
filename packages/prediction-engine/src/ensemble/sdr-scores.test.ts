import { describe, expect, it } from "vitest";
import { inverseSqrt, jacobiEigen, slicedInverseRegression } from "./sdr-scores";

// Deterministic PRNG (mulberry32).
function rng32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("sdr-scores", () => {
  it("inverseSqrt inverts the square root", () => {
    const M = [
      [4, 1],
      [1, 3],
    ];
    const W = inverseSqrt(M);
    // W * M * W should be identity.
    const MW = M.map((row, i) => row.map((_, j) => row.reduce((a, _, k) => a + M[i]![k]! * W[k]![j]!, 0)));
    const WMW = W.map((row, i) => row.map((_, j) => row.reduce((a, _, k) => a + W[i]![k]! * MW[k]![j]!, 0)));
    expect(WMW[0]![0]).toBeCloseTo(1, 4);
    expect(WMW[1]![1]).toBeCloseTo(1, 4);
    expect(Math.abs(WMW[0]![1]!)).toBeLessThan(1e-4);
  });
  it("jacobiEigen diagonalizes a symmetric matrix", () => {
    const { values, vectors } = jacobiEigen([
      [2, 1],
      [1, 2],
    ]);
    expect(values[0]).toBeCloseTo(3, 8);
    expect(values[1]).toBeCloseTo(1, 8);
    const dot = vectors[0]![0]! * vectors[1]![0]! + vectors[0]![1]! * vectors[1]![1]!;
    expect(Math.abs(dot)).toBeLessThan(1e-8);
  });
  it("SIR recovers a single-index direction", () => {
    const rand = rng32(0x9e3779b9);
    const n = 600;
    const beta = [1, 2, 0.5];
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
      const idx = x[0]! * beta[0]! + x[1]! * beta[1]! + x[2]! * beta[2]!;
      X.push(x);
      y.push(idx + (rand() - 0.5) * 0.2);
    }
    const { directions, scores } = slicedInverseRegression(X, y, 10, 1);
    const d = directions[0]!;
    const norm = Math.hypot(...d);
    const bnorm = Math.hypot(...beta);
    const cos = Math.abs(d.reduce((a, v, j) => a + (v / norm) * (beta[j]! / bnorm), 0));
    expect(cos).toBeGreaterThan(0.95);
    expect(scores.length).toBe(n);
    expect(scores[0]!.length).toBe(1);
  });
  it("throws on degenerate inputs", () => {
    expect(() => slicedInverseRegression([], [], 2, 1)).toThrow();
    expect(() => slicedInverseRegression([[1]], [1, 2], 2, 1)).toThrow();
    expect(() => slicedInverseRegression([[1, 2]], [1], 1, 1)).toThrow();
    expect(() => inverseSqrt([])).toThrow();
  });
});
