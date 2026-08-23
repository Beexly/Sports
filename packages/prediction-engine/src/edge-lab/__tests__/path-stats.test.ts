/**
 * CL3 · path-stats — pure line-path summaries (PUBLIC lane).
 *
 * H0 item 7 (doctrine C6.2 CL3): textbook time-series summaries over a market's
 * line path. Public lane — zero repo semantics, safe for any free model.
 *
 * Tests cover:
 *  - latestAtOrBefore: cutoff semantics, tie-break (last in ascending order), null when none
 *  - slopePerHour: exact-line cross-check, zero-variance t → null, <2 points → null,
 *    hour conversion (ms → hours), non-mutation
 *  - maxAbsStep: max absolute consecutive step, <2 points → null
 *  - rangeSpread: max-min, <2 values → null
 *  - Attack list: mutation (frozen input), slope magnitude, tie-break, all-identical t,
 *    NaN injection, hour conversion trap
 */
import { describe, expect, it } from "vitest";

import {
  latestAtOrBefore,
  maxAbsStep,
  rangeSpread,
  slopePerHour,
  type PathPoint,
} from "../path-stats.js";

const MS_PER_HOUR = 3_600_000;

describe("latestAtOrBefore", () => {
  it("returns the latest point with t <= cutoff", () => {
    const pts: PathPoint[] = [
      { t: 1 * MS_PER_HOUR, v: 1 },
      { t: 3 * MS_PER_HOUR, v: 3 },
      { t: 5 * MS_PER_HOUR, v: 5 },
    ];
    expect(latestAtOrBefore(pts, 4 * MS_PER_HOUR)?.v).toBe(3);
  });

  it("returns null when no point has t <= cutoff", () => {
    const pts: PathPoint[] = [{ t: 2 * MS_PER_HOUR, v: 7 }];
    expect(latestAtOrBefore(pts, 1 * MS_PER_HOUR)).toBeNull();
  });

  it("tie on t → last one in ascending-(t, input-index) order", () => {
    const pts: PathPoint[] = [
      { t: 10, v: 1 }, // index 0
      { t: 10, v: 2 }, // index 1, same t
      { t: 10, v: 3 }, // index 2, same t — should win
    ];
    expect(latestAtOrBefore(pts, 10)?.v).toBe(3);
  });

  it("returns the exact cutoff point when t == cutoff", () => {
    const pts: PathPoint[] = [
      { t: 1 * MS_PER_HOUR, v: 1 },
      { t: 2 * MS_PER_HOUR, v: 2 },
    ];
    expect(latestAtOrBefore(pts, 2 * MS_PER_HOUR)?.v).toBe(2);
  });

  it("returns null for empty input", () => {
    expect(latestAtOrBefore([], 100)).toBeNull();
  });

  it("does not mutate the input array", () => {
    const pts: PathPoint[] = [
      { t: 3 * MS_PER_HOUR, v: 3 },
      { t: 1 * MS_PER_HOUR, v: 1 },
      { t: 2 * MS_PER_HOUR, v: 2 },
    ];
    const frozen = Object.freeze([...pts]);
    latestAtOrBefore(frozen, 2 * MS_PER_HOUR);
    expect(pts).toEqual([
      { t: 3 * MS_PER_HOUR, v: 3 },
      { t: 1 * MS_PER_HOUR, v: 1 },
      { t: 2 * MS_PER_HOUR, v: 2 },
    ]);
  });
});

describe("slopePerHour", () => {
  it("exact-line cross-check: v = 2 * hours + 1 → slope 2", () => {
    // v = 2*(t/3600000) + 1
    const pts: PathPoint[] = [
      { t: 0, v: 1 },
      { t: MS_PER_HOUR, v: 3 },
      { t: 2 * MS_PER_HOUR, v: 5 },
      { t: 3 * MS_PER_HOUR, v: 7 },
    ];
    const slope = slopePerHour(pts);
    expect(slope).not.toBeNull();
    expect(slope!).toBeCloseTo(2, 9);
  });

  it("null when < 2 points", () => {
    expect(slopePerHour([{ t: 0, v: 1 }])).toBeNull();
    expect(slopePerHour([])).toBeNull();
  });

  it("null when all t identical (zero variance)", () => {
    const pts: PathPoint[] = [
      { t: 100, v: 1 },
      { t: 100, v: 2 },
      { t: 100, v: 3 },
    ];
    expect(slopePerHour(pts)).toBeNull();
  });

  it("hour conversion: slope in per-ms scaled by 3600000", () => {
    // 1 ms → 0.001 hours. If v increases by 1 over 1ms, slope per hour = 1000.
    const pts: PathPoint[] = [
      { t: 0, v: 0 },
      { t: 1, v: 1 },
    ];
    const slope = slopePerHour(pts);
    expect(slope).not.toBeNull();
    expect(slope!).toBeCloseTo(3_600_000, 3); // 1 unit per ms = 3600000 units per hour
  });

  it("negative slope", () => {
    const pts: PathPoint[] = [
      { t: 0, v: 5 },
      { t: MS_PER_HOUR, v: 3 },
      { t: 2 * MS_PER_HOUR, v: 1 },
    ];
    const slope = slopePerHour(pts);
    expect(slope).not.toBeNull();
    expect(slope!).toBeCloseTo(-2, 9);
  });

  it("does not mutate input", () => {
    const pts: PathPoint[] = [
      { t: 3 * MS_PER_HOUR, v: 3 },
      { t: 1 * MS_PER_HOUR, v: 1 },
      { t: 2 * MS_PER_HOUR, v: 2 },
    ];
    const snapshot = structuredClone(pts);
    slopePerHour(pts);
    expect(pts).toEqual(snapshot);
  });
});

