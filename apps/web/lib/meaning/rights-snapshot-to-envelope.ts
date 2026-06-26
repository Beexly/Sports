/**
 * THE RIGHTS BOUNDARY ADAPTER — the one place apps/web bridges the real scraping rights system into the
 * Meaning Compiler's package-side RightsEnvelope.
 *
 * A package may not import apps/web, so `RightsEnvelope` is defined canonically in
 * `@sports/decision-field-runtime` (structurally mirroring `RightsSnapshot`). This adapter is the
 * trivial, exhaustive field map from the REAL `RightsSnapshot` (captured at extraction time by the
 * Scraping Clearance Engine) to that envelope. Pure; no Prisma, no network.
 */

import type { RightsSnapshot, SourceRightsStatus } from "@/lib/scraping/source-rights-registry";
import type {
  RightsEnvelope,
  RightsEnvelopeStatus,
} from "@sports/decision-field-runtime";
import type { LegalVerdict } from "@sports/data-intelligence";

/** Every SourceRightsStatus maps to a LegalVerdict (exhaustive — asserted in the test). */
const STATUS_TO_VERDICT: Readonly<Record<SourceRightsStatus, LegalVerdict>> = {
  approved_api: "LICENSED",
  approved_open_license: "FREE_OPEN",
  approved_public_logged_off: "FREE_CAUTION",
  approved_written_permission: "LICENSED",
  vendor_candidate: "PAID_REQUIRED",
  manual_research_only: "RIGHTS_REVIEW",
  permission_required: "RIGHTS_REVIEW",
  blocked_technical_controls: "DO_NOT_USE",
  excluded: "DO_NOT_USE",
};

/** Statuses that require an explicit owner decision before any production use. */
const OWNER_GATED: ReadonlySet<SourceRightsStatus> = new Set<SourceRightsStatus>([
  "vendor_candidate",
  "manual_research_only",
  "permission_required",
  "blocked_technical_controls",
  "excluded",
]);

/** Map the snapshot's status (identical 9-value union) onto the envelope status. */
function toEnvelopeStatus(status: SourceRightsStatus): RightsEnvelopeStatus {
  return status; // the unions are intentionally identical; this keeps the dependency one-directional
}

/** Bridge a point-in-time RightsSnapshot into the compiler's RightsEnvelope. */
export function rightsSnapshotToEnvelope(snap: RightsSnapshot): RightsEnvelope {
  return {
    status: toEnvelopeStatus(snap.status),
    legalVerdict: STATUS_TO_VERDICT[snap.status],
    commercialDisplayAllowed: snap.commercial_display_allowed,
    publicDisplayAllowed: snap.public_logged_off_allowed || snap.commercial_display_allowed,
    storageAllowed: snap.storage_allowed,
    derivedUseAllowed: snap.derived_analytics_allowed,
    modelTrainingAllowed: snap.model_training_allowed,
    redistributionAllowed: false, // never asserted by a snapshot — default closed
    attributionRequired: snap.attribution_required,
    attributionText: snap.attribution_text ?? null,
    ownerApprovalRequired: OWNER_GATED.has(snap.status),
    reviewStatus: snap.reviewed_at ? "REVIEWED" : "UNKNOWN",
    reviewedAtLabel: snap.reviewed_at ?? null,
  };
}

export { STATUS_TO_VERDICT };
