import { describe, it, expect } from "vitest";

import { KernelError, makeRng } from "../contract.js";
import { brierMurphy } from "../slots/brier-murphy.js";
import { meanBrier } from "../../../certificate/proper-scoring.js";

/** Raw (unbinned) mean Brier, for contrasting against the binned headline. */
function rawBrier(predicted: readonly number[], outcomes: readonly (0 | 1)[]): number {
  return meanBrier(predicted.map((p, i) => ({ p, y: outcomes[i]! })));
}

/** The binned Brier recomputed from scratch, independently of the slot. */
function independentBinnedBrier(
  predicted: readonly number[],
  outcomes: readonly (0 | 1)[],
  bins: number,
): number {
  const sums = Array.from({ length: bins }, () => ({ n: 0, sumP: 0 }));
  const idx = predicted.map((p) => Math.min(bins - 1, Math.floor(p * bins)));
  idx.forEach((b, i) => {
    const bucket = sums[b]!;
    bucket.n += 1;
    bucket.sumP += predicted[i]!;
  });
  let total = 0;
  for (let i = 0; i < predicted.length; i += 1) {
    const bucket = sums[idx[i]!]!;
    const pBar = bucket.sumP / bucket.n;
    total += (pBar - outcomes[i]!) ** 2;
  }
  return total / predicted.length;
}

describe("brierMurphy — the Murphy decomposition identity", () => {
  it("satisfies brier = reliability - resolution + uncertainty on a hand-checked case", () => {
    // bins = 2. bin0 = {0.1, 0.3}: p̄ = 0.2, ō = 0.5. bin1 = {0.6, 0.9}: p̄ = 0.75, ō = 0.5.
    // ō = 0.5, so resolution = 0; reliability = (2·0.3² + 2·0.25²)/4 = 0.07625.
    // Binned Brier = [(0.2-0)² + (0.2-1)² + (0.75-0)² + (0.75-1)²] / 4 = 1.305/4.
    const predicted = [0.1, 0.3, 0.6, 0.9];
    const outcomes: (0 | 1)[] = [0, 1, 0, 1];
    const d = brierMurphy(predicted, outcomes, 2);

    expect(d.reliability).toBeCloseTo(0.07625, 15);
    expect(d.resolution).toBeCloseTo(0, 15);
    expect(d.uncertainty).toBeCloseTo(0.25, 15);
    expect(d.brier).toBeCloseTo(0.32625, 15);
    expect(d.brier).toBeCloseTo(d.reliability - d.resolution + d.uncertainty, 15);
  });

  it("holds to ~1e-12 across many pseudo-random datasets and bin counts", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const rng = makeRng(seed);
      const n = 40 + (seed % 17);
      const predicted: number[] = [];
      const outcomes: (0 | 1)[] = [];
      for (let i = 0; i < n; i += 1) {
        const p = rng();
        predicted.push(p);
        outcomes.push(rng() < p ? 1 : 0);
      }
      for (const bins of [2, 3, 5, 10, 37]) {
        const d = brierMurphy(predicted, outcomes, bins);
        const residual = d.brier - (d.reliability - d.resolution + d.uncertainty);
        expect(Math.abs(residual)).toBeLessThan(1e-12);
      }
    }
  });

  it("returns the BINNED Brier as the headline, matching an independent recomputation", () => {
    const rng = makeRng(4242);
    const predicted = Array.from({ length: 200 }, () => rng());
    const outcomes: (0 | 1)[] = predicted.map((p) => (rng() < p ? 1 : 0));

    for (const bins of [2, 4, 10]) {
      const d = brierMurphy(predicted, outcomes, bins);
      expect(d.brier).toBeCloseTo(independentBinnedBrier(predicted, outcomes, bins), 14);
    }
  });

  it("relates to the raw Brier by rawBrier = binnedBrier + withinVar - 2*withinCov", () => {
    // Binning is not a bound in either direction: it discards the within-bin
    // discrimination captured by the covariance term. The relation below is an
    // exact algebraic identity, so it is asserted to floating-point precision.
    for (const seed of [99, 1234, 555]) {
      const rng = makeRng(seed);
      const predicted = Array.from({ length: 300 }, () => rng());
      const outcomes: (0 | 1)[] = predicted.map((p) => (rng() < p ? 1 : 0));

      for (const bins of [2, 5, 10]) {
        const d = brierMurphy(predicted, outcomes, bins);
        const raw = rawBrier(predicted, outcomes);

        const sums = Array.from({ length: bins }, () => ({ n: 0, sumP: 0, sumY: 0 }));
        const idx = predicted.map((p) => Math.min(bins - 1, Math.floor(p * bins)));
        idx.forEach((b, i) => {
          const bucket = sums[b]!;
          bucket.n += 1;
          bucket.sumP += predicted[i]!;
          bucket.sumY += outcomes[i]!;
        });

        let withinVar = 0;
        let withinCov = 0;
        for (let i = 0; i < predicted.length; i += 1) {
          const bucket = sums[idx[i]!]!;
          const dp = predicted[i]! - bucket.sumP / bucket.n;
          const dy = outcomes[i]! - bucket.sumY / bucket.n;
          withinVar += dp * dp;
          withinCov += dp * dy;
        }
        withinVar /= predicted.length;
        withinCov /= predicted.length;

        expect(raw).toBeCloseTo(d.brier + withinVar - 2 * withinCov, 12);
      }
    }
  });

  it("binning can make the score WORSE than raw when a bin resolves internally", () => {
    // Inside the single occupied bin (bins = 2) the forecast is perfectly
    // informative, so the raw score is 0 while the binned score is not.
    const predicted = [0.0, 0.49];
    const outcomes: (0 | 1)[] = [0, 1];
    const d = brierMurphy(predicted, outcomes, 2);
    expect(rawBrier(predicted, outcomes)).toBeCloseTo(0.2601 / 2, 15);
    // p̄ = 0.245 → binned Brier = (0.245² + 0.755²)/2
    expect(d.brier).toBeCloseTo((0.245 ** 2 + 0.755 ** 2) / 2, 14);
    expect(d.brier).toBeGreaterThan(rawBrier(predicted, outcomes));
  });

  it("converges to the raw Brier when every distinct forecast owns its own bin", () => {
    // Forecasts sit exactly at distinct bin centres, so p̄_b = p_i for every i.
    const predicted = [0.05, 0.25, 0.45, 0.65, 0.85];
    const outcomes: (0 | 1)[] = [0, 0, 1, 1, 1];
    const d = brierMurphy(predicted, outcomes, 10);
    expect(d.brier).toBeCloseTo(rawBrier(predicted, outcomes), 15);
  });
});