describe("maxAbsStep", () => {
  it("returns max absolute consecutive step", () => {
    const pts: PathPoint[] = [
      { t: 1, v: 1 },
      { t: 2, v: 5 },
      { t: 3, v: 2 },
    ];
    expect(maxAbsStep(pts)).toBe(4); // |5-1|=4, |2-5|=3
  });

  it("null when < 2 points", () => {
    expect(maxAbsStep([])).toBeNull();
    expect(maxAbsStep([{ t: 1, v: 1 }])).toBeNull();
  });

  it("single step with 2 points", () => {
    const pts: PathPoint[] = [
      { t: 1, v: 3 },
      { t: 2, v: 7 },
    ];
    expect(maxAbsStep(pts)).toBe(4);
  });

  it("does not mutate input", () => {
    const pts: PathPoint[] = [
      { t: 3, v: 3 },
      { t: 1, v: 1 },
      { t: 2, v: 2 },
    ];
    const snapshot = structuredClone(pts);
    maxAbsStep(pts);
    expect(pts).toEqual(snapshot);
  });
});

describe("rangeSpread", () => {
  it("returns max - min", () => {
    expect(rangeSpread([1, 5, 3, 9, 2])).toBe(8);
  });

  it("null when < 2 values", () => {
    expect(rangeSpread([5])).toBeNull();
    expect(rangeSpread([])).toBeNull();
  });

  it("handles negatives", () => {
    expect(rangeSpread([-3, -1, -7])).toBe(6);
  });
});

describe("attack list — path-stats", () => {
  it("mutation: frozen unsorted input — no throw, correct output, order unchanged", () => {
    const pts: PathPoint[] = [
      { t: 3 * MS_PER_HOUR, v: 3 },
      { t: 1 * MS_PER_HOUR, v: 1 },
      { t: 2 * MS_PER_HOUR, v: 2 },
    ];
    const frozen = Object.freeze([...pts]);
    const result = latestAtOrBefore(frozen, 2 * MS_PER_HOUR);
    expect(result?.v).toBe(2);
    // Input order unchanged
    expect(frozen).toEqual([
      { t: 3 * MS_PER_HOUR, v: 3 },
      { t: 1 * MS_PER_HOUR, v: 1 },
      { t: 2 * MS_PER_HOUR, v: 2 },
    ]);
  });

  it("slopePerHour cross-check on independent closed-form computation", () => {
    // Independent: slope = Cov(t,v) / Var(t) * 3600000
    const pts: PathPoint[] = [
      { t: 0, v: 0.5 },
      { t: 1_800_000, v: 1.5 }, // 0.5 hours
      { t: 3_600_000, v: 2.0 }, // 1 hour
      { t: 7_200_000, v: 3.5 }, // 2 hours
      { t: 10_800_000, v: 4.0 }, // 3 hours
    ];
    // Independent computation in hours:
    // hours = [0, 0.5, 1, 2, 3], v = [0.5, 1.5, 2.0, 3.5, 4.0]
    // mean_h = 1.3, mean_v = 2.3
    // cov = Σ(hi - mh)(vi - mv) / n = (0.5+(-0.8)*(0.8-2.3)+... )/...
    const hours = [0, 0.5, 1, 2, 3];
    const vs = [0.5, 1.5, 2.0, 3.5, 4.0];
    const n = 5;
    const mh = hours.reduce((a, b) => a + b, 0) / n;
    const mv = vs.reduce((a, b) => a + b, 0) / n;
    let cov = 0;
    let varT = 0;
    for (let i = 0; i < n; i++) {
      cov += (hours[i]! - mh) * (vs[i]! - mv);
      varT += (hours[i]! - mh) ** 2;
    }
    const expectedSlope = cov / varT;

    const result = slopePerHour(pts);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(expectedSlope, 6);
  });

  it("tie-break: equal t, different v — latestAtOrBefore returns later input", () => {
    const pts: PathPoint[] = [
      { t: 50, v: 1 },
      { t: 50, v: 2 },
      { t: 50, v: 3 },
    ];
    expect(latestAtOrBefore(pts, 50)?.v).toBe(3);
  });

  it("all identical t with >= 2 points → slopePerHour null, never Infinity/NaN", () => {
    const pts: PathPoint[] = [
      { t: 100, v: 1 },
      { t: 100, v: 5 },
      { t: 100, v: 3 },
    ];
    const result = slopePerHour(pts);
    expect(result).toBeNull();
  });

  it("NaN injection in t and in v → RangeError from all functions", () => {
    expect(() => latestAtOrBefore([{ t: NaN, v: 1 }], 100)).toThrow(RangeError);
    expect(() => slopePerHour([{ t: 1, v: NaN }])).toThrow(RangeError);
    expect(() => maxAbsStep([{ t: 1, v: NaN }])).toThrow(RangeError);
    expect(() => rangeSpread([1, NaN, 3])).toThrow(RangeError);
  });

  it("hour conversion trap: t in ms — slope not mis-scaled by 3600", () => {
    // If someone computes slope per-ms and divides by 3600 instead of 3600000,
    // the result would be 1000x too large. Assert magnitude with hand computation.
    const pts: PathPoint[] = [
      { t: 0, v: 0 },
      { t: MS_PER_HOUR, v: 100 },
    ];
    const result = slopePerHour(pts);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(100, 6); // 100 units per hour
  });
});
