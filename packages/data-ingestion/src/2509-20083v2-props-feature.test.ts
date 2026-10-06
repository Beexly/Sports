/**
 * Tests for ./2509-20083v2-props-feature (arXiv:2509.20083v2, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADOPT as a GSE QB-evaluation product only if: (a) the reproduction matches the paper's ordering within the top 10 (+-2 rank tolerance), (b) >=5 QBs show BH-significant positive effects per season, and (c) the robustness slop checks pass.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2509-20083v2-props-feature";

describe("2509-20083v2 Rethinking Player Evaluation in Sports: Goals", () => {
  it("projection edge is signed percent over the line", () => {
    expect(mod.projectionEdgePct(110, 100)).toBeCloseTo(10, 10);
    expect(mod.projectionEdgePct(90, 100)).toBeCloseTo(-10, 10);
    expect(mod.projectionEdgePct(100, 0)).toBeNull();
  });
  it("salary efficiency is points per $1k", () => {
    expect(mod.salaryEfficiency(20, 8000)).toBeCloseTo(2.5, 10);
    expect(mod.salaryEfficiency(20, 0)).toBeNull();
  });
  it("ownership fade discounts chalk", () => {
    expect(mod.ownershipFadeScore(20, 50)).toBeCloseTo(10, 10);
    expect(mod.ownershipFadeScore(20, 0)).toBeCloseTo(20, 10);
    expect(mod.ownershipFadeScore(20, 101)).toBeNull();
  });
  it("stack boost scales with correlation", () => {
    expect(mod.stackCorrelationBoost(10, 0.3)).toBeCloseTo(13, 10);
    expect(mod.stackCorrelationBoost(10, -0.5)).toBeCloseTo(5, 10);
    expect(mod.stackCorrelationBoost(10, 2)).toBeNull();
  });
});
