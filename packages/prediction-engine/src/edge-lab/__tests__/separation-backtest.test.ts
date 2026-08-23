/** SYNTHETIC property tests for separation weighted-mean harness (pure fn). */
import { describe, expect, it } from "vitest";
import { computeSeparationBacktest, type SeparationRow } from "../separation-backtest.js";

function synRow(overrides: Partial<SeparationRow> & { playerId: string; week: number; season: number }): SeparationRow {
  return { playerId: "SYN-SEP-001", season: 2024, week: 1, avgSeparation: 3.0, targets: 5, ...overrides } as SeparationRow;
}

describe("separation-backtest — SYNTHETIC property tests", () => {
  it("weighting by targets works: more targets on high-separation rows pulls mean up", () => {
    // SYNTHETIC: two rows same player/season; one high sep with 20 targets, one low with 1 target
    const rows: SeparationRow[] = [
      synRow({ avgSeparation: 5.0, targets: 20 }),
      synRow({ avgSeparation: 1.0, targets: 1 }),
    ];
    const res = computeSeparationBacktest(rows, 2);
    expect(res[0].rollingWeightedMeanSeparation).toBeCloseTo((5.0 * 20 + 1.0) / 21, 4);
    expect(res[0].signal).not.toBeNull();
  });

  it("minSample gate nulls when total targets < 30", () => {
    const rows = [synRow({ avgSeparation: 4.5, targets: 5 })];
    const res = computeSeparationBacktest(rows, 30);
    expect(res[0].rollingWeightedMeanSeparation).toBeNull();
    expect(res[0].signal).toBeNull();
  });

  it("determinism: same SYNTHETIC input => same output", () => {
    const rows: SeparationRow[] = [
      synRow({ avgSeparation: 3.5, targets: 10 }),
      synRow({ avgSeparation: 4.0, targets: 15 }),
    ];
    const a = computeSeparationBacktest(rows, 2);
    const b = computeSeparationBacktest(rows, 2);
    expect(a[0].rollingWeightedMeanSeparation).toBeCloseTo(b[0].rollingWeightedMeanSeparation!, 6);
    expect(a[0].signal).toBeCloseTo(b[0].signal!, 6);
  });

  it("signal positive for above-league SYNTHETIC players", () => {
    // Player with avgSeparation 6.0 and 40 targets; league mean ~3.0 => positive signal
    const rows: SeparationRow[] = [
      synRow({ playerId: "SYN-SEP-POS", avgSeparation: 6.0, targets: 40 }),
      synRow({ playerId: "SYN-SEP-OTHER", avgSeparation: 2.0, targets: 20 }),
      synRow({ playerId: "SYN-SEP-OTHER2", avgSeparation: 3.0, targets: 20 }),
    ];
    const res = computeSeparationBacktest(rows, 10);
    const pos = res.find((r) => r.playerId === "SYN-SEP-POS")!;
    expect(pos.rollingWeightedMeanSeparation).toBeGreaterThan(5);
    expect(pos.signal !== null ? pos.signal > 0 : false).toBe(true);
  });
});
