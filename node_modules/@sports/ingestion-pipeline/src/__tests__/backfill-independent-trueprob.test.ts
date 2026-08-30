import { describe, expect, it } from "vitest";
import { blendIndependentHomeFair } from "../generate-signal-slate.js";

describe("independent trueProb polarity for backfill", () => {
  it("blendIndependentHomeFair sharpness-weights home probs (with discrimination stretch)", () => {
    const blend = blendIndependentHomeFair([
      { source: "fpi", homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: new Date().toISOString() },
      { source: "elo", homeFairProb: 0.7, awayFairProb: 0.3, capturedAt: new Date().toISOString() },
    ]);
    expect(blend).not.toBeNull();
    // Sharpness weights |p−0.5|+0.05 → (0.6×0.15 + 0.7×0.25)/0.4 = 0.6625,
    // then the ×1.12 stretch from 0.5 → 0.682. Polarity must match inputs.
    expect(blend!.homeP).toBeCloseTo(0.682, 5);
    expect(blend!.homeP).toBeGreaterThan(0.5);
    expect(blend!.sources).toEqual(["fpi", "elo"]);
  });

  it("away trueProb is complement of home blend", () => {
    const blend = blendIndependentHomeFair([
      { source: "fpi", homeFairProb: 0.62, awayFairProb: 0.38, capturedAt: new Date().toISOString() },
    ]);
    expect(blend).not.toBeNull();
    const awayP = 1 - blend!.homeP;
    // Single source: 0.62 stretched → 0.6344 home, so away is its exact
    // complement 0.3656 — the backfill must never write home/away probs
    // that fail to sum to 1.
    expect(blend!.homeP).toBeCloseTo(0.6344, 5);
    expect(awayP).toBeCloseTo(0.3656, 5);
    expect(blend!.homeP + awayP).toBeCloseTo(1, 10);
  });
});
