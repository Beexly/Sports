import { describe, it, expect } from "vitest";
import { checkAltLadder, type AltRung } from "../alt-line-curvature.js";

// A clean exponential survival ladder: monotone, decreasing density, log-linear → no flags.
function cleanLadder(): AltRung[] {
  return [30, 40, 50, 60, 70, 80, 90].map((point) => ({
    point,
    overImplied: Math.exp(-0.03 * (point - 20)),
  }));
}

describe("checkAltLadder", () => {
  it("passes a coherent ladder", () => {
    expect(checkAltLadder(cleanLadder())).toHaveLength(0);
  });

  it("flags a monotonicity violation (higher line more likely to go over)", () => {
    const l = cleanLadder();
    l[4] = { point: 70, overImplied: 0.40 }; // > the 60-rung's ~0.301
    const flags = checkAltLadder(l);
    expect(flags.some((f) => f.type === "monotonicity")).toBe(true);
  });

  it("flags a tail rung that is too cheap relative to the ladder's own decay", () => {
    const l = cleanLadder();
    // Keep it monotone (0.04 < the 80-rung ~0.165) but far below the log-linear expectation (~0.122).
    l[6] = { point: 90, overImplied: 0.04 };
    const flags = checkAltLadder(l);
    expect(flags.some((f) => f.type === "tail_mispriced")).toBe(true);
    expect(flags.some((f) => f.type === "monotonicity")).toBe(false);
  });

  it("flags a tail density that bulges back up (non-unimodal)", () => {
    // Construct decreasing survival but with an upward density bump in the tail.
    const l: AltRung[] = [
      { point: 30, overImplied: 0.80 },
      { point: 40, overImplied: 0.66 }, // d 0.014
      { point: 50, overImplied: 0.56 }, // d 0.010
      { point: 60, overImplied: 0.50 }, // d 0.006
      { point: 70, overImplied: 0.30 }, // d 0.020 — bulge up in the tail
      { point: 80, overImplied: 0.26 }, // d 0.004
    ];
    const flags = checkAltLadder(l);
    expect(flags.some((f) => f.type === "tail_curvature")).toBe(true);
  });

  it("ignores degenerate ladders", () => {
    expect(checkAltLadder([{ point: 50, overImplied: 0.5 }])).toHaveLength(0);
  });
});
