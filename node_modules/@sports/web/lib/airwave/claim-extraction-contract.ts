/**
 * Airwave Intelligence Intake — Claim Extraction Contract.
 *
 * Defines the shape of a ClaimCandidate: a structured, paraphrased claim
 * extracted from an Airwave source (CH87, podcast, YouTube, operator import).
 * Also defines validation, redaction, and GSE/GSN relevance checks.
 *
 * HARD RULES (non-negotiable, enforced in code + tests):
 *   1. paraphrased_claim is required — no verbatim quotes.
 *   2. rights_status is required.
 *   3. operator_status is required.
 *   4. source_pointer_private must NEVER appear in public output.
 *   5. No raw_audio_url field is allowed on any claim.
 *   6. No public_verbatim_transcript field is allowed.
 *   7. No full_quote field is allowed.
 *   8. public_safe is false unless review + rights allow it.
 *   9. UNFALSIFIABLE claims cannot become pick evidence without operator review.
 */

export type ClaimCandidateRightsStatus =
  | "OWNED"
  | "PUBLIC"
  | "LICENSED"
  | "PERMISSION_REQUIRED"
  | "HELD";

export type ClaimCandidateOperatorStatus =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SETTLED";

export type ClaimCandidateClaimType =
  | "injury_read"
  | "availability_read"
  | "role_change"
  | "ranking_tier"
  | "dfs_value"
  | "waiver_note"
  | "matchup_note"
  | "depth_chart_note"
  | "usage_trend"
  | "market_signal"
  | "odds_context"
  | "coaching_note"
  | "weather_context"
  | "unfalsifiable_hot_take"
  | "narrative_only";

export type ClaimCandidateEntityType =
  | "player"
  | "team"
  | "matchup"
  | "market"
  | "line"
  | "cohort"
  | "game"
  | "season";

export type ClaimCandidateEvidenceType =
  | "on_air_statement"
  | "operator_note"
  | "beat_report"
  | "official_source"
  | "odds_movement"
  | "inferred";

/**
 * A structured, paraphrased claim candidate extracted from an Airwave source.
 * This is the internal shape — source_pointer_private is present.
 * NEVER serialise this directly to a public surface; use redactClaimCandidateForPublic.
 */
export type ClaimCandidate = {
  readonly id: string;
  /** ISO timestamp in Central Time when claim was aired. */
  readonly aired_at_ct: string;
  /** Channel or source identifier (e.g., "CH87", "podcast-xyz"). */
  readonly channel: string;
  readonly source_policy_id: string;
  readonly show: string;
  readonly segment: string;
  readonly speaker: string;
  /** PARAPHRASED claim — never a verbatim quote. Required. */
  readonly paraphrased_claim: string;
  readonly sport: string;
  readonly league: string;
  readonly entity: string;
  readonly entity_type: ClaimCandidateEntityType;
  readonly claim_type: ClaimCandidateClaimType;
  /** How confident the speaker was — based on language used. */
  readonly confidence_language: "EMPHATIC" | "LEAN" | "HEDGED" | "UNKNOWN";
  /** Whether the claim leads to an actionable GSE or GSN output. */
  readonly actionability: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  readonly evidence_type: ClaimCandidateEvidenceType;
  /** Rights posture of the source material. Required. */
  readonly rights_status: ClaimCandidateRightsStatus;
  /** Operator review gate. Required. */
  readonly operator_status: ClaimCandidateOperatorStatus;
  /** INTERNAL ONLY — pointer to source material. MUST NEVER appear in public output. */
  readonly source_pointer_private: string;
  /** Whether this claim is safe for public-facing output (false until review clears it). */
  readonly public_safe: boolean;
  /** Optional operator review notes. Internal only. */
  readonly review_notes: string;
};

/**
 * The public, redaction-safe projection of a ClaimCandidate.
 * source_pointer_private, review_notes, and channel are stripped.
 * Structurally cannot carry the private fields.
 */
export type PublicClaimCandidate = {
  readonly id: string;
  readonly aired_at_ct: string;
  readonly source_policy_id: string;
  readonly show: string;
  readonly segment: string;
  readonly speaker: string;
  readonly paraphrased_claim: string;
  readonly sport: string;
  readonly league: string;
  readonly entity: string;
  readonly entity_type: ClaimCandidateEntityType;
  readonly claim_type: ClaimCandidateClaimType;
  readonly confidence_language: ClaimCandidate["confidence_language"];
  readonly actionability: ClaimCandidate["actionability"];
  readonly evidence_type: ClaimCandidateEvidenceType;
  readonly rights_status: ClaimCandidateRightsStatus;
  readonly operator_status: ClaimCandidateOperatorStatus;
  readonly public_safe: boolean;
};

export type ClaimValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
};

/** Claim types that are GSE-relevant (produce pick/betting/DFS signals). */
const GSE_RELEVANT_CLAIM_TYPES = new Set<ClaimCandidateClaimType>([
  "injury_read",
  "availability_read",
  "role_change",
  "ranking_tier",
  "dfs_value",
  "waiver_note",
  "matchup_note",
  "depth_chart_note",
  "usage_trend",
  "market_signal",
  "odds_context",
  "coaching_note",
  "weather_context",
]);

