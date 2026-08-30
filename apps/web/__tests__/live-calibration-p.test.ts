import { describe, expect, it } from "vitest";
import {
  resolveLiveCalibrationP,
  picksToHonestCalibrationSamples,
  INDEPENDENT_EVIDENCE_SHRINK,
  MARKET_ANCHOR_INDEP_WEIGHT,
} from "@/lib/calibration/live-calibration-p";

describe("resolveLiveCalibrationP", () => {
  it("shrinks pure independent when conf echoes trueProb", () => {
    // conf = trueProb*100 → signal-slate echo
    const r = resolveLiveCalibrationP({
      confidence: 67,
      pickType: "MONEYLINE",
      factorBreakdown: {
        independentEdge: { trueProb: 0.67, priced: true, marketFairProb: 0.5 },
      },
    });
    expect(r?.source).toBe("independent_trueProb");
    expect(r?.p).toBeCloseTo(0.5 + (0.67 - 0.5) * INDEPENDENT_EVIDENCE_SHRINK, 4);
  });

  it("market-anchors when real book fair exists", () => {
    const r = resolveLiveCalibrationP({
      confidence: 80,
      pickType: "MONEYLINE",
      factorBreakdown: {
        marketFairProb: 0.55,
        independentEdge: { trueProb: 0.67, priced: true, marketFairProb: 0.55 },
      },
    });
    const shrunk = 0.5 + (0.67 - 0.5) * INDEPENDENT_EVIDENCE_SHRINK;
    const expected =
      MARKET_ANCHOR_INDEP_WEIGHT * shrunk +
      (1 - MARKET_ANCHOR_INDEP_WEIGHT) * 0.55;
    expect(r?.source).toBe("blend_indep_market");
    expect(r?.p).toBeCloseTo(expected, 4);
  });

  it("blends conf when conf differs from independent", () => {
    const r = resolveLiveCalibrationP({
      confidence: 80,
      pickType: "MONEYLINE",
      factorBreakdown: {
        independentEdge: { trueProb: 0.61, priced: true },
      },
    });
    const shrunk = 0.5 + (0.61 - 0.5) * INDEPENDENT_EVIDENCE_SHRINK;
    expect(r?.source).toBe("blend_indep_conf");
    expect(r?.p).toBeCloseTo(0.7 * shrunk + 0.3 * 0.8, 4);
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
