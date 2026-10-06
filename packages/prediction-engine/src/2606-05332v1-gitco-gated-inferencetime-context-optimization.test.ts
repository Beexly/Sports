/**
 * Vitest suite for arXiv:2606.05332v1 (GITCO: Gated Inference-Time Context Optimization in TSFMs).
 * Gate: ADOPT as a default-on serving wrapper if the sports gate achieves ≥70% precision on 2022–2024 AND mean MASE reduction ≥1.5% with no season worse than baseline; keep it default-off if precision is 60–70%; REJECT if precision <60% or any season degrades.
 */
import { describe, it, expect } from "vitest";
import { serveOrAbstain, influenceLabel } from "./2606-05332v1-gitco-gated-inferencetime-context-optimization";

describe("2606-05332v1 gate-router-critic serving wrapper", () => {
  it("forces abstention on regime shifts regardless of gate score", () => {
    const d = serveOrAbstain({ gateScore: 0.99, regimeShift: true, forecast: 24 });
    expect(d.action).toBe("abstain");
  });
  it("serves only above the precision-first threshold", () => {
    const serve = serveOrAbstain({ gateScore: 0.8, regimeShift: false, forecast: 24 });
    const abst = serveOrAbstain({ gateScore: 0.6, regimeShift: false, forecast: 24 });
    expect(serve.action).toBe("serve");
    expect(abst.action).toBe("abstain");
    expect(() => serveOrAbstain({ gateScore: 2, regimeShift: false, forecast: 24 })).toThrow();
  });
  it("labels helpful games with leave-one-out influence", () => {
    expect(influenceLabel(3.0, 2.0)).toBe(1);
    expect(influenceLabel(2.0, 3.0)).toBe(0);
  });
});
