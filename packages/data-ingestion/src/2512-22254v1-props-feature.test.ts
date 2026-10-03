/**
 * Tests for ./2512-22254v1-props-feature (arXiv:2512.22254v1, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADOPT only if the backtest reproduces the predicted ceiling/median crossover with statistical significance over >=1 full season and >=10% ROI difference between matched and mismatched strategy-contest pairs.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2512-22254v1-props-feature";

describe("2512-22254v1 Analyzing Skill Element in Online Fantasy", () => {
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
