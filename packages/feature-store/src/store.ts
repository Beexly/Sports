import type { FeatureRecord, FeatureWrite, PITQuery } from "./types.js";
import { asEntityId, asFeatureId } from "./types.js";

export interface FeatureStore {
  put(write: FeatureWrite): FeatureRecord;
  /**
   * Point-in-time get: returns the latest record with asOf <= query.asOf,
   * or null if none. Never returns future-leaked values.
   */
  getAsOf(q: PITQuery): FeatureRecord | null;
  /**
   * Public API path — hard refuses non-eligible records.
   */
  getPublic(q: PITQuery): FeatureRecord | null;
  listByEntity(entityId: string): FeatureRecord[];
}

function key(featureId: string, entityId: string, asOf: string): string {
  return `${featureId}\0${entityId}\0${asOf}`;
}

export class InMemoryFeatureStore implements FeatureStore {
  private readonly rows = new Map<string, FeatureRecord>();

  put(write: FeatureWrite): FeatureRecord {
    if (!write.pitCorrect) {
      throw new Error("refuse write: pitCorrect must be true for store admission");
    }
    if (write.sourceRights === "rights_hold" && write.publicApiEligible) {
      throw new Error("refuse write: rights_hold cannot be public_api_eligible");
    }
    const rec: FeatureRecord = {
      featureId: asFeatureId(String(write.featureId)),
      entityId: asEntityId(String(write.entityId)),
      asOf: write.asOf,
      value: write.value,
      sourceRights: write.sourceRights,
      pitCorrect: true,
      publicApiEligible: write.publicApiEligible,
      calibrationCohort: write.calibrationCohort ?? null,
      modelVersion: write.modelVersion ?? null,
      provenanceHash: write.provenanceHash ?? null,
    };
    this.rows.set(key(rec.featureId, rec.entityId, rec.asOf), rec);
    return rec;
  }

  getAsOf(q: PITQuery): FeatureRecord | null {
    const t = Date.parse(q.asOf);
    if (!Number.isFinite(t)) return null;
    let best: FeatureRecord | null = null;
    let bestT = -Infinity;
    for (const r of this.rows.values()) {
      if (r.featureId !== q.featureId || r.entityId !== q.entityId) continue;
      const rt = Date.parse(r.asOf);
      if (!Number.isFinite(rt) || rt > t) continue;
      if (rt >= bestT) {
        bestT = rt;
        best = r;
      }
    }
    return best;
  }

  getPublic(q: PITQuery): FeatureRecord | null {
    const r = this.getAsOf(q);
    if (r == null) return null;
    if (!r.publicApiEligible) return null;
    if (r.sourceRights === "rights_hold") return null;
    return r;
  }

  listByEntity(entityId: string): FeatureRecord[] {
    return [...this.rows.values()].filter((r) => r.entityId === entityId);
  }
}
