/**
 * GSE Own Feed — first-party source of record contracts.
 * Dominate stats/API by owning compute + provenance + delivery,
 * not by renting someone else's odds feed.
 */

export type OwnPlane =
  | "model"
  | "calibration"
  | "decision"
  | "optical"
  | "derived_stats"
  | "context"
  | "archive";

export type OwnershipClass =
  | "first_party"
  | "derived_cleared"
  | "attributed_third"
  | "blocked";

export interface OwnMetricContract {
  readonly id: string;
  readonly name: string;
  readonly plane: OwnPlane;
  readonly ownership: OwnershipClass;
  readonly unit: string;
  readonly description: string;
  readonly formulaId: string;
  readonly dependsOn: readonly string[];
  readonly publicApiEligible: boolean;
  readonly status: "ACTIVE" | "CATALOG" | "DARK" | "BLOCKED";
  readonly licenseSpdx: string;
  readonly attributionRequired: boolean;
  readonly attributionText?: string;
}

export interface OwnFeatureRecord {
  readonly featureId: string;
  readonly entityId: string;
  readonly asOf: string;
  readonly value: number | string | boolean | Record<string, unknown>;
  readonly plane: OwnPlane;
  readonly ownership: OwnershipClass;
  readonly sourceId: string;
  readonly pitCorrect: boolean;
  readonly publicApiEligible: boolean;
  readonly licenseSpdx: string;
}

export interface OwnFeedSnapshot {
  readonly generatedAt: string;
  readonly metricCount: number;
  readonly firstPartyCount: number;
  readonly publicEligibleCount: number;
  readonly dominance: DominanceScore;
  readonly law: readonly string[];
}

export interface DominanceScore {
  readonly selfReliance: number;
  readonly firstPartyShare: number;
  readonly thirdPartyShare: number;
  readonly blockedShare: number;
  readonly oddsVendorRequired: false;
  readonly notes: string[];
}

export interface OwnValueRequest {
  readonly metricId: string;
  readonly entityId: string;
  readonly asOf: string;
}

export type OwnValueResult =
  | {
      ok: true;
      metricId: string;
      entityId: string;
      asOf: string;
      value: number;
      ownership: OwnershipClass;
      plane: OwnPlane;
      provenance: {
        formulaId: string;
        inputs: readonly string[];
        computedAt: string;
      };
    }
  | {
      ok: false;
      code:
        | "unknown_metric"
        | "blocked"
        | "asof_required"
        | "future_leak"
        | "not_found"
        | "non_numeric";
      error: string;
    };
