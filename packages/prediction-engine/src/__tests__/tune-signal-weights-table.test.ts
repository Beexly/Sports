import { describe, it, expect } from "vitest";
import {
  measureSignalWeights,
  measuredWeightFor,
  formatWeightReport,
  MIN_FIXTURES,
  type FixtureKeyOutcome,
} from "../tune-signal-weights-table.js";
import { MIN_SAMPLES } from "../tune-signal-weights.js";
import { MIN_SCALE_FIXTURES } from "../signal-scale-fit.js";

/**
 * A key that genuinely predicts: reading and outcome move together, spread over
 * `fixtures` DISTINCT fixtures.
 *
 * The fixture key is derived from a monotonic index over (season, week), never
 * from `index % 17` — a modulo repeats fixture keys, the distinct-fixture count
 * collapses toward the number of weeks, and the module then correctly refuses
 * the key for `insufficient-fixtures`. That refusal is the feature, so the
 * helper has to hand over real independent fixtures or it tests nothing.
 */
function fixtureId(index: number): string {
  const WEEKS = 17;
  return `${2000 + Math.floor(index / WEEKS)}w${(index % WEEKS) + 1}`;
}

/** A key that genuinely predicts over `fixtures` independent fixtures. */
function predictiveKey(key: string, fixtures: number, rowsPerFixture = 1): FixtureKeyOutcome[] {
  const out: FixtureKeyOutcome[] = [];
  for (let f = 0; f < fixtures; f++) {
    for (let j = 0; j < rowsPerFixture; j++) {
      // Half the fixtures vote up with the reading, half vote down against it.
      const high = f % 2 === 0;
      out.push({
        key,
        fixtureKey: fixtureId(f),
        value: high ? 0.6 : -0.6,
        outcome: high ? 1 : 0,
      });
    }
  }
  return out;
}

/**
 * A key whose strength is set by OUTCOME NOISE, not by shrinking the reading.
 *
 * Scaling a value does NOT weaken a key: point-biserial correlation is invariant
 * to a positive rescale, so `predictiveKey(...).map(v => v * 0.05)` has the SAME
 * r as the original and both keys clamp to weight 1 — which is what made an
 * earlier version of this file assert a "stronger than weak" ordering it had no
 * way to earn. To vary predictive power the OUTCOME has to vary.
 *
 * `noise` is the fraction of fixtures whose outcome contradicts the reading, so
 * `0` is a perfect predictor and `0.45` is a weak one.
 */
function noisyKey(key: string, fixtures: number, noise: number, rowsPerFixture = 1): FixtureKeyOutcome[] {
  const out: FixtureKeyOutcome[] = [];
  for (let f = 0; f < fixtures; f++) {
    const high = f % 2 === 0;
    // Deterministic "coin" keyed off the fixture index: stable across runs.
    const contradicts = ((f * 7919) % 100) / 100 < noise;
    const outcome = contradicts ? (high ? 0 : 1) : high ? 1 : 0;
    for (let j = 0; j < rowsPerFixture; j++) {
      out.push({ key, fixtureKey: fixtureId(f), value: high ? 0.6 : -0.6, outcome });
    }
  }
  return out;
}

describe("measureSignalWeights — floors agree across modules", () => {
  it("keeps the row floor and the fixture floor on the same law", () => {
    // Three modules express "a key needs ~100 independent observations before it
    // may move a score". If they drift, a refit silently changes the standard.
    expect(MIN_FIXTURES).toBe(MIN_SAMPLES);
    expect(MIN_FIXTURES).toBe(MIN_SCALE_FIXTURES);
  });
});

