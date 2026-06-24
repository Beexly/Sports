import { orderReplayGames, type ReplayGame } from "./nflverse-replay-parser.js";

export { nflverseSchedulesToReplayGames } from "./nflverse-replay-parser.js";
export type { NflverseScheduleRow, ReplayGame } from "./nflverse-replay-parser.js";

export type HistoricalWeekTarget = {
  readonly season: number;
  readonly week: number;
};

export type HistoricalWeekReplay = {
  readonly season: number;
  readonly week: number;
  readonly weekKey: string;
  readonly gameCount: number;
  readonly totalPoints: number;
  readonly games: readonly ReplayGame[];
  readonly fingerprint: string;
};

export type ReplaySplitOptions = {
  readonly minTrainWeeks: number;
  readonly purgeWeeks: number;
  readonly embargoWeeks: number;
};

export type WalkForwardSplit = {
  readonly fold: number;
  readonly trainWeekKeys: readonly string[];
  readonly testWeekKey: string;
  readonly purgedWeekKeys: readonly string[];
  readonly embargoedWeekKeys: readonly string[];
  readonly trainGames: readonly ReplayGame[];
  readonly testGames: readonly ReplayGame[];
};

export type ReplayBacktestReport = {
  readonly baseline: "market-total-closing-line";
  readonly sampleSize: number;
  readonly outOfSampleMae: number;
  readonly folds: readonly WalkForwardSplit[];
  readonly seasonRange: {
    readonly from: number;
    readonly to: number;
  } | null;
};

const MARKET_TOTAL_BASELINE = "market-total-closing-line";

export function replayHistoricalWeek(
  games: readonly ReplayGame[],
  target: HistoricalWeekTarget
): HistoricalWeekReplay {
  const replayGames = orderReplayGames(
    games.filter((game) => game.season === target.season && game.week === target.week)
  );
  const totalPoints = replayGames.reduce(
    (sum, game) => sum + game.awayScore + game.homeScore,
    0
  );

  return {
    season: target.season,
    week: target.week,
    weekKey: weekKey(target.season, target.week),
    gameCount: replayGames.length,
    totalPoints,
    games: replayGames,
    fingerprint: fingerprintReplay(replayGames),
  };
}

export function buildPurgedEmbargoedSplits(
  games: readonly ReplayGame[],
  options: ReplaySplitOptions
): readonly WalkForwardSplit[] {
  const ordered = orderReplayGames(games);
  const weeks = orderedWeekKeys(ordered);
  const gamesByWeek = groupGamesByWeek(ordered);
  const minTrainWeeks = nonNegativeInteger(options.minTrainWeeks);
  const purgeWeeks = nonNegativeInteger(options.purgeWeeks);
  const embargoWeeks = nonNegativeInteger(options.embargoWeeks);
  const splits: WalkForwardSplit[] = [];

  for (let testIndex = minTrainWeeks; testIndex < weeks.length; testIndex += 1) {
    const testWeekKey = weeks[testIndex];
    if (testWeekKey === undefined) {
      continue;
    }

    const embargoEnd = testIndex + 1 + embargoWeeks;
    if (embargoEnd > weeks.length) {
      continue;
    }

    const trainEnd = Math.max(0, testIndex - purgeWeeks);
    const trainWeekKeys = weeks.slice(0, trainEnd);
    if (trainWeekKeys.length === 0) {
      continue;
    }

    const testGames = gamesByWeek.get(testWeekKey) ?? [];
    if (testGames.length === 0) {
      continue;
    }

    splits.push({
      fold: splits.length + 1,
      trainWeekKeys,
      testWeekKey,
      purgedWeekKeys: weeks.slice(trainEnd, testIndex),
      embargoedWeekKeys: weeks.slice(testIndex + 1, embargoEnd),
      trainGames: gamesForWeekKeys(gamesByWeek, trainWeekKeys),
      testGames,
    });
  }

  return splits;
}

export function runMarketTotalReplayBacktest(
  games: readonly ReplayGame[],
  options: ReplaySplitOptions
): ReplayBacktestReport {
  const folds = buildPurgedEmbargoedSplits(games, options);
  const absoluteErrors: number[] = [];

  for (const fold of folds) {
    for (const game of fold.testGames) {
      if (game.totalLine !== null) {
        absoluteErrors.push(Math.abs(game.totalLine - actualTotal(game)));
      }
    }
  }

  return {
    baseline: MARKET_TOTAL_BASELINE,
    sampleSize: absoluteErrors.length,
    outOfSampleMae: mean(absoluteErrors),
    folds,
    seasonRange: seasonRange(games),
  };
}

function orderedWeekKeys(games: readonly ReplayGame[]): readonly string[] {
  const seen = new Set<string>();
  const keys: string[] = [];

  for (const game of games) {
    const key = weekKey(game.season, game.week);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }

  return keys;
}

function groupGamesByWeek(games: readonly ReplayGame[]): ReadonlyMap<string, readonly ReplayGame[]> {
  const grouped = new Map<string, ReplayGame[]>();

  for (const game of games) {
    const key = weekKey(game.season, game.week);
    const bucket = grouped.get(key);
    if (bucket === undefined) {
      grouped.set(key, [game]);
    } else {
      bucket.push(game);
    }
  }

  return grouped;
}

function gamesForWeekKeys(
  gamesByWeek: ReadonlyMap<string, readonly ReplayGame[]>,
  weekKeys: readonly string[]
): readonly ReplayGame[] {
  const games: ReplayGame[] = [];

  for (const key of weekKeys) {
    const bucket = gamesByWeek.get(key) ?? [];
    games.push(...bucket);
  }

  return games;
}

function fingerprintReplay(games: readonly ReplayGame[]): string {
  const payload = games.map((game) => ({
    gameId: game.gameId,
    season: game.season,
    week: game.week,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    awayScore: game.awayScore,
    homeScore: game.homeScore,
    totalLine: game.totalLine,
    spreadLine: game.spreadLine,
  }));

  return stableFingerprint(JSON.stringify(payload));
}

function stableFingerprint(value: string): string {
  const seeds = [
    0x811c9dc5,
    0x9e3779b9,
    0x85ebca6b,
    0xc2b2ae35,
    0x27d4eb2f,
    0x165667b1,
    0xd3a2646c,
    0xfd7046c5,
  ];

  return seeds.map((seed) => fnv1a(value, seed).toString(16).padStart(8, "0")).join("");
}

function fnv1a(value: string, seed: number): number {
  let hash = seed;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }

  return hash;
}

function nonNegativeInteger(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    return 0;
  }

  return value;
}

function weekKey(season: number, week: number): string {
  return `${season}-W${String(week).padStart(2, "0")}`;
}

function actualTotal(game: ReplayGame): number {
  return game.awayScore + game.homeScore;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 1_000_000) / 1_000_000;
}

function seasonRange(games: readonly ReplayGame[]): ReplayBacktestReport["seasonRange"] {
  let from: number | null = null;
  let to: number | null = null;

  for (const game of games) {
    from = from === null ? game.season : Math.min(from, game.season);
    to = to === null ? game.season : Math.max(to, game.season);
  }

  if (from === null || to === null) {
    return null;
  }

  return { from, to };
}
