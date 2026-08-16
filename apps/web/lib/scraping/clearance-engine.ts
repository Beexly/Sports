/**
 * Scraping Clearance Engine.
 *
 * Every extraction job MUST pass through this engine before running.
 * The engine checks source rights, mode constraints, intent permissions,
 * risk thresholds, and tool approval — then issues a ClearanceResult.
 *
 * A ClearanceResult with allowed=false MUST stop the job.
 * A ClearanceResult with requiresReview=true must route to the legal queue.
 *
 * Every extraction job produces records carrying a RightsSnapshot.
 * No record may be stored or displayed without a valid snapshot.
 */

import {
  getSourceRightsEntry,
  snapshotRights,
  type SourceRightsEntry,
  type RightsSnapshot,
} from "./source-rights-registry";
import {
  EXTRACTION_MODE_CONSTRAINTS,
  type ExtractionMode,
  type ExtractionIntent,
} from "./extraction-modes";
import {
  isToolApprovedForMode,
  getToolEntry,
  type ToolId,
} from "./tool-registry";
import {
  getDataRule,
  type DataFieldCategory,
} from "./data-rules";

// ─── Clearance types ──────────────────────────────────────────────────────────

export type ClearanceRequest = {
  readonly source_id: string;
  readonly mode: ExtractionMode;
  readonly tool_id: ToolId;
  readonly intents: readonly ExtractionIntent[];
};

export type ClearanceBlockReason = {
  readonly code: string;
  readonly message: string;
};

export type ClearanceResult = {
  readonly allowed: boolean;
  readonly requiresReview: boolean;
  readonly source_id: string;
  readonly mode: ExtractionMode;
  readonly tool_id: ToolId;
  readonly intents: readonly ExtractionIntent[];
  readonly blocks: readonly ClearanceBlockReason[];
  readonly warnings: readonly string[];
  readonly rightsSnapshot: RightsSnapshot | null;
  readonly checkedAt: string;
};

// ─── Extracted record shape (enforced type) ───────────────────────────────────

export type ExtractedRecord = {
  readonly source_id: string;
  readonly source_url: string;
  readonly extracted_at: string;
  readonly extraction_mode: ExtractionMode;
  readonly tool_name: ToolId;
  readonly rights_snapshot: RightsSnapshot;
  /** Classification of the extracted data per DATA_RULES. Null when the caller
   * did not declare a category (backward compatibility); present when the wrap
   * invoked the data-rule check. */
  readonly data_category: DataFieldCategory | null;
  readonly data: Record<string, unknown>;
};

// ─── Clearance engine ─────────────────────────────────────────────────────────

function block(code: string, message: string): ClearanceBlockReason {
  return { code, message };
}

