/**
 * nflverse-backed value provider — in-memory map filled by ingestion workers.
 * Production: hydrate from PlayerGameStat / PBP aggregates.
 * PIT: only returns rows with asOf <= query (selectLatestAsOf).
 */

import type { ValueProvider } from "../values.js";
import { parseAsOfMs, selectLatestAsOf } from "../pit-validate.js";

export type NflverseRow = {
  metricId: string;
  entityId: string;
  asOf: string;
  value: number | string | boolean | null;
};

export class NflverseMemoryStore {
  private rows = new Map<string, NflverseRow>();

  put(row: NflverseRow): void {
    const parsed = parseAsOfMs(row.asOf);
    if (!parsed.ok) {
      throw new Error(`refuse put: ${parsed.code} — ${parsed.error}`);
    }
    if (!row.metricId?.trim() || !row.entityId?.trim()) {
      throw new Error("refuse put: metricId and entityId required");
    }
    const normalized: NflverseRow = {
      ...row,
      asOf: parsed.asOfIso,
    };
    this.rows.set(`${normalized.metricId}\0${normalized.entityId}\0${normalized.asOf}`, normalized);
  }

  getAsOf(metricId: string, entityId: string, asOf: string): NflverseRow | null {
    const q = parseAsOfMs(asOf);
    if (!q.ok) return null;
    const candidates = [...this.rows.values()].filter(
      (r) => r.metricId === metricId && r.entityId === entityId,
    );
    return selectLatestAsOf(candidates, q.asOfIso);
  }

  size(): number {
    return this.rows.size;
  }
}

export function createNflverseMemoryProvider(store: NflverseMemoryStore): ValueProvider {
  return (metric, entityId, asOf) => {
    if (!metric.id.startsWith("nfl.")) return null;
    const row = store.getAsOf(metric.id, entityId, asOf);
    return row ? row.value : null;
  };
}
