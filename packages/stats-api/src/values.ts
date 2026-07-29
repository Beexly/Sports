/**
 * PIT value API — values only for public_api_eligible metrics with asOf.
 * Refuse-default: missing asOf, dark metrics, rights_hold → structured refuse.
 */

import { getMetricById } from "./catalog.js";
import type { MetricDef } from "./catalog-types.js";
import { metricVisibleToTier, parseBillingTier } from "./entitlements.js";
import {
  pitCodeToHttp,
  validateValueRequest,
  type PitClock,
} from "./pit-validate.js";

export interface MetricValueRequest {
  readonly metricId: string;
  readonly entityId: string;
  readonly asOf: string;
  readonly tier?: string;
}

export interface MetricValue {
  readonly metricId: string;
  readonly entityId: string;
  readonly asOf: string;
  readonly value: number | string | boolean | null;
  readonly unit: string;
  readonly provenance: {
    readonly sourceIds: readonly string[];
    readonly rights: string;
    readonly pitCorrect: true;
    readonly modelVersion: string | null;
  };
  readonly attribution: string | null;
}

export type ValueResult =
  | { ok: true; status: 200; data: MetricValue }
  | { ok: false; status: 400 | 403 | 404 | 422 | 501; code: string; error: string };

export type ValueProvider = (
  metric: MetricDef,
  entityId: string,
  asOf: string,
) => Promise<number | string | boolean | null> | number | string | boolean | null;

export async function handleGetMetricValue(
  req: MetricValueRequest,
  provider?: ValueProvider,
  opts?: { clock?: PitClock; allowFutureAsOf?: boolean },
): Promise<ValueResult> {
  const pit = validateValueRequest(
    {
      metricId: req.metricId,
      entityId: req.entityId,
      asOf: req.asOf,
    },
    { clock: opts?.clock, allowFuture: opts?.allowFutureAsOf },
  );
  if (!pit.ok) {
    return {
      ok: false,
      status: pitCodeToHttp(pit.code),
      code: pit.code,
      error: pit.error,
    };
  }

  const metric = getMetricById(req.metricId);
  if (!metric) {
    return { ok: false, status: 404, code: "not_found", error: `No metric ${req.metricId}` };
  }
  if (!metric.publicApi) {
    return {
      ok: false,
      status: 403,
      code: "not_public",
      error: `Metric ${req.metricId} is ${metric.status}/${metric.rights.surface}`,
    };
  }
  const tier = parseBillingTier(req.tier);
  if (!metricVisibleToTier(metric, tier)) {
    return {
      ok: false,
      status: 403,
      code: "tier_insufficient",
      error: `Metric ${req.metricId} requires ${metric.rights.surface}; tier ${tier} insufficient`,
    };
  }

  if (!provider) {
    return {
      ok: false,
      status: 501,
      code: "provider_unwired",
      error:
        "Metric contract exists; value provider not wired for this metric yet (definition-first API).",
    };
  }

  const value = await provider(metric, req.entityId, pit.asOfIso);
  const attribution = metric.rights.attributionRequired
    ? `Source: ${metric.sourceIds.join(", ")} (${metric.rights.rights})`
    : null;

  return {
    ok: true,
    status: 200,
    data: {
      metricId: metric.id,
      entityId: req.entityId,
      asOf: pit.asOfIso,
      value,
      unit: metric.unit,
      provenance: {
        sourceIds: metric.sourceIds,
        rights: metric.rights.rights,
        pitCorrect: true,
        modelVersion: null,
      },
      attribution,
    },
  };
}

export function createMemoryValueProvider(
  seed: Record<string, number | string | boolean | null>,
): ValueProvider {
  return (metric, entityId, asOf) => {
    const key = `${metric.id}|${entityId}|${asOf}`;
    if (key in seed) return seed[key]!;
    const loose = `${metric.id}|${entityId}`;
    if (loose in seed) return seed[loose]!;
    return null;
  };
}
