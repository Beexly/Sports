export {
  SOURCE_RIGHTS_REGISTRY,
  getApprovedSources,
  getPermissionRequiredSources,
  getRegistrySummary,
  getSourceRightsEntry,
  getSourcesByStatus,
  getVendorCandidates,
  snapshotRights,
} from "@/lib/scraping/source-rights-registry";

export type {
  RightsSnapshot,
  RiskLevel,
  SourceRightsEntry,
  SourceRightsStatus,
  SourceType,
} from "@/lib/scraping/source-rights-registry";
