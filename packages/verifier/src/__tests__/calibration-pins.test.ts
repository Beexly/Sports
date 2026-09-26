/**
 * Hand-computed pins for the calibration module (arXiv:2607.00164).
 *
 * Every expected value here is derived by hand in the comment above it, not
 * copied from an implementation run. The Murphy residual is pinned against an
 * independently computed within-bucket variance, which cross-checks all four
 * decomposition terms at once.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALIBRATION_BINS,
  MIN_CALIBRATION_N,
  accuracy,
  binningResidual,
  compareCalibration,
  expectedCalibrationError,
  identityError,
  maximumCalibrationError,
  murphyDecomposition,
  reliabilityCurve,
  reliabilityTerm,
  resolution,
  uncertainty,
  type CalibrationRow,
} from "../calibration";

/** 20 rows in two saturated groups: p=0.3 with 3/10 wins, p=0.7 with 7/10 wins. */
const calibrated: CalibrationRow[] = [
  ...Array.from({ length: 3 }, () => ({ p: 0.3, y: 1 as const })),
  ...Array.from({ length: 7 }, () => ({ p: 0.3, y: 0 as const })),
  ...Array.from({ length: 7 }, () => ({ p: 0.7, y: 1 as const })),
  ...Array.from({ length: 3 }, () => ({ p: 0.7, y: 0 as const })),
];

/** 20 rows all stating p=0.9, split 10/10 — maximally overconfident. */
const overconfident: CalibrationRow[] = [
  ...Array.from({ length: 10 }, () => ({ p: 0.9, y: 1 as const })),
  ...Array.from({ length: 10 }, () => ({ p: 0.9, y: 0 as const })),
];

/** 20 rows, half at p=0.3 and half at p=0.5, 10 wins out of 20. */
const mixedP: CalibrationRow[] = [
  ...Array.from({ length: 5 }, () => ({ p: 0.3, y: 1 as const })),
  ...Array.from({ length: 5 }, () => ({ p: 0.5, y: 1 as const })),
  ...Array.from({ length: 5 }, () => ({ p: 0.3, y: 0 as const })),
  ...Array.from({ length: 5 }, () => ({ p: 0.5, y: 0 as const })),
];

describe("binning", () => {
  it("uses the paper's ten equal-width bins by default", () => {
    expect(DEFAULT_CALIBRATION_BINS).toBe(10);
    expect(reliabilityCurve(calibrated).length).toBe(10);
  });

  it("puts p=0.3 in bucket 3 and p=0.7 in bucket 7 with the default bins", () => {
    const curve = reliabilityCurve(calibrated);
    expect(curve[3]!.n).toBe(10);
    expect(curve[7]!.n).toBe(10);
    expect(curve[0]!.n).toBe(0);
  });

  it("keeps p=1 inside the last bucket rather than out of range", () => {
    const curve = reliabilityCurve([{ p: 1, y: 1 }, { p: 1, y: 1 }, { p: 1, y: 0 }]);
    expect(curve[9]!.n).toBe(3);
  });

  it("emits an empty bucket as NaN rather than a zero-width gap", () => {
    const curve = reliabilityCurve(calibrated);
    expect(curve[0]!.meanP).toBeNaN();
    expect(curve[0]!.band).toBeNull();
  });
});

