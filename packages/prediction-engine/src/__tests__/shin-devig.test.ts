import { describe, expect, it } from "vitest";
import { shinDevig, gotoConversion, impliedFromDecimalOdds, powerDevig } from "../shin-devig.js";

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe("impliedFromDecimalOdds", () => {
  it("inverts decimal odds", () => {
    const implied = impliedFromDecimalOdds([2, 4]);
    expect(implied[0]).toBeCloseTo(0.5, 6);
    expect(implied[1]).toBeCloseTo(0.25, 6);
  });
});

describe("shinDevig", () => {
  it("returns fair probabilities that sum to 1 and preserve ordering (2-way)", () => {
    const raw = impliedFromDecimalOdds([1.5, 2.5]); // favourite + dog, with margin
    const { probabilities, z, booksum } = shinDevig(raw);
    expect(sum(probabilities)).toBeCloseTo(1, 5);
    expect(probabilities[0]!).toBeGreaterThan(probabilities[1]!); // favourite stays the favourite
    expect(probabilities[0]!).toBeLessThan(1);
    expect(probabilities[1]!).toBeGreaterThan(0);
    expect(z).toBeGreaterThan(0);
    expect(z).toBeLessThan(0.5);
    expect(booksum).toBeGreaterThan(1);
  });

  it("leaves a margin-free book unchanged with z = 0", () => {
    const { probabilities, z } = shinDevig([0.5, 0.5]);
    expect(probabilities).toEqual([0.5, 0.5]);
    expect(z).toBe(0);
  });

  it("handles a 3-way (1X2) market", () => {
    const raw = impliedFromDecimalOdds([2.0, 3.5, 4.0]);
    const { probabilities } = shinDevig(raw);
    expect(sum(probabilities)).toBeCloseTo(1, 5);
    expect(probabilities[0]!).toBeGreaterThan(probabilities[1]!);
    expect(probabilities[1]!).toBeGreaterThan(probabilities[2]!);
  });

  it("differs from naive proportional de-vig (corrects fav–longshot bias)", () => {
    const raw = impliedFromDecimalOdds([1.5, 2.5]);
    const booksum = sum(raw);
    const proportional = raw.map((p) => p / booksum);
    const { probabilities } = shinDevig(raw);
    expect(probabilities[0]!).not.toBeCloseTo(proportional[0]!, 4);
  });
});

describe("gotoConversion", () => {
  it("returns fair probabilities summing to 1 with ordering preserved", () => {
    const raw = impliedFromDecimalOdds([1.5, 2.5]);
    const fair = gotoConversion(raw);
    expect(sum(fair)).toBeCloseTo(1, 5);
    expect(fair[0]!).toBeGreaterThan(fair[1]!);
    expect(fair[0]!).toBeLessThan(1);
    expect(fair[1]!).toBeGreaterThan(0);
  });

  it("leaves a margin-free book unchanged", () => {
    expect(gotoConversion([0.5, 0.5])).toEqual([0.5, 0.5]);
  });

  it("handles a 3-way market and differs from proportional", () => {
    const raw = impliedFromDecimalOdds([2.0, 3.5, 4.0]);
    const fair = gotoConversion(raw);
    expect(sum(fair)).toBeCloseTo(1, 5);
    const booksum = sum(raw);
    expect(fair[0]!).not.toBeCloseTo(raw[0]! / booksum, 4);
  });
});

describe("powerDevig", () => {
  it("returns fair probabilities that sum to 1 with k > 1 on an overround book", () => {
    const raw = impliedFromDecimalOdds([1.5, 2.5]);
    const { probabilities, k, booksum } = powerDevig(raw);
    expect(sum(probabilities)).toBeCloseTo(1, 5);
    expect(k).toBeGreaterThan(1);
    expect(booksum).toBeGreaterThan(1);
    expect(probabilities[0]!).toBeGreaterThan(probabilities[1]!);
  });

  it("leaves a margin-free book unchanged with k = 1", () => {
    const { probabilities, k } = powerDevig([0.5, 0.5]);
    expect(probabilities).toEqual([0.5, 0.5]);
    expect(k).toBe(1);
  });

  it("shrinks the longshot more than multiplicative (Hegarty-style honesty)", () => {
    const raw = impliedFromDecimalOdds([1.15, 6.0]); // heavy favourite + longshot, with juice
    const booksum = sum(raw);
    const multiplicative = raw.map((p) => p / booksum);
    const { probabilities } = powerDevig(raw);
    // Power (k>1) penalises the longshot relative to proportional de-vig.
    expect(probabilities[1]!).toBeLessThan(multiplicative[1]!);
    expect(probabilities[0]!).toBeGreaterThan(multiplicative[0]!);
  });

  it("handles a 3-way market and refuses non-finite / negative input", () => {
    const raw = impliedFromDecimalOdds([2.0, 3.5, 4.0]);
    const { probabilities } = powerDevig(raw);
    expect(sum(probabilities)).toBeCloseTo(1, 5);
    expect(powerDevig([-0.1, 0.5]).k).toBe(0);
    expect(powerDevig([]).probabilities).toEqual([]);
  });
});
