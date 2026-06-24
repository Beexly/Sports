type NflverseScheduleValue = string | number | null | undefined;

export type NflverseScheduleRow = Readonly<Record<string, NflverseScheduleValue>>;

export type ReplayGame = {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly gameType: "REG";
  readonly awayTeam: string;
  readonly homeTeam: string;
  readonly awayScore: number;
  readonly homeScore: number;
  readonly totalLine: number | null;
  readonly spreadLine: number | null;
};

const GAME_ID_FIELDS = ["game_id", "gameId"] as const;
const GAME_TYPE_FIELDS = ["game_type", "gameType"] as const;
const AWAY_TEAM_FIELDS = ["away_team", "awayTeam"] as const;
const HOME_TEAM_FIELDS = ["home_team", "homeTeam"] as const;
const AWAY_SCORE_FIELDS = ["away_score", "awayScore", "result_away"] as const;
const HOME_SCORE_FIELDS = ["home_score", "homeScore", "result_home"] as const;
const TOTAL_LINE_FIELDS = ["total_line", "totalLine", "over_under_line"] as const;
const SPREAD_LINE_FIELDS = ["spread_line", "spreadLine"] as const;

export function nflverseSchedulesToReplayGames(
  rows: readonly NflverseScheduleRow[]
): readonly ReplayGame[] {
  const games: ReplayGame[] = [];

  for (const row of rows) {
    const game = parseScheduleRow(row);
    if (game !== null) {
      games.push(game);
    }
  }

  return orderReplayGames(games);
}

export function orderReplayGames(games: readonly ReplayGame[]): readonly ReplayGame[] {
  return [...games].sort(
    (left, right) =>
      left.season - right.season ||
      left.week - right.week ||
      left.gameId.localeCompare(right.gameId)
  );
}

function parseScheduleRow(row: NflverseScheduleRow): ReplayGame | null {
  const season = integerValue(row["season"]);
  const week = integerValue(row["week"]);
  const gameType = stringValue(fieldValue(row, GAME_TYPE_FIELDS));
  const gameId = stringValue(fieldValue(row, GAME_ID_FIELDS));
  const awayTeam = stringValue(fieldValue(row, AWAY_TEAM_FIELDS));
  const homeTeam = stringValue(fieldValue(row, HOME_TEAM_FIELDS));
  const awayScore = numberValue(fieldValue(row, AWAY_SCORE_FIELDS));
  const homeScore = numberValue(fieldValue(row, HOME_SCORE_FIELDS));

  if (
    season === null ||
    season < 1999 ||
    week === null ||
    gameType !== "REG" ||
    gameId === null ||
    awayTeam === null ||
    homeTeam === null ||
    awayScore === null ||
    homeScore === null
  ) {
    return null;
  }

  return {
    gameId,
    season,
    week,
    gameType: "REG",
    awayTeam,
    homeTeam,
    awayScore,
    homeScore,
    totalLine: numberValue(fieldValue(row, TOTAL_LINE_FIELDS)),
    spreadLine: numberValue(fieldValue(row, SPREAD_LINE_FIELDS)),
  };
}

function fieldValue(
  row: NflverseScheduleRow,
  fields: readonly string[]
): NflverseScheduleValue {
  for (const field of fields) {
    const value = row[field];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function stringValue(value: NflverseScheduleValue): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function numberValue(value: NflverseScheduleValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function integerValue(value: NflverseScheduleValue): number | null {
  const parsed = numberValue(value);
  if (parsed === null || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}
