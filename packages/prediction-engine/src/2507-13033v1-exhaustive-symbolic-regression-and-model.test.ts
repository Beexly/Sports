/**
 * Vitest suite for arXiv:2507.13033v1 ((Exhaustive) Symbolic Regression and model selection by minimum description length).
 * Gate: ADOPT if the MDL top-ranked equation beats the incumbent baseline on 2025 held-out log-likelihood by >=0.005 nats/game AND the ranking is stable (top-3 unchanged under 5-fold season-block CV) AND the winner has <=10 terms.
 */
import { describe, it, expect } from "vitest";
import { mdlScore, rankByMdl, prescreen } from "./2507-13033v1-exhaustive-symbolic-regression-and-model";

describe("2507-13033v1 MDL equation selection", () => {
  it("penalizes complexity: simpler wins ties in fit", () => {
    const a = { id: "a", k: 2, structBits: 3, nll: 100 };
    const b = { id: "b", k: 8, structBits: 10, nll: 100 };
    expect(mdlScore(a, 500)).toBeLessThan(mdlScore(b, 500));
    expect(() => mdlScore(a, 1)).toThrow();
  });
  it("ranks by MDL ascending", () => {
    const eqs = [
      { id: "c", k: 5, structBits: 8, nll: 90 },
      { id: "a", k: 2, structBits: 3, nll: 100 },
      { id: "b", k: 2, structBits: 3, nll: 95 },
    ];
    expect(rankByMdl(eqs, 500).map((e) => e.id)[0]).toBe("b");
  });
  it("pre-screens implausible operator sets", () => {
    const eqs = [
      { id: "a", k: 2, structBits: 3, nll: 100, ops: ["+", "*"] },
      { id: "b", k: 2, structBits: 3, nll: 90, ops: ["bessel"] },
      { id: "c", k: 12, structBits: 3, nll: 80, ops: ["+"] },
    ];
    const kept = prescreen(eqs, new Set(["+", "-", "*", "/"]), 10);
    expect(kept.map((e) => e.id)).toEqual(["a"]);
  });
});
