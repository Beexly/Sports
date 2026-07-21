import type { RightsStatus } from "./types";

export type DataAssetUse =
  | "internal_analysis"
  | "commercial_display"
  | "derived_data_product"
  | "model_training"
  | "evaluation_benchmark"
  | "training_data_license"
  | "partner_sharing";

export interface DataAssetRightsRecord {
  readonly assetId: string;
  readonly sourceIds: readonly string[];
  readonly rightsStatus: RightsStatus;
  readonly ownedByGse: boolean;
  readonly containsPersonalData: boolean;
  readonly containsThirdPartyExpression: boolean;
  readonly commercialUseAllowed: boolean;
  readonly derivedUseAllowed: boolean;
  readonly modelTrainingAllowed: boolean;
  readonly redistributionAllowed: boolean;
  readonly deletionProcessDefined: boolean;
  readonly reviewedAt: string;
  readonly evidenceUrls: readonly string[];
}

export interface DataAssetUseDecision {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
  readonly ownerApprovalRequired: boolean;
  readonly auditRequired: boolean;
}

export function evaluateDataAssetUse(
  record: DataAssetRightsRecord,
  use: DataAssetUse,
): DataAssetUseDecision {
  const reasons: string[] = [];
  if (record.rightsStatus === "blocked") reasons.push("Asset rights are blocked.");
  if (record.rightsStatus !== "cleared") reasons.push("Asset rights are not explicitly cleared.");
  if (record.evidenceUrls.length === 0) reasons.push("No operative rights evidence is attached.");
  if (!Number.isFinite(Date.parse(record.reviewedAt))) reasons.push("Rights review timestamp is invalid.");

  if (use === "commercial_display" && !record.commercialUseAllowed) reasons.push("Commercial display is not allowed.");
  if (use === "derived_data_product" && !record.derivedUseAllowed) reasons.push("Derived commercial data use is not allowed.");
  if (use === "model_training" && !record.modelTrainingAllowed) reasons.push("Model training is not allowed.");
  if (use === "evaluation_benchmark" && !record.derivedUseAllowed) reasons.push("Benchmark derivation is not allowed.");
  if (use === "training_data_license") {
    if (!record.modelTrainingAllowed) reasons.push("Training use is not allowed.");
    if (!record.redistributionAllowed) reasons.push("Training-data redistribution or licensing is not allowed.");
  }
  if (use === "partner_sharing" && !record.redistributionAllowed) reasons.push("Partner sharing is not allowed.");
  if ((record.containsPersonalData || use === "training_data_license") && !record.deletionProcessDefined) {
    reasons.push("A deletion and revocation process is required.");
  }
  if (record.containsThirdPartyExpression && !record.ownedByGse && use !== "internal_analysis") {
    reasons.push("Third-party expression cannot be commercialized without explicit license evidence.");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    ownerApprovalRequired: use !== "internal_analysis",
    auditRequired: use !== "internal_analysis" || record.containsPersonalData || record.containsThirdPartyExpression,
  };
}
