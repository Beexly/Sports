import { describe, expect, it } from "vitest";
import {
  fairSkillBrier,
  indifferenceBrier,
  meanFairSkillBrier,
  originalBrier,
  originalBrierFromBinaryUnit,
} from "../fair-skill-brier.js";

describe("indifferenceBrier / originalBrier", () => {
  it("uniform 1/B scores exactly (B−1)/B, so fair skill is 0", () => {
    expect(indifferenceBrier(2)).toBeCloseTo(0.5, 12);
    expect(indifferenceBrier(5)).toBeCloseTo(0.8, 12);
    const binary = originalBrier([0.5, 0.5], 1);
    expect(binary).toBeCloseTo(0.5, 12);
    expect(fairSkillBrier(binary, 2)).toBeCloseTo(0, 12);

    const five = originalBrier([0.2, 0.2, 0.2, 0.2, 0.2], 0);
    expect(five).toBeCloseTo(0.8, 12);
    expect(fairSkillBrier(five, 5)).toBeCloseTo(0, 12);
  });

  it("perfect forecast is −(B−1)/B (better than indifference)", () => {
    expect(originalBrier([1, 0], 0)).toBe(0);
    expect(fairSkillBrier(0, 2)).toBeCloseTo(-0.5, 12);
    expect(fairSkillBrier(0, 5)).toBeCloseTo(-0.8, 12);
  });
});

describe("binary unit Brier vs original", () => {
  it("GSE (p−y)² is half the two-class original Brier", () => {
    const unit = 0.25; // always-0.5 on a 50/50 sample
    expect(originalBrierFromBinaryUnit(unit)).toBeCloseTo(0.5, 12);
    expect(fairSkillBrier(originalBrierFromBinaryUnit(unit), 2)).toBeCloseTo(0, 12);
  });
});

describe("cross-family comparison (the paper's point)", () => {
  it("a worse binary score can still beat a better-looking 5-way score after the fair adjustment", () => {
    // Binary ATD: original 0.40 (unit 0.20) vs indifference 0.50 → fs = −0.10
    const binaryFs = fairSkillBrier(0.4, 2);
    // 5-bucket yards: original 0.70 vs indifference 0.80 → fs = −0.10
    const yardsFs = fairSkillBrier(0.7, 5);
    expect(binaryFs).toBeCloseTo(-0.1, 12);
    expect(yardsFs).toBeCloseTo(-0.1, 12);
    // Raw Brier said yards (0.70) was worse than binary (0.40). Fair skill says equal.
    expect(0.7 > 0.4).toBe(true);
    expect(binaryFs).toBeCloseTo(yardsFs, 12);
  });

  it("meanFairSkillBrier pools mixed B events", () => {
    const m = meanFairSkillBrier([
      { originalBrS: 0.4, nOutcomes: 2 },
      { originalBrS: 0.7, nOutcomes: 5 },
    ]);
    expect(m).toBeCloseTo(-0.1, 12);
  });
});
