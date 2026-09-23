import { describe, expect, it } from "vitest";

import {
  ENABLED,
  adaptiveEpsilon,
  mmdSquared,
  robustEdge,
  robustKellyFraction,
  volumeGuardOk,
} from "@/lib/calibration/2505-03585v1-robust-kelly-mmd";

describe("robust Kelly under MMD ambiguity", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("MMD is ~0 for identical distributions, >0 under shift", () => {
    const a = [[1, 2], [2, 3], [3, 4], [1.5, 2.5]];
    expect(mmdSquared(a, a, 0.5)).toBeCloseTo(0, 10);
    const b = [[10, 20], [11, 21], [12, 22]];
    expect(mmdSquared(a, b, 0.5)).toBeGreaterThan(0.1);
  });

  it("adaptive epsilon grows with misspecification, capped", () => {
    expect(adaptiveEpsilon(0)).toBe(0);
    expect(adaptiveEpsilon(0.1)).toBeGreaterThan(adaptiveEpsilon(0.05));
    expect(adaptiveEpsilon(10)).toBe(0.25);
    expect(robustEdge(0.08, 0.1)).toBeLessThan(0.08);
  });

  it("higher MMD -> smaller robust Kelly fraction", () => {
    const calm = robustKellyFraction(0.6, 2.0, 0.01);
    const stressed = robustKellyFraction(0.6, 2.0, 0.2);
    expect(stressed).toBeLessThan(calm);
    expect(calm).toBeGreaterThan(0);
    expect(calm).toBeLessThanOrEqual(1);
    // no edge -> zero
    expect(robustKellyFraction(0.5, 2.0, 0.01)).toBe(0);
  });

  it("volume guard rejects degenerate conservatism", () => {
    expect(volumeGuardOk(60, 100)).toBe(true);
    expect(volumeGuardOk(49, 100)).toBe(false);
  });
});
