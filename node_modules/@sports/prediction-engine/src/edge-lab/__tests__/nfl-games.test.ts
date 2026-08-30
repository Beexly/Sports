import { describe, expect, it } from "vitest";
import { americanToDecimal } from "../game-row.js";
import { loadNflGames, NFLDATA_GAMES_CSV_URL } from "../loaders/nfl-games.js";

/**
 * Fixture rows are real nflverse/nfldata games.csv data (fetched live
 * 2026-07-16 against https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv),
 * except the fourth row, which is a clearly-synthetic "not yet played" row
 * (team codes "ZZZ"/"YYY" are not real NFL abbreviations) used only to
 * exercise the null-score path.
 *
 *  - 2007_08_WAS_NE: the KNOWN-SPREAD-SIGN row. 2007 New England, at home,
 *    finished the regular season 16-0 — an unambiguous "home team is the
 *    heavy favorite" case. Real closing line: home (NE) favored by 15,
 *    nfldata's raw spread_line column = 15 (positive), total_line = 46.5,
 *    home_moneyline = -1225, away_moneyline = 825. NE won 52-7. See
 *    ../loaders/nfl-games.ts's header for the full sign-convention writeup:
 *    this loader negates nfldata's positive-home-favored raw column to land
 *    on GameRow's own negative-home-favored convention, so this row must
 *    come out as closing.spreadHome === -15.
 *  - 2024_11_CIN_LAC: a real near-pick'em game (home_moneyline = -110,
 *    away_moneyline = -110) — exercises the -110 -> ~1.9091 decimal
 *    conversion end-to-end through the loader, not just the bare helper.
 *  - 2024_01_BAL_KC: the real 2024 season-opening Thursday-nighter
 *    (Ravens @ Chiefs, KC won 27-20) — a second, ordinary 2024 row, and the
 *    row used to cross-check the ET->UTC kickoff conversion (20:20 ET on a
 *    September date = EDT = UTC-4 = 2024-09-06T00:20:00.000Z).
 */
const NFL_FIXTURE_HEADER = [
  "game_id", "season", "game_type", "week", "gameday", "gametime",
  "home_team", "away_team", "home_score", "away_score",
  "spread_line", "total_line", "home_moneyline", "away_moneyline",
] as const;

// Built from arrays (not hand-joined comma strings) so every row is
// guaranteed to line up 1:1 with NFL_FIXTURE_HEADER — no silent
// off-by-one from miscounted trailing commas on the empty-field row.
const NFL_FIXTURE_ROWS: readonly (readonly string[])[] = [
  ["2007_08_WAS_NE", "2007", "REG", "8", "2007-10-28", "16:15", "NE", "WAS", "52", "7", "15", "46.5", "-1225", "825"],
  ["2024_11_CIN_LAC", "2024", "REG", "11", "2024-11-17", "20:20", "LAC", "CIN", "34", "27", "1", "48", "-110", "-110"],
  ["2024_01_BAL_KC", "2024", "REG", "1", "2024-09-05", "20:20", "KC", "BAL", "27", "20", "3", "46", "-148", "124"],
  ["2024_18_ZZZ_YYY", "2024", "REG", "18", "2025-01-05", "13:00", "YYY", "ZZZ", "", "", "", "", "", ""],
];

for (const row of NFL_FIXTURE_ROWS) {
  if (row.length !== NFL_FIXTURE_HEADER.length) {
    throw new Error(`NFL fixture row has ${row.length} fields, expected ${NFL_FIXTURE_HEADER.length}: ${row.join(",")}`);
  }
}

const NFL_FIXTURE_CSV = [NFL_FIXTURE_HEADER.join(","), ...NFL_FIXTURE_ROWS.map((r) => r.join(","))].join("\n");

function fixtureFetcher(csv: string = NFL_FIXTURE_CSV): typeof fetch {
  return (async (url: string | URL | Request) => {
    expect(String(url)).toBe(NFLDATA_GAMES_CSV_URL);
    return {
      ok: true,
      status: 200,
      text: async () => csv,
    } as Response;
  }) as typeof fetch;
}

