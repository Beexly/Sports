import { describe, expect, it } from "vitest";
import { usageShiftsFromPfr, type PfrDefRow } from "../usage-factors";

const row = (week: string, name: string, position: string, pr: number, sk = 0): PfrDefRow =>
  ({ team: "BAL", week, pfrPlayerName: name, position, defPressures: pr, defSacks: sk });

const SRC = "nflverse pfr_advstats advstats_week_def_2026.csv columns def_pressures, def_sacks";
const TS = "2026-10-23T12:00:00Z";

// BAL defense, measured shape: team pressure totals 15 (w1-3), 12 (w5-6)
const rows: PfrDefRow[] = [
  row("1", "Tavius Robinson", "LB", 0, 0), row("2", "Tavius Robinson", "LB", 1, 0), row("3", "Tavius Robinson", "LB", 0, 0),
  row("5", "Tavius Robinson", "LB", 2, 2), row("6", "Tavius Robinson", "LB", 2, 0),
  row("1", "Odafe Oweh", "EDGE", 5, 1), row("2", "Odafe Oweh", "EDGE", 4, 0), row("3", "Odafe Oweh", "EDGE", 3, 1),
  row("5", "Odafe Oweh", "EDGE", 1, 0), row("6", "Odafe Oweh", "EDGE", 2, 0),
];

describe("usageShiftsFromPfr — pressure-share role changes", () => {
  it("emits Robinson's rise: 6.7% -> 33.3% of team pressures", () => {
    const out = usageShiftsFromPfr(rows, ["5", "6"], ["1", "2", "3"], SRC, TS);
    const t = out.find((s) => s.player === "Tavius Robinson");
    expect(t?.recentShare).toBeGreaterThan(t?.priorShare ?? 1);
    expect(t?.delta ?? 0).toBeGreaterThanOrEqual(0.2);
    expect(t?.role).toContain("pressure share");
  });

  it("emits Oweh's fade: 80% -> 25% of team pressures", () => {
    const out = usageShiftsFromPfr(rows, ["5", "6"], ["1", "2", "3"], SRC, TS);
    const o = out.find((s) => s.player === "Odafe Oweh");
    expect(o?.recentShare).toBeLessThan(o?.priorShare ?? 1);
  });

  it("carries the source string on every row", () => {
    for (const s of usageShiftsFromPfr(rows, ["5", "6"], ["1", "2", "3"], SRC, TS)) {
      expect(s.source).toBe(SRC);
    }
  });
});
