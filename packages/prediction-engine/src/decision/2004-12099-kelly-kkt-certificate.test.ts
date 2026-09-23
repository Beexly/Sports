// Tests for decision/2004-12099-kelly-kkt-certificate.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  kktCertificate,
  slidingWindowDominanceRatio,
  walkForwardRedundancyScreen,
  cappedReallocate,
} from "./2004-12099-kelly-kkt-certificate.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("kktCertificate (2004.12099, Thm 3.1)", () => {
  it("passes on the true Kelly optimum of a two-outcome gamble", () => {
    const rand = mulberry32(31);
    // Gamble: +1 w.p. 5/6, -1 w.p. 1/6 -> K* = 2/3.
    const scenarios: number[][] = Array.from({ length: 4000 }, () => [rand() < 5 / 6 ? 1 : -1]);
    const { passes, violations } = kktCertificate([2 / 3], scenarios, 0.05);
    expect(violations.length).toBe(0);
    expect(passes).toBe(true);
  });
  it("fails on a suboptimal fraction", () => {
    const rand = mulberry32(32);
    const scenarios: number[][] = Array.from({ length: 4000 }, () => [rand() < 5 / 6 ? 1 : -1]);
    const { passes } = kktCertificate([0.1], scenarios, 0.02);
    expect(passes).toBe(false);
  });
  it("requires <= 1 + tol for zero-weight picks", () => {
    const rand = mulberry32(33);
    // Pick 0: good gamble (gets weight); pick 1: dominated noise (zero weight, ratio > 1 would violate).
    const scenarios: number[][] = Array.from({ length: 4000 }, () => [
      rand() < 5 / 6 ? 1 : -1,
      rand() < 0.5 ? 0.05 : -0.05,
    ]);
    const res = kktCertificate([2 / 3, 0], scenarios, 0.05);
    expect(res.passes).toBe(true);
  });
});

describe("slidingWindowDominanceRatio", () => {
  it("stays <= 1 for a dominated pick across windows", () => {
    const ri = [0.2, -0.3, 0.2, -0.3, 0.2, -0.3, 0.2, -0.3];
    const rj = [0.9, -0.1, 0.9, -0.1, 0.9, -0.1, 0.9, -0.1];
    const ratios = slidingWindowDominanceRatio(ri, rj, 4);
    expect(ratios.length).toBe(5);
    expect(ratios.every((r) => r <= 1)).toBe(true);
  });
});

describe("walkForwardRedundancyScreen + cappedReallocate", () => {
  it("suppresses the walk-forward dominated pick and reallocates under the ceiling", () => {
    const returnsByPick: Record<string, number[]> = {
      a: [0.2, -0.3, 0.2, -0.3, 0.2, -0.3, 0.2, -0.3],
      b: [1.2, -0.1, 1.2, -0.1, 1.2, -0.1, 1.2, -0.1],
      c: [0.5, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5, 0.4],
    };
    const { suppressed, reallocatedCap } = walkForwardRedundancyScreen(
      ["a", "b", "c"],
      returnsByPick,
      4,
      3,
      0.25,
    );
    expect(suppressed).toContain("a");
    expect(suppressed).not.toContain("b");
    expect(reallocatedCap).toBe(0.25);
    const realloc = cappedReallocate({ a: 0.1, b: 0.15, c: 0.1 }, suppressed, 0.25);
    expect(realloc["a"]).toBe(0);
    expect(realloc["b"]!).toBeLessThanOrEqual(0.25);
    expect(realloc["c"]!).toBeLessThanOrEqual(0.25);
    // Mass conserved (no all-in leak): survivors absorb the freed 0.1.
    const total = (realloc["b"] ?? 0) + (realloc["c"] ?? 0);
    expect(total).toBeCloseTo(0.35, 10);
  });
});