describe("expected / maximum calibration error", () => {
  it("is exactly 0 for the saturated calibrated fixture — every gap is 0", () => {
    // bucket 3: meanP 0.3, observed 3/10 = 0.3. bucket 7: meanP 0.7, observed 0.7.
    expect(expectedCalibrationError(calibrated)).toBeCloseTo(0, 12);
    expect(maximumCalibrationError(calibrated)).toBeCloseTo(0, 12);
  });

  it("is 0.4 for twenty rows all claiming 0.9 with ten wins", () => {
    // one bucket: meanP 0.9, observed 10/20 = 0.5, gap 0.4, mass 1.
    expect(expectedCalibrationError(overconfident)).toBeCloseTo(0.4, 12);
    expect(maximumCalibrationError(overconfident)).toBeCloseTo(0.4, 12);
  });

  it("weights buckets by mass, not by count of buckets", () => {
    // bucket 3 (p=0.3): meanP 0.3, observed 10/20 = 0.5, gap -0.2, mass 0.5.
    // bucket 5 (p=0.5): meanP 0.5, observed 0.5, gap 0,    mass 0.5.
    // ECE = 0.5*0.2 + 0.5*0 = 0.1; MCE = 0.2 (worst bucket, not an average).
    expect(expectedCalibrationError(mixedP)).toBeCloseTo(0.1, 12);
    expect(maximumCalibrationError(mixedP)).toBeCloseTo(0.2, 12);
  });

  it("is NaN on empty input rather than 0, which would read as perfect", () => {
    expect(expectedCalibrationError([])).toBeNaN();
    expect(maximumCalibrationError([])).toBeNaN();
  });
});

describe("accuracy and base rate", () => {
  it("accuracy is the realized win rate", () => {
    expect(accuracy(calibrated)).toBeCloseTo(0.5, 12);
    expect(accuracy(overconfident)).toBeCloseTo(0.5, 12);
  });

  it("uncertainty is the Bernoulli variance of the base rate", () => {
    expect(uncertainty(calibrated)).toBeCloseTo(0.25, 12);
  });
});

describe("Murphy decomposition", () => {
  it("brier for the calibrated fixture is 0.21 by hand", () => {
    // 3*(0.3-1)^2 + 7*(0.3-0)^2 + 7*(0.7-1)^2 + 3*(0.7-0)^2 = 1.47+0.63+0.63+1.47 = 4.2, /20.
    expect(murphyDecomposition(calibrated).brier).toBeCloseTo(0.21, 12);
  });

  it("reliability is 0 and resolution is 0.04 for the calibrated fixture", () => {
    // resolution = 0.5*(0.3-0.5)^2 + 0.5*(0.7-0.5)^2 = 0.04.
    const d = murphyDecomposition(calibrated);
    expect(d.reliability).toBeCloseTo(0, 12);
    expect(d.resolution).toBeCloseTo(0.04, 12);
    expect(d.uncertainty).toBeCloseTo(0.25, 12);
  });

  it("the identity holds with residual 0 when bins are saturated", () => {
    // 0.21 = 0 - 0.04 + 0.25 exactly.
    expect(identityError(murphyDecomposition(calibrated))).toBeCloseTo(0, 12);
    expect(binningResidual(calibrated)).toBeCloseTo(0, 12);
  });

  it("brier for the overconfident fixture is 0.41 with reliability 0.16", () => {
    // 10*(0.9-1)^2 + 10*(0.9-0)^2 = 0.1 + 8.1 = 8.2, /20 = 0.41; one bucket, gap 0.4 -> 0.16.
    const d = murphyDecomposition(overconfident);
    expect(d.brier).toBeCloseTo(0.41, 12);
    expect(d.reliability).toBeCloseTo(0.16, 12);
    expect(d.resolution).toBeCloseTo(0, 12);
    expect(identityError(d)).toBeCloseTo(0, 12);
  });

  it("resolution is 0 for a forecaster that says one thing every time", () => {
    // overconfident all say 0.9, so the single observed rate IS the base rate.
    expect(resolution(overconfident)).toBeCloseTo(0, 12);
  });

  it("residual equals the within-bucket variance of the stated p, exactly", () => {
    // Proven, not asserted: splitting p-y into within-bucket and bucket-level
    // parts kills the mean-zero terms, leaving SUM_b (n_b/n) var_p(b) as the
    // whole residual. mixedP under ONE bin has var_p = mean((0.3-0.4)^2,
    // (0.5-0.4)^2) = 0.01, and Brier - (rel - res + unc) = 0.27 - 0.26 = 0.01.
    expect(identityError(murphyDecomposition(mixedP, 1))).toBeCloseTo(0.01, 12);
    expect(binningResidual(mixedP, 1)).toBeCloseTo(0.01, 12);
  });

  it("coarse bins inflate the residual; the paper's ten bins are not saturated", () => {
    // Same rows, two binning schemes: one bucket mixes 0.3 and 0.5 (residual
    // 0.01), ten buckets separate them (residual 0).
    expect(binningResidual(mixedP, 1)).toBeCloseTo(0.01, 12);
    expect(binningResidual(mixedP, 10)).toBeCloseTo(0, 12);
  });

  it("reliabilityTerm is the weighted squared gap, not the absolute one", () => {
    expect(reliabilityTerm(mixedP)).toBeCloseTo(0.5 * 0.04, 12);
    expect(reliabilityTerm(mixedP)).toBeLessThan(expectedCalibrationError(mixedP));
  });
});