export function checkClearance(
  request: ClearanceRequest,
  now = new Date(),
): ClearanceResult {
  const blocks: ClearanceBlockReason[] = [];
  const warnings: string[] = [];
  let requiresReview = false;

  const source: SourceRightsEntry | undefined = getSourceRightsEntry(request.source_id);

  // ── 1. Source must exist in registry ────────────────────────────────────────
  if (!source) {
    blocks.push(block(
      "SOURCE_NOT_REGISTERED",
      `Source "${request.source_id}" is not in the Source Rights Registry. ` +
      "Add and review it before running any extraction job.",
    ));
    return finalize(request, blocks, warnings, requiresReview, null, now);
  }

  const snapshot = snapshotRights(source, now);

  // ── 2. Excluded sources: hard block ─────────────────────────────────────────
  if (source.status === "excluded") {
    blocks.push(block(
      "SOURCE_EXCLUDED",
      `Source "${source.source_name}" is permanently excluded. No extraction permitted.`,
    ));
    return finalize(request, blocks, warnings, requiresReview, snapshot, now);
  }

  // ── 3. Technical controls: block all automated modes ────────────────────────
  // Block on EITHER the manual status downgrade OR the detected-controls flag, so
  // a source that later deploys anti-bot (flag flips true) can't keep being hit by
  // automation just because its status was never manually changed. Defense-in-depth
  // against the evasion posture CLAUDE.md forbids. Manual (non-automated) modes are
  // unaffected — human research remains allowed.
  if (source.status === "blocked_technical_controls" || source.technical_controls_detected) {
    const constraint = EXTRACTION_MODE_CONSTRAINTS[request.mode];
    if (constraint.requiresAutomation) {
      blocks.push(block(
        "TECHNICAL_CONTROLS_ACTIVE",
        `Source "${source.source_name}" has active technical controls (anti-bot/CAPTCHA/IP block). ` +
        "Automated access is blocked. Use manual_research_note only.",
      ));
      return finalize(request, blocks, warnings, requiresReview, snapshot, now);
    }
  }

  // ── 4. Cease-and-desist: full block pending legal review ────────────────────
  if (source.cease_and_desist_received) {
    blocks.push(block(
      "CEASE_AND_DESIST",
      `Source "${source.source_name}" has issued a cease-and-desist. ` +
      "No extraction permitted without explicit legal counsel clearance.",
    ));
    requiresReview = true;
    return finalize(request, blocks, warnings, requiresReview, snapshot, now);
  }

  // ── 5. Mode-level clearance ──────────────────────────────────────────────────
  const constraint = EXTRACTION_MODE_CONSTRAINTS[request.mode];
  const compatibleStatuses = constraint.compatibleStatuses as readonly string[];

  if (!compatibleStatuses.includes(source.status)) {
    if (constraint.allowedWhenManualOnly && request.mode === "manual_research_note") {
      // manual_research_note is explicitly permitted for sources where other modes
      // would be blocked. The broader compatibleStatuses for this mode (defined in
      // extraction-modes.ts) already captures the allowed set; no additional block needed.
    } else {
      blocks.push(block(
        "INCOMPATIBLE_STATUS",
        `Mode "${request.mode}" requires source status in [${compatibleStatuses.join(", ")}]. ` +
        `Source "${source.source_name}" has status "${source.status}".`,
      ));
    }
  }

  // ── 6. Automation permission ─────────────────────────────────────────────────
  if (constraint.requiresAutomation && !source.automation_allowed) {
    blocks.push(block(
      "AUTOMATION_NOT_ALLOWED",
      `Mode "${request.mode}" requires automated access, but source "${source.source_name}" ` +
      "has automation_allowed=false. " +
      (source.unlock_condition
        ? `Unlock: ${source.unlock_condition}`
        : "Contact source for permission."),
    ));
  }

  // ── 7. Public logged-off requirement ────────────────────────────────────────
  if (constraint.requiresPublicLoggedOff && !source.public_logged_off_allowed) {
    blocks.push(block(
      "PUBLIC_LOGGED_OFF_NOT_ALLOWED",
      `Mode "${request.mode}" requires public logged-off access, but source ` +
      `"${source.source_name}" does not permit it.`,
    ));
  }

  // ── 8. API license requirement ───────────────────────────────────────────────
  if (constraint.requiresApiLicense) {
    if (source.status !== "approved_api" && source.status !== "approved_written_permission") {
      blocks.push(block(
        "API_LICENSE_REQUIRED",
        `Mode "${request.mode}" requires an approved API license. ` +
        `Source "${source.source_name}" does not have one on file.`,
      ));
    }
  }

  // ── 9. Written permission requirement ───────────────────────────────────────
  if (constraint.requiresWrittenPermission) {
    if (
      source.status !== "approved_written_permission" &&
      !(source.status === "vendor_candidate" && request.mode === "vendor_trial_ingest")
    ) {
      blocks.push(block(
        "WRITTEN_PERMISSION_REQUIRED",
        `Mode "${request.mode}" requires a written permission agreement. ` +
        `Source "${source.source_name}" does not have one on file.`,
      ));
    }
  }

  // ── 10. Open license requirement ─────────────────────────────────────────────
  if (constraint.requiresOpenLicense && source.status !== "approved_open_license") {
    blocks.push(block(
      "OPEN_LICENSE_REQUIRED",
      `Mode "${request.mode}" requires an open-license source. ` +
      `Source "${source.source_name}" has status "${source.status}".`,
    ));
  }

  // ── 11. Intent checks ────────────────────────────────────────────────────────
  for (const intent of request.intents) {
    switch (intent) {
      case "commercial_display":
        if (!source.commercial_display_allowed) {
          blocks.push(block(
            "COMMERCIAL_DISPLAY_NOT_ALLOWED",
            `Intent "commercial_display" is not permitted for source "${source.source_name}". ` +
            (source.unlock_condition ? `Unlock: ${source.unlock_condition}` : ""),
          ));
        }
        break;
      case "storage":
        if (!source.storage_allowed) {
          blocks.push(block(
            "STORAGE_NOT_ALLOWED",
            `Intent "storage" is not permitted for source "${source.source_name}".`,
          ));
        }
        break;
      case "derived_analytics":
        if (!source.derived_analytics_allowed) {
          blocks.push(block(
            "DERIVED_ANALYTICS_NOT_ALLOWED",
            `Intent "derived_analytics" (feature/signal generation) is not permitted ` +
            `for source "${source.source_name}".`,
          ));
        }
        break;
      case "model_training":
        if (!source.model_training_allowed) {
          blocks.push(block(
            "MODEL_TRAINING_NOT_ALLOWED",
            `Intent "model_training" is not permitted for source "${source.source_name}".`,
          ));
        }
        break;
    }
  }

  // ── 12. Risk threshold checks ─────────────────────────────────────────────────
  if (source.personal_data_risk === "high") {
    blocks.push(block(
      "PERSONAL_DATA_RISK_HIGH",
      `Source "${source.source_name}" has a high personal data risk. ` +
      "Privacy review required before extraction.",
    ));
    requiresReview = true;
  } else if (source.personal_data_risk === "medium") {
    warnings.push(
      `Source "${source.source_name}" has medium personal data risk. ` +
      "Ensure extraction does not capture PII.",
    );
    requiresReview = true;
  }

  if (source.copyright_expression_risk === "high") {
    warnings.push(
      `Source "${source.source_name}" has high copyright-expression risk. ` +
      "Extract facts and metadata only; avoid article bodies and creative content.",
    );
  }

  if (source.database_right_risk === "high") {
    warnings.push(
      `Source "${source.source_name}" has high database-right risk (EU). ` +
      "Limit extraction depth and frequency.",
    );
  }

  // ── 13. Tool approval ─────────────────────────────────────────────────────────
  const toolEntry = getToolEntry(request.tool_id);
  if (!toolEntry) {
    blocks.push(block(
      "TOOL_NOT_REGISTERED",
      `Tool "${request.tool_id}" is not in the Tool Registry.`,
    ));
  } else if (!toolEntry.approved) {
    blocks.push(block(
      "TOOL_NOT_APPROVED",
      `Tool "${toolEntry.name}" is not approved for use.`,
    ));
  } else if (!isToolApprovedForMode(request.tool_id, request.mode)) {
    blocks.push(block(
      "TOOL_NOT_APPROVED_FOR_MODE",
      `Tool "${toolEntry.name}" is not approved for mode "${request.mode}". ` +
      `Approved modes: [${toolEntry.allowed_modes.join(", ")}].`,
    ));
  } else if (!toolEntry.approved_for_production && request.mode !== "manual_research_note") {
    warnings.push(
      `Tool "${toolEntry.name}" is not approved for production use. ` +
      "Results must be reviewed before production ingestion.",
    );
  }

  // ── 14. Attribution reminder ──────────────────────────────────────────────────
  if (source.attribution_required && source.attribution_text) {
    warnings.push(
      `Attribution required: "${source.attribution_text}". ` +
      "All derived outputs must carry this attribution.",
    );
  }

  return finalize(request, blocks, warnings, requiresReview, snapshot, now);
}

