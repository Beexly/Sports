/**
 * C-199. The real NFL 2026 Week 1 slate, collapsed.
 *
 * This is not a synthetic fixture. Every row below was read from production on
 * 2026-09-08 (read-only SELECT) two days before the season opener. The `games`
 * table holds **48 rows for 16 real contests** - exactly three per fixture,
 * with no tombstones - because three writers key the same contest under three
 * different externalId shapes:
 *
 *   A  opaque hash id      created 2026-05-22, carries the picks and ~31k odds
 *   B  espn:nfl:<id>       created 2026-08-2x, 0 picks, 0 odds
 *   C  espn:americanfootball_nfl:<id>  created 2026-08-30, 0 picks, 6,522 odds
 *
 * Week 1 is the largest slate of the year and the one every surface will be
 * judged on. A cap applied to ROWS instead of FIXTURES spends two thirds of
 * itself on duplicates - the defect class this repo has now hit five times
 * (C-153, C-161, C-169, C-170, C-171). This test pins the real numbers so that
 * regression is caught against the actual slate, not a toy one.
 *
 * The survivor must be the A row every time: `selectCanonical`'s rule is most
 * picks first, and A is the only writer with any.
 */
import { describe, it, expect } from "vitest";
import { collapseGameRowsToFixtures, type FixtureCollapseRow } from "../fixture-collapse.js";

/** [home, away, kickoff ISO, espnId, picksOnA] - real production values. */
const WEEK1: ReadonlyArray<readonly [string, string, string, string, number]> = [
  ["Seattle Seahawks", "New England Patriots", "2026-09-10T00:20:00.000Z", "401872656", 2],
  ["Los Angeles Rams", "San Francisco 49ers", "2026-09-11T00:35:00.000Z", "401872657", 2],
  ["Carolina Panthers", "Chicago Bears", "2026-09-13T17:00:00.000Z", "401872661", 2],
  ["Cincinnati Bengals", "Tampa Bay Buccaneers", "2026-09-13T17:00:00.000Z", "401872925", 2],
  ["Detroit Lions", "New Orleans Saints", "2026-09-13T17:00:00.000Z", "401872923", 3],
  ["Houston Texans", "Buffalo Bills", "2026-09-13T17:00:00.000Z", "401872660", 2],
  ["Indianapolis Colts", "Baltimore Ravens", "2026-09-13T17:00:00.000Z", "401872659", 2],
  ["Jacksonville Jaguars", "Cleveland Browns", "2026-09-13T17:00:00.000Z", "401872922", 3],
  ["Pittsburgh Steelers", "Atlanta Falcons", "2026-09-13T17:00:00.000Z", "401872658", 2],
  ["Tennessee Titans", "New York Jets", "2026-09-13T17:00:00.000Z", "401872924", 2],
  ["Las Vegas Raiders", "Miami Dolphins", "2026-09-13T20:25:00.000Z", "401872928", 2],
  ["Los Angeles Chargers", "Arizona Cardinals", "2026-09-13T20:25:00.000Z", "401872926", 3],
  ["Minnesota Vikings", "Green Bay Packers", "2026-09-13T20:25:00.000Z", "401872927", 2],
  ["Philadelphia Eagles", "Washington Commanders", "2026-09-13T20:25:00.000Z", "401872929", 2],
  ["New York Giants", "Dallas Cowboys", "2026-09-14T00:20:00.000Z", "401872930", 2],
  ["Kansas City Chiefs", "Denver Broncos", "2026-09-15T00:15:00.000Z", "401872931", 2],
];

function slateRows(): FixtureCollapseRow[] {
  const rows: FixtureCollapseRow[] = [];
  for (const [home, away, kickoff, espnId, picks] of WEEK1) {
    const commenceTime = new Date(kickoff);
    const base = { sportId: "nfl", homeTeamName: home, awayTeamName: away, commenceTime,
      mergedIntoGameId: null, sport: { key: "americanfootball_nfl" } } as const;
    rows.push({ ...base, id: `A-${espnId}`, externalId: `hash-${espnId}`,
      createdAt: new Date("2026-05-22T00:34:29.000Z"), _count: { picks, odds: 31000 } });
    rows.push({ ...base, id: `B-${espnId}`, externalId: `espn:nfl:${espnId}`,
      createdAt: new Date("2026-08-23T17:02:16.000Z"), _count: { picks: 0, odds: 0 } });
    rows.push({ ...base, id: `C-${espnId}`, externalId: `espn:americanfootball_nfl:${espnId}`,
      createdAt: new Date("2026-08-30T04:07:19.000Z"), _count: { picks: 0, odds: 6522 } });
  }
  return rows;
}

describe("NFL 2026 Week 1 — the real production slate", () => {
  it("holds 48 rows for 16 contests, exactly three per fixture", () => {
    const rows = slateRows();
    expect(rows).toHaveLength(48);
    expect(WEEK1).toHaveLength(16);
  });

  it("collapses 48 rows to exactly 16 fixtures", () => {
    const out = collapseGameRowsToFixtures(slateRows());
    expect(out).toHaveLength(16);
    const matchups = out.map((r) => `${r.homeTeamName}|${r.awayTeamName}`);
    expect(new Set(matchups).size).toBe(16);
  });

  it("keeps the pick-carrying row as the survivor for every fixture", () => {
    // selectCanonical's first tiebreak is most picks, and only the A rows have
    // any. Picking B or C would strand every published Week 1 pick.
    const out = collapseGameRowsToFixtures(slateRows());
    for (const r of out) expect(r.id.startsWith("A-"), `survivor was ${r.id}`).toBe(true);
  });

  it("does not depend on the order the rows come back from the database", () => {
    const forward = collapseGameRowsToFixtures(slateRows()).map((r) => r.id).sort();
    const reversed = collapseGameRowsToFixtures([...slateRows()].reverse()).map((r) => r.id).sort();
    expect(reversed).toEqual(forward);
  });

  it("CAP BEFORE COLLAPSE loses two thirds of the slate; cap after does not", () => {
    // The whole point, on the biggest slate of the year. A surface promising
    // 12 games that caps rows first shows 4.
    const rows = slateRows();
    const CAP = 12;
    const wrong = collapseGameRowsToFixtures(rows.slice(0, CAP));
    const right = collapseGameRowsToFixtures(rows).slice(0, CAP);
    expect(wrong).toHaveLength(4);
    expect(right).toHaveLength(12);
  });
});
