import { describe, it, expect } from "vitest";
import {
  ENABLED,
  logit,
  deltaLogit,
  surpriseScore,
  isSteamFlag,
  binaryEntropy,
  expectedEntropyLoss,
} from "./1301-0594-information-incorporation-surprise.js";

describe("1301.0594 information-incorporation surprise", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  describe("logit", () => {
    it("returns 0 at p = 0.5", () => {
      expect(logit(0.5)).toBeCloseTo(0, 12);
    });

    it("is positive for p > 0.5 and negative for p < 0.5", () => {
      expect(logit(0.7)).toBeGreaterThan(0);
      expect(logit(0.3)).toBeLessThan(0);
    });

    it("throws on non-finite input", () => {
      expect(() => logit(Number.NaN)).toThrow(/finite/);
      expect(() => logit(Number.POSITIVE_INFINITY)).toThrow(/finite/);
    });
  });

  describe("deltaLogit", () => {
    it("is positive when probability rises", () => {
      expect(deltaLogit(0.5, 0.7)).toBeGreaterThan(0);
    });

    it("is negative when probability falls", () => {
      expect(deltaLogit(0.7, 0.5)).toBeLessThan(0);
    });

    it("is zero when probability is unchanged", () => {
      expect(deltaLogit(0.6, 0.6)).toBeCloseTo(0, 12);
    });
  });

  describe("surpriseScore", () => {
    it("equals deltaLogit when Var_t = 1", () => {
      const d = deltaLogit(0.5, 0.8);
      expect(surpriseScore(d, 1)).toBeCloseTo(d, 12);
    });

    it("scales by 1/sqrt(Var_t)", () => {
      expect(surpriseScore(2, 4)).toBeCloseTo(1, 12);
    });

it("throws when varT is non-positive or non-finite", () => {
  expect(() => surpriseScore(1, 0)).toThrow(/varT/);
  expect(() => surpriseScore(1, -1)).toThrow(/varT/);
  expect(() => surpriseScore(1, Number.NaN)).toThrow(/varT/);
});

    it("throws when deltaLogit is non-finite", () => {
      expect(() => surpriseScore(Number.NaN, 1)).toThrow(/deltaLogit/);
    });
  });

  describe("isSteamFlag", () => {
    it("flags when |Δlogit| exceeds k × scale", () => {
      expect(isSteamFlag(3.1, 1, 3)).toBe(true);
      expect(isSteamFlag(-3.1, 1, 3)).toBe(true);
    });

    it("does not flag when |Δlogit| is at or below threshold", () => {
      expect(isSteamFlag(3, 1, 3)).toBe(false);
      expect(isSteamFlag(2.9, 1, 3)).toBe(false);
    });

    it("throws on non-positive or non-finite scale/k", () => {
      expect(() => isSteamFlag(1, 0, 3)).toThrow(/scale/);
      expect(() => isSteamFlag(1, 1, 0)).toThrow(/k/);
      expect(() => isSteamFlag(1, Number.NaN, 3)).toThrow(/scale/);
    });

    it("throws when deltaLogit is non-finite", () => {
      expect(() => isSteamFlag(Number.NaN, 1, 3)).toThrow(/deltaLogit/);
    });
  });

  describe("binaryEntropy", () => {
    it("is 1 bit at p = 0.5", () => {
      expect(binaryEntropy(0.5)).toBeCloseTo(1, 12);
    });

    it("is 0 at the endpoints", () => {
      expect(binaryEntropy(0)).toBe(0);
      expect(binaryEntropy(1)).toBe(0);
    });

    it("throws when p is outside [0, 1] or non-finite", () => {
      expect(() => binaryEntropy(-0.01)).toThrow(/\[0, 1\]/);
      expect(() => binaryEntropy(1.01)).toThrow(/\[0, 1\]/);
      expect(() => binaryEntropy(Number.NaN)).toThrow(/\[0, 1\]/);
    });
  });

  describe("expectedEntropyLoss", () => {
    it("is positive when a move reduces uncertainty", () => {
      expect(expectedEntropyLoss(0.5, 0.9)).toBeGreaterThan(0);
    });

    it("is zero when probability is unchanged", () => {
      expect(expectedEntropyLoss(0.6, 0.6)).toBeCloseTo(0, 12);
    });

    it("is negative when a move increases uncertainty toward 0.5", () => {
      expect(expectedEntropyLoss(0.9, 0.5)).toBeLessThan(0);
    });
  });
});
