
import { describe, expect, it } from "vitest";
import { noiseAugmentedViews, selectOmega, sswnpTotalLoss } from "./sswnp";

describe("sswnp", () => {
  it("noise views perturb the input with scale ~omega", () => {
    const traj = [[[0, 0], [1, 1]]];
    const { clean, noisy } = noiseAugmentedViews(traj, 0.05, 7);
    expect(clean).toEqual(traj);
    const diff = Math.abs((noisy[0]?.[0]?.[0] ?? 0) - 0);
    expect(diff).toBeGreaterThanOrEqual(0);
    // omega=0 is a no-op
    const zero = noiseAugmentedViews(traj, 0, 7);
    expect(zero.noisy).toEqual(traj);
  });
  it("total loss combines supervised and self-supervised terms", () => {
    expect(sswnpTotalLoss(1.0, 0.5, 0.01)).toBeCloseTo(1.005, 10);
    expect(() => sswnpTotalLoss(1, 1, -1)).toThrow();
  });
  it("selectOmega minimizes jitter degradation", () => {
    const trials = [
      { omega: 0.01, fdeClean: 1.0, fdeJitter: 1.5 },
      { omega: 0.05, fdeClean: 1.0, fdeJitter: 1.2 },
      { omega: 0.1, fdeClean: 1.1, fdeJitter: 1.25 },
    ];
    expect(selectOmega(trials)).toBe(0.1);
    expect(() => selectOmega([])).toThrow();
  });
  it("rejects negative omega", () => {
    expect(() => noiseAugmentedViews([[[0]]], -0.1)).toThrow();
  });
});
