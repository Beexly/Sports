import { fetchNflverseTableCached, nflverseUrl } from "@sports/data-ingestion";
import { discoverCohortTrends, range, type Observation, type Trend } from "@sports/prediction-engine";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface TeamWeekUsage {
  attempts: number;
  rbTargets: number;
}

interface QbAgeObservationMeta {
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly opponent: string;
  readonly qbId: string;
  readonly qbName: string;
  readonly qbAge: number;
  readonly gameDate: string;
  readonly passAttempts: number;
  readonly rbTargets: number;
  readonly rbTargetShare: number;
}

interface QbAgeObservation extends Observation {
  readonly meta: QbAgeObservationMeta;
}

export interface QbAgeDataQuality {
  readonly scheduleTeamRows: number;
  readonly observationsUsed: number;
  readonly skippedMissingTeamStats: number;
  readonly skippedMissingQbBirthDate: number;
  readonly skippedNoPassAttempts: number;
}

export interface QbAgeRbTrendReport {
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
  readonly metric: "running back targets / team pass attempts";
  readonly feature: "starting QB age";
  readonly minSampleSize: number;
  readonly alpha: number;
  readonly trends: readonly Trend[];
  readonly quality: QbAgeDataQuality;
  readonly examples: readonly QbAgeObservationMeta[];
  readonly canPowerScoring: false;
  readonly boundary: string;
  readonly sourceUrls: Record<"playerStats" | "players" | "schedules", string>;
  readonly error: string | null;
}

