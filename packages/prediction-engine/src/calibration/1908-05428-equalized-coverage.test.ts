import { describe, expect, it } from "vitest";
import {
  EqualizedCoverageManager,
  assignStratum,
  type PregameFeatures,
} from "./1908-05428-equalized-coverage.js";

describe("assignStratum", () => {
  it("concatenates configured keys", () => {
    const features: PregameFeatures = {
      weekBucket: "early",
      qbChange: true,
      roofWind: "dome",
    };
    expect(assignStratum(features, ["weekBucket", "qbChange"])).toBe("weekBucket:early|qbChange:true");
    expect(assignStratum(features, ["roofWind"])).toBe("roofWind:dome");
  });

  it("handles undefined keys with 'undef'", () => {
    const features: PregameFeatures = { weekBucket: "early" };
    expect(assignStratum(features, ["weekBucket", "qbChange"])).toBe("weekBucket:early|qbChange:undef");
  });

  it("returns '*' for empty keys", () => {
    const features: PregameFeatures = { weekBucket: "early" };
    expect(assignStratum(features, [])).toBe("*");
  });
});

describe("EqualizedCoverageManager", () => {
  it("returns exact marginal when strata are empty", () => {
    const manager = new EqualizedCoverageManager({ minSamples: 5, stratumKeys: ["weekBucket"] });

    for (let i = 0; i < 10; i++) {
      manager.add({ weekBucket: `week-${i}` }, i + 1);
    }

    const result = manager.quantile({ weekBucket: "week-0" }, 0.9);

    expect(result.usedFallback).toBe(true);
    expect(result.stratum).toBe("*");
    expect(result.sampleSize).toBe(10);
    expect(result.quantile).toBe(10);
  });

  it("uses stratum quantile when minSamples is met", () => {
    const manager = new EqualizedCoverageManager({ minSamples: 3, stratumKeys: ["weekBucket"] });

    manager.addMany([
      { features: { weekBucket: "early" }, residual: 1 },
      { features: { weekBucket: "early" }, residual: 2 },
      { features: { weekBucket: "early" }, residual: 3 },
      { features: { weekBucket: "early" }, residual: 4 },
    ]);

    manager.addMany([
      { features: { weekBucket: "late" }, residual: 100 },
      { features: { weekBucket: "late" }, residual: 200 },
    ]);

    const earlyResult = manager.quantile({ weekBucket: "early" }, 0.5);
    expect(earlyResult.usedFallback).toBe(false);
    expect(earlyResult.stratum).toBe("weekBucket:early");
    expect(earlyResult.sampleSize).toBe(4);
    expect(earlyResult.quantile).toBe(3);

    const lateResult = manager.quantile({ weekBucket: "late" }, 0.5);
    expect(lateResult.usedFallback).toBe(true);
    expect(lateResult.stratum).toBe("*");
    expect(lateResult.sampleSize).toBe(6);
    expect(lateResult.quantile).toBe(4);
  });

  it("handles complex multi-key strata", () => {
    const manager = new EqualizedCoverageManager({
      minSamples: 2,
      stratumKeys: ["weekBucket", "qbChange", "roofWind"]
    });

    const features1: PregameFeatures = { weekBucket: "early", qbChange: false, roofWind: "dome" };
    const features2: PregameFeatures = { weekBucket: "early", qbChange: true, roofWind: "dome" };

    manager.addMany([
      { features: features1, residual: 5 },
      { features: features1, residual: 6 },
      { features: features2, residual: 10 },
    ]);

    const result1 = manager.quantile(features1, 0.9);
    expect(result1.usedFallback).toBe(false);
    expect(result1.stratum).toBe("weekBucket:early|qbChange:false|roofWind:dome");

    const result2 = manager.quantile(features2, 0.9);
    expect(result2.usedFallback).toBe(true);
    expect(result2.stratum).toBe("*");
  });

  it("fail closed logic prevents returning narrow intervals on tiny samples", () => {
    const manager = new EqualizedCoverageManager({ minSamples: 5, stratumKeys: ["qbChange"] });

    for (let i = 0; i < 20; i++) {
      manager.add({ qbChange: false }, 10 + i);
    }

    manager.add({ qbChange: true }, 1);

    const result = manager.quantile({ qbChange: true }, 0.9);

    expect(result.usedFallback).toBe(true);
    expect(result.quantile).toBeGreaterThan(25);
  });
});
