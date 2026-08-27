/**
 * Tests for the REAL YACoe (R33) + TPR (R34) signals.
 * Deterministic, no I/O. Uses nflverse NGS-shaped rows (CC-BY-4.0), never live data.
 */

import { describe, it, expect } from "vitest";
import {
  computeYacoe,
  computeTpr,
  YACOE_TAU,
  TPR_TAU,
  MIN_CATCHES,
  type YacoeSignal,
  type TprSignal,
} from "../yacoe-backtest.js";
import type { NgsReceivingRow } from "../../../data-ingestion/src/nflverse-ngs.js";

function row(
  over: Partial<NgsReceivingRow> & { gsisId: string; player: string; team: string; season: number },
): NgsReceivingRow {
  return {
    season: over.season,
    seasonType: "REG",
    week: 0,
    gsisId: over.gsisId,
    player: over.player,
    position: "WR",
    team: over.team,
    avgCushion: null,
    avgSeparation: null,
    avgIntendedAirYards: null,
    airYardsShare: null,
    receptions: over.receptions ?? null,
    targets: over.targets ?? null,
    catchPct: null,
    yards: null,
    touchdowns: null,
    avgYac: over.avgYac ?? null,
    avgExpectedYac: over.avgExpectedYac ?? null,
    yacAboveExpected: null,
  };
}

describe("R33 computeYacoe — real NGS-derived signal", () => {
  it("computes per-catch YAC over expected for a qualified receiver", () => {
    const rows = [
      row({ gsisId: "A", player: "A", team: "X", season: 2024, receptions: 60, avgYac: 6.0, avgExpectedYac: 5.0 }),
      row({ gsisId: "B", player: "B", team: "X", season: 2024, receptions: 60, avgYac: 4.0, avgExpectedYac: 5.0 }),
    ];
    const out = computeYacoe(rows);
    const a = out.find((s) => s.gsisId === "A") as YacoeSignal;
    expect(a.yacoe).toBeCloseTo(1.0, 6); // 6.0 - 5.0 = +1.0
    const b = out.find((s) => s.gsisId === "B") as YacoeSignal;
    expect(b.yacoe).toBeCloseTo(-1.0, 6);
    expect(a.priced).toBe(false);
    expect(a.methodTag).toContain("yacoe_real");
  });

  it("returns null (anti-noise floor) when fewer than MIN_CATCHES receptions", () => {
    const rows = [
      row({ gsisId: "C", player: "C", team: "Y", season: 2024, receptions: 5, avgYac: 9.0, avgExpectedYac: 4.0 }),
    ];
    const out = computeYacoe(rows);
    expect(out[0]!.yacoe).toBeNull();
  });

  it("ignores per-week rows, uses full-season aggregate only", () => {
    const rows = [
      row({ gsisId: "D", player: "D", team: "Z", season: 2024, receptions: 60, avgYac: 6.0, avgExpectedYac: 5.0 }),
      { ...row({ gsisId: "D", player: "D", team: "Z", season: 2024, receptions: 60, avgYac: 6.0, avgExpectedYac: 5.0 }), week: 5 },
    ];
    const out = computeYacoe(rows);
    expect(out).toHaveLength(1);
    expect(out[0]!.yacoe).toBeCloseTo(1.0, 6);
  });
});

describe("R34 computeTpr — smoothed target participation (Beta-binomial EB)", () => {
  it("shrinks a high-volume receiver toward league mean with TPR_TAU", () => {
    const rows = [
      row({ gsisId: "A", player: "A", team: "X", season: 2024, targets: 120 }),
      row({ gsisId: "B", player: "B", team: "X", season: 2024, targets: 80 }),
    ];
    const out = computeTpr(rows);
    const a = out.find((s) => s.gsisId === "A") as TprSignal;
    const b = out.find((s) => s.gsisId === "B") as TprSignal;
    // pLeague = 200 / 200 = 1.0 (single team). A's tpr = (120 + TPR_TAU)/(200+TPR_TAU)
    const expectedA = (120 + TPR_TAU) / (200 + TPR_TAU);
    expect(a.tpr).toBeCloseTo(expectedA, 6);
    expect(b.tpr).toBeLessThan(a.tpr);
    expect(a.priced).toBe(false);
  });

  it("returns null below MIN_CATCHES target floor", () => {
    const rows = [row({ gsisId: "C", player: "C", team: "Y", season: 2024, targets: 3 })];
    const out = computeTpr(rows);
    expect(out[0]!.tpr).toBeNull();
  });

  it("tau constant is pre-registered (never 0, never tuned post-hoc here)", () => {
    expect(YACOE_TAU).toBeGreaterThan(0);
    expect(TPR_TAU).toBeGreaterThan(0);
    expect(MIN_CATCHES).toBeGreaterThanOrEqual(30);
  });
});
