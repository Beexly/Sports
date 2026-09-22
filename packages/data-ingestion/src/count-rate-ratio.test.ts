/**
 * Tests for ./count-rate-ratio (arXiv:2012.04455v1, lane=calibration).
 *
 * ACCEPTANCE GATE: Adopt the closed-form ratio posterior as a GSE utility if: on 2024-2025 data, its 80% credible
 * intervals achieve empirical coverage within [0.75, 0.85] on forward rate ratios while being
 * narrower than the Gaussian-propagation intervals. Reject if coverage is off-nominal or intervals
 * are wider than the naive baseline.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./count-rate-ratio";

describe("count-rate ratio (arXiv:2012.04455v1)", () => {
  it("equal exposure: count ratio = rate ratio", () => {
    expect(mod.countRatioBias(10, 5, 100, 100)).toBeCloseTo(0, 10);
    expect(mod.rateRatio({ count: 10, exposure: 100 }, { count: 5, exposure: 100 })).toBeCloseTo(2, 10);
  });
  it("unequal exposure exposes the bias", () => {
    const bias = mod.countRatioBias(10, 5, 200, 100)!;
    expect(bias).not.toBeCloseTo(0, 5);
  });
  it("shrinkage stabilizes small counts", () => {
    const raw = mod.rateRatio({ count: 1, exposure: 10 }, { count: 1, exposure: 10 })!;
    const shr = mod.shrunkRateRatio({ count: 0, exposure: 10 }, { count: 1, exposure: 10 })!;
    expect(raw).toBeCloseTo(1, 10);
    expect(shr).toBeLessThan(1);
    expect(mod.shrunkRateRatio({ count: 1, exposure: 10 }, { count: 1, exposure: 10 }, -1)).toBeNull();
  });
  it("CI brackets the estimate", () => {
    const ci = mod.rateRatioCI({ count: 20, exposure: 100 }, { count: 10, exposure: 100 })!;
    expect(ci.lo).toBeLessThan(ci.est);
    expect(ci.hi).toBeGreaterThan(ci.est);
    expect(mod.rateRatioCI({ count: 0, exposure: 100 }, { count: 10, exposure: 100 })).toBeNull();
  });
  it("null on bad inputs", () => {
    expect(mod.rateRatio({ count: -1, exposure: 1 }, { count: 1, exposure: 1 })).toBeNull();
    expect(mod.rateRatio({ count: 1, exposure: 0 }, { count: 1, exposure: 1 })).toBeNull();
  });
});