describe("measureSignalWeights — the row-count correction is the point", () => {
  it("refuses a key whose rows are few fixtures restated", () => {
    // 1,000 rows, but only 10 distinct fixtures. This is the defect
    // tune-signal-weights-grouped.ts documents: rows that clear #924's 100-row
    // floor while describing a handful of games.
    const sample = predictiveKey("restated", 10, 100);
    const [entry] = measureSignalWeights(sample).entries;

    expect(entry?.rows).toBe(1000);
    expect(entry?.fixtures).toBe(10);
    // #924 would have paid full weight here. The honest count refuses it.
    expect(entry?.rowMultiplier).toBeGreaterThan(0);
    expect(entry?.weight).toBe(0);
    expect(entry?.verdict).toBe("insufficient-fixtures");
    expect(entry?.inflation).toBeGreaterThan(1);
    // The reason must name the numbers, so a reader can dispute it.
    expect(entry?.reason).toContain("10 distinct fixtures");
  });

  it("reports the size of the inflation rather than silently applying it", () => {
    // 2,000 rows over 200 distinct fixtures. The row count overstates the
    // evidence 10x and `inflation` is the size of that gap.
    //
    // The key is NOISY on purpose, and the assertions below are the ones that
    // hold REGARDLESS of saturation. `rowMultiplier` is capped at 1, so once
    // r*sqrt(rows/100) >= 1 the ratio no longer equals sqrt(rows/fixtures) — the
    // cap is what hides the gap, and asserting the exact ratio there would be
    // asserting a number the code does not produce. What is always true, and is
    // what the report actually needs to be true, is:
    //   (a) inflation IS the ratio of the two multipliers, and
    //   (b) it can never exceed the duplication factor sqrt(rows/fixtures).
    const entry = measureSignalWeights(noisyKey("restated", 200, 0.3, 10)).entries[0];
    expect(entry?.rows).toBe(2000);
    expect(entry?.fixtures).toBe(200);
    expect(entry?.weight).toBeGreaterThan(0);

    // (a) definitional identity.
    expect(entry?.inflation).toBeCloseTo(entry!.rowMultiplier / entry!.weight, 6);
    expect(entry?.inflation).toBeGreaterThan(1);

    // (b) bounded by the duplication factor — an overstatement cannot exceed the
    // evidence it overstates.
    expect(entry?.inflation).toBeLessThanOrEqual(Math.sqrt(10) + 1e-9);
    expect(entry?.inflation).toBeLessThanOrEqual(Math.sqrt(entry!.rows / entry!.fixtures) + 1e-9);
  });

  it("reads 1.0 inflation when both multipliers saturate, and does not hide it", () => {
    // A near-perfect predictor: both multipliers clamp to 1, so the row count
    // genuinely is not overstating anything the cap can show. The verdict and
    // the row/fixture counts are still reported, so the 10x duplication stays
    // visible in the numbers even where the ratio is 1.
    const entry = measureSignalWeights(noisyKey("saturated", 200, 0.02, 10)).entries[0];
    expect(entry?.inflation).toBe(1);
    expect(entry?.rows / entry!.fixtures).toBe(10);
    expect(entry?.verdict).toBe("earned");
  });

  it("earns weight once distinct fixtures clear the floor", () => {
    const [entry] = measureSignalWeights(predictiveKey("earned", MIN_FIXTURES * 2)).entries;
    expect(entry?.verdict).toBe("earned");
    expect(entry?.fixtures).toBe(MIN_FIXTURES * 2);
    expect(entry?.weight).toBeGreaterThan(0);
    expect(entry?.weight).toBeLessThanOrEqual(1);
  });
});

describe("measureSignalWeights — anti-predictive keys are excluded, not inverted", () => {
  it("returns weight 0 and preserves the sign in the report", () => {
    // Reading moves UP while the outcome moves DOWN.
    const sample: FixtureKeyOutcome[] = [];
    for (let f = 0; f < MIN_FIXTURES * 2; f++) {
      sample.push({
        key: "inverted",
        fixtureKey: fixtureId(f),
        value: f % 2 === 0 ? 0.8 : -0.8,
        outcome: f % 2 === 0 ? 0 : 1,
      });
    }
    const [entry] = measureSignalWeights(sample).entries;
    expect(entry?.correlation).toBeLessThan(0);
    expect(entry?.verdict).toBe("anti-predictive");
    // weight >= 0 is a SCHEMA constraint: `Signal.weight` documents >= 0,
    // buildCandidate DROPS weight < 0 and compositeScore clamps to 0. Passing
    // the negative through would make the row vanish, not invert.
    expect(entry?.weight).toBe(0);
    expect(entry?.reason).toContain("anti-predicts");
  });

  it("never emits a negative weight for any input", () => {
    const inverted = measureSignalWeights(
      predictiveKey("inv", 400).map((r) => ({ ...r, value: -r.value, outcome: (r.outcome ? 0 : 1) as 0 | 1 })),
    );
    for (const e of inverted.entries) expect(e.weight).toBeGreaterThanOrEqual(0);
  });
});

