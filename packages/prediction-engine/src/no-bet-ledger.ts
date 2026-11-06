/**
 * No-Bet Observability Analyzer — READ-ONLY surface of pick-publication decisions
 * (Workstream-K "K2").
 *
 * WHAT THIS IS
 * A pure analyzer that classifies a batch of candidate picks into "published" vs
 * "no-bet" and counts the reasons each candidate was suppressed (below the
 * minimum confidence floor, edge PASS, independent estimator CONTRADICTS). It
 * surfaces the existing MIN_PUBLISH_CONFIDENCE gate (constants.ts) as countable,
 * auditable output so we can track WHERE decisions are being made — not whether
 * those decisions were correct.
 *
 * THIS IS NOT THE DB LEDGER
 * The persistent database ledger — the K3 No-Bet Ledger that tracks rejected
 * markets to settlement so we can eventually answer "did the no-bet save or cost
 * us?" — is a separate, owner-gated K3 deliverable. This module is the READ-ONLY
 * observability layer ahead of it: it can only measure that a no-bet HAPPENED and
 * WHY, not whether it was the right call.
 *
 * WHY IT IS INERT (WEIGHT 0)
 * This module is shadow decision-support only: weight 0, inert, NOT imported by
 * scoring.ts or any live path. It does not score, gate, tier, or price anything.
 * The analysis it produces is a diagnostic aid for the prediction team, surfaced
 * in reports/dashboards only — never fed back into the live confidence path.
 *
 * CRITICAL HONESTY INVARIANT (read the caveats field)
 * This module CAN tell you: how many picks were suppressed and which gate fired.
 * This module CANNOT tell you: whether the suppressed picks would have won.
 * Discipline is only provable as alpha once rejected markets are tracked to
 * settlement by the K3 No-Bet Ledger. Publishing a no-bet rate without that
 * settlement tracking would be a misleading performance claim.
 *
 * Pure functions, no I/O. Imports MIN_PUBLISH_CONFIDENCE from constants.ts only.
 */

import { MIN_PUBLISH_CONFIDENCE } from "./constants.js";
import type { EdgeDecision, AnchorAgreement } from "./edge-engine.js";

/**
 * The reason a candidate pick was NOT published (or was published).
 *
 * Precedence (applied in this order, first match wins):
 *   1. "below-min-confidence"  — confidence < MIN_PUBLISH_CONFIDENCE (the hard floor).
 *   2. "edge-contradicts"      — independent estimator agreement is "CONTRADICTS".
 *   3. "edge-pass"             — edge decision is "PASS".
 *   4. "published"             — none of the above; the pick cleared every gate.
 *
 * The precedence is documented explicitly so the classification is auditable and
 * consistent: the confidence floor is always the primary gate (it is the one
 * hard-coded in scoring.ts); edge reasons are secondary.
 */
export type NoBetReason =
  | "published"
  | "below-min-confidence"
  | "edge-pass"
  | "edge-contradicts";

/**
 * One candidate pick's facts at the moment a publish/no-bet decision was made.
 * All fields except `confidence` are optional — absence is treated as "not
 * available", never as a positive gate trigger.
 */
export interface NoBetCandidate {
  /** The pick's 0–100 confidence score (the primary gate). */
  readonly confidence: number;
  /** Edge decision from assessEdge. null/undefined = edge engine not run. */
  readonly edgeDecision?: EdgeDecision | null;
  /** Independent-estimator agreement from assessEdge. null/undefined = not available. */
  readonly agreement?: AnchorAgreement | null;
  /** Whether a calibrated probability was available. null/undefined = not available. */
  readonly calibrated?: boolean | null;
}

/** Per-reason count — one entry per distinct NoBetReason that appeared. */
export interface NoBetReasonCount {
  readonly reason: NoBetReason;
  readonly count: number;
}

