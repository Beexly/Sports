export type {
  RightsSnapshot,
  RiskLevel,
  SourceRightsEntry,
  SourceRightsStatus,
  SourceType,
} from "@/lib/scraping/source-rights-registry";

export type SourceRightsUse =
  | "automation"
  | "commercial_display"
  | "storage"
  | "derived_analytics"
  | "model_training"
  | "raw_api"
  | "derived_api";

export interface SourceRightsUseDecision {
  readonly sourceId: string;
  readonly allowed: boolean;
  readonly status: "allowed" | "blocked" | "conditional" | "unknown";
  readonly reasons: readonly string[];
  readonly attributionRequired: boolean;
  readonly attributionText: string | null;
}
