/**
 * arXiv:1807.09236 — Empirical Bayes shrinkage of Bradley-Terry-Luce MLEs.
 *
 * The module docblock specifies
 *   gamma_SHR = (I - R) gamma_MLE + R u,   R = (I + A S)^{-1}
 * These tests encode that formula directly, so the module cannot ship a
 * shrinkage rule that appears in neither the paper nor the ledger.
 *
 * Note on the flag: ENABLED stays false (unwired research code), but the
 * arithmetic must be correct in both states. "Disabled" means "no production
 * caller", never "wrong math".
 */
import { describe, it, expect } from "vitest";

import { shrinkBtl } from "./1807-09236-empirical-bayes-btl.js";

describe("1807-09236 empirical-Bayes BTL shrinkage", () => {
  it("implements gamma_SHR = (I - R) gamma_MLE + R u with R = (I + A S)^-1", () => {
    // A = I, S = 1  =>  R = (2I)^-1 = 0.5 I
    // gamma_SHR = 0.5 * gamma_MLE + 0.5 * u
    const A = [
      [1, 0],
      [0, 1],
    ];
    const gammaMle = [2, 4];
    const u = [0, 0];
    const out = shrinkBtl(gammaMle, A, 1, u);
    expect(out[0]).toBeCloseTo(1, 9);
    expect(out[1]).toBeCloseTo(2, 9);
  });

  it("pulls toward the prior mean u, not toward a hardcoded blend", () => {
    const A = [
      [1, 0],
      [0, 1],
    ];
    const gammaMle = [2, 4];
    const u = [10, 10];
    const out = shrinkBtl(gammaMle, A, 1, u);
    // 0.5*2 + 0.5*10 = 6 ; 0.5*4 + 0.5*10 = 7
    expect(out[0]).toBeCloseTo(6, 9);
    expect(out[1]).toBeCloseTo(7, 9);
  });

  it("collapses to the prior u when the data precision S is zero", () => {
    const A = [
      [1, 0],
      [0, 1],
    ];
    const out = shrinkBtl([2, 4], A, 0, [10, 10]);
    expect(out[0]).toBeCloseTo(10, 9);
    expect(out[1]).toBeCloseTo(10, 9);
  });

  it("converges to the raw MLE as the data precision S grows", () => {
    const A = [
      [1, 0],
      [0, 1],
    ];
    const out = shrinkBtl([2, 4], A, 1e6, [10, 10]);
    expect(out[0]).toBeCloseTo(2, 3);
    expect(out[1]).toBeCloseTo(4, 3);
  });

  it("accepts S as a full matrix and still satisfies the identity at S = 0", () => {
    const A = [
      [2, 0],
      [0, 2],
    ];
    const S = [
      [0, 0],
      [0, 0],
    ];
    const out = shrinkBtl([3, 5], A, S, [1, 1]);
    expect(out[0]).toBeCloseTo(1, 9);
    expect(out[1]).toBeCloseTo(1, 9);
  });

  // --- sealed-invariant coverage: honest refusal on malformed input ---
  // These are the P0 invariants the module was missing. A silent garbage
  // answer is worse than a refusal: a caller cannot tell a wrong shrinkage
  // from a right one. No math is invented here — these guards enforce the
  // paper's own precondition that A, S and u act on the same n-dimensional
  // Bradley-Terry parameter vector as gamma_MLE.

  it("refuses when A is not an n x n matrix matching gamma_MLE", () => {
    const A3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    expect(() => shrinkBtl([2, 4], A3, 1, [0, 0])).toThrow(/dimension|n x n|match/i);
  });

  it("refuses when the prior mean u does not match gamma_MLE's length", () => {
    const A = [
      [1, 0],
      [0, 1],
    ];
    expect(() => shrinkBtl([2, 4], A, 1, [10])).toThrow(/dimension|length|match/i);
  });

  it("refuses when S as a matrix does not match A's dimensions", () => {
    const A = [
      [1, 0],
      [0, 1],
    ];
    const S3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    expect(() => shrinkBtl([2, 4], A, S3, [0, 0])).toThrow(/dimension|shape|match/i);
  });

  it("throws rather than returning NaN when (I + A S) is singular", () => {
    const A = [
      [1, 0],
      [0, 1],
    ];
    expect(() => shrinkBtl([2, 4], A, -1, [0, 0])).toThrow(/singular/i);
  });

  it("does not mutate its inputs", () => {
    const A = [
      [1, 0],
      [0, 1],
    ];
    const gammaMle = [2, 4];
    const u = [0, 0];
    const aCopy = JSON.stringify(A);
    const gCopy = JSON.stringify(gammaMle);
    const uCopy = JSON.stringify(u);
    shrinkBtl(gammaMle, A, 1, u);
    expect(JSON.stringify(A)).toBe(aCopy);
    expect(JSON.stringify(gammaMle)).toBe(gCopy);
    expect(JSON.stringify(u)).toBe(uCopy);
  });

  it("is deterministic for identical inputs", () => {
    const A = [
      [1, 0.2],
      [0.2, 1],
    ];
    const first = shrinkBtl([2, 4], A, 0.7, [1, 1]);
    const second = shrinkBtl([2, 4], A, 0.7, [1, 1]);
    expect(first).toEqual(second);
  });
});
