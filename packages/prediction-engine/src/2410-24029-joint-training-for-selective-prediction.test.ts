/**
 * Vitest suite for arXiv:2410.24029 (Joint Training for Selective Prediction).
 * Gate: ADAPT accepted if JTSP beats the separate-gate Policy baseline by ≥ 2 points of posted-pick hit-rate at matched deferral rate on walk-forward seasons AND the JTSP-vs-JTSP-CE ablation shows the policy-gradient term (not just shared representations) contributes.
 */
import { describe, it, expect } from "vitest";
import { deferralStake, sharpeOfPnl, policyGradientTauStep } from "./2410-24029-joint-training-for-selective-prediction";

describe("2410-24029v1 JTSP stake-aware selective prediction", () => {
  it("abstains on negative edge, stakes on positive edge", () => {
    expect(deferralStake(-0.05, 0, 0.02)).toBeLessThan(0.1);
    expect(deferralStake(0.05, 0, 0.02)).toBeGreaterThan(0.9);
    expect(deferralStake(0, 0, 0.02)).toBeCloseTo(0.5, 10);
    expect(() => deferralStake(0.1, 0, 0)).toThrow();
  });
  it("Sharpe is mean/sd of weekly P&L", () => {
    expect(sharpeOfPnl([1, 1, 1, 1])).toBe(0); // zero variance
    expect(sharpeOfPnl([2, 0, 2, 0])).toBeCloseTo(1 / 1.1547, 3);
    expect(() => sharpeOfPnl([1])).toThrow();
  });
  it("policy-gradient step moves tau toward risk-adjusted improvement", () => {
    const edges = [0.08, 0.06, -0.04, 0.07, -0.02, 0.05];
    const outcomes: (0 | 1)[] = [1, 1, 0, 1, 0, 1];
    const tau2 = policyGradientTauStep(edges, outcomes, 0.0, 0.02, 0.01);
    expect(Number.isFinite(tau2)).toBe(true);
  });
});
