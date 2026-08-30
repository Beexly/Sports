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

  it("guards the coverage divide-by-zero: no expected sources yields zero coverage", () => {
    const clean = dataReliabilityIndex(cleanInput);
    const noExpected = dataReliabilityIndex({ ...cleanInput, expectedSourceCount: 0 });

    const coverageDriver = noExpected.drivers.find((driver) => driver.name === "coverage");
    expect(coverageDriver?.contribution).toBe(0);
    // Coverage weight is 22 points; dropping full coverage removes exactly that.
    expect(clean.score - noExpected.score).toBeCloseTo(22, 5);
    expect(Number.isFinite(noExpected.score)).toBe(true);
  });

  it("treats missing/non-finite source age as zero freshness rather than fabricating a value", () => {
    const { sourceAgeMinutes: _omit, ...withoutAge } = cleanInput;
    const noAge = dataReliabilityIndex(withoutAge);

    const freshnessDriver = noAge.drivers.find((driver) => driver.name === "freshness");
    expect(freshnessDriver?.contribution).toBe(0);
    expect(Number.isFinite(noAge.score)).toBe(true);
  });

  it("clamps ttl to a positive floor so ttlMinutes of 0 does not throw or NaN", () => {
    const result = dataReliabilityIndex({ ...cleanInput, ttlMinutes: 0 });

    expect(Number.isNaN(result.score)).toBe(false);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it("caps the contradiction and missing-field penalties", () => {
    const contradictionsAtCap = dataReliabilityIndex({ ...cleanInput, contradictionCount: 3 });
    const contradictionsBeyondCap = dataReliabilityIndex({ ...cleanInput, contradictionCount: 10 });
    expect(contradictionsBeyondCap.score).toBe(contradictionsAtCap.score);

    const missingAtCap = dataReliabilityIndex({ ...cleanInput, missingRequiredFields: 5 });
    const missingBeyondCap = dataReliabilityIndex({ ...cleanInput, missingRequiredFields: 10 });
    expect(missingBeyondCap.score).toBe(missingAtCap.score);
  });

  it("never emits a NaN score for non-finite numeric inputs", () => {
    const trustNaN = dataReliabilityIndex({ ...cleanInput, providerTrustScore: Number.NaN });
    const sourceCountNaN = dataReliabilityIndex({ ...cleanInput, sourceCount: Number.NaN });
    const expectedCountNaN = dataReliabilityIndex({ ...cleanInput, expectedSourceCount: Number.NaN });

    for (const result of [trustNaN, sourceCountNaN, expectedCountNaN]) {
      expect(Number.isNaN(result.score)).toBe(false);
      expect(Number.isFinite(result.score)).toBe(true);
    }
    // Non-finite provider trust is treated as zero trust, not fabricated.
    const trustDriver = trustNaN.drivers.find((driver) => driver.name === "provider_trust");
    expect(trustDriver?.contribution).toBe(0);
  });

  it("surfaces blocked rights as a decisive, high-magnitude driver in the ranked trail", () => {
    const blockedRights = dataReliabilityIndex({ ...cleanInput, rightsStatus: "unknown" });

    const rightsDriver = blockedRights.drivers.find((driver) => driver.name === "rights_cleanliness");
    expect(rightsDriver?.contribution).toBe(-20);
    expect(rightsDriver?.direction).toBe("DOWN");

    // Its gating power must outrank a smaller positive factor like provider trust,
    // rather than sorting last with a zero contribution.
    const rightsIndex = blockedRights.drivers.findIndex((driver) => driver.name === "rights_cleanliness");
    const providerIndex = blockedRights.drivers.findIndex((driver) => driver.name === "provider_trust");
    expect(rightsIndex).toBeLessThan(providerIndex);
  });
});