/** Claim types that are GSN-relevant (produce editorial/content signals). */
const GSN_RELEVANT_CLAIM_TYPES = new Set<ClaimCandidateClaimType>([
  "injury_read",
  "availability_read",
  "role_change",
  "ranking_tier",
  "dfs_value",
  "waiver_note",
  "matchup_note",
  "usage_trend",
  "market_signal",
  "odds_context",
  "unfalsifiable_hot_take",
  "narrative_only",
]);

const ALLOWED_RIGHTS_FOR_PUBLIC = new Set<ClaimCandidateRightsStatus>([
  "OWNED",
  "PUBLIC",
  "LICENSED",
]);

/**
 * Validate a ClaimCandidate for all required fields and hard rules.
 * Returns an object with valid flag and array of error messages.
 */
export function validateClaimCandidate(candidate: Partial<ClaimCandidate>): ClaimValidationResult {
  const errors: string[] = [];

  if (!candidate.id || candidate.id.trim().length === 0) {
    errors.push("id is required.");
  }
  if (!candidate.aired_at_ct || candidate.aired_at_ct.trim().length === 0) {
    errors.push("aired_at_ct is required.");
  }
  if (!candidate.paraphrased_claim || candidate.paraphrased_claim.trim().length === 0) {
    errors.push("paraphrased_claim is required and must not be empty.");
  }
  if (!candidate.rights_status) {
    errors.push("rights_status is required.");
  }
  if (!candidate.operator_status) {
    errors.push("operator_status is required.");
  }
  if (!candidate.sport || candidate.sport.trim().length === 0) {
    errors.push("sport is required.");
  }
  if (!candidate.entity || candidate.entity.trim().length === 0) {
    errors.push("entity is required.");
  }
  if (!candidate.claim_type) {
    errors.push("claim_type is required.");
  }
  if (!candidate.source_policy_id || candidate.source_policy_id.trim().length === 0) {
    errors.push("source_policy_id is required.");
  }
  if (!candidate.show || candidate.show.trim().length === 0) {
    errors.push("show is required.");
  }
  if (!candidate.speaker || candidate.speaker.trim().length === 0) {
    errors.push("speaker is required.");
  }

  // Hard safety checks
  if ("raw_audio_url" in (candidate as Record<string, unknown>)) {
    errors.push("FORBIDDEN: raw_audio_url must never appear on a ClaimCandidate.");
  }
  if ("public_verbatim_transcript" in (candidate as Record<string, unknown>)) {
    errors.push("FORBIDDEN: public_verbatim_transcript must never appear on a ClaimCandidate.");
  }
  if ("full_quote" in (candidate as Record<string, unknown>)) {
    errors.push("FORBIDDEN: full_quote must never appear on a ClaimCandidate.");
  }

  // public_safe rules
  if (candidate.public_safe === true) {
    if (
      candidate.operator_status !== "APPROVED" &&
      candidate.operator_status !== "SETTLED"
    ) {
      errors.push(
        "public_safe cannot be true unless operator_status is APPROVED or SETTLED.",
      );
    }
    if (candidate.rights_status && !ALLOWED_RIGHTS_FOR_PUBLIC.has(candidate.rights_status)) {
      errors.push(
        "public_safe cannot be true unless rights_status is OWNED, PUBLIC, or LICENSED.",
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Redact a ClaimCandidate for public output.
 * Strips source_pointer_private, review_notes, and channel.
 * Returns a PublicClaimCandidate only if public_safe is true.
 */
export function redactClaimCandidateForPublic(
  candidate: ClaimCandidate,
): PublicClaimCandidate | null {
  if (!candidate.public_safe) return null;
  if (candidate.operator_status !== "APPROVED" && candidate.operator_status !== "SETTLED") {
    return null;
  }
  if (!ALLOWED_RIGHTS_FOR_PUBLIC.has(candidate.rights_status)) return null;

  return {
    id: candidate.id,
    aired_at_ct: candidate.aired_at_ct,
    source_policy_id: candidate.source_policy_id,
    show: candidate.show,
    segment: candidate.segment,
    speaker: candidate.speaker,
    paraphrased_claim: candidate.paraphrased_claim,
    sport: candidate.sport,
    league: candidate.league,
    entity: candidate.entity,
    entity_type: candidate.entity_type,
    claim_type: candidate.claim_type,
    confidence_language: candidate.confidence_language,
    actionability: candidate.actionability,
    evidence_type: candidate.evidence_type,
    rights_status: candidate.rights_status,
    operator_status: candidate.operator_status,
    public_safe: candidate.public_safe,
  };
}

/** Returns true if this claim type is relevant for GSE (sports intelligence/betting/DFS) outputs. */
export function isClaimCandidateGseRelevant(candidate: ClaimCandidate): boolean {
  return GSE_RELEVANT_CLAIM_TYPES.has(candidate.claim_type);
}

/** Returns true if this claim type is relevant for GSN (editorial/media/content) outputs. */
export function isClaimCandidateGsnRelevant(candidate: ClaimCandidate): boolean {
  return GSN_RELEVANT_CLAIM_TYPES.has(candidate.claim_type);
}
