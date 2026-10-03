import type { MetricSourceRightsPolicy, MetricSourceRightsStatus } from "./source-rights.js";

export interface MetricSourceRightsRegistryEntry {
  readonly source_id: string;
  readonly source_name: string;
  readonly status: MetricSourceRightsStatus;
  readonly commercial_display_allowed: boolean;
  readonly storage_allowed: boolean;
  readonly derived_analytics_allowed: boolean;
  readonly model_training_allowed: boolean;
  readonly attribution_required: boolean;
  readonly attribution_text: string | null;
  readonly evidence_urls: readonly string[];
  readonly notes: string;
}

export function metricSourceRightsPolicyFromRegistryEntry(
  entry: MetricSourceRightsRegistryEntry,
): MetricSourceRightsPolicy {
  const approved = isApprovedRegistryStatus(entry.status);
  const openOrLicensed =
    entry.status === "approved_open_license" ||
    entry.status === "approved_api" ||
    entry.status === "approved_written_permission";
  const derivedMetric = approved && entry.derived_analytics_allowed;
  const contentDisplay = approved && entry.commercial_display_allowed;
  const derivedApi = derivedMetric && (contentDisplay || openOrLicensed);

  return {
    attribution: {
      required: entry.attribution_required,
      text: entry.attribution_text,
    },
    evidenceRefs: [
      `apps/web/lib/scraping/source-rights-registry.ts#${entry.source_id}`,
      ...entry.evidence_urls,
    ],
    notes: [
      "Generated from the canonical web source-rights registry fixture; this is not legal clearance.",
      entry.notes,
    ],
    permissions: {
      contentDisplay,
      derivedApi,
      derivedMetric,
      modelTraining: approved && entry.model_training_allowed,
      rawApi: false,
      storage: approved && entry.storage_allowed,
      validation: derivedMetric && entry.storage_allowed,
    },
    registrySourceId: entry.source_id,
    sourceId: entry.source_id,
    sourceName: entry.source_name,
    status: entry.status,
  };
}

export function metricSourceRightsPoliciesFromRegistry(
  entries: readonly MetricSourceRightsRegistryEntry[],
): readonly MetricSourceRightsPolicy[] {
  return entries.map(metricSourceRightsPolicyFromRegistryEntry).sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function isApprovedRegistryStatus(status: MetricSourceRightsStatus): boolean {
  return (
    status === "approved_open_license" ||
    status === "approved_api" ||
    status === "approved_public_logged_off" ||
    status === "approved_written_permission"
  );
}
