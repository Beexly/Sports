/**
 * Content Engine — readiness aggregator.
 *
 * Combines source-coverage and compliance verdicts into a single
 * `ContentReadinessReport` that the cockpit route and API expose. The
 * readiness status is deliberately distinct from the persisted status on
 * `ContentDraft.status`:
 *
 *   - ContentDraft.status     — the operator's last recorded decision.
 *   - ContentReadinessReport  — what the engine *would* say right now.
 *
 * The cockpit shows both so reviewers can see when a draft that was
 * APPROVED last week is no longer ready for re-use because evidence aged
 * out.
 */

import {
  evaluateContentSourceCoverage,
  type SourceCoverageEvaluation,
} from "./source-coverage";
import {
  evaluateContentCompliance,
  type ComplianceEvaluation,
} from "./compliance";
import type {
  ContentDraftRecord,
  ContentDraftType,
  ContentDraftVisibility,
  ContentPerformanceGateStatus,
  ContentReadinessReport,
  ContentReadinessStatus,
} from "./types";

export interface EvaluateContentReadinessInput {
  readonly draft: ContentDraftRecord;
  readonly performanceGateOn: boolean;
}

/**
 * Content types whose visibility is restricted to INTERNAL by default
 * regardless of how clean the source/compliance verdicts are. A deliberate
 * operator action — recorded in a `ContentReview` row — is required to
 * change that.
 */
const INTERNAL_ONLY_TYPES: ReadonlySet<ContentDraftType> =
  new Set<ContentDraftType>(["MODEL_ACCOUNTABILITY_NOTE", "LINE_MOVEMENT_WATCH"]);

const PERFORMANCE_GATED_TYPES: ReadonlySet<ContentDraftType> =
  new Set<ContentDraftType>(["PERFORMANCE_TRANSPARENCY", "WEEKLY_RECAP"]);

function performanceGateStatus(
  contentType: ContentDraftType,
  performanceGateOn: boolean
): ContentPerformanceGateStatus {
  if (!PERFORMANCE_GATED_TYPES.has(contentType)) return "NOT_APPLICABLE";
  if (performanceGateOn) return "GATE_ON";
  return "GATE_OFF_BLOCKED";
}

export function evaluateContentReadiness(
  input: EvaluateContentReadinessInput
): ContentReadinessReport {
  const { draft, performanceGateOn } = input;

  const coverage: SourceCoverageEvaluation = evaluateContentSourceCoverage({
    contentType: draft.contentType,
    sources: draft.sources,
    performanceGateOn,
  });

  const compliance: ComplianceEvaluation = evaluateContentCompliance({
    contentType: draft.contentType,
    draftBody: draft.draftBody,
    affiliateDisclosureIncluded: draft.affiliateDisclosureIncluded,
    responsibleGamingIncluded: draft.responsibleGamingIncluded,
  });

  const perfStatus = performanceGateStatus(draft.contentType, performanceGateOn);
  const blockers: string[] = [
    ...coverage.blockers,
    ...compliance.blockers,
  ];
  const notes: string[] = [
    ...coverage.notes,
    ...compliance.notes,
  ];

  if (perfStatus === "GATE_OFF_BLOCKED") {
    blockers.push(
      "Performance gate is OFF. This content type cannot be approved for public visibility until PERFORMANCE_STATS_ENABLED is on and canonical performance data exists."
    );
  }

  // Determine readiness — strongest blocker wins.
  let readiness: ContentReadinessStatus;
  if (!compliance.bannedPhraseScanClean) {
    readiness = "BLOCKED";
  } else if (coverage.status === "BLOCKED") {
    readiness = "BLOCKED";
  } else if (coverage.status === "NEEDS_SOURCE" || coverage.status === "PARTIAL") {
    readiness = "NEEDS_SOURCE";
  } else if (compliance.status === "NEEDS_DISCLOSURE") {
    readiness = "NEEDS_AFFILIATE_DISCLOSURE";
  } else if (compliance.status === "NEEDS_RG_LANGUAGE") {
    readiness = "NEEDS_RESPONSIBLE_GAMING";
  } else if (perfStatus === "GATE_OFF_BLOCKED") {
    readiness = "NEEDS_PERFORMANCE_GATE";
  } else if (compliance.status === "REVIEW_REQUIRED") {
    readiness = "NEEDS_COMPLIANCE";
  } else if (INTERNAL_ONLY_TYPES.has(draft.contentType)) {
    readiness = "INTERNAL_ONLY";
  } else {
    readiness = "READY_FOR_REVIEW";
  }

  const safeVisibility: ContentDraftVisibility =
    INTERNAL_ONLY_TYPES.has(draft.contentType) ||
    readiness === "BLOCKED" ||
    readiness === "NEEDS_SOURCE" ||
    readiness === "NEEDS_COMPLIANCE"
      ? "INTERNAL"
      : draft.visibility;

  const nextRecommendedAction = computeNextAction(readiness, draft.contentType);

  return {
    readiness,
    blockers,
    notes,
    nextRecommendedAction,
    safeVisibility,
  };
}

function computeNextAction(
  readiness: ContentReadinessStatus,
  contentType: ContentDraftType
): string {
  switch (readiness) {
    case "BLOCKED":
      return "Resolve banned-phrase / hard-blocker findings and re-run the readiness scan.";
    case "NEEDS_SOURCE":
      return "Attach a verified source for each missing source type.";
    case "NEEDS_AFFILIATE_DISCLOSURE":
      return "Insert the affiliate-disclosure block before review.";
    case "NEEDS_RESPONSIBLE_GAMING":
      return "Insert the responsible-gambling line before review.";
    case "NEEDS_PERFORMANCE_GATE":
      return "Wait for PERFORMANCE_STATS_ENABLED=true and refresh evidence.";
    case "NEEDS_COMPLIANCE":
      return "Route to compliance review (BOBBY / SARAH).";
    case "INTERNAL_ONLY":
      return contentType === "MODEL_ACCOUNTABILITY_NOTE"
        ? "Keep INTERNAL. Public publishing of calibration content requires a deliberate operator decision."
        : "Keep INTERNAL until a public-safe variant is reviewed.";
    case "READY_FOR_REVIEW":
      return "Route to AVA (content) for final operator review. Approval does not publish.";
  }
}

export interface FormattedDraftReview {
  readonly title: string;
  readonly slug: string;
  readonly summary: string;
  readonly statusLine: string;
  readonly blockers: readonly string[];
  readonly notes: readonly string[];
}

/**
 * Render-friendly summary of a draft + its readiness report for the cockpit.
 */
export function formatDraftForReview(
  draft: ContentDraftRecord,
  report: ContentReadinessReport
): FormattedDraftReview {
  const summary = draft.excerpt?.trim().length
    ? draft.excerpt!.trim()
    : draft.draftBody.split("\n").find((line) => line.trim().length > 0)?.trim() ??
      "(no body)";

  const statusLine = `${draft.contentType} · ${draft.status} · readiness=${report.readiness}`;

  return {
    title: draft.title,
    slug: draft.slug,
    summary,
    statusLine,
    blockers: report.blockers,
    notes: report.notes,
  };
}
