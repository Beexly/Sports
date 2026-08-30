import {
  SOURCE_RIGHTS_REGISTRY,
  type RiskLevel,
  type SourceRightsEntry,
  type SourceRightsStatus,
} from "../scraping/source-rights-registry";

export type FableUseStatus = "allowed" | "blocked" | "conditional" | "unknown";

export type FableSourceRegistryEntry = {
  readonly source_id: string;
  readonly source_name: string;
  readonly source_type: SourceRightsEntry["source_type"];
  readonly source_url: string;
  readonly allowed_use: readonly string[];
  readonly prohibited_use: readonly string[];
  readonly license_or_terms_note: string;
  readonly ingestion_method: "rights_registry_adapter";
  readonly attribution_required: boolean;
  readonly attribution_text: string | null;
  readonly risk_level: RiskLevel;
  readonly owner_decision_needed: boolean;
  readonly tos_url_or_note: string;
  readonly access_method: string;
  readonly commercial_use_status: FableUseStatus;
  readonly storage_status: FableUseStatus;
  readonly derived_feature_status: FableUseStatus;
  readonly redistribution_status: FableUseStatus;
  readonly display_status: FableUseStatus;
  readonly scrape_status: FableUseStatus;
  readonly paywall_status: FableUseStatus;
  readonly partner_sharing_status: FableUseStatus;
  readonly aws_storage_status: FableUseStatus;
  readonly last_reviewed: string;
  readonly status: SourceRightsStatus;
  readonly evidence_urls: readonly string[];
};

const RISK_ORDER: Record<RiskLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  unknown: 4,
} as const;

function highestRisk(entry: SourceRightsEntry): RiskLevel {
  const risks = [
    entry.personal_data_risk,
    entry.copyright_expression_risk,
    entry.database_right_risk,
  ] as const;

  return risks.reduce<RiskLevel>((highest, risk) =>
    RISK_ORDER[risk] > RISK_ORDER[highest] ? risk : highest
  , "none");
}

function flagStatus(allowed: boolean, entry: SourceRightsEntry): FableUseStatus {
  if (allowed) return "allowed";
  if (entry.status === "vendor_candidate" || entry.status === "permission_required") {
    return "conditional";
  }
  if (entry.status === "manual_research_only") return "conditional";
  return "blocked";
}

function scrapeStatus(entry: SourceRightsEntry): FableUseStatus {
  if (entry.technical_controls_detected || entry.status === "blocked_technical_controls") {
    return "blocked";
  }
  return flagStatus(entry.automation_allowed, entry);
}

function paywallStatus(entry: SourceRightsEntry): FableUseStatus {
  if (entry.public_logged_off_allowed) return "allowed";
  if (entry.status === "approved_api" || entry.status === "approved_written_permission") {
    return "conditional";
  }
  return "blocked";
}

function allowedUses(entry: SourceRightsEntry): readonly string[] {
  const uses: string[] = [];
  if (entry.public_logged_off_allowed) uses.push("public logged-off facts");
  if (entry.storage_allowed) uses.push("local storage");
  if (entry.derived_analytics_allowed) uses.push("derived football features");
  if (entry.commercial_display_allowed) uses.push("commercial display");
  if (entry.model_training_allowed) uses.push("model training");
  return uses.length > 0 ? uses : ["manual review only"];
}

function prohibitedUses(entry: SourceRightsEntry): readonly string[] {
  const uses: string[] = [];
  if (!entry.automation_allowed) uses.push("automated ingestion");
  if (!entry.storage_allowed) uses.push("raw data storage");
  if (!entry.commercial_display_allowed) uses.push("commercial display");
  if (!entry.derived_analytics_allowed) uses.push("derived analytics");
  if (!entry.model_training_allowed) uses.push("model training");
  if (entry.technical_controls_detected) uses.push("technical-control bypass");
  return uses;
}

function ownerDecisionNeeded(entry: SourceRightsEntry): boolean {
  return (
    entry.status === "vendor_candidate" ||
    entry.status === "permission_required" ||
    entry.status === "manual_research_only" ||
    entry.status === "blocked_technical_controls" ||
    entry.status === "excluded"
  );
}

function accessMethod(entry: SourceRightsEntry): string {
  if (entry.status === "approved_api") return "approved API or vendor feed";
  if (entry.public_logged_off_allowed) return "public logged-off source";
  if (entry.status === "manual_research_only") return "manual research only";
  if (entry.status === "vendor_candidate") return "vendor review required";
  return "owner/legal approval required";
}

export function toFableSourceRegistryEntry(entry: SourceRightsEntry): FableSourceRegistryEntry {
  const commercialUseStatus = flagStatus(entry.commercial_display_allowed, entry);
  const storageStatus = flagStatus(entry.storage_allowed, entry);
  const derivedFeatureStatus = flagStatus(entry.derived_analytics_allowed, entry);

  return {
    access_method: accessMethod(entry),
    allowed_use: allowedUses(entry),
    attribution_required: entry.attribution_required,
    attribution_text: entry.attribution_text,
    aws_storage_status: storageStatus,
    commercial_use_status: commercialUseStatus,
    derived_feature_status: derivedFeatureStatus,
    display_status: commercialUseStatus,
    evidence_urls: entry.evidence_urls,
    ingestion_method: "rights_registry_adapter",
    last_reviewed: entry.reviewed_at,
    license_or_terms_note: entry.notes,
    owner_decision_needed: ownerDecisionNeeded(entry),
    partner_sharing_status: commercialUseStatus === "allowed" ? "conditional" : commercialUseStatus,
    paywall_status: paywallStatus(entry),
    prohibited_use: prohibitedUses(entry),
    redistribution_status: commercialUseStatus,
    risk_level: highestRisk(entry),
    scrape_status: scrapeStatus(entry),
    source_id: entry.source_id,
    source_name: entry.source_name,
    source_type: entry.source_type,
    source_url: entry.source_url,
    status: entry.status,
    storage_status: storageStatus,
    tos_url_or_note: entry.terms_url ?? entry.unlock_condition ?? "No terms URL recorded in registry.",
  };
}

export function buildFableSourceRegistry(
  entries: readonly SourceRightsEntry[] = SOURCE_RIGHTS_REGISTRY
): readonly FableSourceRegistryEntry[] {
  return entries.map(toFableSourceRegistryEntry);
}

export function findFableSourceRegistryEntry(
  sourceId: string,
  entries: readonly FableSourceRegistryEntry[] = buildFableSourceRegistry()
): FableSourceRegistryEntry | null {
  return entries.find((entry) => entry.source_id === sourceId) ?? null;
}
