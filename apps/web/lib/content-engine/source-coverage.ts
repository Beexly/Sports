/**
 * Content Engine — source coverage evaluator.
 *
 * Pure functions over the source records attached to a draft. The cockpit
 * route and the API both run this on every read so a stale snapshot never
 * gates a live publishing decision.
 *
 * Decision rules:
 *   - Promotion rows REQUIRE a PROMOTION_TERMS source with a terms URL.
 *     A missing terms URL is BLOCKED (not just NEEDS_SOURCE).
 *   - Performance content REQUIRES a PERFORMANCE source AND the
 *     performance gate to be on. Gate off → BLOCKED.
 *   - Calibration content is INTERNAL_ONLY unless explicitly marked
 *     PUBLIC-safe by the caller (the engine never auto-promotes calibration
 *     content to public).
 *   - Methodology can rely on PLATFORM-trust sources (the Trust Claim
 *     Registry counts as one).
 *   - Regulated / compliance claims (responsible-gaming, promotion terms)
 *     refuse UNVERIFIED or BLOCKED trust levels.
 *
 * No DB access here — callers supply the source records they have.
 */

import type {
  ContentDraftType,
  ContentSourceCoverageStatus,
  ContentSourceRecord,
  ContentSourceType,
} from "./types";

/**
 * Per-draft-type required source types. Aligned with the longer-standing
 * policy table in `apps/web/lib/content/workflow.ts` but expressed in the
 * content-engine vocabulary (PROMOTION_TERMS, RESPONSIBLE_GAMING, etc.).
 */
export const REQUIRED_SOURCE_TYPES: Readonly<
  Record<ContentDraftType, readonly ContentSourceType[]>
> = {
  DAILY_BRIEF: ["ODDS", "DAILY_BRIEF"],
  MATCHUP_PREVIEW: ["ODDS", "PICK"],
  METHODOLOGY_EDUCATION: ["METHODOLOGY"],
  PROMOTION_ROUNDUP: ["PROMOTION_TERMS", "RESPONSIBLE_GAMING"],
  WEEKLY_RECAP: ["PERFORMANCE", "PICK"],
  PERFORMANCE_TRANSPARENCY: ["PERFORMANCE", "METHODOLOGY"],
  RESPONSIBLE_BETTING_EDUCATION: ["RESPONSIBLE_GAMING", "METHODOLOGY"],
  MODEL_ACCOUNTABILITY_NOTE: ["CALIBRATION", "METHODOLOGY"],
  LINE_MOVEMENT_WATCH: ["ODDS"],
  BLOG_POST: ["METHODOLOGY"],
  SOCIAL_DRAFT: ["METHODOLOGY"],
  NEWSLETTER_DRAFT: ["METHODOLOGY", "DAILY_BRIEF"],
};

/**
 * Source types whose content is regulated and therefore MUST be backed by
 * AUTHORITATIVE, PLATFORM, or REVIEWED trust. UNVERIFIED is never enough.
 */
const REGULATED_SOURCE_TYPES: ReadonlySet<ContentSourceType> = new Set([
  "PROMOTION_TERMS",
  "RESPONSIBLE_GAMING",
  "PERFORMANCE",
  "CALIBRATION",
]);

/**
 * Trust levels acceptable for a regulated source.
 */
const REGULATED_OK_TRUST: ReadonlySet<string> = new Set([
  "AUTHORITATIVE",
  "PLATFORM",
  "REVIEWED",
]);

export interface SourceCoverageEvaluation {
  readonly status: ContentSourceCoverageStatus;
  readonly missing: readonly ContentSourceType[];
  readonly blockers: readonly string[];
  readonly notes: readonly string[];
  /** True iff every required source is COVERED and within trust bounds. */
  readonly covered: boolean;
}

export interface EvaluateContentSourceCoverageInput {
  readonly contentType: ContentDraftType;
  readonly sources: readonly ContentSourceRecord[];
  /** True when the public PERFORMANCE_STATS_ENABLED gate is on. */
  readonly performanceGateOn: boolean;
}

/**
 * Evaluate the source-coverage status for a draft.
 *
 * Returns a structured verdict — never throws. The caller may merge this
 * with `evaluateContentCompliance` and `evaluateContentReadiness` to get
 * the final blockers list shown in the cockpit.
 */
export function evaluateContentSourceCoverage(
  input: EvaluateContentSourceCoverageInput
): SourceCoverageEvaluation {
  const required = REQUIRED_SOURCE_TYPES[input.contentType];
  const present = new Map<ContentSourceType, ContentSourceRecord[]>();
  for (const s of input.sources) {
    if (!present.has(s.sourceType)) present.set(s.sourceType, []);
    present.get(s.sourceType)!.push(s);
  }

  const missing: ContentSourceType[] = [];
  const blockers: string[] = [];
  const notes: string[] = [];

  for (const requiredType of required) {
    const records = present.get(requiredType) ?? [];
    if (records.length === 0) {
      missing.push(requiredType);
      continue;
    }

    if (REGULATED_SOURCE_TYPES.has(requiredType)) {
      const okTrust = records.find((r) => REGULATED_OK_TRUST.has(r.trustLevel));
      if (!okTrust) {
        blockers.push(
          `Required regulated source ${requiredType} is only backed by UNVERIFIED or BLOCKED records.`
        );
      }
    }

    if (requiredType === "PROMOTION_TERMS") {
      const hasTerms = records.some(
        (r) => typeof r.sourceUrl === "string" && r.sourceUrl.trim().length > 0
      );
      if (!hasTerms) {
        blockers.push(
          "Promotion content requires a sportsbook terms URL on the PROMOTION_TERMS source."
        );
      }
    }

    if (requiredType === "PERFORMANCE" && !input.performanceGateOn) {
      blockers.push(
        "Performance content cannot proceed while the public performance gate (PERFORMANCE_STATS_ENABLED) is OFF."
      );
    }

    const stale = records.every((r) => r.sourceStatus === "STALE");
    if (stale) {
      blockers.push(
        `All evidence for required source ${requiredType} is STALE; refresh before review.`
      );
    }

    if (requiredType === "CALIBRATION") {
      notes.push(
        "Calibration sources mark this draft INTERNAL_ONLY by default — do not promote to PUBLIC without an explicit operator decision."
      );
    }
  }

  let status: ContentSourceCoverageStatus;
  if (blockers.length > 0 && missing.length === required.length) {
    status = "BLOCKED";
  } else if (missing.length > 0) {
    status = missing.length === required.length ? "NEEDS_SOURCE" : "PARTIAL";
  } else if (blockers.length > 0) {
    status = "BLOCKED";
  } else {
    status = "COVERED";
  }

  return {
    status,
    missing,
    blockers,
    notes,
    covered: status === "COVERED",
  };
}
