import { describe, expect, it } from "vitest";
import {
  KNEEL_CROSSES_HALF_HOOK,
  KNEEL_EXPECTED_GAME_HAIRCUT_YD,
  KNEEL_MASS,
  KNEEL_MEAN_YD,
  KNEEL_RATE_PER_WINNING_GAME,
  halfHookLossProbability,
  kneelMixtureMean,
  kneelProbability,
  kneeldownExpectedHaircutYd,
} from "../kneeldown-mass";

const VICTORY = { secondsRemaining: 60, scoreDifferential: 6, opponentTimeouts: 0, quarter: 4 } as const;

describe("kneel mass", () => {
  it("mass sums to 1", () => {
    const total = KNEEL_MASS.reduce((a, o) => a + o.mass, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("mixture mean reproduces the measured mean", () => {
    expect(kneelMixtureMean()).toBeCloseTo(KNEEL_MEAN_YD, 2);
  });

  it("pins the measured values, not the spec's -2 to -3", () => {
    expect(KNEEL_MEAN_YD).toBe(-1.059);
    expect(KNEEL_RATE_PER_WINNING_GAME).toBe(2.03);
    expect(KNEEL_EXPECTED_GAME_HAIRCUT_YD).toBe(-2.27);
    expect(KNEEL_CROSSES_HALF_HOOK).toBe(1);
  });

  it("is dominated by exactly one lost yard", () => {
    const one = KNEEL_MASS.find((o) => o.yards === -1);
    expect(one?.mass).toBeGreaterThan(0.85);
  });
});

describe("kneelProbability", () => {
  it("is zero outside the endgame window", () => {
    expect(kneelProbability({ ...VICTORY, quarter: 2 })).toBe(0);
    expect(kneelProbability({ ...VICTORY, secondsRemaining: 200 })).toBe(0);
    expect(kneelProbability({ ...VICTORY, scoreDifferential: 0 })).toBe(0);
  });

  it("rises with the lead and falls with opponent timeouts", () => {
    expect(kneelProbability(VICTORY)).toBeGreaterThan(
      kneelProbability({ ...VICTORY, opponentTimeouts: 2 }),
    );
    expect(kneelProbability(VICTORY)).toBeGreaterThan(
      kneelProbability({ ...VICTORY, scoreDifferential: 3, secondsRemaining: 90 }),
    );
  });

  it("caps at certainty", () => {
    expect(kneelProbability({ ...VICTORY, scoreDifferential: 14 })).toBeLessThanOrEqual(1);
  });
});

describe("haircut maths", () => {
  it("is negative and smaller than the naive -2.5", () => {
    const h = kneeldownExpectedHaircutYd(VICTORY);
    expect(h).toBeLessThan(0);
    expect(Math.abs(h)).toBeGreaterThan(1);
    expect(Math.abs(h)).toBeLessThan(2.5);
  });

  it("half-hook loss is a probability in (0,1)", () => {
    const p = halfHookLossProbability(VICTORY);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});
