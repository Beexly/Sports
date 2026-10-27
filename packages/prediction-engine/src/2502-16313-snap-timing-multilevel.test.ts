/**
 * arXiv:2502.16313 — Bayesian multilevel location-scale model for QB pre-snap
 * motion snap-timing variance.
 *
 * Sealed-invariant coverage. This module touches no coach seal state. The
 * invariant under test is honesty of the variance estimate: the multilevel
 * location-scale fit is not in the ledger, so the module may ship only the
 * raw empirical variance — never a fabricated scheme multiplier standing in
 * for scheme-level pooling.
 */
import { describe, it, expect } from "vitest";

import {
  snapTimingVariance,
  type MotionFrame,
} from "./2502-16313-snap-timing-multilevel.js";

const series = (dts: number[]): MotionFrame[] => {
  let t = 0;
  return dts.map((d, i) => {
    t += i === 0 ? 0 : d;
    return { playerId: "qb1", t, x: 0, y: 0 };
  });
};

describe("2502-16313 snap-timing variance", () => {
  it("returns the raw empirical variance of inter-frame deltas", () => {
    // deltas: 1.0, 1.2  -> mean 1.1, variance ((0.1)^2+(0.1)^2)/2 = 0.01
    const frames = series([0, 1.0, 1.2]);
    expect(snapTimingVariance(frames, "neutral")).toBeCloseTo(0.01, 9);
  });

  it("does not inflate or deflate the estimate by a fabricated scheme factor", () => {
    // The paper's multilevel pooling is unimplemented; a scheme label must not
    // silently multiply the variance by a made-up constant.
    const frames = series([0, 1.0, 1.2]);
    const neutral = snapTimingVariance(frames, "neutral");
    const shanahan = snapTimingVariance(frames, "shanahan");
    const mcvay = snapTimingVariance(frames, "mcvay");
    expect(shanahan).toBeCloseTo(neutral, 9);
    expect(mcvay).toBeCloseTo(neutral, 9);
  });

  it("returns a documented default when there are too few frames", () => {
    expect(snapTimingVariance([], "neutral")).toBe(0.1);
    expect(snapTimingVariance(series([0]), "neutral")).toBe(0.1);
  });

  // --- sealed-invariant coverage: honest refusal on malformed tracking data ---
  // Inter-frame deltas are only meaningful when the tracking clock advances.
  // A non-monotonic series means the frame data is corrupt; reporting a
  // "variance" over negative deltas would dress impossible physics up as a
  // measured multilevel estimate. Refuse instead. No math invented — this is
  // the paper's own precondition on the pre-snap motion series.

  it("refuses non-monotonic frame timestamps instead of reporting a fabricated variance", () => {
    const backwards: MotionFrame[] = [
      { playerId: "qb1", t: 0, x: 0, y: 0 },
      { playerId: "qb1", t: 2.0, x: 0, y: 0 },
      { playerId: "qb1", t: 1.0, x: 0, y: 0 },
    ];
    expect(() => snapTimingVariance(backwards, "neutral")).toThrow(
      /monoton|timestamps|corrupt/i,
    );
  });

  it("does not mutate its input frames", () => {
    const frames = series([0, 1.0, 1.2]);
    const before = JSON.stringify(frames);
    snapTimingVariance(frames, "neutral");
    expect(JSON.stringify(frames)).toBe(before);
  });

  it("is deterministic for identical inputs", () => {
    const frames = series([0, 1.0, 1.2]);
    expect(snapTimingVariance(frames, "neutral")).toBe(
      snapTimingVariance(frames, "neutral"),
    );
  });
});
