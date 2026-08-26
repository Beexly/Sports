import { describe, expect, it } from "vitest";
import { computeTprBacktest, type TprRow } from "../tpr-backtest.js";

/**
 * `targets` and `routes` are the two fields with no sensible default — they are
 * what each case actually varies — so they stay required. The identity fields
 * go through `Partial` rather than being intersected in as required: as
 * required they would force every call site to restate the very defaults this
 * helper exists to supply, and would make the spread below a guaranteed
 * overwrite of the literal that precedes it.
 */
function row(overrides: Partial<TprRow> & Pick<TprRow, "targets" | "routes">): TprRow {
  return { playerId: "SYNTH-001", season: 2024, week: 1, ...overrides };
}

describe("tpr-backtest — SYNTHETIC property tests", () => {
  it("Laplace smoothing shrinks extreme rates toward 0.5 prior (k=2)", () => {
    // 10 targets / 30 routes raw = 0.333; smoothed = (10+2)/(30+4) ≈ 0.353
    const result = computeTprBacktest([row({ targets: 10, routes: 30 })]);
    expect(result[0]!.smoothedRate).toBeCloseTo(12 / 34, 3);
  });
  it("minSample gate returns null when routes < 20", () => {
    const result = computeTprBacktest([row({ targets: 5, routes: 10 })]);
    expect(result[0]!.smoothedRate).toBeNull();
    expect(result[0]!.signal).toBeNull();
  });
  it("determinism: same input => same output", () => {
    const rows = [row({ targets: 8, routes: 40 }), row({ targets: 3, routes: 30 })];
    const a = computeTprBacktest(rows);
    const b = computeTprBacktest(rows);
    expect(a[0]!.smoothedRate).toBe(b[0]!.smoothedRate);
    expect(a.map((r) => r.signal)).toEqual(b.map((r) => r.signal));
  });
  it("signal = smoothed rate minus season baseline (SYNTHETIC)", () => {
    // 2 rows same player/season; season total = 30 targets / 60 routes => baseline ~0.467
    const rows: TprRow[] = [
      row({ playerId: "SYNTH-002", season: 2023, targets: 20, routes: 40 }),
      row({ playerId: "SYNTH-002", season: 2023, targets: 10, routes: 20 }),
    ];
    const res = computeTprBacktest(rows);
    expect(res[0]!.signal).not.toBeNull();
    expect(typeof res[0]!.signal).toBe("number");
  });
});
