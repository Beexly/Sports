/**
 * Extraction Modes — defines what each extraction mode is, what it requires,
 * and what rights it demands from the source registry.
 */

// ─── Extraction modes ─────────────────────────────────────────────────────────

export type ExtractionMode =
  | "public_logged_off_fact_extract"  // Fetch publicly visible facts (scores, fixtures, standings) without login
  | "clean_text_extract"              // Extract article text via trafilatura from approved sources
  | "licensed_api_ingest"             // Pull data from a licensed API endpoint
  | "open_dataset_ingest"             // Download and parse an open-license dataset
  | "permissioned_crawl"              // Full crawl under written permission or ToS that permits it
  | "manual_research_note"            // Human operator records a UX/taxonomy/competitive observation
  | "vendor_trial_ingest";            // Ingests data from a vendor trial/sandbox under evaluation terms

// ─── Extraction intent ────────────────────────────────────────────────────────

export type ExtractionIntent =
  | "internal_analysis"       // Analytics only — no customer-facing output
  | "commercial_display"      // Show data to paying customers
  | "storage"                 // Persist to database
  | "derived_analytics"       // Generate signals/predictions/scores from data
  | "model_training"          // Use data to train or fine-tune ML models
  | "manual_research";        // Record human-reviewed observation

// ─── Mode constraints ─────────────────────────────────────────────────────────

export type ModeConstraints = {
  /** Mode requires automated HTTP access. */
  readonly requiresAutomation: boolean;
  /** Mode requires source to be publicly accessible without login. */
  readonly requiresPublicLoggedOff: boolean;
  /** Mode requires an approved API key / license. */
  readonly requiresApiLicense: boolean;
  /** Mode requires a written permission agreement on file. */
  readonly requiresWrittenPermission: boolean;
  /** Mode requires an open license (CC0/CC-BY/etc.) on the data. */
  readonly requiresOpenLicense: boolean;
  /** Permitted when source status is manual_research_only or permission_required. */
  readonly allowedWhenManualOnly: boolean;
  /** Source statuses this mode is compatible with. */
  readonly compatibleStatuses: readonly string[];
  /** Human-readable description. */
  readonly description: string;
};

export const EXTRACTION_MODE_CONSTRAINTS: Record<ExtractionMode, ModeConstraints> = {
  public_logged_off_fact_extract: {
    requiresAutomation: true,
    requiresPublicLoggedOff: true,
    requiresApiLicense: false,
    requiresWrittenPermission: false,
    requiresOpenLicense: false,
    allowedWhenManualOnly: false,
    compatibleStatuses: [
      "approved_public_logged_off",
      "approved_api",
      "approved_open_license",
      "approved_written_permission",
    ],
    description:
      "Fetch publicly visible facts (scores, standings, fixtures) without login. " +
      "Extracts facts and metadata only; no protected expression. Rate-limited.",
  },

  clean_text_extract: {
    requiresAutomation: true,
    requiresPublicLoggedOff: true,
    requiresApiLicense: false,
    requiresWrittenPermission: false,
    requiresOpenLicense: false,
    allowedWhenManualOnly: false,
    compatibleStatuses: [
      "approved_public_logged_off",
      "approved_api",
      "approved_written_permission",
    ],
    description:
      "Extract clean article/page text via trafilatura from an approved source. " +
      "Do not republish verbatim; use for summarisation and signal extraction only.",
  },

  licensed_api_ingest: {
    requiresAutomation: true,
    requiresPublicLoggedOff: false,
    requiresApiLicense: true,
    requiresWrittenPermission: false,
    requiresOpenLicense: false,
    allowedWhenManualOnly: false,
    compatibleStatuses: [
      "approved_api",
      "approved_written_permission",
    ],
    description:
      "Pull data from a licensed API endpoint using a valid subscription key.",
  },

  open_dataset_ingest: {
    requiresAutomation: true,
    requiresPublicLoggedOff: true,
    requiresApiLicense: false,
    requiresWrittenPermission: false,
    requiresOpenLicense: true,
    allowedWhenManualOnly: false,
    compatibleStatuses: [
      "approved_open_license",
    ],
    description:
      "Download and parse an openly-licensed dataset (CC0/CC-BY/CC-BY-SA/Apache/MIT). " +
      "Attribution must be propagated to all derived outputs.",
  },

  permissioned_crawl: {
    requiresAutomation: true,
    requiresPublicLoggedOff: false,
    requiresApiLicense: false,
    requiresWrittenPermission: true,
    requiresOpenLicense: false,
    allowedWhenManualOnly: false,
    compatibleStatuses: [
      "approved_written_permission",
    ],
    description:
      "Full crawl under a written permission agreement. " +
      "Scope is limited to what the agreement specifies.",
  },

  manual_research_note: {
    requiresAutomation: false,
    requiresPublicLoggedOff: false,
    requiresApiLicense: false,
    requiresWrittenPermission: false,
    requiresOpenLicense: false,
    allowedWhenManualOnly: true,
    compatibleStatuses: [
      "approved_public_logged_off",
      "approved_api",
      "approved_open_license",
      "approved_written_permission",
      "vendor_candidate",
      "manual_research_only",
      "permission_required",
    ],
    description:
      "Human operator records a UX/taxonomy/competitive observation. " +
      "No automated extraction. No protected content copied. " +
      "Allowed on any non-blocked, non-excluded source.",
  },

  vendor_trial_ingest: {
    requiresAutomation: true,
    requiresPublicLoggedOff: false,
    requiresApiLicense: false,
    requiresWrittenPermission: true,
    requiresOpenLicense: false,
    allowedWhenManualOnly: false,
    compatibleStatuses: [
      "approved_written_permission",
      "vendor_candidate",
    ],
    description:
      "Ingest data from a vendor trial sandbox under evaluation terms. " +
      "Requires written trial agreement. Production rights not assumed.",
  },
};
