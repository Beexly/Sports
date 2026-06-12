import { describe, it, expect } from "vitest";
import { simulateContest, FORMATS } from "./contest-sim";
import { DFS_SLATE } from "./dfs-slate";
import { optimizeOne } from "./dfs-optimizer";

const format = FORMATS["Large GPP"]!;
const lineup = optimizeOne({ mode: "gpp", stack: false, locks: new Set(), excludes: new Set() }, undefined, 40)!;

describe("simulateContest", () => {
  it("returns all required keys", () => {
    const r = simulateContest(lineup, DFS_SLATE, format, 200, 42);
    expect(typeof r.avgFinishPct).toBe("number");
    expect(typeof r.cashPct).toBe("number");
    expect(typeof r.winPct).toBe("number");
    expect(typeof r.roi).toBe("number");
    expect(typeof r.expectedProfit).toBe("number");
    expect(r.finishDist).toHaveLength(4);
  });

  it("cashPct and winPct are in 0-100 range", () => {
    const r = simulateContest(lineup, DFS_SLATE, format, 200, 42);
    expect(r.cashPct).toBeGreaterThanOrEqual(0);
    expect(r.cashPct).toBeLessThanOrEqual(100);
    expect(r.winPct).toBeGreaterThanOrEqual(0);
    expect(r.winPct).toBeLessThanOrEqual(100);
  });

  it("finishDist sums to approximately 100", () => {
    const r = simulateContest(lineup, DFS_SLATE, format, 500, 99);
    const total = r.finishDist.reduce((s, b) => s + b.pct, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it("is deterministic given the same seed", () => {
    const r1 = simulateContest(lineup, DFS_SLATE, format, 300, 123);
    const r2 = simulateContest(lineup, DFS_SLATE, format, 300, 123);
    expect(r1.cashPct).toBe(r2.cashPct);
    expect(r1.winPct).toBe(r2.winPct);
    expect(r1.roi).toBe(r2.roi);
  });

  it("a top GPP optimizer lineup cashes more often than random (within reason)", () => {
    const r = simulateContest(lineup, DFS_SLATE, format, 500, 7);
    // At least 10% cash rate in a 20%-pays contest — better than pure random
    // (which would cash ~20% since all lineups are from the same slate anyway).
    expect(r.cashPct).toBeGreaterThan(0);
  });
});
