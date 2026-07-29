import type { FeatureRecord } from "./types.js";

export interface FeastOfflineRow {
  entity_id: string;
  event_timestamp: string;
  feature_id: string;
  value_num: number | null;
  value_str: string | null;
  source_rights: string;
  pit_correct: boolean;
  public_api_eligible: boolean;
  calibration_cohort: string;
  model_version: string;
  provenance_hash: string;
}

export function recordToFeastRow(r: FeatureRecord): FeastOfflineRow {
  const num = typeof r.value === "number" ? r.value : null;
  const str =
    typeof r.value === "string"
      ? r.value
      : typeof r.value === "boolean"
        ? String(r.value)
        : r.value == null
          ? null
          : String(r.value);
  return {
    entity_id: r.entityId,
    event_timestamp: r.asOf,
    feature_id: r.featureId,
    value_num: num,
    value_str: num == null ? str : null,
    source_rights: r.sourceRights,
    pit_correct: r.pitCorrect,
    public_api_eligible: r.publicApiEligible,
    calibration_cohort: r.calibrationCohort ?? "",
    model_version: r.modelVersion ?? "",
    provenance_hash: r.provenanceHash ?? "",
  };
}

export function exportForFeast(rows: readonly FeatureRecord[]): FeastOfflineRow[] {
  return rows.filter((r) => r.pitCorrect).map(recordToFeastRow);
}
