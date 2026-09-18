import { describe, it, expect } from "vitest";
import {
  jackknifePlusInterval,
  jackknifePlusCoverageFloor,
  jackknifePlusMinimumN,
  isFiniteJackknifePlusInterval,
} from "../calibration/jackknife-plus.js";

/** Deterministic LCG so the coverage simulation is reproducible. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Box-Muller on a seeded uniform stream. */
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

describe("Jackknife+ coverage is 1 - 2*alpha, and the module refuses to say otherwise", () => {
  it("reports 1 - 2*alpha, NOT 1 - alpha", () => {
    // The entire reason this module exists. At alpha 0.10 the guarantee is 80%,
    // and 90% is the number practitioners write by mistake.
    expect(jackknifePlusCoverageFloor(0.1)).toBeCloseTo(0.8, 12);
    expect(jackknifePlusCoverageFloor(0.1)).not.toBeCloseTo(0.9, 6);
    expect(jackknifePlusCoverageFloor(0.05)).toBeCloseTo(0.9, 12);
  });

  it("exposes no field carrying the 1 - alpha figure", () => {
    const interval = jackknifePlusInterval({
      looPredictionsAtTest: Array.from({ length: 19 }, () => 10),
      looResiduals: Array.from({ length: 19 }, (_, i) => i + 1),
      alpha: 0.1,
    });
    expect(interval).not.toBeNull();
    // Double assertion through `unknown` on purpose: the test must enumerate
    // EVERY field, including ones added later, or it stops guarding anything.
    const values = Object.values(interval as unknown as Record<string, unknown>).filter(
      (v): v is number => typeof v === "number",
    );
    // 0.9 must appear nowhere in the returned object at alpha = 0.1.
    expect(values.some((v) => Math.abs(v - 0.9) < 1e-9)).toBe(false);
    expect((interval as { coverageFloor: number }).coverageFloor).toBeCloseTo(0.8, 12);
  });
});

describe("Jackknife+ order statistics (hand computed)", () => {
  it("selects the exact ranks the theorem names", () => {
    // n = 9, alpha = 0.1.
    // lower rank = floor(0.1 * 10) = 1, upper rank = ceil(0.9 * 10) = 9.
    // lower candidates {10 - r} sorted ascending = [1..9]; 1st smallest = 1.
    // upper candidates {10 + r} sorted ascending = [11..19]; 9th smallest = 19.
    const interval = jackknifePlusInterval({
      looPredictionsAtTest: Array.from({ length: 9 }, () => 10),
      looResiduals: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      alpha: 0.1,
    });
    expect(interval).not.toBeNull();
    expect(interval?.lowerRank).toBe(1);
    expect(interval?.upperRank).toBe(9);
    expect(interval?.lower).toBe(1);
    expect(interval?.upper).toBe(19);
    expect(interval?.refusedBound).toBe("none");
    expect(isFiniteJackknifePlusInterval(interval!)).toBe(true);
  });

  it("widens when the leave-one-out residuals grow", () => {
    const base = Array.from({ length: 19 }, () => 0);
    const tight = jackknifePlusInterval({
      looPredictionsAtTest: base,
      looResiduals: base.map(() => 1),
      alpha: 0.1,
    });
    const loose = jackknifePlusInterval({
      looPredictionsAtTest: base,
      looResiduals: base.map(() => 5),
      alpha: 0.1,
    });
    expect((loose!.upper - loose!.lower)).toBeGreaterThan(tight!.upper - tight!.lower);
  });
});

