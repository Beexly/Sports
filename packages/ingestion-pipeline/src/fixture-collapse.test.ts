import { describe, expect, it } from "vitest";
import {
  collapseGameRowsToFixtures,
  isBetterFixtureCanonical,
  type FixtureCollapseRow,
} from "./fixture-collapse.js";

/**
 * C-166. The signal slate took the next 80 GAME ROWS and treated each as a
 * fixture. Measured on production 2026-09-08: 744 rows over 658 real fixtures
 * inside the slate's own window, the cap reaching 71 fixtures, and 9 of the 80
 * slots spent on duplicates. Every number below is a labelled fixture, not a
 * production value.
 */

const KICKOFF = new Date("2026-09-14T17:00:00.000Z");

function row(over: Partial<FixtureCollapseRow> & { id: string }): FixtureCollapseRow {
  return {
    externalId: `odds-${over.id}`,
    sportId: "sport-nfl",
    homeTeamName: "Kansas City Chiefs",
    awayTeamName: "Denver Broncos",
    commenceTime: KICKOFF,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    mergedIntoGameId: null,
    sport: { key: "americanfootball_nfl" },
    _count: { picks: 0, odds: 0, oddsLineSnapshots: 0 },
    ...over,
  };
}

describe("collapseGameRowsToFixtures", () => {
  it("collapses the three externalId shapes of one contest to a single fixture", () => {
    // The exact production shape: game-identity.ts documents that the same
    // contest arrives as an Odds API 32-hex id, an `espn:<sportKey>:<id>` and an
    // `espn:<short>:<id>`. Feed clocks differ by minutes, never hours.
    const out = collapseGameRowsToFixtures([
      row({ id: "a", externalId: "9f2c4d1e8b7a6c5d4e3f2a1b0c9d8e7f" }),
      row({
        id: "b",
        externalId: "espn:americanfootball_nfl:401772936",
        commenceTime: new Date("2026-09-14T17:05:00.000Z"),
      }),
      row({
        id: "c",
        externalId: "espn:nfl:401772936",
        commenceTime: new Date("2026-09-14T16:55:00.000Z"),
      }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("keeps genuinely different fixtures", () => {
    // The control. A collapse that ate everything would also pass the test
    // above.
    const out = collapseGameRowsToFixtures([
      row({ id: "a" }),
      row({ id: "b", homeTeamName: "Buffalo Bills", awayTeamName: "New York Jets" }),
      row({ id: "c", sportId: "sport-mlb", sport: { key: "baseball_mlb" } }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("does NOT collapse an MLB doubleheader", () => {
    // Two DIFFERENT contests, same teams, same day, hours apart. game-identity
    // gives baseball a 2h twin window for exactly this; collapsing them would
    // drop a real game off the slate.
    const first = new Date("2026-06-11T17:10:00.000Z");
    const out = collapseGameRowsToFixtures([
      row({
        id: "game1",
        sportId: "sport-mlb",
        sport: { key: "baseball_mlb" },
        homeTeamName: "Boston Red Sox",
        awayTeamName: "New York Yankees",
        commenceTime: first,
      }),
      row({
        id: "game2",
        sportId: "sport-mlb",
        sport: { key: "baseball_mlb" },
        homeTeamName: "Boston Red Sox",
        awayTeamName: "New York Yankees",
        commenceTime: new Date(first.getTime() + 4 * 60 * 60 * 1000),
      }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["game1", "game2"]);
  });

  it("does NOT collapse two rows that disagree about who is home", () => {
    // A flipped pair is the same contest, and that is exactly why it is unsafe:
    // home/away drive the sign of every line derived from the row. Same
    // fail-closed rule resolveCanonicalGame already applies - keep both, never
    // guess an orientation.
    const out = collapseGameRowsToFixtures([
      row({ id: "aligned", homeTeamName: "Kansas City Chiefs", awayTeamName: "Denver Broncos" }),
      row({ id: "flipped", homeTeamName: "Denver Broncos", awayTeamName: "Kansas City Chiefs" }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["aligned", "flipped"]);
  });

  it("keeps the row a later merge would choose as survivor, not the first seen", () => {
    // THE REASON THE SURVIVOR RULE IS selectCanonical's AND NOT A NEW ONE
    // (C-163): picks this lane writes today land on the row the merge would
    // keep, so each one is a pick that merge no longer strands.
    const out = collapseGameRowsToFixtures([
      row({ id: "bare", externalId: "espn:nfl:401772936" }),
      row({ id: "has-picks", _count: { picks: 2, odds: 0, oddsLineSnapshots: 0 } }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["has-picks"]);
  });

  it("preserves input order, because the caller slices a fixture cap off the front", () => {
    // Re-sorting here would silently change WHICH fixtures make the slate, and
    // the caller orders by kickoff for a reason.
    const later = new Date(KICKOFF.getTime() + 48 * 60 * 60 * 1000);
    const out = collapseGameRowsToFixtures([
      row({ id: "early" }),
      row({ id: "late", homeTeamName: "Buffalo Bills", awayTeamName: "New York Jets", commenceTime: later }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["early", "late"]);
  });

  it("keeps a row whose commenceTime is unusable instead of throwing", () => {
    // Both callers are read paths whose catch returns an EMPTY board, so a
    // TypeError in here would silently blank a public surface. Fail open to
    // today's behaviour - the row survives, uncollapsed.
    const rows = [
      row({ id: "ok" }),
      { ...row({ id: "broken" }), commenceTime: undefined as unknown as Date },
    ];
    expect(collapseGameRowsToFixtures(rows).map((r) => r.id)).toEqual(["ok", "broken"]);
  });
});

describe("isBetterFixtureCanonical", () => {
  const base = row({ id: "held" });

  it("ranks most picks first", () => {
    expect(
      isBetterFixtureCanonical(row({ id: "c", _count: { picks: 1, odds: 0, oddsLineSnapshots: 0 } }), base),
    ).toBe(true);
  });

  it("then most odds children, summed across both tables", () => {
    expect(
      isBetterFixtureCanonical(row({ id: "c", _count: { picks: 0, odds: 1, oddsLineSnapshots: 3 } }), base),
    ).toBe(true);
  });

  it("then prefers a non-ESPN externalId, because odds ingestion writes to that row", () => {
    const espnHeld = row({ id: "held", externalId: "espn:nfl:1" });
    expect(isBetterFixtureCanonical(row({ id: "c", externalId: "abc123" }), espnHeld)).toBe(true);
    expect(isBetterFixtureCanonical(espnHeld, row({ id: "c", externalId: "abc123" }))).toBe(false);
  });

  it("then the oldest row, and a tie keeps what is already held", () => {
    expect(
      isBetterFixtureCanonical(row({ id: "c", createdAt: new Date("2026-08-01T00:00:00.000Z") }), base),
    ).toBe(true);
    expect(isBetterFixtureCanonical(row({ id: "c" }), base)).toBe(false);
  });

  it("treats an absent _count as zero rather than as unknown", () => {
    // Prisma omits the relation counts when the caller does not select them.
    // Silently ranking such a row ABOVE one with real counts would invert the
    // rule, so absence has to mean zero and be pinned as meaning zero.
    const noCounts = row({ id: "c", _count: null });
    expect(
      isBetterFixtureCanonical(noCounts, row({ id: "held", _count: { picks: 1, odds: 0, oddsLineSnapshots: 0 } })),
    ).toBe(false);
  });
});
