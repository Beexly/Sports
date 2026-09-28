/**
 * The season-scoped `player_stats_week` fetch: correctness of what it KEEPS,
 * and the two failure modes that would silently break the current season.
 *
 * WHY. `/api/cron/refresh-player-stats` was killed for memory on a 1GB
 * serverless heap, repeatedly, and STILL after #929 (dpl_DU9K91tetxKe8oa5YdLvKBaBRJd7,
 * measured 2026-09-27). The asset is one 33,447,747-byte file spanning every
 * season since 1999. The fix filters during the parse instead of after it.
 *
 * Three properties are load-bearing, and each has a way of failing quietly:
 *   1. It returns the same rows a post-hoc season filter would have. Anything
 *      else is data loss disguised as a memory win.
 *   2. It still REPORTS coverage of the underlying asset, so the currency merge
 *      backfills per-season files when the combined asset lags. A filtered table
 *      reports the target season and would make the merge think it is current —
 *      which is how new seasons would stop arriving with no error anywhere.
 *   3. It drops the columns nobody reads.
 */
import { describe, it, expect } from "vitest";
import { parseCsv, type CsvTable } from "./nflverse-source";

/** A combined-asset shape: many seasons, the target NOT the newest. */
const COMBINED = [
  "player_id,player_name,position,season,week,season_type,recent_team,attempts,targets,fantasy_points_ppr,junk_column",
  "00-1,Alpha,QB,2024,1,REG,NYJ,10,0,5.0,xxxx",
  "00-2,Beta,WR,2024,1,REG,NYJ,0,3,7.5,xxxx",
  "00-3,Gamma,RB,2025,1,REG,NE,0,0,3.5,xxxx",
  "00-1,Alpha,QB,2025,2,REG,NE,12,0,9.5,xxxx",
  "00-4,Delta,TE,2025,2,REG,NE,0,4,6.5,xxxx",
].join("\n");

const COLUMNS = [
  "player_id",
  "player_name",
  "position",
  "season",
  "week",
  "season_type",
  "recent_team",
  "attempts",
  "targets",
  "fantasy_points_ppr",
];

/** Mirror the production option shape: project + filter + measure coverage. */
function parseScoped(text: string, season: number): { table: CsvTable; covered: number } {
  let covered = 0;
  const table = parseCsv(text, {
    columns: COLUMNS,
    rowFilter: (row) => row["season"] === String(season),
    onRow: (row) => {
      const value = Number(row["season"]);
      if (Number.isFinite(value) && value > covered) covered = value;
    },
  });
  return { table, covered };
}

describe("parseCsv row filter + observer (season-scoped player_stats_week)", () => {
  it("keeps exactly the rows a post-hoc season filter would have kept", () => {
    const scoped = parseScoped(COMBINED, 2025);
    // Baseline uses the SAME projection, so the only difference under test is
    // WHEN the filter runs. Comparing against a full-record parse would fail on
    // the dropped column and prove nothing about row selection.
    const baseline = parseCsv(COMBINED, { columns: COLUMNS }).records.filter(
      (r) => r["season"] === "2025",
    );

    expect(scoped.table.records.length).toBe(3);
    expect(scoped.table.records.map((r) => r["player_id"])).toEqual(["00-3", "00-1", "00-4"]);
    // Byte-identical content, not merely the same count: a projection that
    // mangled a value would pass a length check and corrupt the ingest.
    expect(scoped.table.records).toEqual(baseline);
  });

  it("reports coverage of the WHOLE asset, not of the filtered rows", () => {
    // The regression this pins: a filter applied before the coverage decision
    // makes the merge believe the asset is current whenever the target season
    // appears in it, so the newest season never backfills.
    expect(parseScoped(COMBINED, 2025).covered).toBe(2025);
    expect(parseScoped(COMBINED, 2024).covered).toBe(2025);
    // Target absent from the asset: covered stays at the real watermark, which
    // is strictly greater than the target, and is what stops a merge that would
    // otherwise loop from year 1.
    expect(parseScoped(COMBINED, 2026).covered).toBe(2025);
  });

  it("reports covered=0 when no row has a parseable season (the untrusted bail-out)", () => {
    const noSeason = ["player_id,player_name,season", "00-1,Alpha,", "00-2,Beta,"].join("\n");
    const { covered } = parseScoped(noSeason, 2025);
    expect(covered).toBe(0);
  });

  it("drops unprojected columns and never leaks them", () => {
    const { table } = parseScoped(COMBINED, 2025);
    for (const record of table.records) {
      expect(Object.keys(record)).not.toContain("junk_column");
      expect(Object.keys(record).sort()).toEqual([...COLUMNS].sort());
    }
  });

  it("returns the header intact so a caller can still report the asset shape", () => {
    expect(parseScoped(COMBINED, 2025).table.header).toContain("junk_column");
  });

  it("ignores rowFilter on the full-record path — no silent partial filtering", () => {
    // A caller who forgets `columns` must get EVERY row, not a filtered subset.
    // This is the asymmetry that makes the option safe to add: forgetting the
    // projection degrades memory, never correctness.
    const all = parseCsv(COMBINED, { rowFilter: () => false });
    expect(all.records.length).toBe(5);
  });

  it("ignores onRow on the full-record path", () => {
    let seen = 0;
    parseCsv(COMBINED, { onRow: () => { seen += 1; } });
    expect(seen).toBe(0);
  });

  it("keeps quoted cells intact through projection and filtering", () => {
    const quoted = [
      'player_id,player_name,season,team',
      '00-9,"Al, Phrase",2025,"NE, Patriots"',
      '00-8,Plain,2024,NE',
    ].join("\n");
    const table = parseCsv(quoted, {
      columns: ["player_id", "player_name", "season", "team"],
      rowFilter: (row) => row["season"] === "2025",
    });
    expect(table.records).toEqual([
      { player_id: "00-9", player_name: "Al, Phrase", season: "2025", team: "NE, Patriots" },
    ]);
  });

  it("treats a blank line as a skipped row, not as a filtered one", () => {
    const withBlank = `${COMBINED}\n\n00-5,Eps,TE,2025,3,REG,NE,0,2,4.0,xxxx`;
    const { table } = parseScoped(withBlank, 2025);
    expect(table.records.map((r) => r["player_id"])).toEqual(["00-3", "00-1", "00-4", "00-5"]);
  });

  it("returns zero records (not a throw) when the target season is absent", () => {
    const { table } = parseScoped(COMBINED, 1999);
    expect(table.records).toEqual([]);
  });
});
