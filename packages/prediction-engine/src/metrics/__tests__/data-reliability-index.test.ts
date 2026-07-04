import { describe, expect, it } from "vitest";
import { dataReliabilityIndex } from "../source/data-reliability-index.js";

describe("dataReliabilityIndex", () => {
  const cleanInput = {
    expectedSourceCount: 4,
    providerTrustScore: 0.92,
    rightsStatus: "approved" as const,
    sourceAgeMinutes: 8,
    sourceCount: 4,
    ttlMinutes: 60,
  };

  it("scores fresh, covered, rights-clean data high", () => {
    const result = dataReliabilityIndex(cleanInput);

    expect(result.score).toBeGreaterThan(80);
    expect(result.grade).toBe("HIGH");
    expect(result.status).toBe("SHADOW");
    expect(Object.prototype.hasOwnProperty.call(result.drivers[0], "weight")).toBe(false);
  });

  it("penalizes each required data reliability failure direction", () => {
    const clean = dataReliabilityIndex(cleanInput);
    const stale = dataReliabilityIndex({ ...cleanInput, sourceAgeMinutes: 180 });
    const missing = dataReliabilityIndex({ ...cleanInput, missingRequiredFields: 3 });
    const contradictory = dataReliabilityIndex({ ...cleanInput, contradictionCount: 2 });
    const lowSourceCount = dataReliabilityIndex({ ...cleanInput, sourceCount: 1 });
    const unclearRights = dataReliabilityIndex({ ...cleanInput, rightsStatus: "manual_review" });

    expect(stale.score).toBeLessThan(clean.score);
    expect(missing.score).toBeLessThan(clean.score);
    expect(contradictory.score).toBeLessThan(clean.score);
    expect(lowSourceCount.score).toBeLessThan(clean.score);
    expect(unclearRights.score).toBeLessThan(clean.score);
  });

  it("matches the documented DRI formula on a mixed-quality example", () => {
    const result = dataReliabilityIndex({
      contradictionCount: 1,
      expectedSourceCount: 4,
      missingRequiredFields: 1,
      providerTrustScore: 0.8,
      rightsStatus: "benchmark_only",
      sourceAgeMinutes: 45,
      sourceCount: 2,
      ttlMinutes: 60,
    });

    expect(result.score).toBe(35.7);
    expect(result.grade).toBe("LOW");
  });

  it("penalizes stale, missing, contradictory, low-source, unclear-rights data", () => {
    const clean = dataReliabilityIndex(cleanInput);
    const bad = dataReliabilityIndex({
      contradictionCount: 2,
      expectedSourceCount: 4,
      missingRequiredFields: 3,
      providerTrustScore: 0.35,
      rightsStatus: "unknown",
      sourceAgeMinutes: 200,
      sourceCount: 1,
      ttlMinutes: 60,
    });

    expect(bad.score).toBeLessThan(clean.score);
    expect(bad.grade).toBe("BLOCKED");
    expect(bad.drivers.some((driver) => driver.name === "rights_cleanliness" && driver.direction === "DOWN")).toBe(true);
  });
});
