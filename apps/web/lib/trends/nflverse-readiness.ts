import { gunzipSync } from "node:zlib";
import {
  NFLVERSE_CATALOG,
  NFLVERSE_TREND_PLANS,
  nflverseUrl,
  parseCsv,
  type NflverseDatasetKey,
  type TrendPlanKey,
} from "@sports/data-ingestion";
import { db } from "@sports/db";

export type NflverseDatasetStatus = "live" | "missing" | "error";

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
  /** Persisted PlayerGameStat rows — each is a player-week observation already joined to a Player identity (FK-enforced at ingestion). */
  readonly joinedTrendObservations: number;
  /** Distinct seasons among the persisted joined observations. */
  readonly persistedSeasonCount: number;
  /** True ONLY when the declared thresholds (minimumSeasons AND minimumObservations) are genuinely met by persisted rows. */
  readonly canPublishTrends: boolean;
  /** Why publication is blocked; null once the declared data volume is truly met. */
  readonly blockReason: string | null;
  readonly datasets: readonly NflverseDatasetReadiness[];
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function latestNflverseInspectionSeason(now = new Date()): number {
  const month = now.getUTCMonth();
  return month >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
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

/**
 * Count the persisted, joined trend observations. A PlayerGameStat row exists
 * only with a valid Player foreign key, so the `player_stats_week` → Player
 * identity join is materialized at ingestion time; counting rows counts joined
 * player-week observations. Fails CLOSED: if the DB is unreachable (or the
 * stub client is active) the counts read as zero and the gate stays shut.
 */
async function countPersistedJoinedObservations(): Promise<PersistedJoinCounts> {
  try {
    const [observationCount, seasonRows] = await Promise.all([
      db.playerGameStat.count(),
      db.playerGameStat.findMany({ distinct: ["season"], select: { season: true } }),
    ]);
    return { observationCount, seasonCount: seasonRows.length };
  } catch {
    return { observationCount: 0, seasonCount: 0 };
  }
}

export async function loadNflverseTrendReadiness({
  planKey = "qb-age-rb-target-share",
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: {
  planKey?: TrendPlanKey;
  season?: number;
  timeoutMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseTrendReadiness> {
  const plan = NFLVERSE_TREND_PLANS[planKey];
  const [datasets, persisted] = await Promise.all([
    Promise.all(plan.requiredDatasets.map((key) => fetchDatasetReadiness({ key, season, timeoutMs, fetcher }))),
    countPersistedJoinedObservations(),
  ]);
  const liveDatasetCount = datasets.filter((dataset) => dataset.status === "live").length;
  const totalSourceRows = datasets.reduce((sum, dataset) => sum + (dataset.rowCount ?? 0), 0);

  // The honest release contract: publication opens ONLY when the declared data
  // volume is truly persisted. No partial credit, no source-row substitution.
  const canPublishTrends =
    persisted.seasonCount >= plan.minimumSeasons && persisted.observationCount >= plan.minimumObservations;
  const blockReason = canPublishTrends
    ? null
    : persisted.observationCount === 0
      ? "Live nflverse source rows are reachable read-only, but GSE has not persisted and joined Player/PlayerGameStat observations yet."
      : `Persisted joined observations are below the declared publication gate: ${persisted.observationCount}/${plan.minimumObservations} observations across ${persisted.seasonCount}/${plan.minimumSeasons} seasons.`;

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
    joinedTrendObservations: persisted.observationCount,
    persistedSeasonCount: persisted.seasonCount,
    canPublishTrends,
    blockReason,
    datasets,
  };
}
