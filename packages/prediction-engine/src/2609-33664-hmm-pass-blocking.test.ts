/**
 * arXiv:2609.33664 — HMM pass-blocking assignment and pocket survival.
 *
 * Sealed-invariant coverage. This module touches no coach seal state and
 * imports nothing, so the invariant is structural: it must never present a
 * placeholder as a posterior. A uniform assignment matrix and an all-zero
 * plus-minus are NOT the paper's method, and a caller must not be able to
 * consume them as one.
 */
import { describe, it, expect } from "vitest";

import {
  gammaIt,
  adjustedPlusMinus,
  pocketSurvival,
  type Frame,
} from "./2609-33664-hmm-pass-blocking.js";

const frame = (t: number): Frame => ({
  t,
  blockers: [
    { id: "b1", x: 0, y: 0, vx: 0, vy: 0 },
    { id: "b2", x: 0, y: 0, vx: 0, vy: 0 },
  ],
  rushers: [
    { id: "r1", x: 0, y: 0, vx: 0, vy: 0 },
    { id: "r2", x: 0, y: 0, vx: 0, vy: 0 },
  ],
});

describe("2609-33664 HMM pass-blocking", () => {
  it("refuses to present a uniform matrix as a posterior assignment", () => {
    // The forward-backward emission model is not in the ledger. A uniform
    // gamma_it would be a fabricated posterior, so the function must refuse
    // rather than hand back a plausible-looking matrix.
    expect(() => gammaIt([frame(0), frame(0.5)])).toThrow(/not implemented/i);
  });

  it("refuses to present all-zero plus-minus as an adjusted estimate", () => {
    expect(() => adjustedPlusMinus([frame(0), frame(0.5)])).toThrow(
      /not implemented/i,
    );
  });

  it("keeps the implemented pocket-survival arithmetic and caps at 1", () => {
    // pocketSurvival IS implemented: survival fraction up to the threshold.
    expect(pocketSurvival([frame(0), frame(1.25)], 2.5)).toBeCloseTo(0.5, 9);
    expect(pocketSurvival([frame(0), frame(3)], 2.5)).toBe(1);
    expect(pocketSurvival([], 2.5)).toBe(0);
  });

  it("returns empty output for an empty frame list without throwing", () => {
    expect(gammaIt([])).toEqual([]);
    expect(adjustedPlusMinus([]).size).toBe(0);
  });

  // --- sealed-invariant coverage: a survival probability must be a probability ---
  // pocketSurvival is the one implemented number in this module. If it can leave
  // [0,1] it stops being a probability, and a caller cannot tell a corrupt frame
  // clock from a real short pocket. These are the invariants the module lacked.

  it("clamps survival probability into [0,1] for negative frame times", () => {
    // A pre-snap or mis-stamped frame gives a negative elapsed time. The honest
    // answer is "the pocket has survived zero seconds", not a negative survival.
    expect(pocketSurvival([frame(-1)], 2.5)).toBe(0);
    expect(pocketSurvival([frame(-0.5)], 2.5)).toBe(0);
  });

  it("does not mutate its input frames", () => {
    const frames = [frame(0), frame(1.25)];
    const before = JSON.stringify(frames);
    pocketSurvival(frames, 2.5);
    expect(JSON.stringify(frames)).toBe(before);
  });

  it("is deterministic for identical inputs", () => {
    const frames = [frame(0), frame(1.25)];
    expect(pocketSurvival(frames, 2.5)).toBe(pocketSurvival(frames, 2.5));
  });
});
