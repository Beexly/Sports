import type { FeatureRecord, FeatureWrite, PITQuery } from "./types.js";
import { asEntityId, asFeatureId } from "./types.js";
import {
  parseAsOfMs,
  selectLatestAsOf,
  validateFeatureWrite,
  validatePitQuery,
  type PitClock,
} from "./pit-validate.js";

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
  private readonly clock: PitClock | undefined;

  constructor(opts?: { clock?: PitClock }) {
    this.clock = opts?.clock;
  }

  put(write: FeatureWrite): FeatureRecord {
    const v = validateFeatureWrite(
      {
        featureId: String(write.featureId),
        entityId: String(write.entityId),
        asOf: write.asOf,
        pitCorrect: write.pitCorrect,
        publicApiEligible: write.publicApiEligible,
        sourceRights: write.sourceRights,
      },
      { clock: this.clock },
    );
    if (!v.ok) {
      throw new Error(`refuse write: ${v.code} — ${v.error}`);
    }
    const rec: FeatureRecord = {
      featureId: asFeatureId(String(write.featureId)),
      entityId: asEntityId(String(write.entityId)),
      asOf: v.asOfIso, // normalized ISO
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
    const v = validatePitQuery(
      {
        featureId: String(q.featureId),
        entityId: String(q.entityId),
        asOf: q.asOf,
      },
      { clock: this.clock, allowFuture: true },
    );
    // allowFuture on read of historical sims; still require valid parse
    // Re-parse strictly: invalid asOf → null
    const parsed = parseAsOfMs(q.asOf);
    if (!parsed.ok) return null;
    if (!v.ok && v.code !== "asof_future") {
      // feature/entity missing shouldn't happen if branded types; still null
      if (v.code === "feature_missing" || v.code === "entity_missing") return null;
    }
    const candidates = [...this.rows.values()].filter(
      (r) => r.featureId === q.featureId && r.entityId === q.entityId,
    );
    return selectLatestAsOf(candidates, parsed.asOfIso);
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
