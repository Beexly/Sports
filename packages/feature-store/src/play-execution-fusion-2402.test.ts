import { describe, expect, it } from "vitest";
import { extractFlowFeatures, adaptiveFusionWeights, GSE_EXECUTION_FUSION_ENABLED } from "./play-execution-fusion-2402.js";

describe("play execution fusion", () => {
  it("extracts flow features from tracking frames", () => {
    const f = extractFlowFeatures([
      { speeds: [4, 6, 8], spacings: [5, 10, 15] },
      { speeds: [5, 7, 9], spacings: [6, 11, 16] },
    ]);
    expect(f.meanSpeed).toBeCloseTo(6.5, 10);
    expect(f.maxSpeed).toBe(9);
    expect(f.frameCount).toBe(2);
    expect(f.spacingEntropy).toBeGreaterThan(0);
  });
  it("handles empty frames", () => {
    const f = extractFlowFeatures([]);
    expect(f.meanSpeed).toBe(0);
    expect(f.maxSpeed).toBe(0);
    expect(f.spacingEntropy).toBe(0);
  });
  it("fusion weights form a convex combination", () => {
    const w = adaptiveFusionWeights(3, 1);
    expect(w.tracking + w.video).toBeCloseTo(1, 10);
    expect(w.tracking).toBeCloseTo(0.75, 10);
    const z = adaptiveFusionWeights(0, 0);
    expect(z.tracking).toBe(0.5);
  });
  it("stays off until the Spearman gates clear", () => {
    expect(GSE_EXECUTION_FUSION_ENABLED).toBe(false);
  });
});

