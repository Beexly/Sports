import { describe, it, expect } from "vitest";
import { pavIsotonic, pavBinary } from "../calibration/pav.js";

/**
 * CHARACTERIZATION (freeze) tests for calibration/pav.ts — added 2026-10-15.
 *
 * The calibration wiring audit (2026-10-14) flagged pav as WIRED-BUT-UNTESTED.
 * A basic suite exists on main (pav.test.ts); these tests pin the behavior it
 * does NOT cover: exact golden outputs on mixed sequences, the weighted-mean
 * preservation identity, idempotence, and code-implied edge cases. They pin
 * CURRENT behavior — a future intentional change should update them
 * deliberately, not drift past them.
 */
describe("pavIsotonic — characterization goldens", () => {
  it("golden: mixed sequence pools into exactly two blocks", () => {
    const fitted = pavIsotonic([0.9, 0.1, 0.5, 0.3, 0.8, 0.2, 0.95, 0.05]);
    const expected = [0.45, 0.45, 0.45, 0.45, 0.5, 0.5, 0.5, 0.5];
    expect(fitted).toHaveLength(8);
    fitted.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 12));
  });

  it("golden: weighted three-point pool", () => {
    // (0.9*2 + 0.1*3) / 5 = 0.42 for the violating tail pair; head untouched.
    const fitted = pavIsotonic([0.2, 0.9, 0.1], [1, 2, 3]);
    expect(fitted[0]).toBeCloseTo(0.2, 12);
    expect(fitted[1]).toBeCloseTo(0.42, 10);
    expect(fitted[2]).toBeCloseTo(0.42, 10);
  });

  it("preserves the weighted mean of the input (isotonic projection identity)", () => {
    const ys = [0.3, 0.9, 0.2, 0.7, 0.1];
    const ws = [1, 2, 1, 3, 2];
    const fitted = pavIsotonic(ys, ws);
    const wMean = (a: number[]) =>
      a.reduce((s, v, i) => s + v * ws[i]!, 0) / ws.reduce((s, v) => s + v, 0);
    expect(wMean(fitted)).toBeCloseTo(wMean(ys), 12);
  });

  it("is idempotent: refitting fitted values changes nothing", () => {
    const ys = [0.9, 0.1, 0.5, 0.3, 0.8, 0.2, 0.95, 0.05];
    const once = pavIsotonic(ys);
    expect(pavIsotonic(once)).toEqual(once);
  });

  it("empty input returns [] even when a weights array is supplied (length check is skipped for n=0)", () => {
    expect(() => pavIsotonic([], [1, 2])).not.toThrow();
    expect(pavIsotonic([], [1, 2])).toEqual([]);
  });

  it("an all-equal sequence is returned unchanged", () => {
    expect(pavIsotonic([2, 2, 2])).toEqual([2, 2, 2]);
  });
});

describe("pavBinary — characterization goldens", () => {
  it("golden: weighted binary labels pool to block means", () => {
    const fitted = pavBinary([1, 0, 0, 1, 0], [1, 1, 2, 1, 1]);
    const expected = [0.25, 0.25, 0.25, 0.5, 0.5];
    fitted.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 12));
  });
});
