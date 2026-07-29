/**
 * In-memory first-party Source of Record for OwnFeatureRecords.
 * Production: Prisma/Neon write_through; same contract.
 */

import type { OwnFeatureRecord, OwnValueRequest, OwnValueResult } from "./types.js";
import { getOwnMetric } from "./catalog.js";

export class OwnFeedMemoryStore {
  private readonly rows = new Map<string, OwnFeatureRecord>();

  private key(featureId: string, entityId: string, asOf: string): string {
    return `${featureId}|${entityId}|${asOf}`;
  }

  put(rec: OwnFeatureRecord): void {
    if (!rec.pitCorrect) {
      throw new Error("refuse non-PIT feature write");
    }
    if (rec.ownership === "blocked") {
      throw new Error("refuse blocked ownership write");
    }
    this.rows.set(this.key(rec.featureId, rec.entityId, rec.asOf), rec);
  }

  get(
    featureId: string,
    entityId: string,
    asOf: string,
  ): OwnFeatureRecord | undefined {
    const exact = this.rows.get(this.key(featureId, entityId, asOf));
    if (exact) return exact;
    const t = Date.parse(asOf);
    let best: OwnFeatureRecord | undefined;
    let bestT = -Infinity;
    for (const r of this.rows.values()) {
      if (r.featureId !== featureId || r.entityId !== entityId) continue;
      const rt = Date.parse(r.asOf);
      if (rt <= t && rt >= bestT) {
        best = r;
        bestT = rt;
      }
    }
    return best;
  }

  listByEntity(entityId: string): OwnFeatureRecord[] {
    return [...this.rows.values()].filter((r) => r.entityId === entityId);
  }

  size(): number {
    return this.rows.size;
  }

  seedDemo(entityId: string, asOf: string): void {
    const base: Omit<OwnFeatureRecord, "featureId" | "value"> = {
      entityId,
      asOf,
      plane: "model",
      ownership: "first_party",
      sourceId: "gse.own",
      pitCorrect: true,
      publicApiEligible: false,
      licenseSpdx: "LicenseRef-GSE-Internal",
    };
    this.put({ ...base, featureId: "own.model.p", value: 0.58 });
    this.put({ ...base, featureId: "own.model.p_lo", value: 0.54 });
    this.put({ ...base, featureId: "own.model.width", value: 0.08 });
    this.put({
      ...base,
      featureId: "own.quote.q",
      value: 0.51,
      plane: "archive",
      sourceId: "quote.independent",
    });
    this.put({
      ...base,
      featureId: "own.cal.ece",
      value: 0.04,
      plane: "calibration",
      publicApiEligible: true,
    });
    this.put({
      ...base,
      featureId: "own.kpi.refusal_rate",
      value: 0.72,
      plane: "decision",
      publicApiEligible: true,
    });
    this.put({
      ...base,
      featureId: "own.kpi.fire_rate",
      value: 0,
      plane: "decision",
      publicApiEligible: true,
    });
    this.put({
      ...base,
      featureId: "own.stat.rest_days",
      value: 7,
      plane: "derived_stats",
      ownership: "derived_cleared",
      sourceId: "nflverse.schedules",
      publicApiEligible: true,
      licenseSpdx: "CC-BY-4.0",
    });
    this.put({
      ...base,
      featureId: "own.ctx.contract_apy",
      value: 12_500_000,
      plane: "context",
      ownership: "derived_cleared",
      sourceId: "nflverse.contracts",
      publicApiEligible: true,
      licenseSpdx: "CC-BY-4.0",
    });
  }
}

export function readOwnValue(
  store: OwnFeedMemoryStore,
  req: OwnValueRequest,
  now = new Date(),
): OwnValueResult {
  const metric = getOwnMetric(req.metricId);
  if (!metric) {
    return { ok: false, code: "unknown_metric", error: req.metricId };
  }
  if (metric.status === "BLOCKED") {
    return { ok: false, code: "blocked", error: "metric blocked" };
  }
  if (!req.asOf || !Number.isFinite(Date.parse(req.asOf))) {
    return { ok: false, code: "asof_required", error: "PIT asOf required" };
  }
  if (Date.parse(req.asOf) > now.getTime() + 60_000) {
    return { ok: false, code: "future_leak", error: "asOf in future" };
  }
  const rec = store.get(req.metricId, req.entityId, req.asOf);
  if (!rec) {
    return { ok: false, code: "not_found", error: "no feature at asOf" };
  }
  if (typeof rec.value !== "number") {
    return { ok: false, code: "non_numeric", error: "value not numeric" };
  }
  return {
    ok: true,
    metricId: req.metricId,
    entityId: req.entityId,
    asOf: rec.asOf,
    value: rec.value,
    ownership: rec.ownership,
    plane: rec.plane,
    provenance: {
      formulaId: metric.formulaId,
      inputs: metric.dependsOn,
      computedAt: now.toISOString(),
    },
  };
}
