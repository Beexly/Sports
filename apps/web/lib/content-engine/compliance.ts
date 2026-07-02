/**
 * Content Engine — compliance evaluator.
 *
 * Re-uses the existing Trust Claim Registry scanner so the content engine
 * never invents its own banned-phrase list. This keeps banned-language
 * policy single-sourced.
 *
 * Compliance rules:
 *   - Any draft containing betting context requires a responsible-gambling
 *     line in the body.
 *   - Any draft referencing a promotion requires the affiliate disclosure
 *     block in the body.
 *   - Any draft body that hits the banned-phrase scanner is BLOCKED.
 *   - Methodology / responsible-betting education drafts get NOT_APPLICABLE
 *     when they don't include betting context.
 */

import { scanForBannedPhrases } from "@/lib/trust-claims";
import type {
  ContentComplianceStatus,
  ContentDraftType,
} from "./types";

export interface EvaluateContentComplianceInput {
  readonly contentType: ContentDraftType;
  readonly draftBody: string;
  readonly affiliateDisclosureIncluded: boolean;
  readonly responsibleGamingIncluded: boolean;
}

export interface ComplianceEvaluation {
  readonly status: ContentComplianceStatus;
  readonly blockers: readonly string[];
  readonly notes: readonly string[];
  readonly bannedPhraseScanClean: boolean;
}

/**
 * Content types that include betting context by default and therefore need
 * responsible-gaming language even if the body doesn't mention odds.
 */
const REQUIRES_RG: ReadonlySet<ContentDraftType> = new Set<ContentDraftType>([
  "DAILY_BRIEF",
  "MATCHUP_PREVIEW",
  "PROMOTION_ROUNDUP",
  "WEEKLY_RECAP",
  "PERFORMANCE_TRANSPARENCY",
  "RESPONSIBLE_BETTING_EDUCATION",
  "LINE_MOVEMENT_WATCH",
  "BLOG_POST",
  "SOCIAL_DRAFT",
  "NEWSLETTER_DRAFT",
]);

/**
 * Content types that REQUIRE a referenced promotion and therefore require
 * an affiliate disclosure block.
 */
const REQUIRES_AFFILIATE_DISCLOSURE: ReadonlySet<ContentDraftType> =
  new Set<ContentDraftType>(["PROMOTION_ROUNDUP"]);

export function evaluateContentCompliance(
  input: EvaluateContentComplianceInput
): ComplianceEvaluation {
  const blockers: string[] = [];
  const notes: string[] = [];

  const hits = scanForBannedPhrases(input.draftBody);
  const bannedPhraseScanClean = hits.length === 0;
  if (!bannedPhraseScanClean) {
    for (const h of hits) {
      blockers.push(
        `Banned phrase on line ${h.line}: "${h.phrase}" (${h.claimId}). Rewrite or replace before review.`
      );
    }
  }

  if (REQUIRES_RG.has(input.contentType) && !input.responsibleGamingIncluded) {
    blockers.push(
      "Draft requires a responsible-gambling line in the body before it can be approved."
    );
  }

  if (
    REQUIRES_AFFILIATE_DISCLOSURE.has(input.contentType) &&
    !input.affiliateDisclosureIncluded
  ) {
    blockers.push(
      "Promotion content requires an affiliate disclosure block before it can be approved."
    );
  }

  if (input.draftBody.trim().length === 0) {
    blockers.push("Draft body is empty.");
  }

  let status: ContentComplianceStatus;
  if (!bannedPhraseScanClean) {
    status = "BLOCKED";
  } else if (
    REQUIRES_AFFILIATE_DISCLOSURE.has(input.contentType) &&
    !input.affiliateDisclosureIncluded
  ) {
    status = "NEEDS_DISCLOSURE";
  } else if (
    REQUIRES_RG.has(input.contentType) &&
    !input.responsibleGamingIncluded
  ) {
    status = "NEEDS_RG_LANGUAGE";
  } else if (
    !REQUIRES_RG.has(input.contentType) &&
    !REQUIRES_AFFILIATE_DISCLOSURE.has(input.contentType)
  ) {
    status = "NOT_APPLICABLE";
  } else if (blockers.length > 0) {
    status = "REVIEW_REQUIRED";
  } else {
    status = "CLEAR";
  }

  if (input.contentType === "MODEL_ACCOUNTABILITY_NOTE") {
    notes.push(
      "Calibration / model accountability drafts default to INTERNAL visibility. Public promotion requires a deliberate operator decision."
    );
  }

  return { status, blockers, notes, bannedPhraseScanClean };
}
