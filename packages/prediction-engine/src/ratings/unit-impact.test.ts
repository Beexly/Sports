import { describe, expect, it } from "vitest";
import {
  fitImpactScores,
  impactScoreIntervals,
  mahalanobisSimilarity,
  predictWpDelta,
  softThreshold,
  yearToYearCorrelation,
} from "./unit-impact";
import type { DriveObs } from "./unit-impact";

// Synthetic drives: starter-QB drives gain WP, backup-QB drives lose it;
// the away DL only rushes against the backup.
const drives: DriveObs[] = Array.from({ length: 120 }, (_, i) => {
  const starter = i % 2 === 0;
  return {
    wpDelta: starter ? 0.05 + (i % 5) * 0.002 : -0.02 - (i % 5) * 0.002,
    units: {
      "home:QB:starter": starter ? 1 : 0,
      "home:QB:backup": starter ? 0 : 1,
      "away:DL": starter ? 0 : -1,
    } as DriveObs["units"],
  };
});

describe("unit-impact", () => {
  it("softThreshold is the Laplace proximal operator", () => {
    expect(softThreshold(0.5, 0.2)).toBeCloseTo(0.3, 12);
    expect(softThreshold(-0.5, 0.2)).toBeCloseTo(-0.3, 12);
    expect(softThreshold(0.1, 0.2)).toBe(0); // killed by the prior
  });

  it("fitImpactScores recovers the strong unit's positive impact", () => {
    const scores = fitImpactScores(drives, 0.005);
    expect(scores["home:QB:starter"]).toBeGreaterThan(scores["home:QB:backup"] ?? 0);
    expect(scores["home:QB:starter"]).toBeGreaterThan(0);
    expect(Object.keys(scores)).toContain("away:DL");
  });

  it("predictWpDelta sums signed contributions", () => {
    const scores = { "home:QB": 0.05, "away:DL": -0.02 };
    expect(predictWpDelta(scores, { "home:QB": 1, "away:DL": -1 })).toBeCloseTo(0.07, 12);
    expect(predictWpDelta(scores, {})).toBe(0);
  });

  it("bootstrap intervals bracket the point estimate", () => {
    const iv = impactScoreIntervals(drives, 0.005, 50);
    for (const u of Object.keys(iv)) {
      expect(iv[u]!.lo).toBeLessThanOrEqual(iv[u]!.hi);
      expect(iv[u]!.score).toBeGreaterThanOrEqual(iv[u]!.lo - 1e-9);
      expect(iv[u]!.score).toBeLessThanOrEqual(iv[u]!.hi + 1e-9);
    }
  });

  it("empty input returns empty scores", () => {
    expect(fitImpactScores([])).toEqual({});
  });

  it("mahalanobisSimilarity: identical profiles are ~0", () => {
    expect(mahalanobisSimilarity([1, 0, 1], [1, 0, 1])).toBeLessThan(1e-3);
    expect(mahalanobisSimilarity([1, 1, 1], [0, 0, 0])).toBeGreaterThan(1);
    expect(() => mahalanobisSimilarity([1], [1, 2])).toThrow();
  });

  it("yearToYearCorrelation detects stable vs shuffled scores", () => {
    const a = { u1: 0.1, u2: -0.05, u3: 0.02, u4: 0.08 };
    const stable = { u1: 0.11, u2: -0.04, u3: 0.01, u4: 0.09 };
    const shuffled = { u1: -0.05, u2: 0.1, u3: 0.08, u4: 0.02 };
    expect(yearToYearCorrelation(a, stable)).toBeGreaterThan(0.9);
    expect(yearToYearCorrelation(a, shuffled)).toBeLessThan(0);
    expect(yearToYearCorrelation({ u1: 1 }, { u1: 1 })).toBe(0); // too few units
  });
});