describe("scarce samples return infinity, never a clamp", () => {
  it("refuses BOTH bounds at n = 5, alpha = 0.10 (the fake-tightness case)", () => {
    // lower rank = floor(0.1 * 6) = 0 -> no such order statistic.
    // upper rank = ceil(0.9 * 6) = 6 > n = 5 -> no such order statistic.
    // A clamp here would return [min, max] of the candidates: finite, tight,
    // and delivering 83.33% coverage behind a label that claims more.
    const interval = jackknifePlusInterval({
      looPredictionsAtTest: [10, 10, 10, 10, 10],
      looResiduals: [1, 2, 3, 4, 5],
      alpha: 0.1,
    });
    expect(interval).not.toBeNull();
    expect(interval?.refusedBound).toBe("both");
    expect(interval?.lower).toBe(Number.NEGATIVE_INFINITY);
    expect(interval?.upper).toBe(Number.POSITIVE_INFINITY);
    expect(isFiniteJackknifePlusInterval(interval!)).toBe(false);
    // And it never silently returns the observed extremes.
    expect(interval?.lower).not.toBe(5);
    expect(interval?.upper).not.toBe(15);
  });

  it("names the smallest n that would work instead of guessing", () => {
    expect(jackknifePlusMinimumN(0.1)).toBe(9);
    expect(jackknifePlusMinimumN(0.05)).toBe(19);
    const interval = jackknifePlusInterval({
      looPredictionsAtTest: [1, 2, 3],
      looResiduals: [1, 1, 1],
      alpha: 0.1,
    });
    expect(interval?.minimumNForFiniteInterval).toBe(9);
  });

  it("becomes finite exactly at the reported minimum n", () => {
    const at8 = jackknifePlusInterval({
      looPredictionsAtTest: Array.from({ length: 8 }, () => 0),
      looResiduals: Array.from({ length: 8 }, () => 1),
      alpha: 0.1,
    });
    const at9 = jackknifePlusInterval({
      looPredictionsAtTest: Array.from({ length: 9 }, () => 0),
      looResiduals: Array.from({ length: 9 }, () => 1),
      alpha: 0.1,
    });
    expect(isFiniteJackknifePlusInterval(at8!)).toBe(false);
    expect(isFiniteJackknifePlusInterval(at9!)).toBe(true);
  });
});

describe("malformed input is refused with null, scarce data is not", () => {
  it("refuses alpha outside (0, 0.5), where 1 - 2*alpha claims nothing", () => {
    const args = { looPredictionsAtTest: [1, 2, 3], looResiduals: [1, 1, 1] };
    expect(jackknifePlusInterval({ ...args, alpha: 0.5 })).toBeNull();
    expect(jackknifePlusInterval({ ...args, alpha: 0.7 })).toBeNull();
    expect(jackknifePlusInterval({ ...args, alpha: 0 })).toBeNull();
    expect(jackknifePlusInterval({ ...args, alpha: Number.NaN })).toBeNull();
  });

  it("refuses mismatched lengths, empty sets, non-finite values, negative residuals", () => {
    expect(
      jackknifePlusInterval({ looPredictionsAtTest: [1, 2], looResiduals: [1], alpha: 0.1 }),
    ).toBeNull();
    expect(jackknifePlusInterval({ looPredictionsAtTest: [], looResiduals: [], alpha: 0.1 })).toBeNull();
    expect(
      jackknifePlusInterval({ looPredictionsAtTest: [1, Number.NaN], looResiduals: [1, 1], alpha: 0.1 }),
    ).toBeNull();
    expect(
      jackknifePlusInterval({ looPredictionsAtTest: [1, 2], looResiduals: [1, -1], alpha: 0.1 }),
    ).toBeNull();
  });

  it("distinguishes 'malformed' (null) from 'too few rows' (an infinite bound)", () => {
    // Scarcity must never be swallowed as an error. It is a finding.
    const scarce = jackknifePlusInterval({
      looPredictionsAtTest: [1, 2, 3],
      looResiduals: [1, 1, 1],
      alpha: 0.1,
    });
    expect(scarce).not.toBeNull();
    expect(scarce?.refusedBound).toBe("both");
  });
});

describe("empirical coverage meets the 1 - 2*alpha floor", () => {
  it("covers at least 1 - 2*alpha over exchangeable draws", () => {
    const alpha = 0.1;
    const n = 20;
    const trials = 400;
    const rand = lcg(20260918);
    let covered = 0;

    for (let t = 0; t < trials; t += 1) {
      const y = Array.from({ length: n }, () => gaussian(rand));
      const yTest = gaussian(rand);
      const total = y.reduce((a, b) => a + b, 0);

      // Leave-one-out constant predictor: mu_{-i} = mean of y without i.
      // With no covariate, its prediction at the test point is that same mean.
      const looPredictionsAtTest = y.map((_, i) => (total - (y[i] as number)) / (n - 1));
      const looResiduals = y.map((yi, i) => Math.abs(yi - (looPredictionsAtTest[i] as number)));

      const interval = jackknifePlusInterval({ looPredictionsAtTest, looResiduals, alpha });
      expect(interval).not.toBeNull();
      if (yTest >= interval!.lower && yTest <= interval!.upper) covered += 1;
    }

    const empirical = covered / trials;
    // The theorem's floor. Jackknife+ is conservative in practice, so this
    // should clear comfortably; the assertion is the floor, not the typical.
    expect(empirical).toBeGreaterThanOrEqual(1 - 2 * alpha);
  });
});
