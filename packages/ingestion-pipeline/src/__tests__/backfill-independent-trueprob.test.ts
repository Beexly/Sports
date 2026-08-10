import { describe, expect, it } from "vitest";
import { blendIndependentHomeFair } from "../generate-signal-slate.js";

describe("independent trueProb polarity for backfill", () => {
  it("blendIndependentHomeFair averages home probs", () => {
    const blend = blendIndependentHomeFair([
      { source: "fpi", homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: new Date().toISOString() },
      { source: "elo", homeFairProb: 0.7, awayFairProb: 0.3, capturedAt: new Date().toISOString() },
    ]);
    expect(blend).not.toBeNull();
    expect(blend!.homeP).toBeCloseTo(0.65, 5);
    expect(blend!.sources).toEqual(["fpi", "elo"]);
  });

  it("away trueProb is complement of home blend", () => {
    const blend = blendIndependentHomeFair([
      { source: "fpi", homeFairProb: 0.62, awayFairProb: 0.38, capturedAt: new Date().toISOString() },
    ]);
    expect(blend).not.toBeNull();
    const awayP = 1 - blend!.homeP;
    expect(awayP).toBeCloseTo(0.38, 5);
  });
});
