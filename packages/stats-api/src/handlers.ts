/**
 * Pure handlers for GSE Stats API v1 — no Next.js deps.
 * Refuse-default: dark/blocked metrics never leak values; public list filters hard.
 */

import {
  catalogStats,
  getMetricById,
  listMetrics,
  type MetricDef,
  type MetricFamily,
  type MetricStatus,
  type SportCode,
} from "./catalog.js";

export type ApiError = {
  ok: false;
  status: 400 | 403 | 404 | 422;
  error: string;
  code: string;
};

export type ApiOk<T> = { ok: true; status: 200; data: T };

export type ApiResult<T> = ApiOk<T> | ApiError;

function refuse(status: ApiError["status"], code: string, error: string): ApiError {
  return { ok: false, status, code, error };
}

export function handleListMetrics(query: {
  sport?: string;
  family?: string;
  status?: string;
  publicOnly?: boolean;
}): ApiResult<{ metrics: MetricDef[]; meta: ReturnType<typeof catalogStats> }> {
  const sport = query.sport as SportCode | undefined;
  const family = query.family as MetricFamily | undefined;
  const status = query.status as MetricStatus | undefined;
  // Default publicOnly=true on public surface — aggressive density, honest access
  const publicOnly = query.publicOnly !== false;

  if (sport && !["NFL", "NCAAF", "NBA", "NCAAB", "MLB", "NHL", "MULTI", "SOCCER"].includes(sport)) {
    return refuse(400, "invalid_sport", `Unknown sport: ${sport}`);
  }

  const metrics = listMetrics({
    sport,
    family,
    status,
    publicApiOnly: publicOnly,
  });

  return {
    ok: true,
    status: 200,
    data: {
      metrics,
      meta: catalogStats(),
    },
  };
}

export function handleGetMetric(metricId: string): ApiResult<{ metric: MetricDef }> {
  if (!metricId?.trim()) {
    return refuse(400, "missing_id", "metricId required");
  }
  const metric = getMetricById(metricId);
  if (!metric) {
    return refuse(404, "not_found", `No metric ${metricId}`);
  }
  // Dark/blocked: admit existence only on internal; public path collapses
  if (!metric.publicApi) {
    return refuse(
      403,
      "not_public",
      `Metric ${metricId} is ${metric.status} / surface ${metric.rights.surface} — refuse-default`,
    );
  }
  return { ok: true, status: 200, data: { metric } };
}

export function handleCatalogSummary(): ApiResult<{
  product: string;
  version: string;
  claim: string;
  stats: ReturnType<typeof catalogStats>;
  law: string[];
}> {
  return {
    ok: true,
    status: 200,
    data: {
      product: "Galaxy Sports Edge Stats API",
      version: "gse.stats.v1",
      claim:
        "Densest rights-tagged sports metrics registry — no fabricated performance numbers.",
      stats: catalogStats(),
      law: [
        "refuse-default",
        "PIT asOf required for values",
        "four-field substantiation for performance claims",
        "LIVE_BOARD founder-gated",
        "Pedersen ≠ ZK/PQ",
      ],
    },
  };
}

export function handleCoverageMatrix(): ApiResult<{
  sources: Array<{
    id: string;
    tier: "CATALOG" | "CONSUMED" | "PERSISTED" | "BLOCKED";
    rights: string;
    sports: string[];
  }>;
  metricCount: number;
  publicMetricCount: number;
}> {
  const stats = catalogStats();
  return {
    ok: true,
    status: 200,
    data: {
      sources: [
        { id: "nflverse.*", tier: "PERSISTED", rights: "CC-BY-4.0", sports: ["NFL"] },
        { id: "odds.the_odds_api", tier: "PERSISTED", rights: "licensed", sports: ["MULTI"] },
        { id: "mlb.statcast", tier: "CATALOG", rights: "free_legal", sports: ["MLB"] },
        { id: "nba.stats", tier: "CATALOG", rights: "free_legal", sports: ["NBA"] },
        { id: "nhl.moneypuck", tier: "CATALOG", rights: "free_legal", sports: ["NHL"] },
        { id: "optical.scorebug", tier: "CATALOG", rights: "optical_derived", sports: ["MULTI"] },
        { id: "optical.formation", tier: "BLOCKED", rights: "PARKED", sports: ["NFL"] },
        {
          id: "nflverse.pbp_participation",
          tier: "BLOCKED",
          rights: "CC-BY-SA hold",
          sports: ["NFL"],
        },
        { id: "college.cfbd", tier: "CATALOG", rights: "pending", sports: ["NCAAF", "NCAAB"] },
      ],
      metricCount: stats.total,
      publicMetricCount: stats.publicApi,
    },
  };
}
