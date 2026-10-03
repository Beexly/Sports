import { describe, it, expect } from "vitest";
import type { Trend } from "@sports/prediction-engine";
import {
  assertRenderableTrend,
  collectTrendDefects,
  renderableTrendOrNull,
  TrendRenderError,
  type TrendRenderInput,
} from "@/lib/trends/render-contract";

/**
 * S3 — a streak cannot render without the context that makes it honest.
 *
 * The headline case is the classic tout device: "hit 36 of the last 37".
 * Statistically significant, completely uninformative without a base rate,
 * and actively misleading without a regression-to-mean caveat and a
 * calibrated forward probability.
 */

/** The tout's dream: 36/37, wildly significant, zero context. */
const STREAK_36_OF_37: Trend = {
  feature: "coverStreak",
  cohort: "Home favorites off a bye",
  n: 37,
  cohortMean: 36 / 37,
  baselineMean: 0.5,
  baselineN: 4200,
  absoluteDelta: 36 / 37 - 0.5,
  relativeDelta: (36 / 37 - 0.5) / 0.5,
  z: 5.8,
  pValue: 0.0000001,
  significant: true,
};

const COMPLETE: TrendRenderInput = {
  trend: STREAK_36_OF_37,
  minSampleSize: 30,
  regressionCaveat:
    "Streaks of this length regress hard toward the base rate; this is a description of the past, not a forecast.",
  calibratedProbability: 0.54,
};

describe("the 36-of-37 case", () => {
  it("REFUSES a bare streak with no caveat and no calibrated probability", () => {
    const bare: TrendRenderInput = { trend: STREAK_36_OF_37, minSampleSize: 30 };
    expect(renderableTrendOrNull(bare)).toBeNull();
    const defects = collectTrendDefects(bare);
    expect(defects).toContain("missing-regression-caveat");
    expect(defects).toContain("missing-calibrated-probability");
  });

  it("RENDERS once every leg is supplied", () => {
    const out = renderableTrendOrNull(COMPLETE);
    expect(out).not.toBeNull();
    expect(out!.n).toBe(37);
    expect(out!.baselineMean).toBe(0.5);
    expect(out!.regressionCaveat).toContain("regress");
    expect(out!.calibratedProbability).toBe(0.54);
  });

  it("the calibrated probability is FORWARD-looking, not the historical rate", () => {
    // The whole point of leg (d): 36/37 is 97% historically, but the honest
    // forward number is near the base rate. The contract carries the supplied
    // forward probability, never the cohort mean.
    const out = renderableTrendOrNull(COMPLETE)!;
    expect(out.calibratedProbability).toBeLessThan(0.6);
    expect(out.cohortMean).toBeGreaterThan(0.9);
    expect(out.calibratedProbability).not.toBe(out.cohortMean);
  });
});

describe("each leg is individually load-bearing", () => {
  it("(a) sample floor: n below minSampleSize is refused", () => {
    const thin: TrendRenderInput = {
      ...COMPLETE,
      trend: { ...STREAK_36_OF_37, n: 6 },
      minSampleSize: 30,
    };
    expect(collectTrendDefects(thin)).toContain("insufficient-sample");
    expect(renderableTrendOrNull(thin)).toBeNull();
  });

  it("(a) exactly at the floor passes", () => {
    const atFloor: TrendRenderInput = { ...COMPLETE, trend: { ...STREAK_36_OF_37, n: 30 }, minSampleSize: 30 };
    expect(collectTrendDefects(atFloor)).not.toContain("insufficient-sample");
  });

  it("(b) base rate: a baseline with no sample behind it is refused", () => {
    const noBaseline: TrendRenderInput = {
      ...COMPLETE,
      trend: { ...STREAK_36_OF_37, baselineN: 0 },
    };
    expect(collectTrendDefects(noBaseline)).toContain("missing-base-rate");
  });

  it("(b) a non-finite baseline mean is refused", () => {
    const nanBaseline: TrendRenderInput = {
      ...COMPLETE,
      trend: { ...STREAK_36_OF_37, baselineMean: NaN },
    };
    expect(collectTrendDefects(nanBaseline)).toContain("missing-base-rate");
  });

  it("(c) an EMPTY caveat string does not satisfy the contract", () => {
    // A caller must not be able to tick the box with "" or whitespace.
    for (const caveat of ["", "   ", "\n\t"]) {
      expect(collectTrendDefects({ ...COMPLETE, regressionCaveat: caveat })).toContain(
        "missing-regression-caveat",
      );
    }
  });

  it("(d) a probability outside [0,1] is refused", () => {
    for (const p of [-0.1, 1.5, NaN, Infinity]) {
      expect(collectTrendDefects({ ...COMPLETE, calibratedProbability: p })).toContain(
        "missing-calibrated-probability",
      );
    }
  });

  it("significance is necessary but listed last — the omitted legs are what touts drop", () => {
    const insignificant: TrendRenderInput = {
      ...COMPLETE,
      trend: { ...STREAK_36_OF_37, significant: false },
    };
    expect(collectTrendDefects(insignificant)).toContain("not-significant");
    expect(renderableTrendOrNull(insignificant)).toBeNull();
  });
});

describe("assertRenderableTrend — the loud version", () => {
  it("throws with every defect named at once, not just the first", () => {
    const naked: TrendRenderInput = {
      trend: { ...STREAK_36_OF_37, n: 3, baselineN: 0, significant: false },
      minSampleSize: 30,
    };
    try {
      assertRenderableTrend(naked);
      throw new Error("expected assertRenderableTrend to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TrendRenderError);
      const e = err as TrendRenderError;
      expect(e.defects).toHaveLength(5);
      expect(e.message).toContain("fabrication by omission");
      expect(e.message).toContain(STREAK_36_OF_37.cohort);
    }
  });

  it("does not throw on a complete trend", () => {
    expect(() => assertRenderableTrend(COMPLETE)).not.toThrow();
  });
});
