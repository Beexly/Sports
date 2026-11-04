import { describe, it, expect } from "vitest";
import { ENABLED, ACCEPTANCE_GATE, counterfactualEfficiency } from "./2606-18512-causal-panel-forecasting.js";

describe("2606-18512-causal-panel-forecasting", () => {
  it("is disabled until the Tuesday seal and injury pipeline are wired", () => {
    expect(ENABLED).toBe(false);
  });

  it("declares an acceptance gate", () => {
    expect(ACCEPTANCE_GATE).toBeDefined();
  });

  it("exports counterfactualEfficiency as a callable", () => {
    expect(typeof counterfactualEfficiency).toBe("function");
  });
});