describe("measureSignalWeights — unusable input is dropped, not defaulted", () => {
  it("drops empty keys, non-finite readings and missing fixtures, and counts them", () => {
    const good = predictiveKey("good", MIN_FIXTURES * 2);
    const table = measureSignalWeights([
      ...good,
      { key: "", fixtureKey: "2020w1", value: 0.5, outcome: 1 },
      { key: "nan", fixtureKey: "2020w2", value: Number.NaN, outcome: 1 },
      { key: "inf", fixtureKey: "2020w3", value: Number.POSITIVE_INFINITY, outcome: 1 },
      { key: "nofixture", fixtureKey: "", value: 0.5, outcome: 1 },
    ]);
    expect(table.rowsOffered).toBe(good.length + 4);
    expect(table.rowsUsed).toBe(good.length);
    // The unreadable keys must not appear as "inert" — unreadable is not
    // "measured, no effect".
    expect(Object.keys(table.weights)).toEqual(["good"]);
  });

  it("returns an empty table rather than throwing on an empty sample", () => {
    const table = measureSignalWeights([]);
    expect(table.measuredCount).toBe(0);
    expect(table.earnedCount).toBe(0);
    expect(table.weights).toEqual({});
    expect(table.reportText).toContain("no key cleared both floors");
  });

  it("reports a constant key as inert rather than exploding", () => {
    const sample: FixtureKeyOutcome[] = [];
    for (let f = 0; f < MIN_FIXTURES * 2; f++) {
      sample.push({ key: "flat", fixtureKey: fixtureId(f), value: 0.5, outcome: f % 2 });
    }
    const [entry] = measureSignalWeights(sample).entries;
    expect(entry?.verdict).toBe("inert");
    expect(entry?.weight).toBe(0);
    expect(entry?.correlation).toBe(0);
  });
});

describe("measuredWeightFor — absent is not zero", () => {
  it("distinguishes 'never measured' (null) from 'measured, earns nothing' (0)", () => {
    const table = measureSignalWeights([
      ...predictiveKey("earned", MIN_FIXTURES * 2),
      { key: "dead", fixtureKey: "2020w1", value: 0.5, outcome: 1 },
    ]);
    expect(measuredWeightFor(table, "earned")).toBeGreaterThan(0);
    expect(measuredWeightFor(table, "dead")).toBe(0);
    // A key the table never saw is a MISSING PRODUCER, which has a different fix
    // than a key measured at zero. Collapsing the two is the silent failure.
    expect(measuredWeightFor(table, "never-emitted")).toBeNull();
  });
});

describe("measureSignalWeights — determinism and reporting", () => {
  it("is byte-identical across runs on the same input", () => {
    const sample = predictiveKey("a", 300);
    expect(formatWeightReport(measureSignalWeights(sample))).toBe(
      formatWeightReport(measureSignalWeights(sample)),
    );
  });

  it("orders strongest evidence first and carries a reason for every key", () => {
    const sample = [
      // Weakness must come from noisy OUTCOMES; a shrunken reading is still a
      // perfectly predictive reading (correlation is scale-invariant).
      ...noisyKey("weak", MIN_FIXTURES * 4, 0.45),
      ...noisyKey("strong", MIN_FIXTURES * 4, 0.05),
      ...predictiveKey("few", 3),
    ];
    const table = measureSignalWeights(sample);
    expect(table.entries[0]?.key).toBe("strong");
    for (const e of table.entries) {
      expect(e.reason.length).toBeGreaterThan(0);
      expect(e.readings.spread).toBeGreaterThanOrEqual(0);
    }
    expect(table.earnedCount + table.zeroWeightCount).toBe(table.measuredCount);
  });

  it("exposes the reading spread so a mixed-scale key is visible", () => {
    // The persisted table predates normalization, so one key can hold rows on
    // two affine scales. That must be REPORTABLE, not averaged away.
    const sample: FixtureKeyOutcome[] = [];
    for (let f = 0; f < MIN_FIXTURES * 2; f++) {
      sample.push({
        key: "mixed",
        fixtureKey: fixtureId(f),
        value: f % 2 === 0 ? 0.4 : 40,
        outcome: f % 2 === 0 ? 1 : 0,
      });
    }
    const [entry] = measureSignalWeights(sample).entries;
    expect(entry?.readings.min).toBeCloseTo(0.4, 6);
    expect(entry?.readings.max).toBeCloseTo(40, 6);
    expect(entry?.readings.spread).toBeGreaterThan(1);
  });
});

describe("measureSignalWeights — honours caller-supplied floors", () => {
  it("raises the fixture floor on request without touching the module default", () => {
    const sample = predictiveKey("a", 200);
    const strict = measureSignalWeights(sample, { minFixtures: 500 });
    const normal = measureSignalWeights(sample);
    expect(strict.entries[0]?.verdict).toBe("insufficient-fixtures");
    expect(normal.entries[0]?.verdict).toBe("earned");
    expect(MIN_FIXTURES).toBe(100);
  });
});