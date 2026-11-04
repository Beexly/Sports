import { describe, it, expect } from "vitest";
import {
  SITUATIONAL_EXPECTED_METRICS_CATALOG,
  computeManageableThirdDownRate,
  computeToxicDifferential,
  computeTargetShareGini,
} from "../situational-expected-metrics-catalog.js";

describe("Situational Expected Metrics Catalog (Q10-Q51)", () => {
  it("catalogs the core situational expected metrics descriptors", () => {
    expect(SITUATIONAL_EXPECTED_METRICS_CATALOG.length).toBeGreaterThanOrEqual(20);
    const q10 = SITUATIONAL_EXPECTED_METRICS_CATALOG.find((m) => m.code === "Q10");
    expect(q10).toBeDefined();
    expect(q10?.name).toBe("Down-of-Conversion Distribution");
    expect(q10?.bitIndex).toBe(224);

    const q49 = SITUATIONAL_EXPECTED_METRICS_CATALOG.find((m) => m.code === "Q49");
    expect(q49).toBeDefined();
    expect(q49?.name).toBe("Toxic Differential");
  });

  it("computes manageable 3rd down creation rate correctly", () => {
    // 3rd & 2, 3rd & 3, 3rd & 4, 3rd & 8, 3rd & 10 -> 3 of 5 are <= 4
    const distances = [2, 3, 4, 8, 10];
    const rate = computeManageableThirdDownRate(distances);
    expect(rate).toBeCloseTo(3 / 5, 4);

    expect(computeManageableThirdDownRate([])).toBe(0);
  });

  it("computes toxic differential correctly", () => {
    // 5 explosive plays (passes >= 20 + rushes >= 10) minus 2 turnovers = +3
    const diff = computeToxicDifferential(5, 2);
    expect(diff).toBe(3);
  });

  it("computes target share Gini coefficient correctly", () => {
    // Completely equal targets -> Gini close to 0
    const equalShares = [0.25, 0.25, 0.25, 0.25];
    expect(computeTargetShareGini(equalShares)).toBeCloseTo(0, 2);

    // Highly concentrated target -> Gini > 0.4
    const concentrated = [0.05, 0.10, 0.15, 0.70];
    expect(computeTargetShareGini(concentrated)).toBeGreaterThan(0.4);

    expect(computeTargetShareGini([])).toBe(0);
  });
});
