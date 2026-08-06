import { gunzipSync } from "node:zlib";
import {
  NFLVERSE_CATALOG,
  NFLVERSE_TREND_PLANS,
  nflverseUrl,
  parseCsv,
  resolveFootballStatsSeason,
  type NflverseDatasetKey,
  type TrendPlanKey,
} from "@sports/data-ingestion";
import { db } from "@sports/db";
import { currentNflSeason } from "@/lib/ingestion/player-stats";
import { TREND_BACKFILL_SEASONS } from "@/lib/ingestion/player-stats-backfill";

export type NflverseDatasetStatus = "live" | "missing" | "error";

/**
 * Source id stamped on every row the nflverse ingestion writer persists
 * (`ingestPlayerWeeklyStats` sets `sourceId: "nflverse"`). The publication
 * gate only trusts rows written through that clearance-gated path.
 */
const TREND_SOURCE_ID = "nflverse";

/**
 * Completeness floor: a season counts toward `minimumSeasons` only once it
 * holds at least this many joined player-week observations inside the trend
 * window. A genuinely ingested REG season yields roughly 5,000-6,000
 * player-week rows, so 100 is a deliberately low floor — it can never block a
 * real ingested season, but it stops a trivially thin season (e.g. a single
 * row persisted by an aborted or partial run) from satisfying the seasons
 * threshold and flipping the PUBLIC honesty gate open.
 */
export const PER_SEASON_OBSERVATION_FLOOR = 100;

export interface NflverseDatasetReadiness {
  readonly key: NflverseDatasetKey;
  readonly name: string;
  readonly grain: string;
  readonly scope: string;
  readonly url: string;
  readonly status: NflverseDatasetStatus;
  readonly httpStatus: number | null;
  readonly rowCount: number | null;
  readonly contentBytes: number | null;
  readonly unlocks: string;
  readonly error: string | null;
}

export interface NflverseTrendReadiness {
  readonly generatedAt: string;
  readonly planKey: TrendPlanKey;
  readonly planTitle: string;
  readonly season: number;
  readonly metric: string;
  readonly cohortFeature: string;
  readonly minimumSeasons: number;
  readonly minimumObservations: number;
  readonly requiredDatasetCount: number;
  readonly liveDatasetCount: number;
  readonly totalSourceRows: number;
  readonly windowStartSeason: number;
  readonly windowEndSeason: number;
  readonly perSeasonObservationFloor: number;
  readonly joinedTrendObservations: number;
  readonly persistedSeasonCount: number;
  readonly canPublishTrends: boolean;
  readonly blockReason: string | null;
  readonly datasets: readonly NflverseDatasetReadiness[];
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Default season for nflverse website/engine probes.
 *
 * Delegates to `resolveFootballStatsSeason` so product surfaces stay on the
 * completed REG floor (through 2025 in Aug 2026) until a newer season has real
 * REG rows — never invents current-season completeness.
 */
export function latestNflverseInspectionSeason(now = new Date()): number {
  return resolveFootballStatsSeason(now).season;
}

function datasetName(key: NflverseDatasetKey): string {
  return key.replace(/_/g, " ");
}

function countRows(text: string): number {
  return parseCsv(text).records.length;
}

async function fetchDatasetReadiness({
  key,
  season,
  timeoutMs,
  fetcher,
}: {
  key: NflverseDatasetKey;
  season: number;
  timeoutMs: number;
  fetcher: FetchLike;
}): Promise<NflverseDatasetReadiness> {
  const dataset = NFLVERSE_CATALOG[key];
  const url = nflverseUrl(key, season);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, { signal: controller.signal });
    const contentLength = Number(response.headers.get("content-length"));