describe("brierMurphy — closed-form component values", () => {
  it("a perfectly calibrated forecaster has exactly zero reliability (closed form for all four terms)", () => {
    // Bin centres 0.05 … 0.95, 100 observations each, with the observed
    // frequency set exactly equal to the forecast. Then:
    //   reliability = 0
    //   uncertainty = ō(1 − ō) = 0.5 · 0.5 = 0.25
    //   resolution  = mean_b (p_b − 0.5)² = 0.0825
    //   brier       = mean_b p_b(1 − p_b) = 0.1675
    const predicted: number[] = [];
    const outcomes: (0 | 1)[] = [];
    for (let b = 0; b < 10; b += 1) {
      const p = (b + 0.5) / 10;
      const ones = Math.round(p * 100);
      for (let i = 0; i < 100; i += 1) {
        predicted.push(p);
        outcomes.push(i < ones ? 1 : 0);
      }
    }
    const d = brierMurphy(predicted, outcomes);

    expect(d.reliability).toBeLessThan(1e-15);
    expect(d.uncertainty).toBeCloseTo(0.25, 14);
    expect(d.resolution).toBeCloseTo(0.0825, 14);
    expect(d.brier).toBeCloseTo(0.1675, 14);
    // Here the forecasts are constant within each bin, so binned == raw.
    expect(d.brier).toBeCloseTo(rawBrier(predicted, outcomes), 14);
  });

  it("a constant forecast at the base rate has zero resolution and zero reliability", () => {
    // 100 forecasts of 0.4 with exactly 40 successes: one occupied bin, p̄ = ō = ō_b.
    const predicted = Array.from({ length: 100 }, () => 0.4);
    const outcomes: (0 | 1)[] = Array.from({ length: 100 }, (_, i) => (i < 40 ? 1 : 0));
    const d = brierMurphy(predicted, outcomes);

    expect(d.resolution).toBe(0);
    expect(d.reliability).toBeLessThan(1e-30);
    expect(d.uncertainty).toBeCloseTo(0.24, 15);
    expect(d.brier).toBeCloseTo(0.24, 14);
  });

  it("a constant forecast away from the base rate keeps zero resolution but gains reliability", () => {
    const predicted = Array.from({ length: 100 }, () => 0.9);
    const outcomes: (0 | 1)[] = Array.from({ length: 100 }, (_, i) => (i < 40 ? 1 : 0));
    const d = brierMurphy(predicted, outcomes);

    expect(d.resolution).toBe(0);
    // (0.9 − 0.4)² = 0.25
    expect(d.reliability).toBeCloseTo(0.25, 14);
    expect(d.uncertainty).toBeCloseTo(0.24, 15);
    expect(d.brier).toBeCloseTo(0.49, 14);
  });

  it("a perfect 0/1 forecaster scores brier 0 with resolution equal to uncertainty", () => {
    const outcomes: (0 | 1)[] = [1, 0, 1, 1, 0, 0, 1, 0, 0, 0];
    const predicted = outcomes.map((y) => (y === 1 ? 1 : 0));
    const d = brierMurphy(predicted, outcomes);

    expect(d.brier).toBeCloseTo(0, 15);
    expect(d.reliability).toBeCloseTo(0, 15);
    // ō = 0.4 → uncertainty 0.24, and for a perfect forecaster resolution = ō(1−ō).
    expect(d.uncertainty).toBeCloseTo(0.24, 15);
    expect(d.resolution).toBeCloseTo(0.24, 14);
  });

  it("an anti-perfect forecaster scores brier 1", () => {
    const outcomes: (0 | 1)[] = [1, 0, 1, 0];
    const predicted = outcomes.map((y) => (y === 1 ? 0 : 1));
    const d = brierMurphy(predicted, outcomes);

    expect(d.brier).toBeCloseTo(1, 14);
    // ō_b is the exact opposite of p̄_b in each bin → reliability = 1.
    expect(d.reliability).toBeCloseTo(1, 14);
    expect(d.resolution).toBeCloseTo(0.25, 14);
    expect(d.uncertainty).toBeCloseTo(0.25, 15);
  });
});

