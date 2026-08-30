/**
 * Content Engine (Phase 8) — typed shape of a draft-only content artifact.
 *
 * Intentionally separate from `apps/web/lib/content/workflow.ts`, which
 * holds the *policy table* (which content kinds exist, what each requires).
 * This module is the *runtime contract* used by the build / evaluation
 * helpers and the cockpit route.
 *
 * Strict draft-only invariants:
 *   - Status transitions never auto-publish.
 *   - `publishedAt` is only set by an explicit operator action recorded in
 *     `ContentReview`. The build/evaluate helpers refuse to set it.
 *   - Banned phrases (Trust Claim Registry) are rejected at evaluate time;
 *     the draft cannot be APPROVED while `bannedPhraseScanClean === false`.
 */

import type { ContentKind } from "@/lib/content/workflow";

export type ContentDraftStatus =
  | "DRAFT"
  | "NEEDS_SOURCE"
  | "NEEDS_REVIEW"
  | "NEEDS_COMPLIANCE"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED"
  | "BLOCKED";

export type ContentDraftVisibility = "INTERNAL" | "PUBLIC" | "PREMIUM";

export type ContentDraftType =
  | "DAILY_BRIEF"
  | "MATCHUP_PREVIEW"
  | "METHODOLOGY_EDUCATION"
  | "PROMOTION_ROUNDUP"
  | "WEEKLY_RECAP"
  | "PERFORMANCE_TRANSPARENCY"
  | "RESPONSIBLE_BETTING_EDUCATION"
  | "MODEL_ACCOUNTABILITY_NOTE"
  | "LINE_MOVEMENT_WATCH"
  | "BLOG_POST"
  | "SOCIAL_DRAFT"
  | "NEWSLETTER_DRAFT";

export type ContentSourceType =
  | "ODDS"
  | "PICK"
  | "PERFORMANCE"
  | "PROMOTION_TERMS"
  | "RESPONSIBLE_GAMING"
  | "METHODOLOGY"
  | "CALIBRATION"
  | "DAILY_BRIEF"
  | "INTERNAL_REVIEW";

export type ContentSourceTrustLevel =
  | "AUTHORITATIVE"
  | "PLATFORM"
  | "REVIEWED"
  | "UNVERIFIED"
  | "BLOCKED";

export type ContentSourceFreshness =
  | "FRESH"
  | "AGING"
  | "STALE"
  | "MISSING"
  | "PENDING";

export type ContentSourceCoverageStatus =
  | "COVERED"
  | "PARTIAL"
  | "NEEDS_SOURCE"
  | "BLOCKED";

export type ContentComplianceStatus =
  | "NOT_APPLICABLE"
  | "CLEAR"
  | "REVIEW_REQUIRED"
  | "NEEDS_DISCLOSURE"
  | "NEEDS_RG_LANGUAGE"
  | "BLOCKED";

export type ContentPerformanceGateStatus =
  | "NOT_APPLICABLE"
  | "GATE_ON"
  | "GATE_OFF_REQUIRED"
  | "GATE_OFF_BLOCKED";

export type ContentReadinessStatus =
  | "READY_FOR_REVIEW"
  | "NEEDS_SOURCE"
  | "NEEDS_COMPLIANCE"
  | "NEEDS_PERFORMANCE_GATE"
  | "NEEDS_AFFILIATE_DISCLOSURE"
  | "NEEDS_RESPONSIBLE_GAMING"
  | "BLOCKED"
  | "INTERNAL_ONLY";

export type ContentReviewDecision =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "ESCALATED"
  | "INTERNAL_ONLY";

export interface ContentSourceRecord {
  readonly id?: string;
  readonly sourceType: ContentSourceType;
  readonly sourceLabel: string;
  readonly sourceUrl?: string | null;
  readonly sourceStatus: ContentSourceFreshness;
  readonly trustLevel: ContentSourceTrustLevel;
  readonly fetchedAt?: Date | null;
  readonly notes?: string | null;
}

export interface ContentDraftRecord {
  readonly id?: string;
  readonly title: string;
  readonly slug: string;
  readonly contentType: ContentDraftType;
  readonly status: ContentDraftStatus;
  readonly visibility: ContentDraftVisibility;
  readonly sport?: string | null;
  readonly league?: string | null;
  readonly relatedPickIds: readonly string[];
  readonly relatedPromotionIds: readonly string[];
  readonly relatedBriefIds: readonly string[];
  readonly sourceCoverageStatus: ContentSourceCoverageStatus;
  readonly complianceStatus: ContentComplianceStatus;
  readonly responsibleGamingIncluded: boolean;
  readonly affiliateDisclosureIncluded: boolean;
  readonly performanceGateStatus: ContentPerformanceGateStatus;
  readonly bannedPhraseScanClean: boolean;
  readonly draftBody: string;
  readonly excerpt?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>> | null;
  readonly generatedBy: string;
  readonly reviewedBy?: string | null;
  readonly reviewedAt?: Date | null;
  readonly publishedAt?: Date | null;
  readonly sources: readonly ContentSourceRecord[];
}

export interface ContentReadinessReport {
  readonly readiness: ContentReadinessStatus;
  readonly blockers: readonly string[];
  readonly notes: readonly string[];
  readonly nextRecommendedAction: string;
  /** Where this draft is allowed to live if all gates pass. */
  readonly safeVisibility: ContentDraftVisibility;
}

/**
 * Map a `ContentKind` (policy module) to the canonical `ContentDraftType`
 * stored on the draft record. The mapping is intentionally lossless and
 * one-to-one so the policy table remains the single source of truth for
 * required source categories.
 */
export function contentKindToDraftType(kind: ContentKind): ContentDraftType {
  switch (kind) {
    case "DAILY_BRIEF_DRAFT":
      return "DAILY_BRIEF";
    case "WEEKLY_RECAP":
      return "WEEKLY_RECAP";
    case "MATCHUP_PREVIEW":
      return "MATCHUP_PREVIEW";
    case "METHODOLOGY_EDUCATION":
      return "METHODOLOGY_EDUCATION";
    case "PROMOTION_ROUNDUP":
      return "PROMOTION_ROUNDUP";
    case "PERFORMANCE_TRANSPARENCY":
      return "PERFORMANCE_TRANSPARENCY";
    case "RESPONSIBLE_BETTING_EDUCATION":
      return "RESPONSIBLE_BETTING_EDUCATION";
    case "MODEL_CHANGE_NOTE":
      return "MODEL_ACCOUNTABILITY_NOTE";
  }
}

/**
 * Reverse the above. Some `ContentDraftType` values (BLOG_POST,
 * SOCIAL_DRAFT, NEWSLETTER_DRAFT, LINE_MOVEMENT_WATCH) are channel-shaped
 * and do not map back to a policy kind — callers must supply the kind
 * explicitly when building those drafts.
 */
export function draftTypeHasPolicyKind(type: ContentDraftType): boolean {
  return (
    type === "DAILY_BRIEF" ||
    type === "WEEKLY_RECAP" ||
    type === "MATCHUP_PREVIEW" ||
    type === "METHODOLOGY_EDUCATION" ||
    type === "PROMOTION_ROUNDUP" ||
    type === "PERFORMANCE_TRANSPARENCY" ||
    type === "RESPONSIBLE_BETTING_EDUCATION" ||
    type === "MODEL_ACCOUNTABILITY_NOTE"
  );
}
