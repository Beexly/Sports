/**
 * Tests for ./spike-slab-signal-rank (arXiv:0911.4503v1, lane=win_spread_total).
 *
 * ACCEPTANCE GATE: ADAPT-accept if Spearman rank correlation between (p_hat_1, -H)-implied signal ranking and
 * observed year-over-year r^2 ranking >= 0.7 on the 2010-2019 fit, AND the PCA on high-signal
 * metrics yields <= 10 significant components; REJECT if rank correlation < 0.4.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./spike-slab-signal-rank";

describe("spike-slab signal ranking (arXiv:0911.4503v1)", () => {
  const rows = [
    { name: "EPA/play", pHat1: 0.95, entropy: 0.2 },
    { name: "success rate", pHat1: 0.9, entropy: 0.3 },
    { name: "havoc rate", pHat1: 0.4, entropy: 1.4 },
    { name: "RYOE", pHat1: 0.85, entropy: 0.9 },
  ];
  it("ranks high p_hat_1 + low entropy first", () => {
    const ranked = mod.rankMetricSignals(rows);
    expect(ranked[0]).toBe("EPA/play");
    expect(ranked[ranked.length - 1]).toBe("havoc rate");
  });
  it("skips malformed rows, empty -> []", () => {
    expect(mod.rankMetricSignals([{ name: "x", pHat1: "high", entropy: 0.1 }, null, 42])).toEqual([]);
    expect(mod.rankMetricSignals([])).toEqual([]);
  });
  it("signalScore is null on out-of-range input", () => {
    expect(mod.signalScore(1.5, 0.1, 1)).toBeNull();
    expect(mod.signalScore(0.5, -0.1, 1)).toBeNull();
    expect(mod.signalScore(0.5, 0.1, 0)).toBeNull();
  });
  it("spearmanRho = 1 on identical rankings, null on degenerate", () => {
    expect(mod.spearmanRho([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10);
    expect(mod.spearmanRho([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 10);
    expect(mod.spearmanRho([1, 2], [1, 2])).toBeNull();
    expect(mod.spearmanRho([1, 2, 3], [1, 2])).toBeNull();
  });
  it("gate check enforces the 0.7 threshold", () => {
    expect(mod.gateSpearmanCheck([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBe(true);
    expect(mod.gateSpearmanCheck([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBe(false);
  });
});
