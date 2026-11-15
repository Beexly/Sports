import { describe, expect, it } from "vitest";
import { buildRankingBundle, type TeamGame, type MarketSlateRow } from "../index";

/**
 * The composite builder is the only entry point most call sites use, and its
 * one non-obvious promise is the doctrine line at the top of the package:
 * the coach path is odds-free unless a slate is supplied. A regression that
 * starts reading prices by default would change every pre-lock ranking read,
 * so that promise is pinned here rather than left to the kernels' own suites.
 */

// A CONNECTED schedule: Colley/Massey solve a linear system, and a schedule
// split into two components has no unique solution (see the last test).
const GAMES: TeamGame[] = [
  { home: "KC", away: "BUF", homeScore: 27, awayScore: 24 },
  { home: "SF", away: "DAL", homeScore: 30, awayScore: 10 },
  { home: "KC", away: "SF", homeScore: 20, awayScore: 23 },
  { home: "DAL", away: "BUF", homeScore: 13, awayScore: 19 },
  { home: "BUF", away: "SF", homeScore: 17, awayScore: 27 },
  { home: "DAL", away: "KC", homeScore: 16, awayScore: 31 },
];

describe("@sports/ranking — buildRankingBundle", () => {
  it("runs the odds-free coach path by default: no slate, no market inversion", () => {
    const bundle = buildRankingBundle({ games: GAMES });
    expect(bundle.marketStrengths).toBeNull();
    expect(bundle.competitorDeltas).toBeNull();
  });

  it("inverts the market only when a slate is actually supplied", () => {
    const slate: MarketSlateRow[] = [
      { home: "KC", away: "BUF", homeSpread: -2.5 },
      { home: "SF", away: "DAL", homeSpread: -7 },
    ];
    const bundle = buildRankingBundle({ games: GAMES, slate });
    expect(bundle.marketStrengths).not.toBeNull();
  });

  it("returns a rating for every team that appears in the game log", () => {
    const bundle = buildRankingBundle({ games: GAMES });
    const teams = new Set(GAMES.flatMap((g) => [g.home, g.away]));
    for (const kernel of [bundle.bradleyTerry, bundle.colley, bundle.massey, bundle.srs]) {
      for (const team of teams) expect(Object.keys(kernel)).toContain(team);
    }
  });

  it("orders head-to-head strength by the settled results, not by alphabet", () => {
    const bundle = buildRankingBundle({ games: GAMES });
    // SF is 3-0 with the largest point differential in the sample; DAL is 0-3.
    expect(bundle.srs["SF"]).toBeGreaterThan(bundle.srs["DAL"] ?? -Infinity);
  });

  it("throws on a disconnected schedule instead of inventing a solution", () => {
    // Two games, four teams, no shared opponent: the Colley system is singular
    // and gaussSolve refuses rather than returning a NaN rating.
    expect(() =>
      buildRankingBundle({
        games: [
          { home: "KC", away: "BUF", homeScore: 27, awayScore: 24 },
          { home: "SF", away: "DAL", homeScore: 30, awayScore: 10 },
        ],
      }),
    ).toThrow(/singular/i);
  });

  it("fits a Kalman rating per team and a Belichick bundle even with no metric inputs", () => {
    const bundle = buildRankingBundle({ games: GAMES });
    expect(Object.keys(bundle.kalman).length).toBeGreaterThan(0);
    expect(bundle.belichick).toBeTruthy();
  });
});