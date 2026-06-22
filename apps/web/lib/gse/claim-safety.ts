/**
 * GSE Claim Safety Gate — the last check before anything reaches a public
 * surface, and the source-rights risk scorer.
 *
 * Doctrine: "No public claims without source. No fake certainty." This module is
 * the programmatic enforcement of the platform's brand-voice and
 * responsible-gambling commitments. It does NOT re-implement the banned-phrase
 * list — that single source of truth lives in `apps/web/lib/trust-claims.ts`
 * and is reused here via {@link scanForBannedPhrases}. The Source-Rights Risk
 * scorer maps the existing scraping registry status
 * (`apps/web/lib/scraping/source-rights-registry.ts`) onto a 0..100 risk band so
 * a job can be hard-stopped before it runs.
 *
 * Companion doc: docs/research/GSE_2026_SOURCE_RIGHTS_AND_CLAIM_SAFETY.md
 */

import { scanForBannedPhrases } from "@/lib/trust-claims";
import type { SourceRightsStatus } from "@/lib/scraping/source-rights-registry";
import { type GseScore, makeScore } from "./gse-scoring-systems";

// ─────────────────────────────────────────────────────────────────────────────
// Public Claim Safety
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-caution phrasing. These do not BAN a claim, but they imply more certainty
 * than an uncertain domain supports, so they pull the safety score down and flag
 * for human review. Distinct from the hard banned list in trust-claims.ts.
 */
const SOFT_CERTAINTY_PATTERNS: readonly { pattern: RegExp; note: string }[] = [
  { pattern: /\bdefinitely\b/i, note: "absolute adverb 'definitely'" },
  { pattern: /\bcertainly\b/i, note: "absolute adverb 'certainly'" },
  { pattern: /\balways wins?\b/i, note: "absolute outcome claim 'always win'" },
  { pattern: /\bnever loses?\b/i, note: "absolute outcome claim 'never lose'" },
  { pattern: /\bproven\s+winner\b/i, note: "unsupported 'proven winner'" },
  { pattern: /\b100%\b/i, note: "'100%' implies certainty" },
];

/** Unsupported causal connectors — flagged when no source accompanies the claim. */
const CAUSAL_PATTERNS: readonly RegExp[] = [/\bbecause\b/i, /\bproves\b/i, /\bguarantees\b/i, /\bensures\b/i];

export interface ClaimSafetyInput {
  /** The exact string that would be rendered publicly. */
  readonly text: string;
  /** Does the claim travel with a cited source / timestamp? */
  readonly hasSource: boolean;
  /** Is the demo-vs-live state unambiguous on the surface? */
  readonly demoLiveClear: boolean;
}

export interface ClaimSafetyResult {
  readonly safe: boolean;
  readonly score: GseScore;
  readonly bannedHits: readonly string[];
  readonly cautions: readonly string[];
}

/**
 * Score whether a public-facing string is safe to render (0..100, higher is
 * safer). A single banned-phrase hit hard-caps the score into "very_low" and
 * sets `safe=false` — there is no confidence level at which banned language is
 * acceptable. Soft-certainty and unsupported-causal language reduce the score
 * and flag for review without hard-failing. This is a guard, not a substitute
 * for human review.
 */
export function scorePublicClaimSafety(input: ClaimSafetyInput): ClaimSafetyResult {
  const cautions: string[] = [];
  const hits = scanForBannedPhrases(input.text).map((h) => h.phrase);
  const uniqueHits = Array.from(new Set(hits));

  let score = 100;

  for (const { pattern, note } of SOFT_CERTAINTY_PATTERNS) {
    if (pattern.test(input.text)) {
      cautions.push(note);
      score -= 15;
    }
  }

  if (!input.hasSource) {
    for (const c of CAUSAL_PATTERNS) {
      if (c.test(input.text)) {
        cautions.push("causal claim without a cited source");
        score -= 20;
        break;
      }
    }
    cautions.push("no source attached — public claims require a source");
    score -= 10;
  }

  if (!input.demoLiveClear) {
    cautions.push("demo-vs-live state is ambiguous");
    score -= 20;
  }

  const banned = uniqueHits.length > 0;
  if (banned) {
    // Hard cap: banned language is never acceptable, regardless of other signals.
    score = Math.min(score, 8);
  }

  const finalScore = makeScore("public_claim_safety", score, {
    confidence: "well_supported",
    rationale: banned
      ? [`banned phrase(s): ${uniqueHits.join(", ")}`]
      : [`${cautions.length} caution(s)`, input.hasSource ? "source present" : "no source"],
    flags: banned ? uniqueHits.map((h) => `BANNED: ${h}`) : cautions,
  });

  return {
    safe: !banned && finalScore.score >= 60,
    score: finalScore,
    bannedHits: uniqueHits,
    cautions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Source-Rights Risk
// ─────────────────────────────────────────────────────────────────────────────

/** Base legal/contractual risk per rights status (0..100, higher is RISKIER). */
const RIGHTS_RISK_BASE: Record<SourceRightsStatus, number> = {
  approved_public_logged_off: 15,
  approved_api: 8,
  approved_open_license: 5,
  approved_written_permission: 10,
  vendor_candidate: 55,
  manual_research_only: 60,
  permission_required: 85,
  blocked_technical_controls: 95,
  excluded: 100,
};

export type IntendedUse =
  | "manual_review"
  | "automated_ingestion"
  | "commercial_display"
  | "model_training"
  | "storage";

export interface SourceRightsRiskInput {
  readonly status: SourceRightsStatus;
  readonly intendedUse: IntendedUse;
  /** Whether the registry entry permits automation for this source. */
  readonly automationAllowed: boolean;
  /** Whether the registry entry permits commercial display. */
  readonly commercialDisplayAllowed: boolean;
}

/**
 * Score the legal/contractual risk of using a source the way we intend (0..100,
 * higher is RISKIER). `permission_required`, `blocked_technical_controls`, and
 * `excluded` are hard-stops: the score lands in the very-high band and a job
 * MUST NOT proceed without explicit clearance, mirroring the clearance engine.
 */
export function scoreSourceRightsRisk(input: SourceRightsRiskInput): GseScore {
  const flags: string[] = [];
  let score = RIGHTS_RISK_BASE[input.status];

  if (input.intendedUse === "automated_ingestion" && !input.automationAllowed) {
    score = Math.max(score, 85);
    flags.push("automated ingestion intended but automation is not allowed for this source");
  }
  if (input.intendedUse === "commercial_display" && !input.commercialDisplayAllowed) {
    score = Math.max(score, 80);
    flags.push("commercial display intended but not permitted for this source");
  }
  if (input.status === "permission_required") {
    flags.push("permission required — written consent needed before any automation");
  }
  if (input.status === "blocked_technical_controls" || input.status === "excluded") {
    flags.push(`hard stop: status is ${input.status} — no safe path without legal review`);
  }

  return makeScore("source_rights_risk", score, {
    confidence: "well_supported",
    rationale: [`status ${input.status}`, `intended use ${input.intendedUse}`],
    flags,
  });
}

/** Convenience: is this source+use combination a hard stop that must not run? */
export function isRightsHardStop(input: SourceRightsRiskInput): boolean {
  return scoreSourceRightsRisk(input).score >= 80;
}
