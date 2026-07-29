/**
 * nflverse-backed value provider — in-memory map filled by ingestion workers.
 * Production: hydrate from PlayerGameStat / PBP aggregates.
 * This is the lawful bridge: stats-api never scrapes; it only serves admitted rows.
 */

import type { ValueProvider } from "../values.js";

export type NflverseRow = {
  metricId: string;
  entityId: string;
  asOf: string;
  value: number | string | boolean | null;
};

export class NflverseMemoryStore {
  private rows = new Map<string, NflverseRow>();

  put(row: NflverseRow): void {
    this.rows.set(`${row.metricId}\0${row.entityId}\0${row.asOf}`, row);
  }

  getAsOf(metricId: string, entityId: string, asOf: string): NflverseRow | null {
    const t = Date.parse(asOf);
    if (!Number.isFinite(t)) return null;
    let best: NflverseRow | null = null;
    let bestT = -Infinity;
    for (const r of this.rows.values()) {
      if (r.metricId !== metricId || r.entityId !== entityId) continue;
      const rt = Date.parse(r.asOf);
      if (!Number.isFinite(rt) || rt > t) continue;
      if (rt >= bestT) {
        bestT = rt;
        best = r;
      }
    }
    return best;
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
