import { describe, expect, it } from "vitest";
import {
  assessSafeFootballSegmentParity,
  computeChiSquareDrift,
  computeKlDivergence,
  computePopulationStabilityIndex,
  type DistributionBucket,
} from "./drift";

const stableBuckets: readonly DistributionBucket[] = [
  { baseline: 50, bucket: "low", observed: 49 },
  { baseline: 30, bucket: "mid", observed: 31 },
  { baseline: 20, bucket: "high", observed: 20 },
];

const shiftedBuckets: readonly DistributionBucket[] = [
  { baseline: 50, bucket: "low", observed: 20 },
  { baseline: 30, bucket: "mid", observed: 30 },
  { baseline: 20, bucket: "high", observed: 50 },
];

describe("FABLE drift statistics", () => {
  it("keeps PSI and KL quiet for stable distributions", () => {
    expect(computePopulationStabilityIndex(stableBuckets).drifted).toBe(false);
    expect(computeKlDivergence(stableBuckets).drifted).toBe(false);
  });

  it("flags shifted distributions with PSI, KL, and chi-square", () => {
    expect(computePopulationStabilityIndex(shiftedBuckets).drifted).toBe(true);
    expect(computeKlDivergence(shiftedBuckets).drifted).toBe(true);
    expect(computeChiSquareDrift(shiftedBuckets).drifted).toBe(true);
  });

  it("allows parity only on safe football segments", () => {
    const report = assessSafeFootballSegmentParity([
      { group: "QB", sampleSize: 50, segment: "position", value: 0.62 },
      { group: "RB", sampleSize: 50, segment: "position", value: 0.5 },
    ]);

    expect(report.status).toBe("ok");
    if (report.status !== "ok") throw new Error("expected safe segment report");
    expect(report.rows.some((row) => row.flagged)).toBe(true);
  });

  it("blocks non-football protected or personal segments", () => {
    const report = assessSafeFootballSegmentParity([
      { group: "example", sampleSize: 50, segment: "age", value: 0.58 },
    ]);

    expect(report.status).toBe("blocked");
    if (report.status !== "blocked") throw new Error("expected blocked segment report");
    expect(report.blockedSegments).toEqual(["age"]);
  });
});
