
import { describe, expect, it } from "vitest";
import { epProbitFit, epProbitPredict } from "./ep-probit";

describe("ep-probit", () => {
  it("converges and separates a simple 1-D problem", () => {
    const X = [[-2], [-1], [1], [2]];
    const y = [-1, -1, 1, 1];
    const res = epProbitFit(X, y, { damping: 0.7, maxIter: 200 });
    expect(res.converged).toBe(true);
    expect(res.mean[0] ?? 0).toBeGreaterThan(0);
    expect(epProbitPredict(res.mean, res.cov, [2])).toBeGreaterThan(0.5);
    expect(epProbitPredict(res.mean, res.cov, [-2])).toBeLessThan(0.5);
  });
  it("posterior mean has the sign of the data with an intercept", () => {
    const X = [[1, -3], [1, -1], [1, 1], [1, 3]];
    const y = [-1, -1, 1, 1];
    const res = epProbitFit(X, y, { damping: 0.7, maxIter: 200 });
    expect(res.mean[1] ?? 0).toBeGreaterThan(0);
  });
  it("edge cases: empty X throws, mismatched y throws", () => {
    expect(() => epProbitFit([], [])).toThrow();
    expect(() => epProbitFit([[1]], [1, -1])).toThrow();
  });
  it("single observation does not crash and stays finite", () => {
    const res = epProbitFit([[1, 0.5]], [1], { maxIter: 50 });
    expect(res.mean.every(Number.isFinite)).toBe(true);
  });
});
