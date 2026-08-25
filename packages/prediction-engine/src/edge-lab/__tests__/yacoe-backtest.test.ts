/** SYNTHETIC property tests for YACoe rolling-signal harness (pure fn). */
import { describe, expect, it } from "vitest";
import { computeYacoeSignal, type YacoeRow } from "../yacoe-backtest.js";

describe("YACoe rolling-signal backtest — SYNTHETIC property tests", () => {
  it("monotonicity: more positive YACoe history -> higher signal", () => {
    const base: YacoeRow[] = [
      { playerId: "SYN_P1", week: 1, season: 2024, yacAboveExpected: 2.0, avgExpectedYac: 3.0, targetShare: 0.25 },
    ];
    const positive: YacoeRow[] = [
      ...base,
      { playerId: "SYN_P1", week: 2, season: 2024, yacAboveExpected: 4.0, avgExpectedYac: 3.0, targetShare: 0.25 },
    ];
    const resultBase = computeYacoeSignal(base);
    const resultPos = computeYacoeSignal(positive);
    const rb = resultBase.find((r) => r.playerId === "SYN_P1")!;
    const rp = resultPos.find((r) => r.playerId === "SYN_P1")!;
    expect(rp.signal).toBeGreaterThan(rb.signal);
    expect(rp.rollingMeanYacoe).toBeGreaterThan(rb.rollingMeanYacoe);
    expect(rp.priced).toBe(false);
  });

  it("zero-history -> null-like zero signal (n=0 handled by empty array -> no output)", () => {
    const empty: YacoeRow[] = [];
    const result = computeYacoeSignal(empty);
    expect(result).toHaveLength(0);
  });

  it("deterministic output for identical SYNTHETIC input", () => {
    const rows: YacoeRow[] = [
      { playerId: "SYN_P2", week: 1, season: 2024, yacAboveExpected: 1.5, avgExpectedYac: 2.5, targetShare: 0.3 },
      { playerId: "SYN_P2", week: 2, season: 2024, yacAboveExpected: -0.5, avgExpectedYac: 2.5, targetShare: 0.3 },
    ];
    const r1 = computeYacoeSignal(rows);
    const r2 = computeYacoeSignal(rows);
    expect(r1).toHaveLength(r2.length);
    expect(r1[0]!.signal).toBe(r2[0]!.signal);
    expect(r1[0]!.rollingMeanYacoe).toBe(r2[0]!.rollingMeanYacoe);
  });

  it("signal = rollingMean / sqrt(n) — t-like shrinkage verified", () => {
    const rows: YacoeRow[] = [
      { playerId: "SYN_P3", week: 1, season: 2024, yacAboveExpected: 4.0, avgExpectedYac: 2.0, targetShare: 0.2 },
      { playerId: "SYN_P3", week: 2, season: 2024, yacAboveExpected: 4.0, avgExpectedYac: 2.0, targetShare: 0.2 },
    ];
    const result = computeYacoeSignal(rows);
    const r = result.find((x) => x.playerId === "SYN_P3")!;
    expect(r.rollingMeanYacoe).toBe(4.0);
    expect(r.signal).toBeCloseTo(4.0 / Math.sqrt(2), 6);
    expect(r.n).toBe(2);
  });
});
