import { describe, expect, it } from "vitest";
import { blendIndependentHomeFair } from "../generate-signal-slate.js";

/**
 * blendIndependentHomeFair — sharpness-weighted blend of independent home fair
 * probs with a mild ×1.12 discrimination stretch (model definition; see the
 * implementation comment in generate-signal-slate.ts). Soft near-0.5 sources
 * vote less than extreme sources; the stretch preserves polarity while
 * increasing separation. Never invents a blend from an empty list → null.
 */
describe("independent trueProb polarity for backfill", () => {
  it("sharpness-weights then stretches the home blend", () => {
    // Equal inputs, unequal weights: |0.6-0.5|+0.05 = 0.15, |0.7-0.5|+0.05 = 0.25.
    // Weighted = (0.6*0.15 + 0.7*0.25) / 0.40 = 0.6625; |0.6625-0.5| >= 0.03 so
    // stretch ×1.12 -> 0.5 + 0.1625*1.12 = 0.682.
    const blend = blendIndependentHomeFair([
      { source: "fpi", homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: new Date().toISOString() },
      { source: "elo", homeFairProb: 0.7, awayFairProb: 0.3, capturedAt: new Date().toISOString() },
    ]);
    expect(blend).not.toBeNull();
    expect(blend!.homeP).toBeCloseTo(0.682, 5);
    expect(blend!.sources).toEqual(["fpi", "elo"]);
  });

  it("away trueProb is complement of the stretched home blend", () => {
    const blend = blendIndependentHomeFair([
      { source: "fpi", homeFairProb: 0.62, awayFairProb: 0.38, capturedAt: new Date().toISOString() },
    ]);
    expect(blend).not.toBeNull();
    // Single source: weighted = 0.62; stretch ×1.12 -> 0.5 + 0.12*1.12 = 0.6344.
    expect(blend!.homeP).toBeCloseTo(0.6344, 5);
    const awayP = 1 - blend!.homeP;
    expect(awayP).toBeCloseTo(0.3656, 5);
  });

  it("gives extreme sources more weight than near-coin-flip sources", () => {
    // 0.9 (w=0.45) vs 0.51 (w=0.06): the extreme source dominates the blend.
    const blend = blendIndependentHomeFair([
      { source: "kalshi", homeFairProb: 0.51, awayFairProb: 0.49, capturedAt: new Date().toISOString() },
      { source: "standings", homeFairProb: 0.9, awayFairProb: 0.1, capturedAt: new Date().toISOString() },
    ]);
    expect(blend).not.toBeNull();
    expect(blend!.homeP).toBeGreaterThan(0.8);
    expect(blend!.sources).toEqual(["kalshi", "standings"]);
  });

  it("returns null for an empty list (never invents a blend)", () => {
    expect(blendIndependentHomeFair([])).toBeNull();
  });
});
