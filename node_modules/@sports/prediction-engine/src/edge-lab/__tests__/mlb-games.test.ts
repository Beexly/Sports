import { describe, expect, it } from "vitest";
import { loadMlbGames, mlbScheduleUrl } from "../loaders/mlb-games.js";

/**
 * Fixture JSON mirrors the real MLB Stats API schedule response shape,
 * verified live 2026-07-16 against:
 *   https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=2024&gameType=R
 *   https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=2026&gameType=R
 *
 *  - gamePk 747060 is a real completed 2024-03-28 game (Los Angeles Angels
 *    @ Baltimore Orioles, final 3-11, status.abstractGameState: "Final").
 *  - gamePk 822781 is a real not-yet-played 2026 game (St. Louis Cardinals @
 *    Toronto Blue Jays, status.abstractGameState: "Preview") — confirmed
 *    live that a Preview game's `teams.home`/`teams.away` carry NO `score`
 *    field at all (not even 0).
 *  - The third row (gamePk 900001) is a synthetic "Live" (in-progress) game
 *    used to prove the loader does not report a partial in-progress score
 *    as a settled result — it is not a real gamePk.
 */
function mlbFixtureResponse(season: number) {
  return {
    dates: [
      {
        date: "2024-03-28",
        games: [
          {
            gamePk: 747060,
            gameDate: "2024-03-28T19:05:00Z",
            status: { abstractGameState: "Final" },
            teams: {
              away: { team: { name: "Los Angeles Angels" }, score: 3 },
              home: { team: { name: "Baltimore Orioles" }, score: 11 },
            },
          },
          {
            gamePk: 822781,
            gameDate: "2026-08-01T19:07:00Z",
            status: { abstractGameState: "Preview" },
            teams: {
              away: { team: { name: "St. Louis Cardinals" } },
              home: { team: { name: "Toronto Blue Jays" } },
            },
          },
          {
            gamePk: 900001,
            gameDate: "2024-06-15T23:10:00Z",
            status: { abstractGameState: "Live" },
            teams: {
              away: { team: { name: "Test Away Club" }, score: 2 },
              home: { team: { name: "Test Home Club" }, score: 1 },
            },
          },
        ],
      },
    ],
    _requestedSeason: season,
  };
}

function fixtureFetcher(): typeof fetch {
  return (async (url: string | URL | Request) => {
    const urlStr = String(url);
    expect(urlStr).toBe(mlbScheduleUrl(2024));
    return {
      ok: true,
      status: 200,
      json: async () => mlbFixtureResponse(2024),
    } as Response;
  }) as typeof fetch;
}

describe("mlbScheduleUrl", () => {
  it("builds the sportId=1 / gameType=R regular-season schedule URL", () => {
    expect(mlbScheduleUrl(2024)).toBe(
      "https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=2024&gameType=R",
    );
  });
});

describe("loadMlbGames", () => {
  it("maps a Final game to a settled GameRow with week null and closing all-null", async () => {
    const rows = await loadMlbGames({ seasons: [2024], fetcher: fixtureFetcher() });
    const game = rows.find((r) => r.gameId === "mlb-747060");
    expect(game).toBeDefined();
    expect(game?.sport).toBe("mlb");
    expect(game?.season).toBe(2024);
    expect(game?.week).toBeNull();
    expect(game?.startTime).toBe("2024-03-28T19:05:00Z");
    expect(game?.homeTeam).toBe("Baltimore Orioles");
    expect(game?.awayTeam).toBe("Los Angeles Angels");
    expect(game?.homeScore).toBe(11);
    expect(game?.awayScore).toBe(3);
    // MLB historical closing odds are not freely licensed (see loader header) — always null.
    expect(game?.closing).toEqual({
      spreadHome: null,
      total: null,
      moneylineHomeDecimal: null,
      moneylineAwayDecimal: null,
    });
  });

  it("reports null scores for a scheduled (Preview) game with no score field at all", async () => {
    const rows = await loadMlbGames({ seasons: [2024], fetcher: fixtureFetcher() });
    const game = rows.find((r) => r.gameId === "mlb-822781");
    expect(game).toBeDefined();
    expect(game?.homeScore).toBeNull();
    expect(game?.awayScore).toBeNull();
  });

  it("does not report a Live (in-progress) game's partial score as final", async () => {
    const rows = await loadMlbGames({ seasons: [2024], fetcher: fixtureFetcher() });
    const game = rows.find((r) => r.gameId === "mlb-900001");
    expect(game).toBeDefined();
    expect(game?.homeScore).toBeNull();
    expect(game?.awayScore).toBeNull();
  });

  it("returns exactly the 3 fixture games for the requested season", async () => {
    const rows = await loadMlbGames({ seasons: [2024], fetcher: fixtureFetcher() });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.season === 2024)).toBe(true);
  });

  it("issues one request per requested season", async () => {
    const requestedUrls: string[] = [];
    const fetcher = (async (url: string | URL | Request) => {
      requestedUrls.push(String(url));
      return {
        ok: true,
        status: 200,
        json: async () => ({ dates: [] }),
      } as Response;
    }) as typeof fetch;

    await loadMlbGames({ seasons: [2023, 2024], fetcher });
    expect(requestedUrls).toEqual([mlbScheduleUrl(2023), mlbScheduleUrl(2024)]);
  });

  it("throws on a non-ok fetch response", async () => {
    const failingFetcher = (async () =>
      ({ ok: false, status: 503, json: async () => ({}) }) as Response) as typeof fetch;
    await expect(loadMlbGames({ seasons: [2024], fetcher: failingFetcher })).rejects.toThrow(/503/);
  });
});
