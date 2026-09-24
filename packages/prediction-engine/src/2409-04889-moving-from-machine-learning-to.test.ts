/**
 * Vitest suite for arXiv:2409.04889 (Moving from Machine Learning to Statistics: Expected Points in American Football).
 * Gate: Adopt the full package (quality adjustment + 1/N_i weighting + cluster bootstrap) if the weighted model beats unweighted on 2023–2024 log-loss and bootstrap CIs achieve ≥93% coverage; adopt the catalytic prior only if it removes monotonicity artifacts at <0.5% log-loss cost.
 */
import { describe, it, expect } from "vitest";
import { weightedLogisticFit, catalyticShrink, clusterBootstrapReplicates, bootstrapCI } from "./2409-04889-moving-from-machine-learning-to";

describe("2409-04889 EP rebuild with catalytic prior", () => {
  it("weighted logistic fit recovers the slope", () => {
    const X: number[][] = [];
    const y: (0 | 1)[] = [];
    const w: number[] = [];
    for (let i = 0; i < 200; i++) {
      const x = (i - 100) / 50;
      X.push([1, x]);
      y.push(i % 7 < Math.round(3.5 * (1 / (1 + Math.exp(-(0.5 + 1.5 * x)))) * 2) ? 1 : 0);
      w.push(1 / (1 + (i % 5)));
    }
    const beta = weightedLogisticFit(X, y, w);
    expect(beta[1]).toBeGreaterThan(0.5);
    expect(() => weightedLogisticFit([], [], [])).toThrow();
  });
  it("catalytic prior interpolates toward the market", () => {
    expect(catalyticShrink([1, 2], [0, 0], 0)).toEqual([1, 2]);
    expect(catalyticShrink([1, 2], [0, 0], 1)).toEqual([0, 0]);
    expect(catalyticShrink([2], [0], 0.5)).toEqual([1]);
    expect(() => catalyticShrink([1], [1, 2], 0.5)).toThrow();
    expect(() => catalyticShrink([1], [1], 2)).toThrow();
  });
  it("cluster bootstrap yields finite CIs", () => {
    const X = [[1, 0], [1, 1], [1, 0], [1, 1]];
    const rng = (() => { let s = 3; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
    const reps = clusterBootstrapReplicates(X, [0, 1, 0, 1], [1, 1, 1, 1], ["g1", "g1", "g2", "g2"], 10, rng);
    expect(reps).toHaveLength(10);
    const [lo, hi] = bootstrapCI(reps, 1);
    expect(lo).toBeLessThanOrEqual(hi);
    expect(() => clusterBootstrapReplicates(X, [0, 1, 0, 1], [1, 1, 1, 1], [], 5, rng)).toThrow();
  });
});
