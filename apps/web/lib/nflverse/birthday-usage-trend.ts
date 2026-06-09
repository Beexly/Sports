import { gunzipSync } from "node:zlib";
import { nflverseUrl, parseCsv } from "@sports/data-ingestion";
import { welchCompare } from "@sports/prediction-engine";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type BirthdayUsageMetric = "opportunity-delta" | "relative-opportunity-lift";

interface PlayerUsageGame {
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly team: string;
  readonly opponent: string;
  readonly season: number;
  readonly week: number;
  readonly gameDate: string;
  readonly birthDate: string;
  readonly opportunities: number;
}

export interface BirthdayUsageComparison {
  readonly label: string;
  readonly metric: BirthdayUsageMetric;
  readonly windowDays: number;
  readonly minPriorAverage: number;
  readonly n: number;
  readonly baselineN: number;
  readonly cohortMean: number;
  readonly baselineMean: number;
  readonly cohortMedian: number;
  readonly baselineMedian: number;
  readonly absoluteDelta: number;
  readonly relativeDelta: number;
  readonly z: number;
  readonly pValue: number;
  readonly significant: boolean;
  readonly gate: "candidate" | "rejected";
}

export interface BirthdayUsageExample {
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly team: string;
  readonly opponent: string;
  readonly season: number;
  readonly week: number;
  readonly gameDate: string;
  readonly dayOffset: number;
  readonly opportunities: number;
  readonly priorAverage: number;
  readonly opportunityDelta: number;
  readonly relativeLift: number;
}

export interface BirthdayUsageQuality {
  readonly eligibleSkillRows: number;
  readonly playerTimelines: number;
  readonly observationsTested: number;
  readonly observationsUsed: number;
  readonly birthdayWindowObservations: number;
  readonly careerMilestone50Observations: number;
  readonly skippedMissingBirthDate: number;
  readonly skippedMissingGameDate: number;
  readonly skippedInsufficientPriorGames: number;
  readonly skippedLowPriorAverage: number;
}

export interface BirthdayUsageTrendReport {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly sourceRows: {
    readonly playerStats: number;
    readonly players: number;
    readonly schedules: number;
  };
  readonly seasonRange: {
    readonly start: number | null;
    readonly end: number | null;
  };
  readonly metric: "skill-player opportunities versus prior four-game average";
  readonly feature: "game within birthday window";
  readonly alpha: number;
  readonly minSampleSize: number;
  readonly birthdayWindowDays: number;
  readonly minPriorAverage: number;
  readonly result: BirthdayUsageComparison | null;
  readonly milestoneResult: BirthdayUsageComparison | null;
  readonly sensitivity: readonly BirthdayUsageComparison[];
  readonly milestoneSensitivity: readonly BirthdayUsageComparison[];
  readonly positionBreakdown: readonly BirthdayUsageComparison[];
  readonly examples: {
    readonly positiveSpikes: readonly BirthdayUsageExample[];
    readonly negativeDrops: readonly BirthdayUsageExample[];
  };
  readonly quality: BirthdayUsageQuality;
  readonly conclusion: "candidate" | "not-publishable" | "source-error";
  readonly canPowerScoring: false;
  readonly boundary: string;
  readonly sourceUrls: Record<"playerStats" | "players" | "schedules", string>;
  readonly error: string | null;
}

interface UsageObservation extends PlayerUsageGame {
  readonly priorAverage: number;
  readonly dayOffset: number;
  readonly birthdayWindow: boolean;
  readonly gameNumber: number;
  readonly careerMilestone25: boolean;
  readonly careerMilestone50: boolean;
  readonly opportunityDelta: number;
  readonly relativeLift: number;
}

