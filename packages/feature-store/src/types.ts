/**
 * Feature Store contract — single source of truth for as-of / PIT features.
 * LAW: refuse-default · public_api_eligible hard gate · measurement > narrative
 */

export type FeatureId = string & { readonly __brand: "FeatureId" };
export type EntityId = string & { readonly __brand: "EntityId" };
export type SourceRights =
  | "licensed"
  | "free_legal"
  | "optical_derived"
  | "internal_synthetic"
  | "rights_hold";

export function asFeatureId(s: string): FeatureId {
  if (!s.trim()) throw new Error("empty FeatureId");
  return s as FeatureId;
}
export function asEntityId(s: string): EntityId {
  if (!s.trim()) throw new Error("empty EntityId");
  return s as EntityId;
}

export interface FeatureRecord {
  readonly featureId: FeatureId;
  readonly entityId: EntityId;
  /** Decision timestamp — feature must be frozen at/before this instant */
  readonly asOf: string;
  readonly value: number | string | boolean | null;
  readonly sourceRights: SourceRights;
  /** True only if PIT-correct by construction (no post-asOf leakage) */
  readonly pitCorrect: boolean;
  /** True only if rights + quality allow public API emission */
  readonly publicApiEligible: boolean;
  readonly calibrationCohort: string | null;
  readonly modelVersion: string | null;
  readonly provenanceHash: string | null;
}

export interface PITQuery {
  readonly featureId: FeatureId;
  readonly entityId: EntityId;
  readonly asOf: string;
}

export interface FeatureWrite {
  readonly featureId: FeatureId;
  readonly entityId: EntityId;
  readonly asOf: string;
  readonly value: number | string | boolean | null;
  readonly sourceRights: SourceRights;
  readonly pitCorrect: boolean;
  readonly publicApiEligible: boolean;
  readonly calibrationCohort?: string | null;
  readonly modelVersion?: string | null;
  readonly provenanceHash?: string | null;
}
