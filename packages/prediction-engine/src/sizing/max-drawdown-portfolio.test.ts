
import { describe, expect, it } from "vitest";
import { constrainedMaxDrawdownWeights, drawdownAdaptiveBounds, projectCappedSimplex } from "./max-drawdown-portfolio";

describe("max-drawdown-portfolio", () => {
  it("projection respects box and simplex constraints", () => {
    const w = projectCappedSimplex([0.9, 0.9, 0.9], 0.05, 0.5);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 6);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(0.05 - 1e-9);
    expect(Math.max(...w)).toBeLessThanOrEqual(0.5 + 1e-9);
  });
  it("favors the bet that survives the worst session", () => {
    // bet 0 wins everywhere; bet 1 blows up in session 1
    const sessions = [
      [0.1, 0.1],
      [0.1, -0.9],
    ];
    const w = constrainedMaxDrawdownWeights(sessions, { iters: 3000, lr: 0.1, maxW: 0.9 });
    expect(w[0] ?? 0).toBeGreaterThan(w[1] ?? 0);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 6);
  });
  it("drawdownAdaptiveBounds shrinks maxW after drawdown", () => {
    const calm = drawdownAdaptiveBounds(0, 0.5);
    const stressed = drawdownAdaptiveBounds(0.3, 0.5);
    expect(stressed.maxW).toBeLessThan(calm.maxW);
    expect(stressed.maxW).toBeGreaterThanOrEqual(stressed.minW);
  });
  it("edge cases: empty sessions throw", () => {
    expect(() => constrainedMaxDrawdownWeights([])).toThrow();
    expect(projectCappedSimplex([], 0, 1)).toEqual([]);
  });
});
