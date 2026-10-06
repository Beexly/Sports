import { describe, expect, it } from "vitest";
import {
  hodgeBootstrap,
  hodgeDecompose,
  type ComparisonEdge,
} from "./hodge-diagnostic-2607.js";

function transitiveEdges(): ComparisonEdge[] {
  // A>B>C>D with Bradley-Terry-consistent probabilities
  const s = { A: 1.5, B: 0.5, C: -0.5, D: -1.5 };
  const teams = ["A", "B", "C", "D"] as const;
  const edges: ComparisonEdge[] = [];
  for (const i of teams)
    for (const j of teams) {
      if (i >= j) continue;
      const p = 1 / (1 + Math.exp(-(s[i] - s[j])));
      edges.push({ i, j, p, n: 100 });
    }
  return edges;
}

function cyclicEdges(): ComparisonEdge[] {
  // rock-paper-scissors: A>B, B>C, C>A at 0.7, D dominated by all
  return [
    { i: "A", j: "B", p: 0.7, n: 100 },
    { i: "B", j: "C", p: 0.7, n: 100 },
    { i: "C", j: "A", p: 0.7, n: 100 },
    { i: "A", j: "D", p: 0.8, n: 100 },
    { i: "B", j: "D", p: 0.8, n: 100 },
    { i: "C", j: "D", p: 0.8, n: 100 },
  ];
}

describe("hodge diagnostic", () => {
  it("finds near-zero cyclic share for transitive data", () => {
    const d = hodgeDecompose(transitiveEdges());
    expect(d.cyclicShare).toBeLessThan(0.05);
    expect(d.gradientShare).toBeGreaterThan(0.95);
    expect(d.potential[0]).toBeGreaterThan(d.potential[3] ?? 0); // A > D
  });

  it("finds large cyclic share for rock-paper-scissors data", () => {
    const d = hodgeDecompose(cyclicEdges());
    expect(d.cyclicShare).toBeGreaterThan(0.2);
  });

  it("bootstrap fires on cyclic data, not on transitive data", () => {
    const cyclic = hodgeBootstrap(cyclicEdges(), 100, 7);
    expect(cyclic.fires).toBe(true);
    expect(cyclic.pValue).toBeLessThan(0.05);
    const trans = hodgeBootstrap(transitiveEdges(), 100, 7);
    expect(trans.fires).toBe(false);
    expect(trans.pValue).toBeGreaterThan(0.05);
  });

  it("handles empty input", () => {
    const d = hodgeDecompose([]);
    expect(d.cyclicShare).toBe(0);
    expect(d.teams).toEqual([]);
  });
});
