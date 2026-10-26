import { describe, expect, it } from "vitest";
import { usageShiftsFromSnaps, type SnapRow } from "../usage-factors";

const row = (team: string, week: string, player: string, position: string, offensePct: number, defensePct = 0): SnapRow =>
  ({ team, week, player, position, offensePct, defensePct });

const SRC = "nflverse snap_counts_2026.csv column offense_pct";
const TS = "2026-10-23T12:00:00Z";

describe("usageShiftsFromSnaps — the measured week-8 reads", () => {
  const rows: SnapRow[] = [
    row("BAL", "1", "Lamar Jackson", "QB", 100), row("BAL", "2", "Lamar Jackson", "QB", 100), row("BAL", "3", "Lamar Jackson", "QB", 100),
    row("BAL", "5", "Tyler Huntley", "QB", 100), row("BAL", "6", "Tyler Huntley", "QB", 100),
    row("BAL", "1", "Zay Flowers", "WR", 31), row("BAL", "2", "Zay Flowers", "WR", 31), row("BAL", "3", "Zay Flowers", "WR", 31),
    row("BAL", "5", "Zay Flowers", "WR", 85), row("BAL", "6", "Zay Flowers", "WR", 85),
    row("BAL", "1", "Rashod Bateman", "WR", 86.3), row("BAL", "2", "Rashod Bateman", "WR", 86.3), row("BAL", "3", "Rashod Bateman", "WR", 86.3),
    row("BAL", "5", "Rashod Bateman", "WR", 55), row("BAL", "6", "Rashod Bateman", "WR", 55),
  ];

  it("emits Lamar->Huntley as a full QB handover (1.00 -> 0)", () => {
    const out = usageShiftsFromSnaps(rows, ["5", "6"], ["1", "2", "3"], SRC, TS);
    const lamar = out.find((s) => s.player === "Lamar Jackson");
    expect(lamar?.delta).toBe(-1);
    expect(lamar?.role).toContain("QB");
  });

  it("emits Flowers +0.54 and Bateman -0.313", () => {
    const out = usageShiftsFromSnaps(rows, ["5", "6"], ["1", "2", "3"], SRC, TS);
    expect(out.find((s) => s.player === "Zay Flowers")?.delta).toBeCloseTo(0.54, 2);
    expect(out.find((s) => s.player === "Rashod Bateman")?.delta).toBeCloseTo(-0.313, 2);
  });

  it("carries the source string on every row", () => {
    for (const s of usageShiftsFromSnaps(rows, ["5", "6"], ["1", "2", "3"], SRC, TS)) {
      expect(s.source).toBe(SRC);
    }
  });

  it("stays silent under the 20-point role-change threshold", () => {
    const steady = [...rows, row("BAL", "1", "D.Henry", "RB", 56.5), row("BAL", "5", "D.Henry", "RB", 56.5)];
    const out = usageShiftsFromSnaps(steady, ["5", "6"], ["1", "2", "3"], SRC, TS);
    expect(out.find((s) => s.player === "D.Henry")).toBeUndefined();
  });
});
