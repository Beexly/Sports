/**
 * Tests for ./2511-07703v2-props-feature (arXiv:2511.07703v2, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADOPT if the skill-adjusted model beats the context-only baseline by >=0.02 RMSE yards/play reduction AND >=0.005 Brier improvement on the 2025 holdout, with gains in at least 3 of 4 position groups (QB, RB, WR, TE).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2511-07703v2-props-feature";

describe("2511-07703v2 Expected by Whom? A Skill-Adjusted Expected", () => {
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
