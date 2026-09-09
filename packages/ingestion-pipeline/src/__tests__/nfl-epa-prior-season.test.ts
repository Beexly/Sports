import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * C-235. NFL had NO independent fair value for the first four weeks of every
 * season, so the MONEYLINE-only signal slate produced no NFL moneylines at all
 * for the opening month.
 *
 * Two facts combined to cause it. `tryNflEpaFairValue` looked up the CURRENT
 * nflverse season only, and `nflEpaToWinProbs` refuses a team with fewer than
 * NFL_EPA_MIN_GAMES (4) games. In Week 1 the current season has zero rows; from
 * Weeks 2 to 4 no team has met the floor. The only other NFL independent is
 * ESPN PowerIndex, rights-gated closed by default. Measured on production
 * 2026-09-08: 6 NFL games in the 72h window and 0 MONEYLINE picks, two days
 * before Week 1 kickoff.
 *
 * The fix falls back to the PRIOR season while the current one cannot meet the
 * floor. These tests pin the three properties that keep that honest: it is
 * self-limiting, it reaches back exactly one season, and it never presents last
 * season's form under this season's provenance.
 *
 * Mock pattern copied from build-independent-fair-values-rights-gate.test.ts.
 */

const mocks = vi.hoisted(() => ({
  teamGameLogFindMany: vi.fn().mockResolvedValue([]),
  teamGameEfficiencyFindMany: vi.fn(),
  opponentAdjustedRatings: vi.fn(),
  nflEpaToIndependentFairValue: vi.fn(),
  resolveNflWeek: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    teamGameLog: { findMany: mocks.teamGameLogFindMany },
    teamGameEfficiency: { findMany: mocks.teamGameEfficiencyFindMany },
  },
}));

vi.mock("@sports/data-ingestion", () => ({
  getTeamScoringRecords: vi.fn().mockResolvedValue([]),
  getLeagueAverageScored: vi.fn().mockResolvedValue(null),
  KalshiClient: vi.fn().mockImplementation(() => ({
    getFairValue: vi.fn().mockResolvedValue(null),
  })),
  toIndependentFairValue: vi.fn().mockReturnValue(null),
  sportKeyToPowerIndexLeague: vi.fn().mockReturnValue(null),
  getCachedEspnPowerIndexMap: vi.fn().mockResolvedValue(new Map()),
  lookupTeamFpi: vi.fn().mockReturnValue(null),
  defaultPowerIndexSeason: vi.fn().mockReturnValue(2026),
  sportKeyToKalshiLeagueCode: vi.fn().mockReturnValue(null),
  getSharedClubEloClient: vi.fn(),
  isClubEloSport: vi.fn().mockReturnValue(false),
  isIngestible: vi.fn().mockReturnValue(false),
  isPolymarketIndependentEnabled: vi.fn().mockReturnValue(false),
  PolymarketIndependentClient: vi.fn(),
  resolveNflWeek: mocks.resolveNflWeek,
  fetchMlbStandings: vi.fn().mockResolvedValue([]),
  buildMlbWinPctLookup: vi.fn().mockReturnValue(new Map()),
  lookupMlbWinPct: vi.fn().mockReturnValue(null),
}));

vi.mock("@sports/prediction-engine", () => ({
  isPoissonValidSport: vi.fn().mockReturnValue(false),
  poissonIndependentFairValue: vi.fn().mockReturnValue(null),
  isDixonColesValidSport: vi.fn().mockReturnValue(false),
  dixonColesIndependentFairValue: vi.fn().mockReturnValue(null),
  skellamCoverFairValue: vi.fn().mockReturnValue(null),
  SKELLAM_COVER_SOURCE: "skellam_cover",
  fitEloRatingsFromResults: vi.fn().mockReturnValue(new Map()),
  eloFairValueFromRatings: vi.fn().mockReturnValue(null),
  powerIndexToIndependentFairValue: vi.fn().mockReturnValue(null),
  standingsWinPctToIndependentFairValue: vi.fn().mockReturnValue(null),
  nflEpaToIndependentFairValue: mocks.nflEpaToIndependentFairValue,
  opponentAdjustedRatings: mocks.opponentAdjustedRatings,
  NFL_EPA_MIN_GAMES: 4,
}));

import {
  buildIndependentFairValues,
  NFL_EPA_PRIOR_SEASON_SOURCE,
  type IndependentFairValueBuildInput,
} from "../build-independent-fair-values.js";

/**
 * The ratings cache is module-level and holds a season for 30 minutes of the
 * clock the caller passes in. Every test therefore gets its OWN `now`, an hour
 * apart, so one test's empty-season entry cannot leak into the next. Sharing a
 * single fixed clock silently made later tests read earlier tests' caches.
 */
let testClock = new Date("2026-09-08T12:00:00Z").getTime();
function nextNow(): Date {
  testClock += 60 * 60 * 1000;
  return new Date(testClock);
}
const KC = "Kansas City Chiefs";
const BUF = "Buffalo Bills";

