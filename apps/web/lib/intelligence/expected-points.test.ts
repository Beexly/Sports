import { describe, it, expect } from "vitest";
import { buildExpectedPoints, loadExpectedPoints } from "./expected-points";

type Row = Record<string, string>;
function wk(o: Partial<Row>): Row {
  return {
    season: "2025", season_type: "REG", week: "1", position: "WR",
    player_id: "x", full_name: "X", posteam: "KC",
    total_fantasy_points_exp: "11", total_fantasy_points_diff: "0",
    ...o,
  };
}

const RECORDS: Row[] = [
  wk({ player_id: "BUY", full_name: "Buy Low", week: "1", total_fantasy_points_exp: "15", total_fantasy_points_diff: "-8" }),
  wk({ player_id: "BUY", full_name: "Buy Low", week: "2", total_fantasy_points_exp: "15", total_fantasy_points_diff: "-8" }),
  wk({ player_id: "SELL", full_name: "Sell High", week: "1", total_fantasy_points_exp: "8", total_fantasy_points_diff: "12" }),
  wk({ player_id: "SELL", full_name: "Sell High", week: "2", total_fantasy_points_exp: "8", total_fantasy_points_diff: "12" }),
  wk({ player_id: "MID", full_name: "In Line", week: "1", total_fantasy_points_exp: "11", total_fantasy_points_diff: "1" }),
  wk({ player_id: "MID", full_name: "In Line", week: "2", total_fantasy_points_exp: "11", total_fantasy_points_diff: "1" }),
  wk({ player_id: "TINY", full_name: "Tiny", week: "1", total_fantasy_points_exp: "5", total_fantasy_points_diff: "0" }), // below MIN_XFP
];

describe("buildExpectedPoints", () => {
  const { rows, throughWeek } = buildExpectedPoints(RECORDS, 2025);
  const by = (n: string) => rows.find((r) => r.name === n);

  it("aggregates expected + actual (exp+diff), drops sub-threshold, reports week", () => {
    expect(throughWeek).toBe(2);
    expect(rows.map((r) => r.name).sort()).toEqual(["Buy Low", "In Line", "Sell High"]); // TINY excluded
    expect(by("Buy Low")!.xfpTotal).toBe(30);
    expect(by("Buy Low")!.actualTotal).toBe(14); // 30 + (-16)
    expect(by("Sell High")!.actualTotal).toBe(40); // 16 + 24
  });

  it("flags buy-low when expected outruns actual", () => {
    expect(by("Buy Low")!.signal).toBe("buy-low");
  });

  it("flags sell-high when actual outruns expected (conversion luck)", () => {
    expect(by("Sell High")!.signal).toBe("sell-high");
  });

  it("calls an earned line in-line", () => {
    expect(by("In Line")!.signal).toBe("in-line");
  });

  it("falls back to rush+rec components when total_* columns are absent", () => {
    const { rows: r2 } = buildExpectedPoints(
      [
        { season: "2025", season_type: "REG", week: "1", position: "RB", player_id: "R", full_name: "RB One", posteam: "ATL", rush_fantasy_points_exp: "10", rec_fantasy_points_exp: "6", rush_fantasy_points_diff: "1", rec_fantasy_points_diff: "0" },
        { season: "2025", season_type: "REG", week: "2", position: "RB", player_id: "R", full_name: "RB One", posteam: "ATL", rush_fantasy_points_exp: "10", rec_fantasy_points_exp: "6", rush_fantasy_points_diff: "1", rec_fantasy_points_diff: "0" },
      ],
      2025,
    );
    expect(r2[0]!.xfpTotal).toBe(32); // (10+6) * 2
    expect(r2[0]!.actualTotal).toBe(34); // 32 + 2
  });
});

describe("loadExpectedPoints", () => {
  it("degrades to source-error when ff_opportunity is unreachable", async () => {
    const r = await loadExpectedPoints({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
    expect(r.canPublishProjections).toBe(false);
  });
});
