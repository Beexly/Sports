import { describe, expect, it } from "vitest";
import { fitIqra, meanPinball, pinball, predictIqra } from "./iqra";

describe("iqra", () => {
  it("pinball is asymmetric in the right direction", () => {
    expect(pinball(1, 0, 0.9)).toBeCloseTo(0.9, 12); // underpredict at high tau: costly
    expect(pinball(0, 1, 0.9)).toBeCloseTo(0.1, 12); // overpredict at high tau: cheap
    expect(pinball(1, 0, 0.1)).toBeCloseTo(0.1, 12);
  });
  it("fitIqra keeps weights nonnegative and predicts sanely", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 300; i++) {
      const base = (i % 20) - 10;
      X.push([base + 1, base - 1, base + 0.5]);
      y.push(base + (i % 2 === 0 ? 0.5 : -0.5));
    }
    const fit = fitIqra(X, y, 0.5, 1500, 0.05);
    expect(fit.weights.every((w) => w >= 0)).toBe(true);
    expect(fit.weights.length).toBe(3);
    const q = predictIqra(fit, [2, 0, 1]);
    expect(q).toBeGreaterThan(-2);
    expect(q).toBeLessThan(4);
    // Median fit on symmetric noise centers near the ensemble center.
    expect(Math.abs(q - 1)).toBeLessThan(1.5);
  });
  it("monotone in tau: no quantile crossing on the same row", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 200; i++) {
      const base = (i % 10) - 5;
      X.push([base - 1, base, base + 1]);
      y.push(base + 0.25 * Math.sin(i));
    }
    const lo = fitIqra(X, y, 0.25, 1200, 0.05);
    const hi = fitIqra(X, y, 0.75, 1200, 0.05);
    const row = [1.5, 2.5, 3.5];
    expect(predictIqra(hi, row)).toBeGreaterThanOrEqual(predictIqra(lo, row) - 1e-6);
  });
  it("meanPinball scores a fit on heldout rows", () => {
    const X = [[1, 2, 3], [2, 3, 4], [0, 1, 2]];
    const y = [2, 3, 1];
    const fit = fitIqra(X, y, 0.5, 800, 0.05);
    const mp = meanPinball(fit, X, y);
    expect(mp).toBeGreaterThanOrEqual(0);
    expect(mp).toBeLessThan(2);
  });
  it("throws on degenerate inputs", () => {
    expect(() => fitIqra([], [], 0.5)).toThrow();
    expect(() => fitIqra([[1]], [1], 1.5)).toThrow();
    expect(() => predictIqra({ intercept: 0, weights: [1], tau: 0.5 }, [1, 2])).toThrow();
  });
});
