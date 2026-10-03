import { describe, expect, it } from "vitest";
import {
  buildPurgedEmbargoedSplits,
  nflverseSchedulesToReplayGames,
  replayHistoricalWeek,
  runMarketTotalReplayBacktest,
  type NflverseScheduleRow,
} from "../replay-harness.js";

const rows: readonly NflverseScheduleRow[] = [
  row({ season: 1998, week: 1, gameType: "REG", gameId: "1998_01_ARI_DAL", awayTeam: "ARI", homeTeam: "DAL", awayScore: 17, homeScore: 24, totalLine: 39.5, spreadLine: -4 }),
  row({ season: 1999, week: 1, gameType: "REG", gameId: "1999_01_MIN_ATL", awayTeam: "MIN", homeTeam: "ATL", awayScore: 31, homeScore: 28, totalLine: 45.5, spreadLine: -2.5 }),
  row({ season: 1999, week: 1, gameType: "REG", gameId: "1999_01_DEN_MIA", awayTeam: "DEN", homeTeam: "MIA", awayScore: 10, homeScore: 21, totalLine: 38, spreadLine: -3 }),
  row({ season: 1999, week: 2, gameType: "REG", gameId: "1999_02_MIA_ARI", awayTeam: "MIA", homeTeam: "ARI", awayScore: 20, homeScore: 17, totalLine: 41, spreadLine: 1.5 }),
  row({ season: 1999, week: 3, gameType: "REG", gameId: "1999_03_ARI_MIN", awayTeam: "ARI", homeTeam: "MIN", awayScore: 14, homeScore: 28, totalLine: 42, spreadLine: -6 }),
  row({ season: 1999, week: 4, gameType: "REG", gameId: "1999_04_ATL_DEN", awayTeam: "ATL", homeTeam: "DEN", awayScore: 24, homeScore: 27, totalLine: 45, spreadLine: -5.5 }),
  row({ season: 1999, week: 5, gameType: "POST", gameId: "1999_05_POST", awayTeam: "ATL", homeTeam: "DEN", awayScore: 10, homeScore: 13, totalLine: 40, spreadLine: -3 }),
  row({ season: 2000, week: 1, gameType: "REG", gameId: "2000_01_DAL_MIA", awayTeam: "DAL", homeTeam: "MIA", awayScore: 17, homeScore: 20, totalLine: 37, spreadLine: -1 }),
];

type ScheduleFixture = {
  readonly season: number;
  readonly week: number;
  readonly gameType: string;
  readonly gameId: string;
  readonly awayTeam: string;
  readonly homeTeam: string;
  readonly awayScore: number;
  readonly homeScore: number;
  readonly totalLine: number;
  readonly spreadLine: number;
};

function row(fixture: ScheduleFixture): NflverseScheduleRow {
  return {
    season: fixture.season,
    week: fixture.week,
    game_type: fixture.gameType,
    game_id: fixture.gameId,
    away_team: fixture.awayTeam,
    home_team: fixture.homeTeam,
    away_score: fixture.awayScore,
    home_score: fixture.homeScore,
    total_line: fixture.totalLine,
    spread_line: fixture.spreadLine,
  };
}

describe("nflverseSchedulesToReplayGames", () => {
  it("keeps regular-season nflverse schedule rows from 1999 forward in deterministic order", () => {
    const games = nflverseSchedulesToReplayGames([...rows].reverse());

    expect(games.map((game) => game.gameId)).toEqual([
      "1999_01_DEN_MIA",
      "1999_01_MIN_ATL",
      "1999_02_MIA_ARI",
      "1999_03_ARI_MIN",
      "1999_04_ATL_DEN",
      "2000_01_DAL_MIA",
    ]);
  });
});

describe("replayHistoricalWeek", () => {
  it("reproduces one historical week deterministically", () => {
    const games = nflverseSchedulesToReplayGames(rows);
    const first = replayHistoricalWeek(games, { season: 1999, week: 1 });
    const second = replayHistoricalWeek([...games].reverse(), { season: 1999, week: 1 });

    expect(second).toEqual(first);
    expect(first.gameCount).toBe(2);
    expect(first.totalPoints).toBe(90);
    expect(first.fingerprint).toHaveLength(64);
  });
});

describe("buildPurgedEmbargoedSplits", () => {
  it("builds walk-forward splits without leaking purged or embargoed weeks into training", () => {
    const games = nflverseSchedulesToReplayGames(rows);
    const splits = buildPurgedEmbargoedSplits(games, { minTrainWeeks: 2, purgeWeeks: 1, embargoWeeks: 1 });

    expect(splits[0]?.trainWeekKeys).toEqual(["1999-W01"]);
    expect(splits[0]?.testWeekKey).toBe("1999-W03");
    expect(splits[0]?.purgedWeekKeys).toEqual(["1999-W02"]);
    expect(splits[0]?.embargoedWeekKeys).toEqual(["1999-W04"]);
    expect(splits[0]?.trainGames.every((game) => game.week < 3)).toBe(true);
  });
});

describe("runMarketTotalReplayBacktest", () => {
  it("emits an out-of-sample market-total MAE from walk-forward test weeks", () => {
    const games = nflverseSchedulesToReplayGames(rows);
    const report = runMarketTotalReplayBacktest(games, { minTrainWeeks: 2, purgeWeeks: 1, embargoWeeks: 1 });

    expect(report.sampleSize).toBe(2);
    expect(report.outOfSampleMae).toBe(3);
    expect(report.baseline).toBe("market-total-closing-line");
    expect(report.folds).toHaveLength(2);
  });

  it("reports a null out-of-sample MAE (not a fabricated 0) when no test weeks qualify", () => {
    const games = nflverseSchedulesToReplayGames(rows);
    const report = runMarketTotalReplayBacktest(games, { minTrainWeeks: 99, purgeWeeks: 0, embargoWeeks: 0 });

    expect(report.folds).toHaveLength(0);
    expect(report.sampleSize).toBe(0);
    expect(report.outOfSampleMae).toBeNull();
  });
});
