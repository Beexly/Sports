import { describe, expect, it } from "vitest";

import {
  ENABLED,
  MIN_PICKS_FOR_HALT,
  SCALE_DOWN_WEALTH,
  SCALE_UP_WEALTH,
  coverRobbinsWealth,
  coverWealth,
  robbinsMixtureWealth,
  shuffleTestPassRate,
  stakeGate,
} from "@/lib/calibration/2604-20172v2-cover-robbins-stake-multiplier";

describe("Cover-Robbins stake multiplier", () => {
  it("is disabled by default; gate constants set", () => {
    expect(ENABLED).toBe(false);
    expect(SCALE_UP_WEALTH).toBe(20);
    expect(SCALE_DOWN_WEALTH).toBe(0.5);
    expect(MIN_PICKS_FOR_HALT).toBe(50);
  });

  it("wealth is a nonnegative martingale starting at 1", () => {
    const outcomes = [0.6, 0.4, 0.7, 0.3, 0.55];
    const w = coverWealth(outcomes, 0.5, () => 0.25);
    expect(w).toBeGreaterThan(0);
    expect(coverWealth([], 0.5, () => 0.25)).toBe(1);
    // betting with the true edge grows wealth in expectation
    const w2 = robbinsMixtureWealth([0.7, 0.7, 0.7, 0.7], 0.5, [0.25, 0.5]);
    expect(w2).toBeGreaterThan(1);
  });

  it("stake gates fire at the right wealth levels", () => {
    expect(stakeGate(25, 100)).toEqual({ gate: "scale-up", multiplier: 1.5, review: false });
    expect(stakeGate(0.4, 60)).toEqual({ gate: "scale-down", multiplier: 0.5, review: true });
    expect(stakeGate(0.4, 40).gate).toBe("hold"); // too few picks to halt
    expect(stakeGate(5, 100).gate).toBe("hold");
  });

  it("shuffle test keeps W_n < 20 on no-edge data (Ville validity)", () => {
    // Fair coin outcomes in {0,1} vs m0=0.5: no edge -> wealth should rarely spike.
    let s = 77;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const outcomes = Array.from({ length: 200 }, () => (rnd() < 0.5 ? 1 : 0));
    const passRate = shuffleTestPassRate(outcomes, 0.5, 40, 1234);
    expect(passRate).toBeGreaterThanOrEqual(0.95); // gate: >=95% of shuffles
  });

  it("mixture wealth averages Cover and Robbins halves", () => {
    const outcomes = [0.8, 0.2, 0.9];
    const w = coverRobbinsWealth(outcomes, 0.5, () => 0.2, [0.2]);
    const expected = 0.5 * coverWealth(outcomes, 0.5, () => 0.2) + 0.5 * coverWealth(outcomes, 0.5, () => 0.2);
    expect(w).toBeCloseTo(expected, 10);
  });
});
