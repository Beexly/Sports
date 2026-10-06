import { describe, expect, it } from "vitest";

import {
  ENABLED,
  coveragePinned,
  dualStep,
  initMarketBudgets,
  lagrangianUpdate,
  selectByTheta,
} from "@/lib/calibration/2501-08397-lagrangian-abstention-head";

describe("Lagrangian abstention head", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("dual variable rises when under-covered, falls when over-covered", () => {
    expect(lagrangianUpdate(0.5, 0.2, 0.4)).toBeGreaterThan(0.5);
    expect(lagrangianUpdate(0.5, 0.6, 0.4)).toBeLessThan(0.5);
    expect(lagrangianUpdate(0, 0.9, 0.4)).toBe(0); // floored at 0
  });

  it("dualStep loosens theta when under-covered", () => {
    const b = initMarketBudgets(0.4).spread;
    const after = dualStep({ ...b, theta: 0.6 }, 2, 10); // realized 0.2 < 0.4
    expect(after.lambda).toBeGreaterThan(0);
    expect(after.theta).toBeLessThan(0.6);
    const over = dualStep({ ...b, theta: 0.6 }, 8, 10); // realized 0.8 > 0.4
    expect(over.theta).toBeGreaterThan(0.6);
  });

  it("per-market budgets are independent", () => {
    const budgets = initMarketBudgets(0.35);
    expect(Object.keys(budgets)).toEqual(["spread", "total", "moneyline"]);
    budgets.total.theta = 0.9;
    expect(budgets.spread.theta).toBe(0.5);
  });

  it("selectByTheta pins exact coverage on sorted scores", () => {
    const scores = Array.from({ length: 10 }, (_, i) => ({ id: "p" + i, score: i / 10 }));
    expect(selectByTheta(scores, 0.7).length).toBe(3);
  });

  it("coveragePinned checks the +/-3pt gate over 4 weeks", () => {
    expect(coveragePinned([0.39, 0.41, 0.38, 0.42], 0.4)).toBe(true);
    expect(coveragePinned([0.39, 0.41, 0.38, 0.30], 0.4)).toBe(false);
  });
});