function finalize(
  request: ClearanceRequest,
  blocks: readonly ClearanceBlockReason[],
  warnings: readonly string[],
  requiresReview: boolean,
  snapshot: RightsSnapshot | null,
  now: Date,
): ClearanceResult {
  return {
    allowed: blocks.length === 0,
    requiresReview: requiresReview || blocks.length > 0,
    source_id: request.source_id,
    mode: request.mode,
    tool_id: request.tool_id,
    intents: request.intents,
    blocks,
    warnings,
    rightsSnapshot: snapshot,
    checkedAt: now.toISOString(),
  };
}

// ─── Record factory ───────────────────────────────────────────────────────────

/**
 * Wrap raw extracted data in the required ExtractedRecord envelope.
 * Only call this after checkClearance returns allowed=true.
 *
 * @param clearance       the ClearanceResult from checkClearance (must be allowed)
 * @param sourceUrl        the URL the data was extracted from
 * @param data             the extracted payload
 * @param dataCategory     optional DataFieldCategory used to consult DATA_RULES.
 *                         When provided, the record is rejected if that category
 *                         is blocked from extraction or storage — closing the gap
 *                         where DATA_RULES existed but was never consulted at the
 *                         wrap boundary (GSE-SEC-055). When omitted, the data is
 *                         wrapped without a category check (backward compat).
 * @param now              extraction timestamp (defaults to new Date())
 *
 * Throws if clearance was not granted, if snapshot is missing, or (when
 * dataCategory is supplied) if DATA_RULES blocks that category from
 * extraction or storage.
 */
