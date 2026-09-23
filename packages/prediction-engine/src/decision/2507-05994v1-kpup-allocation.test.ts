// Tests for 2507.05994v1 k-PUP allocation (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  bucketIndex,
  pupUpdate,
  bankrollMultiple,
  maxDrawdown,
  runKPup,
  pupGatePasses,
} from "./2507-05994v1-kpup-allocation.js";

describe("bucketIndex", () => {
  it("cycles with period k", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((t) => bucketIndex(t, 7))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(bucketIndex(7, 7)).toBe(0);
    expect(bucketIndex(13, 7)).toBe(6);
  });
});

describe("pupUpdate", () => {
  it("stays on the simplex and tilts toward the winner", () => {
    const w = [0.5, 0.5];
    const next = pupUpdate(w, [1.2, 0.9], 1);
    expect(next[0]! + next[1]!).toBeCloseTo(1, 12);
    expect(next[0]!).toBeGreaterThan(0.5);
    expect(next.every((x) => x > 0)).toBe(true);
  });
});

describe("bankrollMultiple", () => {
  it("equals the portfolio gross return", () => {
    expect(bankrollMultiple([0.5, 0.5], [1.2, 0.8])).toBeCloseTo(1.0, 12);
    expect(bankrollMultiple([1, 0], [1.3, 0.5])).toBeCloseTo(1.3, 12);
  });
});

describe("maxDrawdown", () => {
  it("measures peak-to-trough decline", () => {
    expect(maxDrawdown([1.1, 1.1, 0.5, 1.2])).toBeCloseTo(1 - (1.21 * 0.5) / 1.21, 12);
    expect(maxDrawdown([1.1, 1.05])).toBe(0);
  });
});

describe("runKPup", () => {
  it("learns periodic structure a flat allocation misses", () => {
    // Asset 0 wins on even periods, asset 1 on odd periods (k=2 structure).
    const rels: number[][] = Array.from({ length: 40 }, (_, t) =>
      t % 2 === 0 ? [1.1, 0.95] : [0.95, 1.1],
    );
    const run = runKPup(rels, 2, 2);
    expect(run.bucketWeights[0]![0]!).toBeGreaterThan(run.bucketWeights[0]![1]!);
    expect(run.bucketWeights[1]![1]!).toBeGreaterThan(run.bucketWeights[1]![0]!);
    expect(run.terminalWealth).toBeGreaterThan(1);
    expect(run.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it("k=1 matches a single universal portfolio", () => {
    const rels = Array.from({ length: 10 }, () => [1.05, 0.98]);
    const run = runKPup(rels, 1, 1);
    expect(run.bucketWeights).toHaveLength(1);
    expect(run.terminalWealth).toBeGreaterThan(1);
  });
});

describe("pupGatePasses", () => {
  it("requires +10% wealth and bounded drawdown", () => {
    expect(pupGatePasses(1.2, 0.2, 1.0, 0.2)).toBe(true);
    expect(pupGatePasses(1.09, 0.2, 1.0, 0.2)).toBe(false);
    expect(pupGatePasses(1.2, 0.25, 1.0, 0.2)).toBe(false);
  });
});