    if (!response.ok) {
      return {
        key,
        name: datasetName(key),
        grain: dataset.grain,
        scope: dataset.seasonal ? String(season) : "all seasons",
        url,
        status: response.status === 404 ? "missing" : "error",
        httpStatus: response.status,
        rowCount: null,
        contentBytes: Number.isFinite(contentLength) ? contentLength : null,
        unlocks: dataset.unlocks,
        error: response.statusText || `HTTP ${response.status}`,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const text = url.endsWith(".gz") ? gunzipSync(buffer).toString("utf8") : buffer.toString("utf8");

    return {
      key,
      name: datasetName(key),
      grain: dataset.grain,
      scope: dataset.seasonal ? String(season) : "all seasons",
      url,
      status: "live",
      httpStatus: response.status,
      rowCount: countRows(text),
      contentBytes: buffer.length,
      unlocks: dataset.unlocks,
      error: null,
    };
  } catch (error) {
    return {
      key,
      name: datasetName(key),
      grain: dataset.grain,
      scope: dataset.seasonal ? String(season) : "all seasons",
      url,
      status: "error",
      httpStatus: null,
      rowCount: null,
      contentBytes: null,
      unlocks: dataset.unlocks,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  } finally {
    clearTimeout(timer);
  }
}

interface PersistedJoinCounts {
  readonly observationCount: number;
  readonly seasonCount: number;
}

async function countPersistedJoinedObservations(
  windowStart: number,
  windowEnd: number,
): Promise<PersistedJoinCounts> {
  try {
    const groups = await db.playerGameStat.groupBy({
      by: ["season"],
      where: { season: { gte: windowStart, lte: windowEnd }, sourceId: TREND_SOURCE_ID },
      _count: { _all: true },
    });
    const observationCount = groups.reduce((sum, group) => sum + group._count._all, 0);
    const seasonCount = groups.filter((group) => group._count._all >= PER_SEASON_OBSERVATION_FLOOR).length;
    return { observationCount, seasonCount };
  } catch {
    return { observationCount: 0, seasonCount: 0 };
  }
}

export async function loadNflverseTrendReadiness({
  planKey = "qb-age-rb-target-share",
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
  now = new Date(),
}: {
  planKey?: TrendPlanKey;
  season?: number;
  timeoutMs?: number;
  fetcher?: FetchLike;
  now?: Date;
} = {}): Promise<NflverseTrendReadiness> {
  const plan = NFLVERSE_TREND_PLANS[planKey];
  const windowEndSeason = currentNflSeason(now);
  const windowStartSeason = windowEndSeason - TREND_BACKFILL_SEASONS + 1;
  const [datasets, persisted] = await Promise.all([
    Promise.all(plan.requiredDatasets.map((key) => fetchDatasetReadiness({ key, season, timeoutMs, fetcher }))),
    countPersistedJoinedObservations(windowStartSeason, windowEndSeason),
  ]);
  const liveDatasetCount = datasets.filter((dataset) => dataset.status === "live").length;
  const totalSourceRows = datasets.reduce((sum, dataset) => sum + (dataset.rowCount ?? 0), 0);

  const canPublishTrends =
    persisted.seasonCount >= plan.minimumSeasons && persisted.observationCount >= plan.minimumObservations;
  const blockReason = canPublishTrends
    ? null
    : persisted.observationCount === 0
      ? "Live nflverse source rows are reachable read-only, but GSE has not persisted and joined Player/PlayerGameStat observations inside the trend window yet."
      : `Persisted joined observations are below the declared publication gate: ${persisted.observationCount}/${plan.minimumObservations} observations across ${persisted.seasonCount}/${plan.minimumSeasons} qualifying seasons (window ${windowStartSeason}-${windowEndSeason}; a season qualifies with >=${PER_SEASON_OBSERVATION_FLOOR} joined observations).`;

  return {
    generatedAt: new Date().toISOString(),
    planKey,
    planTitle: plan.title,
    season,
    metric: plan.metric,
    cohortFeature: plan.cohortFeature,
    minimumSeasons: plan.minimumSeasons,
    minimumObservations: plan.minimumObservations,
    requiredDatasetCount: plan.requiredDatasets.length,
    liveDatasetCount,
    totalSourceRows,
    windowStartSeason,
    windowEndSeason,
    perSeasonObservationFloor: PER_SEASON_OBSERVATION_FLOOR,
    joinedTrendObservations: persisted.observationCount,
    persistedSeasonCount: persisted.seasonCount,
    canPublishTrends,
    blockReason,
    datasets,
  };
}
