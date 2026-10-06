import { describe, it, expect } from "vitest";
import {
  weightedEdgeVote,
  breakCycles,
  movingBlockIndices,
  adjacencyF1,
  contemporaneousPrecision,
  type CausalGraph,
} from "@/lib/calibration/bootstrap-causal-discovery";

// ============================================================
// arXiv 2306.08946v2 — bootstrap causal discovery. Additive.
// ============================================================

const e = (from: string, to: string, lag: number, confidence: number) => ({
  from,
  to,
  lag,
  confidence,
});

describe("bootstrap causal discovery — 2306.08946v2", () => {
  it("weightedEdgeVote keeps edges with weighted majority", () => {
    const graphs: CausalGraph[] = [
      { edges: [e("a", "b", 1, 0.9), e("x", "y", 0, 0.4)], fitWeight: 1 },
      { edges: [e("a", "b", 1, 0.8)], fitWeight: 3 },
      { edges: [e("x", "y", 0, 0.5)], fitWeight: 1 },
    ];
    // total weight 5; a>b has 4 > 2.5 (kept), x>y has 2 (dropped).
    const voted = weightedEdgeVote(graphs);
    const keys = voted.map((x) => x.from + ">" + x.to);
    expect(keys).toContain("a>b");
    expect(keys).not.toContain("x>y");
  });

  it("weightedEdgeVote averages confidence by fit weight", () => {
    const graphs: CausalGraph[] = [
      { edges: [e("a", "b", 1, 1.0)], fitWeight: 3 },
      { edges: [e("a", "b", 1, 0.0)], fitWeight: 1 },
    ];
    const [edge] = weightedEdgeVote(graphs);
    expect(edge!.confidence).toBeCloseTo(0.75, 10);
  });

  it("weightedEdgeVote returns [] with no weight", () => {
    expect(weightedEdgeVote([])).toEqual([]);
    expect(weightedEdgeVote([{ edges: [e("a", "b", 1, 1)], fitWeight: 0 }])).toEqual([]);
  });

  it("breakCycles drops the weakest edge in a cycle", () => {
    const edges = [e("a", "b", 1, 0.9), e("b", "c", 1, 0.8), e("c", "a", 1, 0.1)];
    const acyclic = breakCycles(edges);
    expect(acyclic.length).toBe(2);
    expect(acyclic.every((x) => x.from !== "c")).toBe(true);
  });

  it("breakCycles leaves acyclic graphs untouched", () => {
    const edges = [e("a", "b", 1, 0.9), e("b", "c", 1, 0.8)];
    expect(breakCycles(edges)).toEqual(edges);
    expect(breakCycles([])).toEqual([]);
  });

  it("movingBlockIndices returns n indices in range", () => {
    const idx = movingBlockIndices(10, 3, () => 0.5);
    expect(idx.length).toBe(10);
    expect(idx.every((i) => i >= 0 && i < 10)).toBe(true);
    expect(movingBlockIndices(0, 3, () => 0.5)).toEqual([]);
  });

  it("adjacencyF1 is 1 on identical graphs, 0 on disjoint", () => {
    const t = [e("a", "b", 1, 1)];
    expect(adjacencyF1(t, t)).toBeCloseTo(1, 10);
    expect(adjacencyF1([e("x", "y", 0, 1)], t)).toBe(0);
  });

  it("contemporaneousPrecision isolates lag-0 edges", () => {
    const truth = [e("a", "b", 0, 1), e("b", "c", 2, 1)];
    const est = [e("a", "b", 0, 1), e("c", "a", 0, 1)];
    // lag-0: truth {a>b}, est {a>b, c>a} -> P=0.5, R=1 -> F1=2/3
    expect(contemporaneousPrecision(est, truth)).toBeCloseTo(2 / 3, 10);
  });
});