describe("americanToDecimal", () => {
  it("converts a positive (underdog) American price", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 3);
  });

  it("converts a negative (favorite) American price", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 3);
  });

  it("treats exactly +/-100 as valid (pick'em, decimal 2.0)", () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0, 6);
    expect(americanToDecimal(-100)).toBeCloseTo(2.0, 6);
  });

  it("guards 0 -> null", () => {
    expect(americanToDecimal(0)).toBeNull();
  });

  it("guards |a| < 100 -> null", () => {
    expect(americanToDecimal(50)).toBeNull();
    expect(americanToDecimal(-50)).toBeNull();
    expect(americanToDecimal(99)).toBeNull();
    expect(americanToDecimal(-99)).toBeNull();
  });

  it("guards non-finite input -> null", () => {
    expect(americanToDecimal(Number.NaN)).toBeNull();
    expect(americanToDecimal(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("loadNflGames", () => {
  it("filters to only the requested season", async () => {
    const rows = await loadNflGames({ seasons: [2024], fetcher: fixtureFetcher() });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.season === 2024)).toBe(true);
    expect(rows.some((r) => r.gameId === "2007_08_WAS_NE")).toBe(false);
  });

  it("returns all fixture rows when both seasons are requested", async () => {
    const rows = await loadNflGames({ seasons: [2007, 2024], fetcher: fixtureFetcher() });
    expect(rows).toHaveLength(4);
  });

  it("applies the documented spread-sign convention (negative = home favored)", async () => {
    const rows = await loadNflGames({ seasons: [2007], fetcher: fixtureFetcher() });
    expect(rows).toHaveLength(1);
    const [game] = rows;
    expect(game).toBeDefined();
    // nfldata raw spread_line = 15 (positive = home NE favored); GameRow's
    // convention is negative = home favored, so this loader must negate it.
    expect(game?.closing.spreadHome).toBe(-15);
    expect(game?.homeTeam).toBe("NE");
    expect(game?.awayTeam).toBe("WAS");
    expect(game?.homeScore).toBe(52);
    expect(game?.awayScore).toBe(7);
  });

  it("converts American moneylines to decimal end-to-end (-110 -> ~1.9091)", async () => {
    const rows = await loadNflGames({ seasons: [2024], fetcher: fixtureFetcher() });
    const game = rows.find((r) => r.gameId === "2024_11_CIN_LAC");
    expect(game).toBeDefined();
    expect(game?.closing.moneylineHomeDecimal).toBeCloseTo(1.9091, 3);
    expect(game?.closing.moneylineAwayDecimal).toBeCloseTo(1.9091, 3);
  });

  it("produces a valid UTC ISO startTime, converted from ET wall clock", async () => {
    const rows = await loadNflGames({ seasons: [2024], fetcher: fixtureFetcher() });
    const game = rows.find((r) => r.gameId === "2024_01_BAL_KC");
    expect(game).toBeDefined();
    const start = game?.startTime ?? "";
    // Must be a valid, round-trippable ISO 8601 UTC string.
    expect(new Date(start).toISOString()).toBe(start);
    // 2024-09-05 20:20 ET, still EDT (UTC-4) in September -> 2024-09-06T00:20:00.000Z.
    expect(start).toBe("2024-09-06T00:20:00.000Z");
  });

  it("converts ET->UTC correctly across the DST boundary (EST row)", async () => {
    const rows = await loadNflGames({ seasons: [2024], fetcher: fixtureFetcher() });
    const game = rows.find((r) => r.gameId === "2024_11_CIN_LAC");
    // 2024-11-17 is after the 2024 DST end date (2024-11-03) -> EST (UTC-5).
    expect(game?.startTime).toBe("2024-11-18T01:20:00.000Z");
  });

  it("reports null scores for a not-yet-played row", async () => {
    const rows = await loadNflGames({ seasons: [2024], fetcher: fixtureFetcher() });
    const game = rows.find((r) => r.gameId === "2024_18_ZZZ_YYY");
    expect(game).toBeDefined();
    expect(game?.homeScore).toBeNull();
    expect(game?.awayScore).toBeNull();
    expect(game?.closing.spreadHome).toBeNull();
    expect(game?.closing.total).toBeNull();
    expect(game?.closing.moneylineHomeDecimal).toBeNull();
    expect(game?.closing.moneylineAwayDecimal).toBeNull();
  });

  it("filters out non-REG rows", async () => {
    const csv = [
      "game_id,season,game_type,week,gameday,gametime,home_team,away_team,home_score,away_score,spread_line,total_line,home_moneyline,away_moneyline",
      "2023_01_KC_DET,2023,REG,1,2023-09-07,20:20,KC,DET,20,21,-2.5,54,-142,120",
      "2023_22_KC_SF,2023,SB,22,2024-02-11,18:30,SF,KC,22,25,-2,47.5,-125,105",
    ].join("\n");
    const rows = await loadNflGames({ seasons: [2023], fetcher: fixtureFetcher(csv) });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.gameId).toBe("2023_01_KC_DET");
  });

  it("throws on a non-ok fetch response", async () => {
    const failingFetcher = (async () =>
      ({ ok: false, status: 500, text: async () => "" }) as Response) as typeof fetch;
    await expect(loadNflGames({ seasons: [2024], fetcher: failingFetcher })).rejects.toThrow(/500/);
  });
});
