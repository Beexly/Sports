import { describe, it, expect } from "vitest";
import {
  drawdownFraction,
  classifyMomentum,
  classifyMdpState,
  samplePolicyAction,
  validatePolicyTable,
  walkForwardMetrics,
  type PolicyTable,
} from "@/lib/calibration/drawdown-cvar-mdp";

// ============================================================
// arXiv 2312.01586v1 — drawdown CVaR MDP. Additive only.
// ============================================================

const table: PolicyTable = {
  "normal:high": [{ action: 1, prob: 1 }],
  "normal:low": [{ action: 0.5, prob: 1 }],
  "hot:high": [{ action: 2, prob: 1 }],
  "hot:low": [{ action: 1, prob: 1 }],
  "cold:high": [
    { action: 1, prob: 0.8 },
    { action: 3, prob: 0.2 },
  ],
  "cold:low": [{ action: 0.5, prob: 1 }],
};

describe("drawdown CVaR MDP — 2312.01586v1", () => {
  it("drawdownFraction measures peak-to-current decline", () => {
    expect(drawdownFraction(92, 100)).toBeCloseTo(0.08, 10);
    expect(drawdownFraction(110, 100)).toBe(0);
    expect(drawdownFraction(90, 0)).toBe(0);
  });

  it("classifyMomentum applies the 8% loss frame", () => {
    expect(classifyMomentum(91, 100)).toBe("cold");
    expect(classifyMomentum(92, 100)).toBe("cold");
    expect(classifyMomentum(93, 100)).toBe("normal");
    expect(classifyMomentum(101, 100)).toBe("hot");
  });

  it("classifyMdpState composes the 6 states", () => {
    expect(classifyMdpState(91, 100, "high")).toBe("cold:high");
    expect(classifyMdpState(95, 100, "low")).toBe("normal:low");
    expect(classifyMdpState(105, 100, "high")).toBe("hot:high");
  });

  it("samplePolicyAction respects the randomization", () => {
    expect(samplePolicyAction(table, "cold:high", () => 0.5)).toBe(1);
    expect(samplePolicyAction(table, "cold:high", () => 0.9)).toBe(3);
    expect(samplePolicyAction(table, "normal:high", () => 0.99)).toBe(1);
  });

  it("validatePolicyTable checks the 6-state contract", () => {
    expect(validatePolicyTable(table)).toBe(true);
    const bad = { ...table, "cold:high": [{ action: 1, prob: 0.5 }] };
    expect(validatePolicyTable(bad as PolicyTable)).toBe(false);
  });

  it("walkForwardMetrics measures recovery, final, maxDD", () => {
    // -10 (drawdown 10%), then +5, +5, +1: recovers at week 3.
    const m = walkForwardMetrics([-10, 5, 5, 1], 100);
    expect(m.maxDrawdown).toBeCloseTo(0.1, 10);
    expect(m.recoveryWeeks).toBe(3);
    expect(m.finalBankroll).toBeCloseTo(101, 10);
  });

  it("walkForwardMetrics reports Infinity when never recovered", () => {
    const m = walkForwardMetrics([-10, -1, -1], 100);
    expect(m.recoveryWeeks).toBe(Number.POSITIVE_INFINITY);
    expect(m.finalBankroll).toBeLessThan(100);
  });

  it("walkForwardMetrics handles empty input", () => {
    const m = walkForwardMetrics([], 100);
    expect(m.recoveryWeeks).toBe(0);
    expect(m.finalBankroll).toBe(100);
    expect(m.maxDrawdown).toBe(0);
  });
});
