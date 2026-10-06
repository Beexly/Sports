/**
 * Tests for ./2511-23072v1-props-feature (arXiv:2511.23072v1, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADOPT for personnel evaluation if (a) player effects improve held-out log-loss by >=1% over the no-player-effect baseline on 2023 data, AND (b) counterfactual predictions for team-switchers beat the population baseline by >=5% RMSE.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2511-23072v1-props-feature";

describe("2511-23072v1 What If They Took the Shot?", () => {
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
