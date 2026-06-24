import { describe, it, expect } from "vitest";
import { buildReceivingOpportunity, loadReceivingOpportunity } from "./receiving-opportunity";

type Row = Record<string, string>;
function wk(o: Partial<Row>): Row {
  return {
    season: "2025", season_type: "REG", week: "1",
    player_id: "x", player_display_name: "X", recent_team: "KC", position: "WR",
    targets: "10", receptions: "6", receiving_yards: "60", receiving_tds: "0", receiving_air_yards: "80",
    wopr: "0.45", target_share: "0.20", air_yards_share: "0.25",
    ...o,
  };
}

// Three qualified WRs: A = opportunity≫production, B = production≫opportunity, C = balanced.
const RECORDS: Row[] = [
  // A — high WOPR, low yards (buy-low)
  wk({ player_id: "A", player_display_name: "Aaron A", week: "1", targets: "12", receptions: "6", receiving_yards: "40", receiving_air_yards: "120", wopr: "0.70" }),
  wk({ player_id: "A", player_display_name: "Aaron A", week: "2", targets: "12", receptions: "6", receiving_yards: "40", receiving_air_yards: "120", wopr: "0.70" }),
  // B — low WOPR, high yards (sell-high)
  wk({ player_id: "B", player_display_name: "Bram B", week: "1", targets: "11", receptions: "8", receiving_yards: "120", receiving_tds: "2", receiving_air_yards: "60", wopr: "0.20" }),
  wk({ player_id: "B", player_display_name: "Bram B", week: "2", targets: "11", receptions: "8", receiving_yards: "120", receiving_tds: "2", receiving_air_yards: "60", wopr: "0.20" }),
  // C — balanced
  wk({ player_id: "C", player_display_name: "Cy C", week: "1", targets: "10", receptions: "7", receiving_yards: "75", receiving_tds: "1", receiving_air_yards: "90", wopr: "0.45" }),
  wk({ player_id: "C", player_display_name: "Cy C", week: "2", targets: "10", receptions: "7", receiving_yards: "75", receiving_tds: "1", receiving_air_yards: "90", wopr: "0.45" }),
  // D — below MIN_TARGETS, excluded
  wk({ player_id: "D", player_display_name: "Dee D", week: "1", targets: "8", wopr: "0.30" }),
];

describe("buildReceivingOpportunity", () => {
  const { rows, throughWeek } = buildReceivingOpportunity(RECORDS, 2025);
  const byName = (n: string) => rows.find((r) => r.name === n);

  it("aggregates weekly rows and drops sub-threshold players", () => {
    expect(throughWeek).toBe(2);
    expect(rows.map((r) => r.name).sort()).toEqual(["Aaron A", "Bram B", "Cy C"]); // D excluded
    expect(byName("Aaron A")!.targets).toBe(24);
    expect(byName("Aaron A")!.games).toBe(2);
  });

  it("computes season aDOT, RACR, and catch rate from sums", () => {
    const a = byName("Aaron A")!;
    expect(a.aDOT).toBe(10); // 240 air yards / 24 targets
    expect(a.racr).toBe(0.33); // 80 / 240
    expect(a.catchRate).toBe(0.5); // 12 / 24
  });

  it("adds process-grade xCatch and xTD regression signals", () => {
    const a = byName("Aaron A")!;
    const b = byName("Bram B")!;
    expect(a.receivingTds).toBe(0);
    expect(a.xCatch).toBeGreaterThan(a.receptions);
    expect(a.xTd).toBeGreaterThan(a.receivingTds);
    expect(a.xTdDelta).toBeGreaterThan(0);
    expect(a.regressionScore).toBeGreaterThan(0);
    expect(a.breakoutScore).toBe(a.regressionScore);
    expect(a.note).toContain("xCatch/xTD");
    expect(b.receivingTds).toBe(4);
    expect(b.xTdDelta).toBeLessThan(0);
    expect(b.regressionScore).toBeLessThan(0);
    expect(b.breakoutScore).toBe(0);
  });

  it("flags buy-low when opportunity outruns production", () => {
    expect(byName("Aaron A")!.signal).toBe("buy-low");
  });

  it("flags sell-high when production outruns opportunity", () => {
    expect(byName("Bram B")!.signal).toBe("sell-high");
  });

  it("calls a role-earned line stable", () => {
    expect(byName("Cy C")!.signal).toBe("stable");
  });

  it("sorts by WOPR (opportunity) descending", () => {
    expect(rows[0]!.name).toBe("Aaron A");
  });
});

describe("loadReceivingOpportunity", () => {
  it("degrades to source-error when nflverse is unreachable", async () => {
    const r = await loadReceivingOpportunity({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
    expect(r.canPublishProjections).toBe(false);
  });
});
