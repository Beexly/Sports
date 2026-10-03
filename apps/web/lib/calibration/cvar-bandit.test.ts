import { describe, it, expect } from "vitest";
import {
  empiricalCvar,
  sampleVariance,
  bernsteinBonus,
  optimisticCvar,
  slidingWindow,
  allocateSlots,
  bonusDominanceFraction,
} from "@/lib/calibration/cvar-bandit";

// ============================================================
// arXiv 2302.03201v2 — Bernstein-UCB CVaR bandit. Additive only.
// ============================================================

describe("CVaR bandit — 2302.03201v2", () => {
  it("empiricalCvar of a constant series is the constant", () => {
    expect(empiricalCvar([0.5, 0.5, 0.5, 0.5], 0.25)).toBeCloseTo(0.5, 10);
  });

  it("empiricalCvar takes the worst tau-fraction", () => {
    expect(empiricalCvar([0.9, 0.8, 0.1, 0.2], 0.25)).toBeCloseTo(0.1, 10);
    expect(empiricalCvar([0.9, 0.8, 0.1, 0.2], 0.5)).toBeCloseTo(0.15, 10);
  });

  it("empiricalCvar is 0 on empty input", () => {
    expect(empiricalCvar([], 0.25)).toBe(0);
  });

  it("sampleVariance matches the unbiased estimator", () => {
    expect(sampleVariance([1, 2, 3, 4])).toBeCloseTo(5 / 3, 10);
    expect(sampleVariance([7])).toBe(0);
  });

  it("bernsteinBonus shrinks with n and is infinite at n=0", () => {
    const b10 = bernsteinBonus([0.1, 0.2, 0.3], 10, 0.05);
    const b100 = bernsteinBonus([0.1, 0.2, 0.3], 100, 0.05);
    expect(b100).toBeLessThan(b10);
    expect(bernsteinBonus([], 0, 0.05)).toBe(Number.POSITIVE_INFINITY);
  });

  it("optimisticCvar is infinite for unexplored categories", () => {
    expect(optimisticCvar([], 0.25, 0.05)).toBe(Number.POSITIVE_INFINITY);
  });

  it("optimisticCvar >= empiricalCvar (optimism)", () => {
    const s = [0.6, 0.7, 0.2, 0.9, 0.5];
    expect(optimisticCvar(s, 0.25, 0.05)).toBeGreaterThanOrEqual(
      empiricalCvar(s, 0.25),
    );
  });

  it("slidingWindow keeps the most recent weeks", () => {
    expect(slidingWindow([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
    expect(slidingWindow([1, 2], 8)).toEqual([1, 2]);
  });

  it("allocateSlots distributes to top-3 proportionally and sums to total", () => {
    const alloc = allocateSlots(
      [
        { category: "ml-dog", fHat: 0.6 },
        { category: "spread", fHat: 0.3 },
        { category: "total-over", fHat: 0.2 },
        { category: "total-under", fHat: 0.1 },
      ],
      10,
      3,
    );
    expect(alloc.length).toBe(3);
    expect(alloc.reduce((a, r) => a + r.slots, 0)).toBe(10);
    expect(alloc[0]!.slots).toBeGreaterThanOrEqual(alloc[2]!.slots);
    expect(alloc.every((r) => r.slots >= 0)).toBe(true);
  });

  it("allocateSlots splits evenly when all f-hats are non-positive", () => {
    const alloc = allocateSlots(
      [
        { category: "a", fHat: 0 },
        { category: "b", fHat: -1 },
      ],
      5,
      3,
    );
    expect(alloc.reduce((a, r) => a + r.slots, 0)).toBe(5);
  });

  it("allocateSlots handles degenerate input", () => {
    expect(allocateSlots([], 10)).toEqual([]);
    expect(allocateSlots([{ category: "a", fHat: 1 }], 0)).toEqual([]);
  });

  it("bonusDominanceFraction counts dominated weeks", () => {
    expect(bonusDominanceFraction([true, false, true, false])).toBeCloseTo(0.5, 10);
    expect(bonusDominanceFraction([])).toBe(0);
  });
});
