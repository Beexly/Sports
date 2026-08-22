import { describe, expect, it } from "vitest";
import { makeProvenance, reconstructed } from "@/lib/reconstruction/provenance";
import { measureReconstructionVsNgs } from "@/lib/reconstruction/ngs-sep-measurement";

function feat(value: number) {
  return reconstructed(value, [Math.max(0, value - 0.4), value + 0.4], 0.2, makeProvenance("empirical-bayes-shrinkage", ["nflverse:ngs"], false));
}

describe("measureReconstructionVsNgs", () => {
  it("joins on gsisId and does not graduate a tiny sample", () => {
    const predicted = [
      { gsisId: "a", feature: feat(3.0) },
      { gsisId: "b", feature: feat(1.5) },
      { gsisId: "c", feature: feat(2.4) },
    ];
    const truth = [
      { gsisId: "a", actualSeparation: 3.05 },
      { gsisId: "b", actualSeparation: 1.45 },
      { gsisId: "c", actualSeparation: 2.5 },
    ];
    const r = measureReconstructionVsNgs(predicted, truth);
    expect(r.n).toBe(3);
    expect(r.report.rmse).toBeLessThan(0.2);
    expect(r.graduation.graduates).toBe(false);
    expect(r.graduation.reasons.some((x) => x.includes("sample too small"))).toBe(true);
  });
});
