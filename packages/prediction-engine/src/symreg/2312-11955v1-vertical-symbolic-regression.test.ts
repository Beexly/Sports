import { describe, it, expect } from "vitest";
import {
  ParetoPoint,
  paretoFrontier,
  skeletonJaccard,
  pairedPvalue,
  hypothesisReject,
  verticalFilter,
} from "./2312-11955v1-vertical-symbolic-regression.js";

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

describe("feynman", () => {
  it("paretoFrontier keeps only non-dominated points", () => {
    const pts = [
      { error: 0.1, complexity: 5, id: "a" },
      { error: 0.2, complexity: 3, id: "b" },
      { error: 0.15, complexity: 6, id: "c" }, // dominated by a
      { error: 0.05, complexity: 8, id: "d" },
    ];
    const front = paretoFrontier(pts).map((p) => p.id).sort();
    expect(front).toEqual(["a", "b", "d"]);
  });
  it("hypothesisReject keeps significantly-better candidates", () => {
    const rand = mulberry32(351);
    const base = Array.from({ length: 100 }, () => 1 + randn(rand) * 0.1);
    const better = base.map((v) => v - 0.5);
    const same = base.map((v) => v + randn(rand) * 0.01);
    expect(hypothesisReject(better, base)).toBe(false);
    expect(hypothesisReject(same, base)).toBe(true);
  });
  it("verticalFilter restricts to allowed features", () => {
    const hof = [
      { expr: "x1+x2", features: ["x1", "x2"], error: 0.1 },
      { expr: "x1*x3", features: ["x1", "x3"], error: 0.2 },
    ];
    expect(verticalFilter(hof, new Set(["x1", "x2"])).length).toBe(1);
  });
});
