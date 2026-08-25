import { describe, expect, it } from "vitest";
import { compareDevigMethods } from "../devig-method-compare.js";

describe("compareDevigMethods — Hegarty/Whelan longshot inflation", () => {
  it("returns null on degenerate inputs rather than inventing a fair p", () => {
    expect(compareDevigMethods({ homeImplied: 0, awayImplied: 0.9 })).toBeNull();
    expect(compareDevigMethods({ homeImplied: Number.NaN, awayImplied: 0.5 })).toBeNull();
    expect(compareDevigMethods({ homeImplied: -0.1, awayImplied: 0.5 })).toBeNull();
  });

  it("three methods each sum to 1 on a two-way book", () => {
    const r = compareDevigMethods({ homeImplied: 0.91, awayImplied: 0.14 });
    expect(r).not.toBeNull();
    expect(r!.multiplicative.home + r!.multiplicative.away).toBeCloseTo(1, 10);
    expect(r!.shin.home + r!.shin.away).toBeCloseTo(1, 5);
    expect(r!.goto.home + r!.goto.away).toBeCloseTo(1, 5);
    expect(r!.booksum).toBeCloseTo(1.05, 10);
  });

  it("multiplicative inflates the longshot vs Shin on a favourite-longshot book", () => {
    // Heavy favourite ~1.10 / longshot ~8.00 → implied 0.909 / 0.125, booksum ~1.034
    const r = compareDevigMethods({ homeImplied: 1 / 1.1, awayImplied: 1 / 8 });
    expect(r).not.toBeNull();
    expect(r!.longshotSide).toBe("away");
    expect(r!.longshotInflation).toBeGreaterThan(0);
    expect(r!.multiplicative.away).toBeGreaterThan(r!.shin.away);
    expect(r!.multiplicative.home).toBeLessThan(r!.shin.home);
  });

  it("a balanced two-way book has ~zero longshot inflation", () => {
    const r = compareDevigMethods({ homeImplied: 0.52, awayImplied: 0.52 });
    expect(r).not.toBeNull();
    expect(Math.abs(r!.longshotInflation)).toBeLessThan(0.01);
  });
});