describe("brierMurphy — edge cases", () => {
  it("handles a single observation: resolution and uncertainty vanish", () => {
    const d = brierMurphy([0.3], [1]);
    expect(d.brier).toBeCloseTo(0.49, 15);
    expect(d.reliability).toBeCloseTo(0.49, 15);
    expect(d.resolution).toBe(0);
    expect(d.uncertainty).toBe(0);
  });

  it("handles all-identical outcomes: uncertainty and resolution are exactly zero", () => {
    const predicted = [0.2, 0.5, 0.8, 0.95];
    const outcomes: (0 | 1)[] = [1, 1, 1, 1];
    const d = brierMurphy(predicted, outcomes);

    expect(d.uncertainty).toBe(0);
    expect(d.resolution).toBe(0);
    // Every forecast alone in its bin → reliability = raw Brier.
    const expected = predicted.reduce((s, p) => s + (p - 1) ** 2, 0) / 4;
    expect(d.reliability).toBeCloseTo(expected, 15);
    expect(d.brier).toBeCloseTo(expected, 15);
  });

  it("handles all-identical forecasts (single occupied bin)", () => {
    const d = brierMurphy([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0]);
    expect(d.resolution).toBe(0);
    expect(d.reliability).toBe(0);
    expect(d.uncertainty).toBeCloseTo(0.25, 15);
    expect(d.brier).toBeCloseTo(0.25, 15);
  });

  it("places boundary probabilities 0 and 1 in the first and last bins", () => {
    // p = 1 must not fall outside the bin array; it belongs to bin B−1.
    const d = brierMurphy([1, 1], [1, 0]);
    expect(d.reliability).toBeCloseTo(0.25, 15);
    expect(d.resolution).toBe(0);
    expect(d.uncertainty).toBeCloseTo(0.25, 15);
    expect(d.brier).toBeCloseTo(0.5, 15);

    const zero = brierMurphy([0, 0], [1, 0]);
    expect(zero.reliability).toBeCloseTo(0.25, 15);
    expect(zero.brier).toBeCloseTo(0.5, 15);
  });

  it("bin edges are half-open on the right: 0.1 lands in bin 1, not bin 0 (bins = 10)", () => {
    // Forecasts 0.09 and 0.1 land in different bins, so each is its own bin mean
    // and the binned Brier equals the raw Brier.
    const predicted = [0.09, 0.1];
    const outcomes: (0 | 1)[] = [0, 0];
    const d = brierMurphy(predicted, outcomes, 10);
    expect(d.brier).toBeCloseTo((0.09 ** 2 + 0.1 ** 2) / 2, 15);
    // If both had shared a bin, p̄ = 0.095 and the score would be 0.095² = 0.009025.
    expect(d.brier).not.toBeCloseTo(0.009025, 12);
  });

  it("empty bins contribute nothing — extra unused bins do not change the result", () => {
    const predicted = [0.05, 0.15, 0.25];
    const outcomes: (0 | 1)[] = [0, 1, 0];
    const a = brierMurphy(predicted, outcomes, 10);
    const b = brierMurphy(predicted, outcomes, 1000);
    expect(b.brier).toBeCloseTo(a.brier, 15);
    expect(b.reliability).toBeCloseTo(a.reliability, 15);
    expect(b.resolution).toBeCloseTo(a.resolution, 15);
    expect(b.uncertainty).toBeCloseTo(a.uncertainty, 15);
  });

  it("defaults to 10 bins", () => {
    const rng = makeRng(7);
    const predicted = Array.from({ length: 120 }, () => rng());
    const outcomes: (0 | 1)[] = predicted.map((p) => (rng() < p ? 1 : 0));
    expect(brierMurphy(predicted, outcomes)).toEqual(brierMurphy(predicted, outcomes, 10));
  });

  it("is pure: it does not mutate its inputs", () => {
    const predicted = [0.1, 0.4, 0.9];
    const outcomes: (0 | 1)[] = [0, 1, 1];
    const pCopy = [...predicted];
    const yCopy = [...outcomes];
    brierMurphy(predicted, outcomes, 4);
    expect(predicted).toEqual(pCopy);
    expect(outcomes).toEqual(yCopy);
  });

  it("uncertainty depends only on the base rate, never on the forecast", () => {
    const outcomes: (0 | 1)[] = [1, 1, 0, 0, 0, 1, 0, 0];
    const a = brierMurphy([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], outcomes);
    const b = brierMurphy([0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9], outcomes);
    expect(a.uncertainty).toBe(b.uncertainty);
    expect(a.uncertainty).toBeCloseTo((3 / 8) * (5 / 8), 15);
  });
});

