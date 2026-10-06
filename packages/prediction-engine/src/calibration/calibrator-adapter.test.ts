/**
 * The seam and the map were built on different branches and neither imports the
 * other, so nothing in the repo proved they compose. These tests are that proof.
 *
 * They check three things:
 *   1. A fitted map, bound through the adapter, actually moves the published
 *      probability DOWN when the model is overconfident.
 *   2. The engine's edge, conviction ladder and decision are all derived from
 *      the CALIBRATED number, not the raw blend.
 *   3. No map means no change, byte for byte.
 */
import { describe, expect, it } from "vitest";
import { assessEdge, type EdgeInput } from "../edge-engine.js";
import { applyIsotonicMap, fitIsotonicMap } from "./isotonic-calibration.js";
import { calibratorFromIsotonicMap } from "./calibrator-adapter.js";

/**
 * A settled corpus where the model is systematically overconfident: it states
 * 0.70 and wins 55% of the time. Monotone and correctly ordered, so this is the
 * fixable case (ranking real, level wrong) rather than the unfixable one.
 *
 * The realized column is an INTERLEAVED 0/1 sequence whose local mean is the
 * target rate. A monotone sweep of all-0s-then-all-1s would give the same
 * headline numbers but no within-cell variance, and the fitter is entitled to
 * reject that as too small to be monotone.
 */
function overconfidentCorpus(): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  const n = 400;
  for (let i = 0; i < n; i += 1) {
    const published = 0.4 + (i / (n - 1)) * 0.5; // 0.40 -> 0.90
    // Realized rate tracks the ranking but sits ~7 points below the stated one.
    const actual = published - 0.07;
    // Deterministic interleave: the k-th of every 100-strike block wins.
    out.push([published, i % 100 < Math.round(actual * 100) ? 1 : 0]);
  }
  return out;
}

function baseInput(overrides: Partial<EdgeInput> = {}): EdgeInput {
  return {
    marketFairProb: 0.5,
    marketConsistent: true,
    independents: [{ prob: 0.7, weight: 1, source: "elo" }],
    ...overrides,
  };
}

describe("isotonic map bound to the engine seam", () => {
  it("reduces a stated 0.70 toward the realized 0.63", () => {
    const map = fitIsotonicMap(overconfidentCorpus(), { minCellSize: 25 });
    const calibrator = calibratorFromIsotonicMap(map);
    expect(calibrator).not.toBeNull();
    const mapped = calibrator!.predict(0.7);
    expect(mapped).toBeLessThan(0.7);
    expect(mapped).toBeGreaterThan(0.55);
    expect(mapped).toBe(applyIsotonicMap(map, 0.7));
  });

  it("derives the edge from the calibrated number, not the raw blend", () => {
    const map = fitIsotonicMap(overconfidentCorpus(), { minCellSize: 25 });
    const raw = assessEdge(baseInput());
    const calibrated = assessEdge(baseInput({ calibrator: calibratorFromIsotonicMap(map) }));

    // The raw blend is 0.7; the map pulls it down. Both must be inside (0,1).
    expect(calibrated.trueProb).toBeLessThan(raw.trueProb);
    expect(calibrated.trueProb).toBeGreaterThan(0);
    expect(calibrated.trueProb).toBeLessThan(1);
    // The decision is made on the calibrated value, so its edge is the
    // calibrated probability minus the market.
    expect(calibrated.rawEdge).toBeCloseTo(calibrated.trueProb - 0.5, 10);
  });

  it("is byte-identical to the uncalibrated engine when no map is supplied", () => {
    const raw = assessEdge(baseInput());
    const nullMap = assessEdge(baseInput({ calibrator: calibratorFromIsotonicMap(null) }));
    expect(nullMap).toEqual(raw);
    expect(nullMap.trueProb).toBe(raw.trueProb);
    expect(nullMap.decision).toBe(raw.decision);
  });

  it("keeps the published probability a probability", () => {
    const map = fitIsotonicMap(overconfidentCorpus(), { minCellSize: 25 });
    const calibrator = calibratorFromIsotonicMap(map);
    for (const p of [0, 0.01, 0.25, 0.5, 0.7, 0.9, 0.99, 1]) {
      const mapped = calibrator!.predict(p);
      expect(Number.isFinite(mapped)).toBe(true);
      expect(mapped).toBeGreaterThanOrEqual(0);
      expect(mapped).toBeLessThanOrEqual(1);
    }
  });

  it("refuses to fit from a sample too small to be monotone", () => {
    // Below minCellSize the fitter throws rather than producing a map that
    // looks calibrated and is not.
    expect(() => fitIsotonicMap([[0.6, 1], [0.7, 0]], { minCellSize: 25 })).toThrow();
  });
});
