/**
 * Vitest suite for arXiv:2603.22620v2 (Chain-Reaction Causal Discovery via Blocking Interventions).
 * Gate: ADOPT the sandbox protocol if it recovers all 5 known dependencies with no false negatives AND identifies >=3 features with zero downstream effect; REJECT the tree assumption and allow multi-parent DAG structure.
 */
import { describe, it, expect } from "vitest";
import { notearsAcyclicity, backdoorSet, refutationSuite } from "./2603-22620v2-chainreaction-causal-discovery-via-blocking";

describe("2603-22620v2 causal graph discovery + refutation", () => {
  it("NOTEARS acyclicity is ~0 for DAGs, >0 for cycles", () => {
    const dag = [[0, 1, 0], [0, 0, 1], [0, 0, 0]];
    const cyc = [[0, 1, 0], [0, 0, 1], [1, 0, 0]];
    expect(notearsAcyclicity(dag)).toBeLessThan(1e-6);
    expect(notearsAcyclicity(cyc)).toBeGreaterThan(0.1);
  });
  it("reads the back-door set off the graph", () => {
    const edges = [
      { from: "weather", to: "injury", weight: 0.5 },
      { from: "weather", to: "winprob", weight: 0.3 },
      { from: "injury", to: "winprob", weight: -0.4 },
    ];
    expect(backdoorSet(edges, "injury", "winprob")).toEqual(["weather"]);
  });
  it("refutation suite checks placebo and subsets", () => {
    const r = refutationSuite(0.3, 0.01, [0.28, 0.33]);
    expect(r.placeboOk).toBe(true);
    expect(r.subsetOk).toBe(true);
    expect(refutationSuite(0.3, 0.2, [0.28]).placeboOk).toBe(false);
    expect(refutationSuite(0.3, 0.01, [-0.2]).subsetOk).toBe(false);
  });
});
