import { describe, expect, it } from "vitest";
import {
  resolveLiveCalibrationP,
  picksToHonestCalibrationSamples,
} from "@/lib/calibration/live-calibration-p";

describe("resolveLiveCalibrationP", () => {
  it("prefers independent trueProb over market (RES unlock)", () => {
    const r = resolveLiveCalibrationP({
      confidence: 80,
      pickType: "MONEYLINE",
      factorBreakdown: {
        marketFairProb: 0.55,
        independentEdge: { trueProb: 0.67, priced: true, marketFairProb: 0.55 },
      },
    });
    expect(r?.source).toBe("independent_trueProb");
    expect(r?.p).toBeCloseTo(0.67);
  });

  it("uses real marketFairProb when no independent", () => {
    const r = resolveLiveCalibrationP({
      confidence: 80,
      pickType: "MONEYLINE",
      factorBreakdown: { marketFairProb: 0.55 },
    });
    expect(r?.source).toBe("marketFairProb");
    expect(r?.p).toBeCloseTo(0.55);
  });

  it("ignores synthetic marketFairProb=0.5 and uses independent", () => {
    const r = resolveLiveCalibrationP({
      confidence: 70,
      pickType: "MONEYLINE",
      factorBreakdown: {
        independentEdge: {
          trueProb: 0.61,
          priced: true,
          marketFairProb: 0.5,
        },
      },
    });
    expect(r?.source).toBe("independent_trueProb");
    expect(r?.p).toBeCloseTo(0.61);
  });

  it("uses independent trueProb when no market", () => {
    const r = resolveLiveCalibrationP({
      confidence: 70,
      pickType: "MONEYLINE",
      factorBreakdown: {
        independentEdge: { trueProb: 0.61, priced: true },
        rankingSource: "independent_trueProb",
      },
    });
    expect(r?.source).toBe("independent_trueProb");
    expect(r?.p).toBeCloseTo(0.61);
  });

  it("excludes spread without fair p", () => {
    const r = resolveLiveCalibrationP({
      confidence: 75,
      pickType: "SPREAD",
      factorBreakdown: {},
    });
    expect(r).toBeNull();
  });

  it("moneyline falls back to confidence", () => {
    const r = resolveLiveCalibrationP({
      confidence: 62,
      pickType: "MONEYLINE",
    });
    expect(r?.source).toBe("confidence_moneyline");
    expect(r?.p).toBeCloseTo(0.62);
  });
});

describe("picksToHonestCalibrationSamples", () => {
  it("excludes non-prob markets from sample", () => {
    const built = picksToHonestCalibrationSamples([
      { confidence: 70, result: "WIN", pickType: "MONEYLINE" },
      { confidence: 80, result: "LOSS", pickType: "SPREAD" },
      {
        confidence: 90,
        result: "WIN",
        pickType: "TOTAL",
        factorBreakdown: { marketFairProb: 0.52 },
      },
    ]);
    expect(built.included).toBe(2);
    expect(built.excludedNonProb).toBe(1);
    expect(built.samples).toHaveLength(2);
  });
});
