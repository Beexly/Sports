/**
 * Trust Claim Registry
 *
 * Single source of truth for what the public surface is allowed to *claim*.
 *
 * Every public statement on the marketing surface (homepage, pricing, picks,
 * performance, brief, promotions, blog) that asserts a fact, capability, or
 * social-proof signal should map to an APPROVED entry in this registry —
 * or be rejected by the public-copy scanner test.
 *
 * Goals:
 *   1. Make public claims auditable in source review.
 *   2. Provide a banned-phrase list (the kind of language a sports picks
 *      product should never use because it implies certainty in an
 *      uncertain domain).
 *   3. Provide a `scanForBannedPhrases` helper used by the test suite so a
 *      regression where unsupported language sneaks back in fails CI.
 *
 * Non-goals (Phase 2):
 *   - No database persistence. This is a typed module.
 *   - No runtime admin UI. Reviewers edit this file in a PR.
 *   - No auto-replacement at render time. Components reference claim IDs
 *      explicitly where helpful.
 *
 * Future evolution (out of scope for Phase 2):
 *   - Promote to a `TrustClaim` Prisma model + admin CRUD if/when claim
 *      volume justifies it (revisit during Phase 7 Agent Cockpit work).
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ClaimCategory =
  | "METHODOLOGY"        // how the platform works
  | "DATA_TRANSPARENCY"  // what we expose about freshness / coverage / quality
  | "PERFORMANCE"        // anything resembling a track-record assertion
  | "PRICING"            // billing, refund, subscription mechanics
  | "SOCIAL_PROOF"       // testimonials, user counts, badges
  | "RISK_DISCLOSURE";   // responsible-gambling, no-guarantee language

export type ClaimStatus =
  | "APPROVED"       // safe to render publicly
  | "GATED"          // safe only when a specific readiness gate is true
  | "BANNED";        // must never render publicly, with or without evidence

export type EvidenceType =
  | "ENGINE_BEHAVIOR"   // implementation in the engine package backs the claim
  | "DATA_MODEL"        // backed by a schema field that is computed/populated
  | "PUBLIC_DOC"        // matches language in docs/ or .env.example bootstrap guide
  | "BILLING_POLICY"    // backed by Stripe configuration / subscription terms
  | "REGULATORY"        // required by responsible-gambling / disclosure policy
  | "NONE";             // no acceptable evidence (used for BANNED entries)

export type ClaimVisibility =
  | "PUBLIC"     // marketing surface
  | "DASHBOARD"  // signed-in surface
  | "ADMIN"      // operator surface
  | "INTERNAL";  // never rendered

export interface TrustClaim {
  /** Stable identifier referenced from components or tests. */
  readonly id: string;
  /** The approved copy, or canonical phrasing for banned entries. */
  readonly copy: string;
  readonly category: ClaimCategory;
  readonly status: ClaimStatus;
  readonly evidence: EvidenceType;
  readonly visibility: ClaimVisibility;
  /** ISO date the claim was last reviewed by a human. */
  readonly lastReviewedAt: string;
  /** Short note explaining why the claim is approved / gated / banned. */
  readonly reviewNote: string;
  /**
   * If status === "GATED", the readiness-gate key (from ReadinessGates) that
   * must be true before this claim can render. Components/tests can use this
   * to assert the page checks the gate before showing the copy.
   */
  readonly requiredGate?: string;
  /**
   * For BANNED claims: a suggested replacement phrasing if the author was
   * reaching for the wrong words. Optional.
   */
  readonly safeReplacement?: string;
}

// ─────────────────────────────────────────────
// Approved claims (the only language the public surface is allowed to assert)
// ─────────────────────────────────────────────

const LAST_REVIEW = "2026-05-18";

