import { describe, it, expect } from "vitest";
import {
  featureExposure,
  type FeatureColumn,
} from "../edge-lab/features/feature-exposure.js";

const preds = [0.1, 0.35, 0.5, 0.72, 0.9];

describe("featureExposure", () => {
  it("reports |spearman| = 1 for a perfectly monotone feature", () => {
    const feats: FeatureColumn[] = [{ name: "line", values: [1, 2, 3, 4, 5] }];
    const r = featureExposure(preds, feats);
    expect(r.exposures[0]?.exposure).toBeCloseTo(1, 10);
    expect(r.maxExposureFeature).toBe("line");
  });

  it("is symmetric in direction: descending feature also exposes fully", () => {
    const feats: FeatureColumn[] = [{ name: "inv", values: [5, 4, 3, 2, 1] }];
    const r = featureExposure(preds, feats, { flagThreshold: 0.9 });
    expect(r.exposures[0]?.exposure).toBeCloseTo(1, 10);
    expect(r.exposures[0]?.flagged).toBe(true);
  });

  it("near-noise feature yields low exposure and is not flagged at sane threshold", () => {
    // Alternating high/low values decorrelates from the monotone prediction.
    const feats: FeatureColumn[] = [{ name: "noise", values: [3, -2, 4, -1, -4] }];
    const r = featureExposure(preds, feats, { flagThreshold: 0.8 });
    expect(r.exposures[0]?.exposure ?? 1).toBeLessThan(0.8);
    expect(r.exposures[0]?.flagged).toBe(false);
  });

  it("ties in the feature are handled by average ranks (constant-ish columns skipped)", () => {
    const feats: FeatureColumn[] = [
      { name: "tied", values: [2, 1, 2, 1, 2] },
      { name: "const", values: [7, 7, 7, 7, 7] },
    ];
    const r = featureExposure(preds, feats);
    expect(r.exposures[0]?.exposure).not.toBeNull();
    expect(r.skipped).toEqual(["const"]);
  });

  it("degenerate inputs are reported as null exposure with reasons, never zero-imputed", () => {
    const feats: FeatureColumn[] = [
      { name: "short", values: [1, 2] }, // length mismatch
      { name: "nan", values: [1, NaN, 3, 4, 5] },
      { name: "ok", values: [1, 2, 3, 5, 4] },
    ];
    const r = featureExposure(preds, feats);
    expect(r.skipped).toEqual(["short", "nan"]);
    expect(r.exposures.find((e) => e.name === "short")?.exposure).toBeNull();
    expect(r.exposures.find((e) => e.name === "ok")?.exposure).not.toBeNull();
  });

  it("maxExposure picks the strongest column; null when none evaluable", () => {
    const allBad: FeatureColumn[] = [{ name: "a", values: [1] }];
    const r0 = featureExposure(preds, allBad);
    expect(r0.maxExposure).toBeNull();
    expect(r0.maxExposureFeature).toBeNull();

    const mixed: FeatureColumn[] = [
      { name: "weak", values: [3, -2, 4, -1, -4] },
      { name: "strong", values: [1, 2, 3, 4, 5] },
    ];
    const r = featureExposure(preds, mixed);
    expect(r.maxExposureFeature).toBe("strong");
    expect(r.maxExposure ?? 0).toBeCloseTo(1, 10);
  });

  it("fail-closed on empty predictions, non-finite or out-of-range probabilities", () => {
    expect(() => featureExposure([], [])).toThrow();
    expect(() => featureExposure([0.5, NaN], [{ name: "x", values: [1, 2] }])).toThrow();
    expect(() =>
      featureExposure([0.5, 1.2], [{ name: "x", values: [1, 2] }]),
    ).toThrow();
  });

  it("rejects non-finite explicit flagThreshold but allows Infinity default", () => {
    expect(() =>
      featureExposure(preds, [{ name: "x", values: [1, 2, 3, 4, 5] }], {
        flagThreshold: NaN,
      }),
    ).toThrow();
    const r = featureExposure(preds, [{ name: "x", values: [1, 2, 3, 4, 5] }]);
    expect(r.exposures[0]?.flagged).toBe(false); // Infinity threshold flags nothing
  });
});