describe("candidate vs market diagnosis", () => {
  it("calls a Brier loss with equal calibration 'resolution-limited'", () => {
    // Market is the calibrated fixture (Brier 0.21, ECE 0). The candidate says
    // 0.5 everywhere and wins ten of twenty: perfectly calibrated, less sharp.
    const flat: CalibrationRow[] = [
      ...Array.from({ length: 10 }, () => ({ p: 0.5, y: 1 as const })),
      ...Array.from({ length: 10 }, () => ({ p: 0.5, y: 0 as const })),
    ];
    const v = compareCalibration(flat, calibrated);
    // flat Brier 0.25 > market 0.21, yet its ECE is 0 too: a resolution gap.
    expect(v.deltaBrier).toBeGreaterThan(0);
    expect(v.deltaEce).toBeCloseTo(0, 12);
    expect(v.brierDirection).toBe("market-better");
    expect(v.diagnosis).toBe("resolution-limited");
    expect(v.deltaResolution).toBeLessThan(0);
  });

  it("calls a Brier loss with worse calibration a reliability gap", () => {
    const v = compareCalibration(overconfident, calibrated);
    expect(v.deltaBrier).toBeGreaterThan(0);
    expect(v.deltaEce).toBeGreaterThan(0);
    expect(v.diagnosis).toBe("reliability-gap");
    expect(v.worstBucket?.n).toBe(20);
    expect(v.candidateOffBandBuckets).toBeGreaterThan(0);
  });

  it("refuses to diagnose below the minimum sample", () => {
    const tiny: CalibrationRow[] = [
      { p: 0.9, y: 1 },
      { p: 0.1, y: 0 },
    ];
    expect(MIN_CALIBRATION_N).toBe(20);
    expect(compareCalibration(tiny, calibrated).diagnosis).toBe("n-too-small");
  });

  it("never marks a bucket off-band when the truth's Wilson band covers it", () => {
    // 2 rows in the 0.9 bucket, 1 win: the band is wide enough to contain 0.9.
    const rows: CalibrationRow[] = [
      { p: 0.9, y: 1 },
      { p: 0.9, y: 0 },
    ];
    const bucket = reliabilityCurve(rows, 10)[9]!;
    expect(bucket.band).not.toBeNull();
    expect(bucket.exceedsBand).toBe(false);
  });

  it("flags a bucket whose stated p falls outside a tight band", () => {
    // 20 rows at 0.55, all wins: observed 1.0, gap -0.45, band is [0.84, 1.0].
    const tight: CalibrationRow[] = Array.from({ length: 20 }, () => ({ p: 0.55, y: 1 as const }));
    const bucket = reliabilityCurve(tight, 1)[0]!;
    expect(bucket.observedRate).toBe(1);
    expect(bucket.gap).toBeCloseTo(-0.45, 12);
    expect(bucket.exceedsBand).toBe(true);
  });
});
