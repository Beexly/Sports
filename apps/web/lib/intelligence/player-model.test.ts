import { describe, it, expect } from "vitest";
import { gzipSync } from "node:zlib";
import { buildPlayerModel, loadPlayerModel } from "./player-model";

type Row = Record<string, string>;

function toCsv(rows: Row[]): string {
  const cols = Object.keys(rows[0]!);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => r[c] ?? "").join(","))].join("\n");
}
function wr(o: Partial<Row>): Row {
  return {
    season: "2025", season_type: "REG", week: "1", position: "WR",
    player_id: "x", player_display_name: "X", recent_team: "KC",
    attempts: "0", carries: "0", targets: "13",
    passing_epa: "0", rushing_epa: "0", receiving_epa: "5",
    wopr: "0.40", target_share: "0.20", dakota: "", pacr: "", fantasy_points_ppr: "20",
    ...o,
  };
}

// Three qualified WRs: high process/low production, low process/high production, balanced.
const RECORDS: Row[] = [
  wr({ player_id: "BUY", player_display_name: "Buy Low", week: "1", targets: "14", receiving_epa: "10", wopr: "0.60", target_share: "0.30", fantasy_points_ppr: "8" }),
  wr({ player_id: "BUY", player_display_name: "Buy Low", week: "2", targets: "14", receiving_epa: "10", wopr: "0.60", target_share: "0.30", fantasy_points_ppr: "8" }),
  wr({ player_id: "SELL", player_display_name: "Sell High", week: "1", targets: "13", receiving_epa: "1", wopr: "0.20", target_share: "0.12", fantasy_points_ppr: "25" }),
  wr({ player_id: "SELL", player_display_name: "Sell High", week: "2", targets: "13", receiving_epa: "1", wopr: "0.20", target_share: "0.12", fantasy_points_ppr: "25" }),
  wr({ player_id: "MID", player_display_name: "In Line", week: "1", targets: "13", receiving_epa: "5", wopr: "0.40", target_share: "0.20", fantasy_points_ppr: "20" }),
  wr({ player_id: "MID", player_display_name: "In Line", week: "2", targets: "13", receiving_epa: "5", wopr: "0.40", target_share: "0.20", fantasy_points_ppr: "20" }),
  wr({ player_id: "TINY", player_display_name: "Tiny Sample", week: "1", targets: "5", fantasy_points_ppr: "30" }), // below min plays
];

describe("buildPlayerModel", () => {
  const { profiles, throughWeek } = buildPlayerModel(RECORDS, 2025);
  const byName = (n: string) => profiles.find((p) => p.name === n);

  it("aggregates weeks, drops sub-threshold samples, and reports through-week", () => {
    expect(throughWeek).toBe(2);
    expect(profiles.map((p) => p.name).sort()).toEqual(["Buy Low", "In Line", "Sell High"]); // TINY excluded
    expect(byName("Buy Low")!.touches).toBe(28); // 14 + 14 targets
    expect(byName("Buy Low")!.games).toBe(2);
  });

  it("computes a position-aware composite process grade (0-100)", () => {
    const buy = byName("Buy Low")!;
    expect(buy.processGrade).toBeGreaterThan(70); // top of the WR group on every anchor
    expect(byName("Sell High")!.processGrade).toBeLessThan(30);
  });

  it("flags buy-low when process outruns production", () => {
    expect(byName("Buy Low")!.signal).toBe("buy-low");
  });

  it("flags sell-high when production outruns process", () => {
    expect(byName("Sell High")!.signal).toBe("sell-high");
  });

  it("calls an aligned profile in-line", () => {
    expect(byName("In Line")!.signal).toBe("in-line");
  });

  it("ranks by process grade", () => {
    expect(profiles[0]!.name).toBe("Buy Low");
  });
});

describe("loadPlayerModel", () => {
  it("degrades to source-error when nflverse is unreachable", async () => {
    const r = await loadPlayerModel({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.profiles).toEqual([]);
    expect(r.canPublishProjections).toBe(false);
  });

  // Regression: nflverse release assets are raw-gzip (.csv.gz) with no
  // Content-Encoding, so the body MUST be gunzipped — calling response.text()
  // directly parses gzip bytes as garbage CSV and yields zero profiles.
  it("gunzips a real gzipped CSV body into live profiles (not garbage)", async () => {
    const gz = gzipSync(Buffer.from(toCsv(RECORDS), "utf8"));
    const r = await loadPlayerModel({ season: 2025, fetcher: async () => new Response(gz) });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2025);
    expect(r.profiles.length).toBeGreaterThan(0);
    expect(r.profiles.map((p) => p.name)).toContain("Buy Low");
  });
});
