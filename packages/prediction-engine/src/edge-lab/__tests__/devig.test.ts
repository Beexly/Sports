import { describe, expect, it } from "vitest";
import { impliedFromDecimal, proportionalDevig, shinDevig } from "../devig.js";

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe("impliedFromDecimal", () => {
  it("inverts a decimal price", () => {
    expect(impliedFromDecimal(2)).toBeCloseTo(0.5, 10);
    expect(impliedFromDecimal(4)).toBeCloseTo(0.25, 10);
  });

  it("is guarded against non-finite and non-positive input", () => {
    expect(Number.isNaN(impliedFromDecimal(0))).toBe(true);
    expect(Number.isNaN(impliedFromDecimal(-1.5))).toBe(true);
    expect(Number.isNaN(impliedFromDecimal(Infinity))).toBe(true);
    expect(Number.isNaN(impliedFromDecimal(NaN))).toBe(true);
  });
});

describe("proportionalDevig", () => {
  it("splits a balanced two-way book 50/50", () => {
    const probs = proportionalDevig([1.91, 1.91]);
    expect(probs).not.toBeNull();
    expect(probs![0]!).toBeCloseTo(0.5, 6);
    expect(probs![1]!).toBeCloseTo(0.5, 6);
    expect(sum(probs!)).toBeCloseTo(1, 10);
  });

  it("sums to 1 and preserves ordering on an unbalanced book", () => {
    const probs = proportionalDevig([1.87, 1.95]);
    expect(probs).not.toBeNull();
    expect(sum(probs!)).toBeCloseTo(1, 10);
    // 1.87 is the shorter (favourite) price -> higher implied probability.
    expect(probs![0]!).toBeGreaterThan(probs![1]!);
    expect(probs![0]!).toBeCloseTo(1 / 1.87 / (1 / 1.87 + 1 / 1.95), 10);
  });

  it("computes the overround correctly", () => {
    const decimalOdds = [1.87, 1.95];
    const overround = 1 / decimalOdds[0]! + 1 / decimalOdds[1]!;
    expect(overround).toBeGreaterThan(1);
    const probs = proportionalDevig(decimalOdds)!;
    // Each fair prob = raw implied / overround.
    expect(probs[0]!).toBeCloseTo(1 / decimalOdds[0]! / overround, 10);
    expect(probs[1]!).toBeCloseTo(1 / decimalOdds[1]! / overround, 10);
  });

  it("refuses a sub-vig (crossed/stale) market", () => {
    // implied sum = 1/2.10 + 1/2.10 = 0.952381 < 1.
    expect(proportionalDevig([2.1, 2.1])).toBeNull();
  });

  it("refuses invalid prices", () => {
    expect(proportionalDevig([1, 2])).toBeNull(); // d <= 1
    expect(proportionalDevig([0.5, 2])).toBeNull(); // d <= 1
    expect(proportionalDevig([Infinity, 2])).toBeNull(); // non-finite
    expect(proportionalDevig([NaN, 2])).toBeNull(); // non-finite
    expect(proportionalDevig([])).toBeNull(); // empty market
  });

  it("handles a 3-way market", () => {
    const probs = proportionalDevig([2.5, 3.2, 2.9]);
    expect(probs).not.toBeNull();
    expect(sum(probs!)).toBeCloseTo(1, 10);
    expect(probs!.every((p) => p > 0 && p < 1)).toBe(true);
  });
});

describe("shinDevig", () => {
  it("fits z ~ 0 on a vig-free book and returns the raw implied probabilities", () => {
    // 1/1.20 + 1/6.00 = 0.833333... + 0.166667... = 1 exactly: a genuinely
    // fair (margin-free) book.
    const result = shinDevig([1.2, 6.0]);
    expect(result).not.toBeNull();
    expect(result!.z).toBeCloseTo(0, 6);
    expect(result!.probs[0]!).toBeCloseTo(1 / 1.2, 6);
    expect(result!.probs[1]!).toBeCloseTo(1 / 6.0, 6);
  });

  it("moves the longshot probability DOWN relative to proportional on a longshot-heavy vigged book", () => {
    // A favourite/longshot book with real margin: implied sum
    // 1/1.15 + 1/6.00 = 1.036232... (~3.6% overround).
    const decimalOdds = [1.15, 6.0];
    const proportional = proportionalDevig(decimalOdds)!;
    const shin = shinDevig(decimalOdds)!;

    expect(shin.z).toBeGreaterThan(0);
    // The favourite-longshot correction: Shin attributes more of the
    // overround to the longshot, so its fair probability comes in BELOW
    // the proportional split (and the favourite's comes in above it).
    expect(shin.probs[1]!).toBeLessThan(proportional[1]!);
    expect(shin.probs[0]!).toBeGreaterThan(proportional[0]!);
  });

  it("always sums to 1 within 1e-8", () => {
    for (const decimalOdds of [
      [1.91, 1.91],
      [1.87, 1.95],
      [1.15, 6.0],
      [1.2, 5.5],
      [2.5, 3.2, 2.9],
    ]) {
      const result = shinDevig(decimalOdds)!;
      expect(result).not.toBeNull();
      expect(sum(result.probs)).toBeCloseTo(1, 8);
    }
  });

  it("refuses a sub-vig (crossed/stale) market", () => {
    expect(shinDevig([2.1, 2.1])).toBeNull();
  });

  it("refuses invalid prices", () => {
    expect(shinDevig([1, 2])).toBeNull();
    expect(shinDevig([0.5, 2])).toBeNull();
    expect(shinDevig([Infinity, 2])).toBeNull();
    expect(shinDevig([NaN, 2])).toBeNull();
    expect(shinDevig([])).toBeNull();
  });

  it("handles a 3-way market", () => {
    // decimal odds 2.5 / 3.2 / 2.9 -> raw implied 0.400 / 0.3125 / 0.34483,
    // so the favourite/longshot ranking is index 0 > index 2 > index 1.
    const decimalOdds = [2.5, 3.2, 2.9];
    const result = shinDevig(decimalOdds);
    expect(result).not.toBeNull();
    expect(sum(result!.probs)).toBeCloseTo(1, 8);
    expect(result!.z).toBeGreaterThan(0);
    expect(result!.probs[0]!).toBeGreaterThan(result!.probs[2]!);
    expect(result!.probs[2]!).toBeGreaterThan(result!.probs[1]!);
    // Ordering matches the proportional split's own ranking too.
    const proportional = proportionalDevig(decimalOdds)!;
    expect(proportional[0]!).toBeGreaterThan(proportional[2]!);
    expect(proportional[2]!).toBeGreaterThan(proportional[1]!);
  });
});
