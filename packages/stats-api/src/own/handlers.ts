/**
 * Own Feed API handlers — dominate surface we control end-to-end.
 */

import {
  getOwnMetric,
  listOwnMetrics,
  ownCatalogStats,
} from "./catalog.js";
import { designSpaceReport, ownFeedSnapshot } from "./dominance.js";
import {
  OwnFeedMemoryStore,
  readOwnValue,
} from "./memory-sor.js";
import type { OwnValueRequest } from "./types.js";

export type OwnApiResult<T> =
  | { ok: true; status: 200; data: T }
  | { ok: false; status: number; code: string; error: string };

export function handleOwnSnapshot(): OwnApiResult<
  ReturnType<typeof ownFeedSnapshot> & {
    designSpace: ReturnType<typeof designSpaceReport>;
    claim: string;
  }
> {
  return {
    ok: true,
    status: 200,
    data: {
      ...ownFeedSnapshot(),
      designSpace: designSpaceReport(),
      claim:
        "First-party sports intelligence feed — we own model, calibration, gate, ledger, and derived formulas. Odds vendors optional.",
    },
  };
}

export function handleOwnCatalog(query?: {
  plane?: string;
  publicOnly?: boolean;
}): OwnApiResult<{
  metrics: ReturnType<typeof listOwnMetrics>;
  stats: ReturnType<typeof ownCatalogStats>;
}> {
  return {
    ok: true,
    status: 200,
    data: {
      metrics: listOwnMetrics({
        plane: query?.plane as never,
        publicOnly: query?.publicOnly,
      }),
      stats: ownCatalogStats(),
    },
  };
}

export function handleOwnProvenance(metricId: string): OwnApiResult<{
  metric: NonNullable<ReturnType<typeof getOwnMetric>>;
}> {
  const metric = getOwnMetric(metricId);
  if (!metric) {
    return { ok: false, status: 404, code: "not_found", error: metricId };
  }
  return { ok: true, status: 200, data: { metric } };
}

export function handleOwnValues(
  store: OwnFeedMemoryStore,
  req: OwnValueRequest,
  now?: Date,
): OwnApiResult<Extract<ReturnType<typeof readOwnValue>, { ok: true }>> {
  const r = readOwnValue(store, req, now);
  if (!r.ok) {
    const status =
      r.code === "not_found"
        ? 404
        : r.code === "future_leak" || r.code === "asof_required"
          ? 422
          : 400;
    return { ok: false, status, code: r.code, error: r.error };
  }
  return { ok: true, status: 200, data: r };
}

/** Demo asOf always in the past relative to "now" for previews. */
export function createDemoOwnStore(now = new Date()): OwnFeedMemoryStore {
  const store = new OwnFeedMemoryStore();
  const asOf = new Date(now.getTime() - 2 * 3600_000).toISOString();
  store.seedDemo("nfl:kc", asOf);
  store.seedDemo("nfl:phi", asOf);
  return store;
}
