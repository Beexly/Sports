/**
 * Vitest suite for arXiv:2606.09276 (ERBench: A Benchmark and Testsuite for Equation Discovery Algorithms).
 * Gate: ADAPT if: GSE's current sports-config PySR scores Recovery < 0.40 on the 200-formula panel AND the diagnostic sweeps identify at least one concrete failure axis that a ledger 2166–2172 upgrade is designed to fix.
 */
import { describe, it, expect } from "vitest";
import { panelScores, panelRegressionGate, sweepCellRecovery, PanelResult } from "./2606-09276-erbench-a-benchmark-and-testsuite";

describe("2606-09276 ERBench panel regression harness", () => {
  const results: PanelResult[] = [
    { formulaId: "f1", recovered: true, jaccard: 1, ted: 0 },
    { formulaId: "f2", recovered: false, jaccard: 0.6, ted: 0.3 },
    { formulaId: "f3", recovered: true, jaccard: 0.9, ted: 0.1 },
    { formulaId: "f4", recovered: false, jaccard: 0.4, ted: 0.5 },
  ];
  it("aggregates Recovery/JI/TED", () => {
    const s = panelScores(results);
    expect(s.recovery).toBeCloseTo(0.5, 10);
    expect(s.jaccard).toBeCloseTo(0.725, 10);
    expect(s.ted).toBeCloseTo(0.225, 10);
    expect(() => panelScores([])).toThrow();
  });
  it("blocks configs that regress Recovery or JI", () => {
    expect(panelRegressionGate({ recovery: 0.3, jaccard: 0.6 }, { recovery: 0.35, jaccard: 0.6 })).toBe(true);
    expect(panelRegressionGate({ recovery: 0.3, jaccard: 0.6 }, { recovery: 0.3, jaccard: 0.7 })).toBe(false);
    expect(panelRegressionGate({ recovery: 0.3, jaccard: 0.6 }, { recovery: 0.35, jaccard: 0.5 })).toBe(false);
  });
  it("sweeps failure boundaries by cell", () => {
    expect(sweepCellRecovery(results, (r) => r.formulaId <= "f2")).toBeCloseTo(0.5, 10);
    expect(Number.isNaN(sweepCellRecovery(results, () => false))).toBe(true);
  });
});
