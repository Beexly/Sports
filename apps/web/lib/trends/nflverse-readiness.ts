import { gunzipSync } from "node:zlib";
import {
  NFLVERSE_CATALOG,
  NFLVERSE_TREND_PLANS,
  nflverseUrl,
  parseCsv,
  type NflverseDatasetKey,
  type TrendPlanKey,
} from "@sports/data-ingestion";

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
  readonly joinedTrendObservations: number;
  readonly canPublishTrends: false;
  readonly blockReason: string;
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
  const datasets = await Promise.all(
    plan.requiredDatasets.map((key) => fetchDatasetReadiness({ key, season, timeoutMs, fetcher })),
  );
  const liveDatasetCount = datasets.filter((dataset) => dataset.status === "live").length;
  const totalSourceRows = datasets.reduce((sum, dataset) => sum + (dataset.rowCount ?? 0), 0);

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
    joinedTrendObservations: 0,
    canPublishTrends: false,
    blockReason:
      "Live nflverse source rows are reachable read-only, but GSE has not persisted and joined Player/PlayerGameStat-style observations yet.",
    datasets,
  };
}