let birthdayTrendCache: { readonly expiresAt: number; readonly value: BirthdayUsageTrendReport } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function fetchCsvRecords(url: string, fetcher: FetchLike, timeoutMs: number): Promise<readonly CsvRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`nflverse fetch failed (${response.status}) for ${url}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const text = url.endsWith(".gz") ? gunzipSync(buffer).toString("utf8") : buffer.toString("utf8");
    return parseCsv(text).records;
  } finally {
    clearTimeout(timer);
  }
}

function birthDateMap(players: readonly CsvRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const player of players) {
    const id = player["gsis_id"];
    const birthDate = player["birth_date"];
    if (id && birthDate) map.set(id, birthDate);
  }
  return map;
}

function gameDateMap(schedules: readonly CsvRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const game of schedules) {
    if (game["game_type"] !== "REG") continue;
    const season = game["season"];
    const week = game["week"];
    const gameday = game["gameday"];
    if (!season || !week || !gameday) continue;
    const awayTeam = game["away_team"];
    const homeTeam = game["home_team"];
    if (awayTeam) map.set(`${season}|${week}|${awayTeam}`, gameday);
    if (homeTeam) map.set(`${season}|${week}|${homeTeam}`, gameday);
  }
  return map;
}

function dayOffsetFromBirthday(gameDate: string, birthDate: string): number | null {
  const game = new Date(`${gameDate}T00:00:00Z`);
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(game.getTime()) || Number.isNaN(birth.getTime())) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const birthdayThisYear = Date.UTC(game.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate());
  const gameDay = Date.UTC(game.getUTCFullYear(), game.getUTCMonth(), game.getUTCDate());
  const rawOffset = Math.round((gameDay - birthdayThisYear) / dayMs);
  return [rawOffset, rawOffset - 365, rawOffset + 365, rawOffset - 366, rawOffset + 366].reduce(
    (best, candidate) => (Math.abs(candidate) < Math.abs(best) ? candidate : best),
    rawOffset,
  );
}

function buildUsageTimelines({
  playerStats,
  players,
  schedules,
}: {
  readonly playerStats: readonly CsvRecord[];
  readonly players: readonly CsvRecord[];
  readonly schedules: readonly CsvRecord[];
}): {
  readonly timelines: Map<string, PlayerUsageGame[]>;
  readonly eligibleSkillRows: number;
  readonly skippedMissingBirthDate: number;
  readonly skippedMissingGameDate: number;
} {
  const skillPositions = new Set(["RB", "WR", "TE"]);
  const birthDates = birthDateMap(players);
  const gameDates = gameDateMap(schedules);
  const timelines = new Map<string, PlayerUsageGame[]>();
  let eligibleSkillRows = 0;
  let skippedMissingBirthDate = 0;
  let skippedMissingGameDate = 0;

  for (const row of playerStats) {
    if (row["season_type"] !== "REG") continue;
    if (!skillPositions.has(row["position"] ?? "")) continue;
    eligibleSkillRows += 1;

    const playerId = row["player_id"];
    const birthDate = birthDates.get(playerId ?? "");
    if (!playerId || !birthDate) {
      skippedMissingBirthDate += 1;
      continue;
    }

    const season = row["season"];
    const week = row["week"];
    // nflverse renamed player_stats `recent_team` -> `team` (nflfastR::calculate_stats).
    // Tolerate both so the season|week|team game-date join key never silently breaks.
    const team = row["recent_team"] || row["team"] || "";
    const gameDate = gameDates.get(`${season}|${week}|${team}`);
    if (!gameDate) {
      skippedMissingGameDate += 1;
      continue;
    }

    const games = timelines.get(playerId) ?? [];
    games.push({
      playerId,
      playerName: row["player_display_name"] || row["player_name"] || playerId,
      position: row["position"] ?? "",
      team: team ?? "",
      opponent: row["opponent_team"] ?? "",
      season: toNumber(season),
      week: toNumber(week),
      gameDate,
      birthDate,
      opportunities: toNumber(row["targets"]) + toNumber(row["carries"]),
    });
    timelines.set(playerId, games);
  }

  return { timelines, eligibleSkillRows, skippedMissingBirthDate, skippedMissingGameDate };
}

function buildObservations({
  timelines,
  windowDays,
  minPriorAverage,
}: {
  readonly timelines: Map<string, PlayerUsageGame[]>;
  readonly windowDays: number;
  readonly minPriorAverage: number;
}): {
  readonly observations: readonly UsageObservation[];
  readonly skippedInsufficientPriorGames: number;
  readonly skippedLowPriorAverage: number;
} {
  const observations: UsageObservation[] = [];
  let skippedInsufficientPriorGames = 0;
  let skippedLowPriorAverage = 0;

  for (const games of timelines.values()) {
    games.sort(
      (a, b) =>
        new Date(`${a.gameDate}T00:00:00Z`).getTime() - new Date(`${b.gameDate}T00:00:00Z`).getTime() ||
        a.season - b.season ||
        a.week - b.week,
    );

    for (let index = 0; index < games.length; index += 1) {
      const game = games[index]!;
      const priorGames = games.slice(Math.max(0, index - 4), index);
      if (priorGames.length < 4) {
        skippedInsufficientPriorGames += 1;
        continue;
      }
      const priorAverage = mean(priorGames.map((prior) => prior.opportunities));
      if (priorAverage < minPriorAverage) {
        skippedLowPriorAverage += 1;
        continue;
      }
      const dayOffset = dayOffsetFromBirthday(game.gameDate, game.birthDate);
      if (dayOffset === null) continue;
      const opportunityDelta = game.opportunities - priorAverage;
      const gameNumber = index + 1;
      observations.push({
        ...game,
        priorAverage,
        dayOffset,
        birthdayWindow: Math.abs(dayOffset) <= windowDays,
        gameNumber,
        careerMilestone25: gameNumber % 25 === 0,
        careerMilestone50: gameNumber % 50 === 0,
        opportunityDelta,
        relativeLift: opportunityDelta / priorAverage,
      });
    }
  }

  return { observations, skippedInsufficientPriorGames, skippedLowPriorAverage };
}

function compareObservationSets({
  label,
  observations,
  metric,
  windowDays,
  minPriorAverage,
  alpha,
  minSampleSize,
  cohortSelector,
}: {
  readonly label: string;
  readonly observations: readonly UsageObservation[];
  readonly metric: BirthdayUsageMetric;
  readonly windowDays: number;
  readonly minPriorAverage: number;
  readonly alpha: number;
  readonly minSampleSize: number;
  readonly cohortSelector?: (observation: UsageObservation) => boolean;
}): BirthdayUsageComparison {
  const isInCohort = cohortSelector ?? ((observation: UsageObservation) => observation.birthdayWindow);
  const cohort = observations.filter(isInCohort);
  const baseline = observations.filter((observation) => !isInCohort(observation));
  const metricFor = (observation: UsageObservation) =>
    metric === "opportunity-delta" ? observation.opportunityDelta : observation.relativeLift;
  const cohortValues = cohort.map(metricFor);
  const baselineValues = baseline.map(metricFor);
  const cohortMean = mean(cohortValues);
  const baselineMean = mean(baselineValues);
  const { z, pValue } = welchCompare(cohortValues, baselineValues);
  const significant = cohort.length >= minSampleSize && baseline.length >= minSampleSize && pValue < alpha;

  return {
    label,
    metric,
    windowDays,
    minPriorAverage,
    n: cohort.length,
    baselineN: baseline.length,
    cohortMean,
    baselineMean,
    cohortMedian: median(cohortValues),
    baselineMedian: median(baselineValues),
    absoluteDelta: cohortMean - baselineMean,
    relativeDelta: baselineMean === 0 ? 0 : (cohortMean - baselineMean) / Math.abs(baselineMean),
    z,
    pValue,
    significant,
    gate: significant ? "candidate" : "rejected",
  };
}

function seasonRange(observations: readonly UsageObservation[]): BirthdayUsageTrendReport["seasonRange"] {
  if (observations.length === 0) return { start: null, end: null };
  const seasons = observations.map((observation) => observation.season);
  return { start: Math.min(...seasons), end: Math.max(...seasons) };
}

function examples(observations: readonly UsageObservation[]): BirthdayUsageTrendReport["examples"] {
  const birthdayRows = observations.filter((observation) => observation.birthdayWindow);
  const toExample = (observation: UsageObservation): BirthdayUsageExample => ({
    playerId: observation.playerId,
    playerName: observation.playerName,
    position: observation.position,
    team: observation.team,
    opponent: observation.opponent,
    season: observation.season,
    week: observation.week,
    gameDate: observation.gameDate,
    dayOffset: observation.dayOffset,
    opportunities: observation.opportunities,
    priorAverage: round(observation.priorAverage, 2),
    opportunityDelta: round(observation.opportunityDelta, 2),
    relativeLift: round(observation.relativeLift, 4),
  });

  return {
    positiveSpikes: birthdayRows
      .sort((a, b) => b.opportunityDelta - a.opportunityDelta)
      .slice(0, 4)
      .map(toExample),
    negativeDrops: birthdayRows
      .sort((a, b) => a.opportunityDelta - b.opportunityDelta)
      .slice(0, 4)
      .map(toExample),
  };
}

export function resetBirthdayUsageTrendCacheForTests(): void {
  birthdayTrendCache = null;
}

export async function loadBirthdayUsageTrendReport({
  timeoutMs = 15000,
  cacheTtlMs = 6 * 60 * 60 * 1000,
  alpha = 0.01,
  minSampleSize = 100,
  birthdayWindowDays = 3,
  minPriorAverage = 5,
  fetcher = fetch,
}: {
  timeoutMs?: number;
  cacheTtlMs?: number;
  alpha?: number;
  minSampleSize?: number;
  birthdayWindowDays?: number;
  minPriorAverage?: number;
  fetcher?: FetchLike;
} = {}): Promise<BirthdayUsageTrendReport> {
  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && birthdayTrendCache && birthdayTrendCache.expiresAt > now) {
    return birthdayTrendCache.value;
  }

  const sourceUrls = {
    playerStats: nflverseUrl("player_stats_week", 0),
    players: nflverseUrl("players", 0),
    schedules: nflverseUrl("schedules", 0),
  };

  try {
    const [playerStats, players, schedules] = await Promise.all([
      fetchCsvRecords(sourceUrls.playerStats, fetcher, timeoutMs),
      fetchCsvRecords(sourceUrls.players, fetcher, timeoutMs),
      fetchCsvRecords(sourceUrls.schedules, fetcher, timeoutMs),
    ]);
    const timelinesResult = buildUsageTimelines({ playerStats, players, schedules });
    const observationResult = buildObservations({
      timelines: timelinesResult.timelines,
      windowDays: birthdayWindowDays,
      minPriorAverage,
    });
    const observations = observationResult.observations;
    const result = compareObservationSets({
      label: `Within ${birthdayWindowDays} days of birthday`,
      observations,
      metric: "opportunity-delta",
      windowDays: birthdayWindowDays,
      minPriorAverage,
      alpha,
      minSampleSize,
    });
    const milestoneResult = compareObservationSets({
      label: "Career game 50/100/150+",
      observations,
      metric: "opportunity-delta",
      windowDays: birthdayWindowDays,
      minPriorAverage,
      alpha,
      minSampleSize,
      cohortSelector: (observation) => observation.careerMilestone50,
    });

    const sensitivity = [
      compareObservationSets({
        label: "Window +/-3 days, prior avg 2+",
        observations: buildObservations({
          timelines: timelinesResult.timelines,
          windowDays: birthdayWindowDays,
          minPriorAverage: 2,
        }).observations,
        metric: "opportunity-delta",
        windowDays: birthdayWindowDays,
        minPriorAverage: 2,
        alpha,
        minSampleSize,
      }),
      compareObservationSets({
        label: "Window +/-3 days, prior avg 5+",
        observations,
        metric: "opportunity-delta",
        windowDays: birthdayWindowDays,
        minPriorAverage,
        alpha,
        minSampleSize,
      }),
      compareObservationSets({
        label: "Relative lift, prior avg 5+",
        observations,
        metric: "relative-opportunity-lift",
        windowDays: birthdayWindowDays,
        minPriorAverage,
        alpha,
        minSampleSize,
      }),
    ];
    const milestoneSensitivity = [
      compareObservationSets({
        label: "Every 25th career game",
        observations,
        metric: "opportunity-delta",
        windowDays: birthdayWindowDays,
        minPriorAverage,
        alpha,
        minSampleSize,
        cohortSelector: (observation) => observation.careerMilestone25,
      }),
      milestoneResult,
      compareObservationSets({
        label: "Relative lift, every 50th game",
        observations,
        metric: "relative-opportunity-lift",
        windowDays: birthdayWindowDays,
        minPriorAverage,
        alpha,
        minSampleSize,
        cohortSelector: (observation) => observation.careerMilestone50,
      }),
    ];

    const positionBreakdown = ["RB", "WR", "TE"].map((position) =>
      compareObservationSets({
        label: `${position} birthday window`,
        observations: observations.filter((observation) => observation.position === position),
        metric: "opportunity-delta",
        windowDays: birthdayWindowDays,
        minPriorAverage,
        alpha,
        minSampleSize: Math.max(30, Math.floor(minSampleSize / 2)),
      }),
    );
    const conclusion = result.significant || milestoneResult.significant ? "candidate" : "not-publishable";
    const value: BirthdayUsageTrendReport = {
      generatedAt: new Date().toISOString(),
      status: "live",
      sourceRows: {
        playerStats: playerStats.length,
        players: players.length,
        schedules: schedules.length,
      },
      seasonRange: seasonRange(observations),
      metric: "skill-player opportunities versus prior four-game average",
      feature: "game within birthday window",
      alpha,
      minSampleSize,
      birthdayWindowDays,
      minPriorAverage,
      result,
      milestoneResult,
      sensitivity,
      milestoneSensitivity,
      positionBreakdown,
      examples: examples(observations),
      quality: {
        eligibleSkillRows: timelinesResult.eligibleSkillRows,
        playerTimelines: timelinesResult.timelines.size,
        observationsTested: observations.length + observationResult.skippedLowPriorAverage,
        observationsUsed: observations.length,
        birthdayWindowObservations: observations.filter((observation) => observation.birthdayWindow).length,
        careerMilestone50Observations: observations.filter((observation) => observation.careerMilestone50).length,
        skippedMissingBirthDate: timelinesResult.skippedMissingBirthDate,
        skippedMissingGameDate: timelinesResult.skippedMissingGameDate,
        skippedInsufficientPriorGames: observationResult.skippedInsufficientPriorGames,
        skippedLowPriorAverage: observationResult.skippedLowPriorAverage,
      },
      conclusion,
      canPowerScoring: false,
      boundary:
        conclusion === "candidate"
          ? "This narrative-context cohort is a research candidate only. It does not affect live scoring until persisted joins, backtests, and model-version review clear."
          : "The birthday-window and career-milestone cohorts do not clear the significance gate. The product must reject them as scoring inputs instead of turning anecdotes into picks.",
      sourceUrls,
      error: null,
    };

    if (cacheTtlMs > 0 && fetcher === fetch) birthdayTrendCache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      sourceRows: { playerStats: 0, players: 0, schedules: 0 },
      seasonRange: { start: null, end: null },
      metric: "skill-player opportunities versus prior four-game average",
      feature: "game within birthday window",
      alpha,
      minSampleSize,
      birthdayWindowDays,
      minPriorAverage,
      result: null,
      milestoneResult: null,
      sensitivity: [],
      milestoneSensitivity: [],
      positionBreakdown: [],
      examples: { positiveSpikes: [], negativeDrops: [] },
      quality: {
        eligibleSkillRows: 0,
        playerTimelines: 0,
        observationsTested: 0,
        observationsUsed: 0,
        birthdayWindowObservations: 0,
        careerMilestone50Observations: 0,
        skippedMissingBirthDate: 0,
        skippedMissingGameDate: 0,
        skippedInsufficientPriorGames: 0,
        skippedLowPriorAverage: 0,
      },
      conclusion: "source-error",
      canPowerScoring: false,
      boundary:
        "The birthday-window report could not load source rows. The product must show an empty state instead of fabricating a narrative signal.",
      sourceUrls,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
