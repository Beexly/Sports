/**
 * Vitest suite for arXiv:2504.19612v1 (Relative Advantage: Quantifying Performance in Noisy Competitive Settings).
 * Gate: Adopt the principle if relative-difference features beat the two-feature absolute baseline on held-out 2024–2025 NFL games by ≥ 0.01 AUC on log-loss-neutral comparison.
 */
import { describe, it, expect } from "vitest";
import { adjustedRelativeMetric, estimateLoading } from "./2504-19612v1-relative-advantage-quantifying-performance-in";

describe("2504-19612v1 differential environmental sensitivity", () => {
  it("discounts the dome team more in wind", () => {
    const dome = { team: "DOME", lambda: 0.8 };
    const out = { team: "OUT", lambda: 0.2 };
    const raw = (30 - 28); // naive relative metric
    const adj = adjustedRelativeMetric(30, 28, dome, out, 10);
    expect(adj).toBeCloseTo(raw - (0.8 - 0.2) * 10, 10);
    expect(adj).toBeLessThan(raw);
  });
  it("recovers the OLS loading", () => {
    const env = [0, 1, 2, 3, 4];
    const stats = env.map((e) => 5 + 2 * e);
    expect(estimateLoading(stats, env)).toBeCloseTo(2, 10);
    expect(() => estimateLoading([1], [1])).toThrow();
    expect(() => estimateLoading([1, 2], [3, 3])).toThrow();
  });
});
