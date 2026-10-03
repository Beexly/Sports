// Tests for 2508.07556v2 instability gate (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  instabilityScore,
  instabilitySelect,
  confidenceSelect,
  hitRate,
  mcnemarTable,
  mcnemarPValue,
  instabilityGatePasses,
} from "./2508-07556v2-instability-gate.js";

describe("instabilityScore", () => {
  it("is 0 for perfectly agreeing seeds", () => {
    expect(instabilityScore([0.7, 0.7, 0.7])).toBeCloseTo(0, 12);
    expect(instabilityScore([0.5, 0.7])).toBeCloseTo(0.1, 12);
  });
});

describe("instabilitySelect / confidenceSelect", () => {
  it("selects the least-unstable / most-confident at coverage", () => {
    expect(instabilitySelect([0.3, 0.1, 0.2, 0.4], 0.5)).toEqual([1, 2]);
    expect(confidenceSelect([0.6, 0.9, 0.7, 0.5], 0.5)).toEqual([1, 2]);
  });
});

describe("hitRate", () => {
  it("computes the selected hit rate", () => {
    expect(hitRate([0, 2], [1, 0, 1, 0])).toBe(1);
    expect(hitRate([], [1])).toBe(0);
  });
});

describe("mcnemarTable / mcnemarPValue", () => {
  it("builds the paired table and scores significance", () => {
    const table = mcnemarTable([0, 1], [1, 2], [1, 1, 0, 0]);
    // Pick 0: A-only correct; pick 1: both correct; pick 2: B selected, wrong.
    expect(table).toEqual({ bothCorrect: 1, instabilityOnly: 1, confidenceOnly: 0, bothWrong: 1 });
    // No discordant pairs in one direction only -> p = 1 when b = c = 0.
    expect(mcnemarPValue({ bothCorrect: 5, instabilityOnly: 0, confidenceOnly: 0, bothWrong: 5 })).toBe(1);
    // Strong asymmetry -> small p.
    const sig = mcnemarPValue({ bothCorrect: 0, instabilityOnly: 20, confidenceOnly: 2, bothWrong: 0 });
    expect(sig).toBeLessThan(0.01);
  });
});

describe("instabilityGatePasses", () => {
  it("detects a significant instability-selection win", () => {
    // 10 stable winners (instability 0.01, confidence 0.55) and 10 wobbly
    // losers (instability 0.5, confidence 0.95). At 70% coverage (k=14):
    // instability selects 10 winners + 4 losers; confidence selects
    // 10 losers + 4 winners.
    const n = 20;
    const instabilities = Array.from({ length: n }, (_, i) => (i < 10 ? 0.01 : 0.5));
    const confidences = Array.from({ length: n }, (_, i) => (i < 10 ? 0.55 : 0.95));
    const outcomes = Array.from({ length: n }, (_, i) => (i < 10 ? 1 : 0) as 0 | 1);
    const gate = instabilityGatePasses(instabilities, confidences, outcomes, 0.7);
    expect(gate.instabilityHitRate).toBeCloseTo(10 / 14, 12);
    expect(gate.confidenceHitRate).toBeCloseTo(4 / 14, 12);
    expect(gate.liftPp).toBeCloseTo(100 * (6 / 14), 8);
    expect(gate.pValue).toBeLessThan(0.1);
    expect(gate.passes).toBe(true);
  });

  it("rejects when there is no lift", () => {
    const n = 10;
    const instabilities = new Array(n).fill(0.1);
    const confidences = new Array(n).fill(0.6);
    const outcomes = Array.from({ length: n }, (_, i) => (i % 2) as 0 | 1);
    expect(instabilityGatePasses(instabilities, confidences, outcomes, 0.7).passes).toBe(false);
  });
});
