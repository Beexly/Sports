import { describe, it, expect } from "vitest";
import {
  tuneGroupedWeights,
  pointBiserial,
  multiplierFrom,
  type GroupedObservation,
} from "../tune-signal-weights-grouped.js";
import {
  pointBiserial as naivePointBiserial,
  correlationToMultiplier,
  MIN_SAMPLES,
} from "../tune-signal-weights.js";

/** Deterministic: no Math.random, so these cannot flake. */
function obs(
  key: string,
  clusterKey: string,
  value: number,
  outcome: 0 | 1,
): GroupedObservation {
  return { key, clusterKey, value, outcome };
}

/**
 * Build a sample where ONE key is genuinely predictive but its rows are a
 * handful of fixtures restated many times — the exact shape of the repo's
 * fixture triplication plus the same-selection-published-per-series pattern.
 */
function clustered(
  key: string,
  fixtures: number,
  dupPerFixture: number,
  wonValue: number,
  lostValue: number,
): GroupedObservation[] {
  const rows: GroupedObservation[] = [];
  for (let f = 0; f < fixtures; f++) {
    const won = f % 2 === 0;
    for (let d = 0; d < dupPerFixture; d++) {
      rows.push(obs(key, `fx-${f}`, won ? wonValue : lostValue, won ? 1 : 0));
    }
  }
  return rows;
}

describe("parity with #924's tuner", () => {
  it("computes the SAME correlation as #924 on the same values", () => {
    const values = [0.1, 0.5, 0.9, 0.95, 0.2, 0.4];
    const outcomes: (0 | 1)[] = [0, 0, 1, 1, 0, 1];
    expect(pointBiserial(values, outcomes)).toBeCloseTo(
      naivePointBiserial(values, outcomes),
      12,
    );
  });

  it("agrees with #924 when every row IS independent (no duplication)", () => {
    // 200 rows, 200 distinct fixtures, default floor. The two must not differ:
    // if they do, this module is not measuring the same quantity.
    const sample: GroupedObservation[] = [];
    for (let i = 0; i < 200; i++) {
      const won = i % 2 === 0;
      sample.push(obs("k", `fx-${i}`, won ? 0.5 : -0.5, won ? 1 : 0));
    }
    const [r] = tuneGroupedWeights(sample);
    expect(r!.groups).toBe(200);
    expect(r!.duplicationFactor).toBe(1);
    expect(r!.multiplier).toBeCloseTo(r!.naiveMultiplier, 12);
    expect(r!.inflation).toBeCloseTo(1, 10);
  });
});

describe("the defect this module exists to close", () => {
  it("withholds weight from 100 rows spread over 11 fixtures", () => {
    // #924 grants this FULL weight: rows = 100 >= MIN_SAMPLES.
    const sample = clustered("k", 11, 10, 0.6, -0.6);
    const naive = correlationToMultiplier(naivePointBiserial(
      sample.map((r) => r.value),
      sample.map((r) => r.outcome),
    ), sample.length, MIN_SAMPLES);
    expect(naive).toBeGreaterThan(0.5); // #924 is confident

    const [r] = tuneGroupedWeights(sample);
    expect(r!.rows).toBe(110);
    expect(r!.groups).toBe(11);
    expect(r!.verdict).toBe("insufficient-groups");
    expect(r!.multiplier).toBe(0);
    // ...and the row count's claim is preserved for comparison, not hidden.
    expect(r!.naiveMultiplier).toBeGreaterThan(0.5);
    expect(r!.inflation).toBeGreaterThan(1);
  });

  it("does not treat 99 independent games as equal to 99 duplicated rows", () => {
    const sample = clustered("k", 99, 1, 0.6, -0.6);
    const [r] = tuneGroupedWeights(sample);
    expect(r!.rows).toBe(99);
    expect(r!.groups).toBe(99);
    // Below the floor on GROUPS, which is the honest denominator.
    expect(r!.verdict).toBe("insufficient-groups");
    expect(r!.multiplier).toBe(0);
  });

  it("reports how far the row count overstated the weight", () => {
    const sample = clustered("k", 11, 10, 0.6, -0.6);
    const [r] = tuneGroupedWeights(sample);
    // maxClusterSize exposes the worst single fixture.
    expect(r!.maxClusterSize).toBe(10);
    expect(r!.duplicationFactor).toBe(10);
  });

  it("still grants weight to enough genuinely independent fixtures", () => {
    // 120 fixtures, 1 row each: clears the floor on its own merits.
    const sample = clustered("k", 120, 1, 0.6, -0.6);
    const [r] = tuneGroupedWeights(sample);
    expect(r!.groups).toBe(120);
    expect(r!.verdict).toBe("earned");
    expect(r!.multiplier).toBeGreaterThan(0);
  });
});

describe("honesty properties", () => {
  it("keeps a sign-inverted key negative rather than dropping it", () => {
    // Higher reading LOSES. Must read anti-predictive, not "insufficient".
    const sample: GroupedObservation[] = [];
    for (let i = 0; i < 200; i++) {
      const won = i % 2 === 0;
      sample.push(obs("k", `fx-${i}`, won ? -0.5 : 0.5, won ? 1 : 0));
    }
    const [r] = tuneGroupedWeights(sample);
    expect(r!.correlation).toBeLessThan(0);
    expect(r!.verdict).toBe("anti-predictive");
    expect(r!.multiplier).toBeLessThan(0);
  });

  it("excludes non-finite readings from the correlation but still counts the cluster", () => {
    const sample: GroupedObservation[] = [];
    for (let i = 0; i < 150; i++) {
      const won = i % 2 === 0;
      sample.push(obs("k", `fx-${i}`, won ? 0.5 : -0.5, won ? 1 : 0));
    }
    sample.push(obs("k", "fx-999", Number.NaN, 1));
    const [r] = tuneGroupedWeights(sample);
    // The NaN row is not usable evidence, but its fixture still exists.
    expect(r!.rows).toBe(150);
    expect(r!.groups).toBe(151);
    expect(Number.isFinite(r!.correlation)).toBe(true);
  });

  it("returns an empty result rather than throwing on an empty sample", () => {
    expect(tuneGroupedWeights([])).toEqual([]);
  });

  it("is deterministic across identical inputs", () => {
    const sample = clustered("k", 40, 5, 0.6, -0.6);
    const a = tuneGroupedWeights(sample);
    const b = tuneGroupedWeights(sample);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("does not let one huge fixture manufacture evidence", () => {
    // 1 fixture with 5000 rows vs 1 fixture with 1 row: identical verdict.
    const many = clustered("k", 1, 5000, 0.6, -0.6);
    const one = clustered("k", 1, 1, 0.6, -0.6);
    const [a] = tuneGroupedWeights(many);
    const [b] = tuneGroupedWeights(one);
    expect(a!.rows).toBe(5000);
    expect(b!.rows).toBe(1);
    expect(a!.verdict).toBe("insufficient-groups");
    expect(b!.verdict).toBe("insufficient-groups");
  });
});

describe("multiplierFrom", () => {
  it("withholds all weight below the evidence floor", () => {
    expect(multiplierFrom(0.99, 99, 100)).toBe(0);
  });

  it("needs real evidence before approaching full strength", () => {
    const small = multiplierFrom(0.5, 100, 100);
    const large = multiplierFrom(0.5, 400, 100);
    expect(large).toBeGreaterThan(small);
    expect(large).toBeLessThanOrEqual(1);
  });

  it("preserves sign", () => {
    expect(multiplierFrom(-0.5, 400, 100)).toBeLessThan(0);
  });
});