export function wrapExtractedRecord(
  clearance: ClearanceResult,
  sourceUrl: string,
  data: Record<string, unknown>,
  dataCategory?: DataFieldCategory,
  now = new Date(),
): ExtractedRecord {
  if (!clearance.allowed) {
    throw new Error(
      `Cannot wrap record: clearance not granted for source "${clearance.source_id}". ` +
      clearance.blocks.map((b) => b.message).join("; "),
    );
  }
  if (!clearance.rightsSnapshot) {
    throw new Error("Cannot wrap record: rights snapshot is missing.");
  }
  if (dataCategory) {
    const rule = getDataRule(dataCategory);
    if (!rule) {
      throw new Error(
        `Cannot wrap record: unknown data category "${dataCategory}" passed to DATA_RULES. ` +
        "Add the category to data-rules.ts before wrapping.",
      );
    }
    if (!rule.extractionAllowed) {
      throw new Error(
        `Cannot wrap record: data category "${dataCategory}" is blocked from extraction ` +
        `(extractionAllowed=false). ${rule.notes}`,
      );
    }
    if (!rule.storageAllowed) {
      throw new Error(
        `Cannot wrap record: data category "${dataCategory}" is blocked from storage ` +
        `(storageAllowed=false). ${rule.notes}`,
      );
    }
  }
  return {
    source_id: clearance.source_id,
    source_url: sourceUrl,
    extracted_at: now.toISOString(),
    extraction_mode: clearance.mode,
    tool_name: clearance.tool_id,
    rights_snapshot: clearance.rightsSnapshot,
    data_category: dataCategory ?? null,
    data,
  };
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

export type ClearanceSummary = {
  readonly allowed: boolean;
  readonly blockCount: number;
  readonly warningCount: number;
  readonly primaryBlock: string | null;
  readonly requiresReview: boolean;
};

export function summarizeClearance(result: ClearanceResult): ClearanceSummary {
  return {
    allowed: result.allowed,
    blockCount: result.blocks.length,
    warningCount: result.warnings.length,
    primaryBlock: result.blocks[0]?.message ?? null,
    requiresReview: result.requiresReview,
  };
}