/** A Week 1 2026 fixture — the state that was broken. */
function week1Input(
  overrides: Partial<IndependentFairValueBuildInput> = {},
): IndependentFairValueBuildInput {
  const now = nextNow();
  return {
    sportKey: "americanfootball_nfl",
    homeTeam: KC,
    awayTeam: BUF,
    commenceTime: new Date("2026-09-10T00:20:00Z"),
    now: () => now,
    env: {},
    ...overrides,
  };
}

/** One efficiency row; only `season` is read by the query mock. */
const row = (team: string) => ({
  team,
  opponent: "OPP",
  offEpaPerPlay: 0.1,
  defEpaPerPlay: -0.05,
});

/**
 * Drive the season lookup: a map of nflverse season -> per-team game counts.
 * Absent season = no rows, which is exactly Week 1 for the current season.
 */
function seasonData(bySeason: Record<number, Record<string, number>>): void {
  // Both seasons carry the same team names, so the ratings mock cannot infer
  // the season from the rows. It reads the season the query just asked for
  // instead — otherwise a prior-season row set is indistinguishable from a
  // current-season one and the test proves nothing.
  let lastSeason: number | null = null;
  mocks.teamGameEfficiencyFindMany.mockImplementation(
    async (args: { where: { season: number } }) => {
      lastSeason = args.where.season;
      const teams = bySeason[args.where.season];
      if (!teams) return [];
      return Object.keys(teams).map((t) => row(t));
    },
  );
  mocks.opponentAdjustedRatings.mockImplementation(() => {
    const teams = lastSeason == null ? undefined : bySeason[lastSeason];
    if (!teams) return [];
    return Object.entries(teams).map(([team, games]) => ({
      team,
      overall: 0.05,
      games,
    }));
  });
}

/** Seasons actually queried, in order. */
function queriedSeasons(): number[] {
  return mocks.teamGameEfficiencyFindMany.mock.calls.map(
    (c) => (c[0] as { where: { season: number } }).where.season,
  );
}

beforeEach(() => {
  mocks.resolveNflWeek.mockReset();
  mocks.resolveNflWeek.mockReturnValue({ season: 2026, week: 1, inSeason: true });
  mocks.teamGameEfficiencyFindMany.mockReset();
  mocks.opponentAdjustedRatings.mockReset();
  mocks.nflEpaToIndependentFairValue.mockReset();
  mocks.nflEpaToIndependentFairValue.mockImplementation(() => ({
    source: "nfl_epa_adj",
    homeFairProb: 0.57,
    awayFairProb: 0.43,
    capturedAt: new Date(testClock).toISOString(),
  }));
});