export const TRUST_CLAIMS: readonly TrustClaim[] = [
  // ── Methodology (how the platform works) ──────────────────────────
  {
    id: "methodology.odds-ingestion",
    copy:
      "We ingest live odds from multiple sportsbooks on a regular schedule and score every available matchup.",
    category: "METHODOLOGY",
    status: "APPROVED",
    evidence: "ENGINE_BEHAVIOR",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Backed by data-refresh worker + The Odds API client. No claim about update frequency in seconds.",
  },
  {
    id: "methodology.bookmaker-coverage",
    copy:
      "Each pick is scored against the bookmakers that had a market for the game at the time of scoring. We surface the bookmaker count as a transparency signal.",
    category: "METHODOLOGY",
    status: "APPROVED",
    evidence: "DATA_MODEL",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Pick.bookmakerCount + Game.bookmakerCoverageMax exist in the schema and are surfaced via API.",
  },
  {
    id: "methodology.data-freshness",
    copy:
      "Where available, each pick shows the timestamp of the odds data it was scored against so you can judge freshness for yourself.",
    category: "DATA_TRANSPARENCY",
    status: "APPROVED",
    evidence: "DATA_MODEL",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Pick.dataFreshnessAt populated by the pick-generation worker.",
  },
  {
    id: "methodology.confidence-presentation",
    copy:
      "Confidence is expressed as a label or score depending on the platform's current confidence-display mode. Numeric scores are only shown once calibrated against settled outcomes.",
    category: "METHODOLOGY",
    status: "APPROVED",
    evidence: "ENGINE_BEHAVIOR",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "platform-config.ts exposes CONFIDENCE_DISPLAY_MODE; defaults to 'labels' until calibration verified.",
  },
  {
    id: "methodology.risk-levels",
    copy:
      "Each pick carries a risk level reflecting bookmaker consensus, market depth, and known volatility factors.",
    category: "METHODOLOGY",
    status: "APPROVED",
    evidence: "DATA_MODEL",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Pick.riskLevel enum (LOW_RISK | MODERATE | HIGH_VARIANCE | INJURY_RISK | LINE_STEAM).",
  },
  {
    id: "methodology.factor-breakdown",
    copy:
      "Subscribers with the right entitlement can see a factor-by-factor breakdown of how each pick was scored.",
    category: "METHODOLOGY",
    status: "APPROVED",
    evidence: "DATA_MODEL",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Pick.factorBreakdown gated server-side by entitlements.canSeeFactorBreakdown.",
  },
  {
    id: "methodology.price-method",
    copy:
      "The GSE PRICE Method has five pillars — Proof, Read, Integrity, Context, Edge — that read the board, score the math, and gate the slate. Each pillar maps to a real part of the engine.",
    category: "METHODOLOGY",
    status: "APPROVED",
    evidence: "ENGINE_BEHAVIOR",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Backed by gse-method-spec.ts (PRICE_PILLARS) and the drift-guard test. Framework is published; exact weights stay proprietary.",
  },
  {
    id: "methodology.gse-score",
    copy:
      "The GSE Score is a single 0-100 ranking signal: our confidence read, adjusted only by how provably we can stand behind the pick. It is shown next to its inputs and is not a win probability.",
    category: "METHODOLOGY",
    status: "APPROVED",
    evidence: "ENGINE_BEHAVIOR",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Backed by gse-score.ts (computeGseScore / buildGseScoreCard). Provenance haircut only; never presented as a probability. Calibration gates a real probability separately.",
  },

  // ── Performance / track-record (all GATED) ────────────────────────
  {
    id: "performance.public-stats-gated",
    copy:
      "Public performance statistics are only displayed after the platform has accumulated enough settled, canonical picks to compute them honestly.",
    category: "PERFORMANCE",
    status: "GATED",
    requiredGate: "canExposePerformanceStats",
    evidence: "ENGINE_BEHAVIOR",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Tied to PERFORMANCE_STATS_ENABLED. Renders bootstrap-state copy when the gate is false.",
  },
  {
    id: "performance.no-cherrypicking",
    copy:
      "Once performance stats are public, every settled pick is included in the totals. Bootstrap-era picks are excluded by design because their data quality is uncalibrated.",
    category: "PERFORMANCE",
    status: "GATED",
    requiredGate: "canExposePerformanceStats",
    evidence: "ENGINE_BEHAVIOR",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Pick.isBootstrap filter is enforced in /api/performance route.",
  },
  {
    id: "performance.win-rate-definition",
    copy:
      "Win rate is computed as wins divided by wins + losses. Pushes are reported separately and excluded from the denominator.",
    category: "PERFORMANCE",
    status: "GATED",
    requiredGate: "canExposePerformanceStats",
    evidence: "ENGINE_BEHAVIOR",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Computation in /api/performance/route.ts is consistent with this definition.",
  },

  // ── Pricing / billing ─────────────────────────────────────────────
  {
    id: "pricing.cancel-anytime",
    copy: "Cancel any time from your dashboard.",
    category: "PRICING",
    status: "APPROVED",
    evidence: "BILLING_POLICY",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Stripe Customer Portal exposes subscription cancellation.",
  },
  {
    id: "pricing.money-back-window",
    copy:
      "Paid plans include a 7-day refund window. This applies to billing, not to any sports outcome.",
    category: "PRICING",
    status: "APPROVED",
    evidence: "BILLING_POLICY",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Refund policy is a billing term, not a guarantee of picks. Keep distinct from sports-outcome claims.",
  },

  // ── Risk / responsible-gambling disclosures ───────────────────────
  {
    id: "risk.no-guarantee",
    copy:
      "Picks are informational analysis, not guarantees. Odds move, data can be incomplete, and sports betting involves risk. Use your own judgment.",
    category: "RISK_DISCLOSURE",
    status: "APPROVED",
    evidence: "REGULATORY",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Standard risk disclosure language. Used by RiskDisclosure component.",
  },
  {
    id: "risk.past-performance",
    copy: "Past performance does not guarantee future results.",
    category: "RISK_DISCLOSURE",
    status: "APPROVED",
    evidence: "REGULATORY",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Standard disclosure phrasing on performance surfaces.",
  },
  {
    id: "risk.gamble-responsibly",
    copy:
      "If you or someone you know has a gambling problem, call 1-800-522-4700 (National Problem Gambling Helpline).",
    category: "RISK_DISCLOSURE",
    status: "APPROVED",
    evidence: "REGULATORY",
    visibility: "PUBLIC",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Already rendered in Footer. Keep wording consistent if reused.",
  },

  // ── Banned (the kind of language a serious sports product should refuse) ─
  {
    id: "banned.guaranteed-outcome",
    copy: "guaranteed",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Implies certainty in an uncertain market. Note: 'money-back guarantee' (noun form) is a billing term and is not matched by the scanner.",
    safeReplacement: "our model favors / the data suggests",
  },
  {
    id: "banned.lock",
    copy: "lock",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Sports-betting slang for a 'guaranteed' pick (a lock, lock of the day). Scanner uses word boundaries to avoid matching 'block', 'unlock', 'clock', and blanks the legitimate TEMPORAL idiom ('at lock', 'lock time', 'lock→close' — when the line locks/closes) before testing. Claim forms ('a lock', 'it's a lock') still fail.",
    safeReplacement: "high-confidence pick",
  },
  {
    id: "banned.sure-thing",
    copy: "sure thing",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Direct certainty claim. Not allowed regardless of confidence level.",
  },
  {
    id: "banned.risk-free",
    copy: "risk-free",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Sports betting is not risk-free. Banned even in promotional copy.",
  },
  {
    id: "banned.easy-money",
    copy: "easy money",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Implies low risk / high yield. Banned.",
  },
  {
    id: "banned.cant-lose",
    copy: "can't lose",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Direct certainty claim. Banned.",
  },
  {
    id: "banned.verified-track-record",
    copy: "verified track record",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote:
      "Implies third-party verification. No such verification exists at this stage. Use 'published track record' only when PERFORMANCE_STATS_ENABLED is true.",
  },
  {
    id: "banned.thousands-of-bettors",
    copy: "thousands of bettors",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Unsupported user-count claim. Banned until a claim record backed by real metrics exists.",
  },
  {
    id: "banned.trusted-by-serious-bettors",
    copy: "trusted by serious bettors",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Unsupported social-proof headline. Banned.",
  },
  {
    id: "banned.guaranteed-profit",
    copy: "guaranteed profit",
    category: "SOCIAL_PROOF",
    status: "BANNED",
    evidence: "NONE",
    visibility: "INTERNAL",
    lastReviewedAt: LAST_REVIEW,
    reviewNote: "Compound certainty + financial outcome. Banned.",
  },
] as const;

// ─────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────

export function getClaim(id: string): TrustClaim | undefined {
  return TRUST_CLAIMS.find((c) => c.id === id);
}

export function getApprovedClaims(category?: ClaimCategory): readonly TrustClaim[] {
  return TRUST_CLAIMS.filter(
    (c) => c.status === "APPROVED" && (!category || c.category === category)
  );
}

export function getBannedClaims(): readonly TrustClaim[] {
  return TRUST_CLAIMS.filter((c) => c.status === "BANNED");
}

/**
 * Convenience accessor returning a flat array of banned phrase strings.
 * Tests and policy helpers should use this rather than duplicating the
 * list — it keeps the registry as the single source of truth.
 */
export function getBannedPhraseList(): readonly string[] {
  return getBannedClaims().map((c) => c.copy);
}

/**
 * Internal-vocabulary terms that are legitimate inside the codebase, admin
 * UI, and operator messages — but must NOT appear in customer-facing
 * `publicMessage` strings. Centralised here so the public-performance
 * policy tests and any future customer-copy guard can consume one list.
 *
 * Add an entry when an internal noun starts leaking into customer-facing
 * copy in code review.
 */
export const INTERNAL_VOCABULARY: readonly string[] = [
  "canonical",
  "bootstrap",
  "isBootstrap",
  "isPublished",
  "isFeatured",
  "settledAt",
  "pickGrade",
  "modelVersion",
  "bookmakerCount",
  "edgeScore",
  "snapshot",
  "calibrationProposal",
  "readinessGate",
  "performanceSummary",
];

// ─────────────────────────────────────────────
// Banned-phrase scanner
// ─────────────────────────────────────────────

export interface BannedPhraseHit {
  readonly phrase: string;
  readonly claimId: string;
  /** 1-based line number in the input where the match starts. */
  readonly line: number;
  /** The line of text that matched (trimmed). */
  readonly snippet: string;
}

/**
 * Scan a string for any public-banned phrase from the registry.
 *
 * Word-boundary handling: phrases that are vulnerable to false positives
 * inside larger words (e.g. "lock" inside "block", "unlock", "clock") are
 * matched with regex word boundaries. Multi-word phrases are matched as
 * literal case-insensitive substrings.
 *
 * Returns every hit; the caller decides how to report them.
 */
export function scanForBannedPhrases(input: string): BannedPhraseHit[] {
  const hits: BannedPhraseHit[] = [];
  const lines = input.split(/\r?\n/);

  for (const claim of getBannedClaims()) {
    const phrase = claim.copy;
    const useWordBoundary = !phrase.includes(" ") && phrase.length <= 6;
    const pattern = useWordBoundary
      ? new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i")
      : new RegExp(escapeRegex(phrase), "i");

    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        hits.push({
          phrase,
          claimId: claim.id,
          line: idx + 1,
          snippet: line.trim(),
        });
      }
    });
  }

  return hits;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
