import { describe, it, expect } from "vitest";
import {
  calibrateConformal,
  conformalInterval,
  conformalPrediction,
  reliabilityCurve,
  expectedCalibrationError,
  brierScore,
} from "@/lib/math/conformal";

// ---------------------------------------------------------------------------
// calibrateConformal
// ---------------------------------------------------------------------------

describe("calibrateConformal", () => {
  it("perfect model — scores are all 0 when predictions equal outcomes exactly", () => {
    // A "perfect" calibration set: predicted prob is exactly the outcome (0 or 1).
    // score[i] = |outcome[i] - predictedProb[i]| = |1 - 1| = 0 or |0 - 0| = 0.
    const probs = [1.0, 0.0, 1.0, 0.0, 1.0] as const;
    const outcomes = [1, 0, 1, 0, 1] as const;
    const result = calibrateConformal(probs, outcomes);
    expect(result.scores).toHaveLength(5);
    for (const s of result.scores) {
      expect(s).toBeCloseTo(0, 10);
    }
    expect(result.qHat).toBeCloseTo(0, 10);
  });

  it("alpha=0.1 → qHat is the (n+1)*0.9 / n quantile of sorted scores", () => {
    // 10 calibration points with known nonconformity scores 0.1..1.0
    const probs = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0] as const;
    const outcomes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const; // all wrong → score = p
    const result = calibrateConformal(probs, outcomes, 0.1);
    // scores: 0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0.0
    // sorted: 0.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9
    // ceil((10+1)*0.9) = ceil(9.9) = 10 → index 9 (0-based) → value 0.9
    expect(result.qHat).toBeCloseTo(0.9, 10);
    expect(result.coverageLevel).toBeCloseTo(0.9, 10);
  });

  it("throws on mismatched array lengths", () => {
    expect(() =>
      calibrateConformal([0.5, 0.6], [1 as 0 | 1]),
    ).toThrow(/length/i);
  });

  it("returns empty result for empty inputs without throwing", () => {
    const result = calibrateConformal([], []);
    expect(result.scores).toHaveLength(0);
    expect(result.qHat).toBe(0);
    expect(result.coverageLevel).toBeCloseTo(0.9, 10);
  });

  it("coverageLevel equals 1 - alpha", () => {
    const result = calibrateConformal([0.5], [1], 0.2);
    expect(result.coverageLevel).toBeCloseTo(0.8, 10);
  });

  it("scores array has same length as input", () => {
    const result = calibrateConformal([0.3, 0.6, 0.9], [1, 0, 1]);
    expect(result.scores).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// conformalInterval
// ---------------------------------------------------------------------------

describe("conformalInterval", () => {
  it("p=0.6, qHat=0.1 → lower=0.5, upper=0.7", () => {
    const interval = conformalInterval(0.6, 0.1);
    expect(interval.lower).toBeCloseTo(0.5, 10);
    expect(interval.upper).toBeCloseTo(0.7, 10);
  });

  it("clips lower to 0 when p - qHat would be negative", () => {
    const interval = conformalInterval(0.05, 0.3);
    expect(interval.lower).toBe(0);
  });

  it("clips upper to 1 when p + qHat exceeds 1", () => {
    const interval = conformalInterval(0.95, 0.3);
    expect(interval.upper).toBe(1);
  });

  it("width = 2 * qHat when not clipped", () => {
    const qHat = 0.1;
    const interval = conformalInterval(0.5, qHat);
    expect(interval.width).toBeCloseTo(2 * qHat, 10);
  });

  it("width is upper - lower", () => {
    const interval = conformalInterval(0.4, 0.15);
    expect(interval.width).toBeCloseTo(interval.upper - interval.lower, 10);
  });

  it("lower and upper are both in [0, 1]", () => {
    for (const p of [0.0, 0.1, 0.5, 0.9, 1.0]) {
      const iv = conformalInterval(p, 0.25);
      expect(iv.lower).toBeGreaterThanOrEqual(0);
      expect(iv.upper).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// conformalPrediction (full pipeline)
// ---------------------------------------------------------------------------

describe("conformalPrediction", () => {
  it("full pipeline: calibration + interval in a single call", () => {
    const calPredictedProbs = [0.2, 0.4, 0.6, 0.8] as const;
    const calTrueOutcomes = [0, 0, 1, 1] as const;
    const result = conformalPrediction({
      calPredictedProbs,
      calTrueOutcomes,
      newPredictedProb: 0.5,
      alpha: 0.1,
    });

    expect(result.calibration.scores).toHaveLength(4);
    expect(result.calibration.qHat).toBeGreaterThanOrEqual(0);
    expect(result.interval.lower).toBeGreaterThanOrEqual(0);
    expect(result.interval.upper).toBeLessThanOrEqual(1);
    expect(result.interval.lower).toBeLessThanOrEqual(result.interval.upper);
  });

  it("uses default alpha=0.1 when omitted", () => {
    const result = conformalPrediction({
      calPredictedProbs: [0.5, 0.5],
      calTrueOutcomes: [1, 0],
      newPredictedProb: 0.5,
    });
    expect(result.calibration.coverageLevel).toBeCloseTo(0.9, 10);
  });
});

// ---------------------------------------------------------------------------
// reliabilityCurve
// ---------------------------------------------------------------------------

describe("reliabilityCurve", () => {
  it("returns exactly nBins entries (default 10)", () => {
    const probs = Array.from({ length: 30 }, (_, i) => i / 30);
    const outcomes = probs.map((p) => (p > 0.5 ? 1 : 0)) as (0 | 1)[];
    const bins = reliabilityCurve({ predictedProbs: probs, trueOutcomes: outcomes });
    expect(bins).toHaveLength(10);
  });

  it("returns nBins entries when nBins=5", () => {
    const probs = [0.1, 0.3, 0.5, 0.7, 0.9] as const;
    const outcomes = [0, 0, 1, 1, 1] as const;
    const bins = reliabilityCurve({ predictedProbs: probs, trueOutcomes: outcomes, nBins: 5 });
    expect(bins).toHaveLength(5);
  });

  it("bins sum to total number of predictions", () => {
    const probs = Array.from({ length: 50 }, (_, i) => (i + 0.5) / 50);
    const outcomes = probs.map((_, i) => (i % 2 === 0 ? 1 : 0)) as (0 | 1)[];
    const bins = reliabilityCurve({ predictedProbs: probs, trueOutcomes: outcomes });
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(50);
  });

  it("perfect calibration → actualFrequency ≈ predictedMean in each populated bin", () => {
    // Build a dataset where within each bin, the outcome rate equals the predicted probability.
    // Use midpoints of each bin and deterministically assign outcomes.
    // For bin b of 10 bins, midpoint = (b + 0.5) / 10. We add 2 samples per bin:
    //   one outcome=1 and one outcome=0, giving rate 0.5 — but predictedMean also = 0.5
    // → actual ≈ predicted when predictedMean is forced to match.
    // Use 1 sample per bin at exactly the bin midpoint, outcome = 1 → frequency=1,
    // then pair with same point outcome=0 → frequency=0.5.
    // Instead use perfectly calibrated: all probs = 0.5, all outcomes alternate.
    const n = 20;
    const probs = new Array<number>(n).fill(0.5);
    const outcomes = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : 0)) as (0 | 1)[];
    const bins = reliabilityCurve({ predictedProbs: probs, trueOutcomes: outcomes, nBins: 1 });
    // single bin: predictedMean = 0.5, actualFrequency = 0.5
    expect(bins[0]!.predictedMean).toBeCloseTo(0.5, 5);
    expect(bins[0]!.actualFrequency).toBeCloseTo(0.5, 5);
  });

  it("all-zero outcomes → actualFrequency = 0 for all populated bins", () => {
    const probs = [0.1, 0.3, 0.5, 0.7, 0.9] as const;
    const outcomes: (0 | 1)[] = [0, 0, 0, 0, 0];
    const bins = reliabilityCurve({ predictedProbs: probs, trueOutcomes: outcomes });
    for (const bin of bins) {
      if (bin.count > 0) {
        expect(bin.actualFrequency).toBe(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// expectedCalibrationError
// ---------------------------------------------------------------------------

describe("expectedCalibrationError", () => {
  it("perfect calibration → ECE ≈ 0", () => {
    // When predictedMean equals actualFrequency in every bin, ECE = 0.
    // Construct: in the [0.4–0.5) bin, use probs all at 0.45, outcomes alternating.
    const probs = new Array<number>(100).fill(0.45);
    const outcomes = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 1 : 0)) as (0 | 1)[];
    // predictedMean = 0.45, actualFrequency = 0.5 — slight mismatch.
    // True perfect calibration: predicted = actual.
    const ece = expectedCalibrationError(probs, outcomes);
    // ECE will be |0.45 - 0.5| = 0.05 since all 100 are in one bin.
    // For a "≈ 0" test, we need actual calibration data.
    // Build: for each bin midpoint b, use 2 samples: p=(b+0.5)/10, outcomes=[0,1] → rate=0.5
    // and predictedMean = (b+0.5)/10. Only the bin where (b+0.5)/10 = 0.5 → b=4 matches.
    // Better: use a single-bin setup where predictedMean = actualFrequency exactly.
    const probs2 = [0.5, 0.5];
    const outcomes2: (0 | 1)[] = [1, 0];
    const ece2 = expectedCalibrationError(probs2, outcomes2, 1);
    // nBins=1: predictedMean=0.5, actualFrequency=0.5 → ECE = 0
    expect(ece2).toBeCloseTo(0, 10);
  });

  it("worst case (all 1.0 predicted, all 0 outcomes) → ECE = 1", () => {
    const probs = [1.0, 1.0, 1.0, 1.0] as const;
    const outcomes: (0 | 1)[] = [0, 0, 0, 0];
    const ece = expectedCalibrationError(probs, outcomes);
    // All land in the last bin. predictedMean=1.0, actualFrequency=0 → gap=1.0 → ECE=1.0
    expect(ece).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for empty inputs", () => {
    expect(expectedCalibrationError([], [])).toBe(0);
  });

  it("ECE is between 0 and 1", () => {
    const probs = [0.2, 0.4, 0.6, 0.8, 0.3, 0.7] as const;
    const outcomes: (0 | 1)[] = [0, 1, 0, 1, 0, 1];
    const ece = expectedCalibrationError(probs, outcomes);
    expect(ece).toBeGreaterThanOrEqual(0);
    expect(ece).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// brierScore
// ---------------------------------------------------------------------------

describe("brierScore", () => {
  it("perfect predictions → Brier score = 0", () => {
    const probs = [1.0, 0.0, 1.0, 0.0] as const;
    const outcomes: (0 | 1)[] = [1, 0, 1, 0];
    expect(brierScore(probs, outcomes)).toBeCloseTo(0, 10);
  });

  it("all wrong predictions → Brier score = 1", () => {
    const probs = [0.0, 1.0, 0.0, 1.0] as const;
    const outcomes: (0 | 1)[] = [1, 0, 1, 0];
    expect(brierScore(probs, outcomes)).toBeCloseTo(1.0, 10);
  });

  it("50/50 random (0.5 always) → Brier score = 0.25", () => {
    const n = 100;
    const probs = new Array<number>(n).fill(0.5);
    const outcomes = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : 0)) as (0 | 1)[];
    // (0.5 - 1)^2 = 0.25, (0.5 - 0)^2 = 0.25 → mean = 0.25
    expect(brierScore(probs, outcomes)).toBeCloseTo(0.25, 10);
  });

  it("returns 0 for empty inputs", () => {
    expect(brierScore([], [])).toBe(0);
  });

  it("Brier score is between 0 and 1 for valid probability inputs", () => {
    const probs = [0.2, 0.4, 0.6, 0.8] as const;
    const outcomes: (0 | 1)[] = [0, 1, 1, 0];
    const bs = brierScore(probs, outcomes);
    expect(bs).toBeGreaterThanOrEqual(0);
    expect(bs).toBeLessThanOrEqual(1);
  });
});