describe("NFL EPA: the prior season carries the early weeks", () => {
  it("Week 1 falls back to the prior season instead of returning nothing", async () => {
    // 2026 has not started; 2025 is a full season. This is the exact state that
    // produced 0 NFL moneylines on production two days before kickoff.
    seasonData({ 2025: { KC: 17, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());
    const epa = out.filter(
      (fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE || fv.source === "nfl_epa_adj",
    );

    expect(epa).toHaveLength(1);
    // Provenance says PRIOR season — last season's form is never presented as
    // this season's.
    expect(epa[0]?.source).toBe(NFL_EPA_PRIOR_SEASON_SOURCE);
    expect(queriedSeasons()).toEqual([2026, 2025]);
  });

  it("keeps the current season, and never queries the prior one, once the floor is met", async () => {
    // Week 5+: both teams past NFL_EPA_MIN_GAMES. The fallback must not fire,
    // and must not cost a second query.
    seasonData({ 2026: { KC: 4, BUF: 6 }, 2025: { KC: 17, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());
    const epa = out.filter(
      (fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE || fv.source === "nfl_epa_adj",
    );

    expect(epa[0]?.source).toBe("nfl_epa_adj");
    expect(queriedSeasons()).toEqual([2026]);
  });

  it("falls back when only ONE side is under the floor", async () => {
    // Week 2-4: the season has rows, but a team short of the floor cannot be
    // opined on, and mixing one current side with one prior side would compare
    // ratings built on different opponent pools.
    seasonData({ 2026: { KC: 3, BUF: 9 }, 2025: { KC: 17, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());
    const epa = out.filter(
      (fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE || fv.source === "nfl_epa_adj",
    );

    expect(epa[0]?.source).toBe(NFL_EPA_PRIOR_SEASON_SOURCE);
    // BOTH sides came from 2025 (games 17/17), not one from each season.
    const call = mocks.nflEpaToIndependentFairValue.mock.calls.at(-1);
    expect(call?.[0]).toMatchObject({ homeGames: 17, awayGames: 17 });
  });

  it("reaches back exactly one season, never two", async () => {
    // A gap in the data must not silently serve three-year-old form.
    seasonData({ 2024: { KC: 17, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());
    const epa = out.filter(
      (fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE || fv.source === "nfl_epa_adj",
    );

    expect(epa).toHaveLength(0);
    expect(queriedSeasons()).toEqual([2026, 2025]);
    expect(queriedSeasons()).not.toContain(2024);
  });

  it("refuses when the prior season is itself under the floor", async () => {
    // A team with two games last season is not a basis. Excluding is the only
    // honest answer; inventing one is what this whole path forbids.
    seasonData({ 2025: { KC: 2, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());

    expect(
      out.filter(
        (fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE || fv.source === "nfl_epa_adj",
      ),
    ).toHaveLength(0);
    expect(mocks.nflEpaToIndependentFairValue).not.toHaveBeenCalled();
  });

  it("returns nothing when neither season has the teams", async () => {
    seasonData({});

    const out = await buildIndependentFairValues(week1Input());

    expect(
      out.filter(
        (fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE || fv.source === "nfl_epa_adj",
      ),
    ).toHaveLength(0);
  });
});

/**
 * C-237. The short-key fallback in resolveNflTeamRating tested a word boundary
 * with a dynamic RegExp and then ALSO accepted startsWith/endsWith, which
 * defeats the boundary. Its own comment claimed "NE" would not match inside
 * "NEW ORLEANS" - and "NEW ORLEANS SAINTS".startsWith("NE") is true, so New
 * Orleans resolved to New England's rating.
 *
 * A team priced on another team's EPA is a silent wrong number, which is worse
 * than no pick at all. Whole-token matching is the boundary the comment always
 * meant.
 */
describe("the short-key fallback matches whole tokens, not prefixes", () => {
  it("does not resolve New Orleans to New England", async () => {
    // Only NE is in the ratings, and the abbreviation map is bypassed by using
    // a name it does not contain, so the short-key fallback is what answers.
    seasonData({ 2025: { NE: 17 } });

    const out = await buildIndependentFairValues(
      week1Input({ homeTeam: "New Orleans Gridiron", awayTeam: "New Orleans Gridiron" }),
    );

    expect(
      out.filter(
        (fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE || fv.source === "nfl_epa_adj",
      ),
    ).toHaveLength(0);
    expect(mocks.nflEpaToIndependentFairValue).not.toHaveBeenCalled();
  });

  it("still resolves a short key that IS a whole token", async () => {
    // The behaviour the fallback exists for must survive the fix.
    seasonData({ 2025: { NE: 17 } });

    const out = await buildIndependentFairValues(
      week1Input({ homeTeam: "NE Patriots", awayTeam: "NE Patriots" }),
    );

    expect(
      out.filter((fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE),
    ).toHaveLength(1);
  });
});

/**
 * C-238, raised by Devin. The first version of the fallback fired whenever a
 * current rating was absent or thin, REGARDLESS OF WEEK, and I described it as
 * "self-limiting". It self-limits only while the data is healthy. It does not
 * self-limit when ingestion breaks: in Week 12 a missing TeamGameEfficiency row
 * is an OUTAGE, and falling back would publish a pick built on year-old form
 * while reporting nothing wrong.
 *
 * The bound is derived rather than chosen: by target week W a team has played at
 * most W-1 games, so a sample under NFL_EPA_MIN_GAMES is expected only while
 * W-1 is below that floor. Past it, thin current data means something upstream
 * is wrong and the honest answer is no opinion.
 */
describe("the fallback is bounded to the genuinely early season", () => {
  it("refuses to reuse last season when the current one is thin in Week 12", async () => {
    // The outage case: 2026 has no rows for these teams in Week 12. Falling
    // back here would price a mid-season game on last season's form.
    mocks.resolveNflWeek.mockReturnValue({ season: 2026, week: 12, inSeason: true });
    seasonData({ 2025: { KC: 17, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());

    expect(
      out.filter(
        (fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE || fv.source === "nfl_epa_adj",
      ),
    ).toHaveLength(0);
    // And it does not even pay for the prior-season query.
    expect(queriedSeasons()).toEqual([2026]);
  });

  it("still falls back at the last week where a thin sample is expected", async () => {
    // W-1 games at most, so week 4 is the boundary the floor implies.
    mocks.resolveNflWeek.mockReturnValue({ season: 2026, week: 4, inSeason: true });
    seasonData({ 2025: { KC: 17, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());

    expect(
      out.filter((fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE),
    ).toHaveLength(1);
  });

  it("refuses one week past that boundary", async () => {
    mocks.resolveNflWeek.mockReturnValue({ season: 2026, week: 5, inSeason: true });
    seasonData({ 2025: { KC: 17, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());

    expect(
      out.filter((fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE),
    ).toHaveLength(0);
  });

  it("refuses when the resolver disagrees with the fixture's own season", async () => {
    // A fixture whose commenceTime lands outside the resolved season window is
    // not an early-season thin sample; it is a mismatch, and guessing would be
    // the same silent-wrong-basis failure in a different disguise.
    mocks.resolveNflWeek.mockReturnValue({ season: 2025, week: 1, inSeason: true });
    seasonData({ 2025: { KC: 17, BUF: 17 } });

    const out = await buildIndependentFairValues(week1Input());

    expect(
      out.filter((fv) => fv.source === NFL_EPA_PRIOR_SEASON_SOURCE),
    ).toHaveLength(0);
  });
});
