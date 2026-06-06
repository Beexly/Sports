import { loadBirthdayUsageTrendReport } from "@/lib/nflverse/birthday-usage-trend";
import { loadNflverseUsagePulse } from "@/lib/nflverse/usage-pulse";
import { loadQbAgeRbTrendReport } from "@/lib/nflverse/qb-age-rb-trend";
import { loadNflverseTrendReadiness } from "@/lib/trends/nflverse-readiness";

export interface SourceDatasetEvidence {
  readonly key: string;
  readonly status: "live" | "missing" | "error" | "unknown";
  readonly rowCount: number | null;
  readonly scope: string;
  readonly route: string;
}

export interface SourceLiveEvidence {
  readonly generatedAt: string;
  readonly status: "live" | "partial" | "source-error";
  readonly summary: {
    readonly liveDatasets: number;
    readonly requiredDatasets: number;
    readonly totalSourceRows: number | null;
    readonly usagePlayerStatsRows: number | null;
    readonly latestUsageSeason: number | null;
    readonly latestUsageWeek: number | null;
    readonly latestWeekPlayerRows: number | null;
    readonly qbAgeRows: number | null;
    readonly cohortObservations: number | null;
    readonly qbAge34Sample: number | null;
    readonly qbAge34Lift: number | null;
    readonly qbAge34PValue: number | null;
    readonly birthdayUsageObservations: number | null;
    readonly birthdayWindowObservations: number | null;
    readonly birthdayUsagePValue: number | null;
    readonly careerMilestone50Observations: number | null;
    readonly careerMilestone50PValue: number | null;
    readonly birthdayUsageConclusion: "candidate" | "not-publishable" | "source-error" | null;
  };
  readonly gates: {
    readonly databaseWritesScheduled: false;
    readonly scoringEnabled: false;
    readonly publicationEnabled: false;
  };
  readonly datasets: readonly SourceDatasetEvidence[];
  readonly routes: {
    readonly usagePulse: "/api/nflverse/usage-pulse";
    readonly qbAgeTrend: "/api/nflverse/qb-age-rb-trend";
    readonly birthdayUsageTrend: "/api/nflverse/birthday-usage-trend";
    readonly trendReadiness: "/api/trends/nflverse-readiness";
  };
  readonly errors: readonly string[];
}

type EvidenceOptions = {
  readonly timeoutMs?: number;
};

let sourceEvidenceCache: { readonly expiresAt: number; readonly value: SourceLiveEvidence } | null = null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "UNKNOWN";
}

function roundNullable(value: number | null | undefined, decimals = 4): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function evidenceStatus(errors: readonly string[]): SourceLiveEvidence["status"] {
  if (errors.length === 0) return "live";
  if (errors.length >= 3) return "source-error";
  return "partial";
}

export function resetSourceLiveEvidenceCacheForTests(): void {
  sourceEvidenceCache = null;
}

