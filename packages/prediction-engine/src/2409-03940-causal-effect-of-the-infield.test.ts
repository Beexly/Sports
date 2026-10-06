/**
 * Vitest suite for arXiv:2409.03940 (Causal effect of the infield shift in the MLB).
 * Gate: ADAPT the triangulation template if the NFL kickoff replication shows sign agreement between IPTW and IV, post-weighting |SMD| < 0.1, first-stage partial F > 100, and the placebo-year ETT has 95% CI covering 0. REJECT if estimators disagree in sign or the placebo test fails.
 */
import { describe, it, expect } from "vitest";
import { smd, varianceRatio, balanceTable, balanceGate } from "./2409-03940-causal-effect-of-the-infield";

describe("2409-03940 causal imbalance diagnostics", () => {
  it("SMD is ~0 for balanced covariates, large for imbalanced", () => {
    expect(Math.abs(smd([1, 2, 3, 4], [1, 2, 3, 4]))).toBeLessThan(1e-9);
    expect(Math.abs(smd([5, 6, 7, 8], [1, 2, 3, 4]))).toBeGreaterThan(2);
    expect(() => smd([], [1])).toThrow();
  });
  it("balance gate passes only balanced tables", () => {
    const rows = balanceTable(
      ["age", "snaps"],
      [[25, 60], [26, 62], [24, 58]],
      [[25, 61], [26, 60], [24, 59]],
    );
    expect(balanceGate(rows)).toBe(true);
    const bad = balanceTable(["age"], [[35], [36], [34]], [[25], [26], [24]]);
    expect(balanceGate(bad)).toBe(false);
    expect(() => varianceRatio([1], [1, 2])).toThrow();
  });
});