let qbAgeTrendCache: { readonly expiresAt: number; readonly value: QbAgeRbTrendReport } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function ageOnDate(birthDate: string | undefined, gameDate: string | undefined): number | null {
  if (!birthDate || !gameDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const game = new Date(`${gameDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(game.getTime())) return null;
  let age = game.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    game.getUTCMonth() < birth.getUTCMonth() ||
    (game.getUTCMonth() === birth.getUTCMonth() && game.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function playerBirthDateMap(players: readonly CsvRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const player of players) {
    const id = player["gsis_id"];
    const birthDate = player["birth_date"];
    if (id && birthDate) map.set(id, birthDate);
  }
  return map;
}

function teamWeekUsageMap(playerStats: readonly CsvRecord[]): Map<string, TeamWeekUsage> {
  const map = new Map<string, TeamWeekUsage>();
  for (const row of playerStats) {
    if (row["season_type"] !== "REG") continue;
    const season = row["season"];
    const week = row["week"];
    const team = row["recent_team"];
    if (!season || !week || !team) continue;
    const key = `${season}|${week}|${team}`;
    const usage = map.get(key) ?? { attempts: 0, rbTargets: 0 };
    usage.attempts += toNumber(row["attempts"]);
    if (row["position"] === "RB") usage.rbTargets += toNumber(row["targets"]);
    map.set(key, usage);
  }
  return map;
}

function buildObservations({
  playerStats,
  players,
  schedules,
}: {
  playerStats: readonly CsvRecord[];
  players: readonly CsvRecord[];
  schedules: readonly CsvRecord[];
}): { observations: readonly QbAgeObservation[]; quality: QbAgeDataQuality } {
  const birthDates = playerBirthDateMap(players);
  const teamWeeks = teamWeekUsageMap(playerStats);
  const observations: QbAgeObservation[] = [];
  let scheduleTeamRows = 0;
  let skippedMissingTeamStats = 0;
  let skippedMissingQbBirthDate = 0;
  let skippedNoPassAttempts = 0;

  for (const game of schedules) {
    if (game["game_type"] !== "REG") continue;
    for (const side of ["away", "home"] as const) {
      scheduleTeamRows += 1;
      const team = game[`${side}_team`];
      const opponent = game[side === "away" ? "home_team" : "away_team"];
      const qbId = game[`${side}_qb_id`];
      const qbName = game[`${side}_qb_name`] || "UNKNOWN";
      const teamWeek = teamWeeks.get(`${game["season"]}|${game["week"]}|${team}`);
      if (!teamWeek) {
        skippedMissingTeamStats += 1;
        continue;
      }
      if (teamWeek.attempts < 1) {
        skippedNoPassAttempts += 1;
        continue;
      }
      const qbAge = ageOnDate(birthDates.get(qbId ?? ""), game["gameday"]);
      if (qbAge === null) {
        skippedMissingQbBirthDate += 1;
        continue;
      }
      const rbTargetShare = teamWeek.rbTargets / teamWeek.attempts;
      observations.push({
        metric: rbTargetShare,
        features: { qbAge },
        meta: {
          season: toNumber(game["season"]),
          week: toNumber(game["week"]),
          team: team ?? "",
          opponent: opponent ?? "",
          qbId: qbId ?? "",
          qbName,
          qbAge,
          gameDate: game["gameday"] ?? "",
          passAttempts: teamWeek.attempts,
          rbTargets: teamWeek.rbTargets,
          rbTargetShare,
        },
      });
    }
  }

  return {
    observations,
    quality: {
      scheduleTeamRows,
      observationsUsed: observations.length,
      skippedMissingTeamStats,
      skippedMissingQbBirthDate,
      skippedNoPassAttempts,
    },
  };
}

function seasonRange(observations: readonly QbAgeObservation[]): QbAgeRbTrendReport["seasonRange"] {
  if (observations.length === 0) return { start: null, end: null };
  const seasons = observations.map((observation) => observation.meta.season);
  return { start: Math.min(...seasons), end: Math.max(...seasons) };
}

function exampleRows(observations: readonly QbAgeObservation[]): readonly QbAgeObservationMeta[] {
  return observations
    .filter((observation) => observation.meta.qbAge >= 34)
    .sort(
      (a, b) =>
        b.meta.season - a.meta.season ||
        b.meta.week - a.meta.week ||
        b.meta.rbTargetShare - a.meta.rbTargetShare,
    )
    .slice(0, 8)
    .map((observation) => observation.meta);
}

export function resetQbAgeRbTrendCacheForTests(): void {
  qbAgeTrendCache = null;
}

export async function loadQbAgeRbTrendReport({
  timeoutMs = 15000,
  cacheTtlMs = 6 * 60 * 60 * 1000,
  minSampleSize = 300,
  alpha = 0.01,
  fetcher = fetch,
  season = latestNflverseInspectionSeason(),
}: {
  timeoutMs?: number;
  cacheTtlMs?: number;
  minSampleSize?: number;
  alpha?: number;
  fetcher?: FetchLike;
  season?: number;
} = {}): Promise<QbAgeRbTrendReport> {
  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && qbAgeTrendCache && qbAgeTrendCache.expiresAt > now) {
    return qbAgeTrendCache.value;
  }

  // Published sourceUrls stay the season-invariant combined-asset URLs — the
  // report shape and values are unchanged regardless of the internally
  // requested season (see fetchNflverseTableCached's shared cache key).
  const sourceUrls = {
    playerStats: nflverseUrl("player_stats_week", 0),
    players: nflverseUrl("players", 0),
    schedules: nflverseUrl("schedules", 0),
  };

  try {
    const [playerStatsTable, playersTable, schedulesTable] = await Promise.all([
      fetchNflverseTableCached({ key: "player_stats_week", season, fetcher, timeoutMs }),
      fetchNflverseTableCached({ key: "players", season: 0, fetcher, timeoutMs }),
      fetchNflverseTableCached({ key: "schedules", season: 0, fetcher, timeoutMs }),
    ]);
    const playerStats = playerStatsTable.table.records;
    const players = playersTable.table.records;
    const schedules = schedulesTable.table.records;
    const { observations, quality } = buildObservations({ playerStats, players, schedules });
    const trends = discoverCohortTrends(observations, {
      feature: "qbAge",
      buckets: [range("QB age 34+", 34), range("QB age 30-33", 30, 33), range("QB age under 30", 0, 29)],
      minSampleSize,
      alpha,
    });
    const value: QbAgeRbTrendReport = {
      generatedAt: new Date().toISOString(),
      status: "live",
      sourceRows: {
        playerStats: playerStats.length,
        players: players.length,
        schedules: schedules.length,
      },
      seasonRange: seasonRange(observations),
      metric: "running back targets / team pass attempts",
      feature: "starting QB age",
      minSampleSize,
      alpha,
      trends,
      quality,
      examples: exampleRows(observations),
      canPowerScoring: false,
      boundary:
        "This is a read-only research result from public nflverse files. It is not a betting pick and does not affect live scoring until persisted joins, backtests, and model-version review clear.",
      sourceUrls,
      error: null,
    };
    if (cacheTtlMs > 0 && fetcher === fetch) qbAgeTrendCache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      sourceRows: { playerStats: 0, players: 0, schedules: 0 },
      seasonRange: { start: null, end: null },
      metric: "running back targets / team pass attempts",
      feature: "starting QB age",
      minSampleSize,
      alpha,
      trends: [],
      quality: {
        scheduleTeamRows: 0,
        observationsUsed: 0,
        skippedMissingTeamStats: 0,
        skippedMissingQbBirthDate: 0,
        skippedNoPassAttempts: 0,
      },
      examples: [],
      canPowerScoring: false,
      boundary:
        "The cohort report could not load source rows. The product must show an empty state instead of fabricating a trend.",
      sourceUrls,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