export async function loadSourceLiveEvidence({
  timeoutMs = 15000,
}: EvidenceOptions = {}): Promise<SourceLiveEvidence> {
  const now = Date.now();
  if (sourceEvidenceCache && sourceEvidenceCache.expiresAt > now) {
    return sourceEvidenceCache.value;
  }

  const [readinessResult, usageResult, trendResult, birthdayResult] = await Promise.allSettled([
    loadNflverseTrendReadiness({ timeoutMs }),
    loadNflverseUsagePulse({ timeoutMs }),
    loadQbAgeRbTrendReport({ timeoutMs }),
    loadBirthdayUsageTrendReport({ timeoutMs }),
  ]);

  const errors: string[] = [];
  if (readinessResult.status === "rejected") errors.push(`readiness: ${errorMessage(readinessResult.reason)}`);
  if (usageResult.status === "rejected") errors.push(`usage: ${errorMessage(usageResult.reason)}`);
  if (trendResult.status === "rejected") errors.push(`qb-age-trend: ${errorMessage(trendResult.reason)}`);
  if (birthdayResult.status === "rejected") errors.push(`birthday-usage-trend: ${errorMessage(birthdayResult.reason)}`);

  const readiness = readinessResult.status === "fulfilled" ? readinessResult.value : null;
  const usage = usageResult.status === "fulfilled" ? usageResult.value : null;
  const trend = trendResult.status === "fulfilled" ? trendResult.value : null;
  const birthday = birthdayResult.status === "fulfilled" ? birthdayResult.value : null;
  const qbAge34 = trend?.trends.find((item) => item.cohort === "QB age 34+") ?? null;

  const datasets = new Map<string, SourceDatasetEvidence>();
  for (const dataset of readiness?.datasets ?? []) {
    datasets.set(dataset.key, {
      key: dataset.key,
      status: dataset.status,
      rowCount: dataset.rowCount,
      scope: dataset.scope,
      route: "/api/trends/nflverse-readiness",
    });
  }

  if (usage) {
    datasets.set("player_stats_week", {
      key: "player_stats_week",
      status: usage.status === "live" ? "live" : "error",
      rowCount: usage.sourceRows,
      scope: "all seasons",
      route: "/api/nflverse/usage-pulse",
    });
  }

  if (trend) {
    datasets.set("players", {
      key: "players",
      status: trend.status === "live" ? "live" : "error",
      rowCount: trend.sourceRows.players,
      scope: "all seasons",
      route: "/api/nflverse/qb-age-rb-trend",
    });
    datasets.set("schedules", {
      key: "schedules",
      status: trend.status === "live" ? "live" : "error",
      rowCount: trend.sourceRows.schedules,
      scope: "all seasons",
      route: "/api/nflverse/qb-age-rb-trend",
    });
  }

  const value: SourceLiveEvidence = {
    generatedAt: new Date().toISOString(),
    status: evidenceStatus(errors),
    summary: {
      liveDatasets: readiness?.liveDatasetCount ?? 0,
      requiredDatasets: readiness?.requiredDatasetCount ?? 0,
      totalSourceRows: readiness?.totalSourceRows ?? null,
      usagePlayerStatsRows: usage?.sourceRows ?? null,
      latestUsageSeason: usage?.season ?? null,
      latestUsageWeek: usage?.week ?? null,
      latestWeekPlayerRows: usage?.latestWeekRows ?? null,
      qbAgeRows: usage?.qbAgeRows.length ?? null,
      cohortObservations: trend?.quality.observationsUsed ?? null,
      qbAge34Sample: qbAge34?.n ?? null,
      qbAge34Lift: roundNullable(qbAge34?.relativeDelta ?? null),
      qbAge34PValue: roundNullable(qbAge34?.pValue ?? null, 12),
      birthdayUsageObservations: birthday?.quality.observationsUsed ?? null,
      birthdayWindowObservations: birthday?.quality.birthdayWindowObservations ?? null,
      birthdayUsagePValue: roundNullable(birthday?.result?.pValue ?? null, 12),
      careerMilestone50Observations: birthday?.quality.careerMilestone50Observations ?? null,
      careerMilestone50PValue: roundNullable(birthday?.milestoneResult?.pValue ?? null, 12),
      birthdayUsageConclusion: birthday?.conclusion ?? null,
    },
    gates: {
      databaseWritesScheduled: false,
      scoringEnabled: false,
      publicationEnabled: false,
    },
    datasets: Array.from(datasets.values()).sort((a, b) => a.key.localeCompare(b.key)),
    routes: {
      usagePulse: "/api/nflverse/usage-pulse",
      qbAgeTrend: "/api/nflverse/qb-age-rb-trend",
      birthdayUsageTrend: "/api/nflverse/birthday-usage-trend",
      trendReadiness: "/api/trends/nflverse-readiness",
    },
    errors,
  };

  sourceEvidenceCache = { expiresAt: now + 15 * 60 * 1000, value };
  return value;
}