export interface NoBetAnalysis {
  /** Weight is always 0: inert, shadow, never priced into live confidence. */
  readonly weight: 0;
  /** Total candidates analysed. */
  readonly total: number;
  /** Candidates that cleared every gate and would be published. */
  readonly published: number;
  /** Candidates suppressed by at least one gate (total − published). */
  readonly noBet: number;
  /**
   * noBet / total in [0, 1], or 0 when total is 0.
   * This is the suppression RATE — how many candidates did not publish.
   * It is an operational metric, NOT a measure of decision quality.
   */
  readonly noBetRate: number;
  /** Per-gate counts, sorted by count descending. */
  readonly byReason: readonly NoBetReasonCount[];
  /**
   * Honest caveats about what this analysis can and cannot tell us.
   * Always non-empty. Read before drawing conclusions.
   */
  readonly caveats: readonly string[];
}

const STANDARD_CAVEATS: readonly string[] = [
  `This analysis measures that a no-bet decision WAS MADE and which gate fired — it CANNOT determine whether the no-bet SAVED or COST us. That determination requires the settled outcome of each rejected market, which is the purpose of the K3 No-Bet Ledger (not yet built).`,
  `Discipline is only provable as alpha once rejected markets are tracked to settlement. A low no-bet rate is not evidence of over-filtering, and a high no-bet rate is not evidence of good discipline — both claims require settlement data to support them.`,
  `The "published" count reflects candidates that cleared every available gate given the inputs supplied to this function. Actual publication may have additional gates not visible here (e.g., deduplication, content generation status, subscription tier limits).`,
  `MIN_PUBLISH_CONFIDENCE is the primary gate (currently ${MIN_PUBLISH_CONFIDENCE}). Edge reasons are secondary and only apply when confidence data alone does not suppress the pick.`,
];

/**
 * Classify one candidate into the appropriate NoBetReason.
 * Precedence: confidence floor first, then CONTRADICTS, then PASS, then published.
 */
function classifyCandidate(candidate: NoBetCandidate): NoBetReason {
  // 1. Hard confidence floor — the primary gate, always checked first.
  if (!Number.isFinite(candidate.confidence) || candidate.confidence < MIN_PUBLISH_CONFIDENCE) {
    return "below-min-confidence";
  }

  // 2. Independent estimator CONTRADICTS us — an independent referee sides with the market.
  if (candidate.agreement === "CONTRADICTS") {
    return "edge-contradicts";
  }

  // 3. Edge decision is PASS — the honest default silence.
  if (candidate.edgeDecision === "PASS") {
    return "edge-pass";
  }

  // 4. Every gate cleared — the pick would be published.
  return "published";
}

/**
 * Analyse a batch of pick candidates to surface how many were suppressed and why.
 *
 * This is a READ-ONLY diagnostic. It measures gate firing rates across the batch.
 * It says nothing about whether the suppressed picks would have won or lost —
 * that determination requires settlement data (the K3 No-Bet Ledger).
 *
 * An empty candidates array returns a zeroed, valid result with the standard caveats.
 */
export function analyzeNoBetDecisions(candidates: readonly NoBetCandidate[]): NoBetAnalysis {
  const reasonCounts = new Map<NoBetReason, number>();

  // Initialise all reason buckets to 0 for consistent output ordering.
  const allReasons: NoBetReason[] = [
    "published",
    "below-min-confidence",
    "edge-contradicts",
    "edge-pass",
  ];
  for (const r of allReasons) {
    reasonCounts.set(r, 0);
  }

  let publishedCount = 0;

  for (const candidate of candidates) {
    const reason = classifyCandidate(candidate);
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    if (reason === "published") {
      publishedCount++;
    }
  }

  const total = candidates.length;
  const noBet = total - publishedCount;
  const noBetRate = total > 0 ? noBet / total : 0;

  // Build byReason array sorted by count descending (most common gate first).
  const byReason: NoBetReasonCount[] = allReasons
    .map((reason) => ({ reason, count: reasonCounts.get(reason) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return {
    weight: 0,
    total,
    published: publishedCount,
    noBet,
    noBetRate,
    byReason,
    caveats: STANDARD_CAVEATS,
  };
}

// Re-export the threshold so callers can see what floor this module uses without
// importing constants.ts directly. (Read-only surface — do NOT mutate.)
export { MIN_PUBLISH_CONFIDENCE };