describe("brierMurphy — fail-closed behaviour", () => {
  const expectCode = (fn: () => unknown, code: string): void => {
    let caught: unknown;
    try {
      fn();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe(code);
  };

  it("throws MISMATCHED_LENGTH when the arrays do not align", () => {
    expectCode(() => brierMurphy([0.5, 0.5], [1]), "MISMATCHED_LENGTH");
    expectCode(() => brierMurphy([0.5], []), "MISMATCHED_LENGTH");
    expectCode(() => brierMurphy([], [1]), "MISMATCHED_LENGTH");
  });

  it("throws EMPTY when both arrays are empty", () => {
    expectCode(() => brierMurphy([], []), "EMPTY");
  });

  it("throws DOMAIN for a probability outside [0, 1]", () => {
    expectCode(() => brierMurphy([0.5, 1.5], [1, 0]), "DOMAIN");
    expectCode(() => brierMurphy([-0.001, 0.5], [1, 0]), "DOMAIN");
  });

  it("throws NOT_FINITE for a non-finite probability", () => {
    expectCode(() => brierMurphy([Number.NaN], [1]), "NOT_FINITE");
    expectCode(() => brierMurphy([Number.POSITIVE_INFINITY], [1]), "NOT_FINITE");
  });

  it("throws DOMAIN for an outcome that is not 0 or 1", () => {
    expectCode(() => brierMurphy([0.5, 0.5], [1, 2 as unknown as 0 | 1]), "DOMAIN");
    expectCode(() => brierMurphy([0.5], [0.5 as unknown as 0 | 1]), "DOMAIN");
    expectCode(() => brierMurphy([0.5], [-1 as unknown as 0 | 1]), "DOMAIN");
  });

  it("throws NOT_FINITE for a non-finite outcome", () => {
    expectCode(() => brierMurphy([0.5], [Number.NaN as unknown as 0 | 1]), "NOT_FINITE");
  });

  it("throws DOMAIN for bins < 2 or non-integer bins", () => {
    expectCode(() => brierMurphy([0.5], [1], 1), "DOMAIN");
    expectCode(() => brierMurphy([0.5], [1], 0), "DOMAIN");
    expectCode(() => brierMurphy([0.5], [1], -3), "DOMAIN");
    expectCode(() => brierMurphy([0.5], [1], 2.5), "DOMAIN");
  });

  it("throws NOT_FINITE for non-finite bins", () => {
    expectCode(() => brierMurphy([0.5], [1], Number.NaN), "NOT_FINITE");
    expectCode(() => brierMurphy([0.5], [1], Number.POSITIVE_INFINITY), "NOT_FINITE");
  });

  it("never returns NaN, even for degenerate all-zero / all-one inputs", () => {
    for (const [p, y] of [
      [[0, 0], [0, 0]],
      [[1, 1], [1, 1]],
      [[0, 1], [1, 0]],
    ] as const) {
      const d = brierMurphy([...p], [...y] as (0 | 1)[]);
      expect(Number.isFinite(d.brier)).toBe(true);
      expect(Number.isFinite(d.reliability)).toBe(true);
      expect(Number.isFinite(d.resolution)).toBe(true);
      expect(Number.isFinite(d.uncertainty)).toBe(true);
    }
  });
});

describe("brierMurphy — determinism", () => {
  it("is deterministic for identical inputs", () => {
    const rng = makeRng(2024);
    const predicted = Array.from({ length: 150 }, () => rng());
    const outcomes: (0 | 1)[] = predicted.map((p) => (rng() < p ? 1 : 0));
    const a = brierMurphy(predicted, outcomes, 8);
    const b = brierMurphy([...predicted], [...outcomes], 8);
    expect(a).toEqual(b);
  });
});
