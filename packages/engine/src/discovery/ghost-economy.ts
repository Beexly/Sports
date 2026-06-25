/**
 * DISCOVERY LAYER — Ghost Economy (Invention 37).
 *
 * The graveyard of false edges should not be passive — it should TEACH. Every failed edge leaves a
 * ghost pattern (looked like a stale book but was a liquidity trap; looked like CLV but the close
 * was wrong; looked like injury lag but was already priced). New candidates are penalized for
 * resembling prior failures. Humans repeat mistakes because losses fade emotionally; machines can be
 * made to remember humiliation precisely — that is the advantage.
 *
 *   GhostPenalty = similarity(candidate, failed_cluster) × prior_failure_severity × recency_weight
 *                  × market_family_match
 *
 * Pure + deterministic. Builds on the einstein Negative Discovery Ledger's signatures.
 */

import { edgeSignature, type CandidateShape, type FailureReason } from "../einstein/negative-discovery-ledger.js";

export interface GhostCluster {
  readonly id: string;
  /** Representative shape of the failed-edge cluster. */
  readonly shape: CandidateShape;
  readonly failureReason: FailureReason;
  /** 0..1 how badly it failed (settlement-negative > CLV-only). */
  readonly severity: number;
  /** 0..1 recency weight (recent failures weigh more). */
  readonly recencyWeight: number;
}

const FAMILY = (sig: string) => sig.split("|")[0] ?? "";

/** Structural similarity between two candidate shapes via their signatures (0..1). */
export function shapeSimilarity(a: CandidateShape, b: CandidateShape): number {
  const sa = edgeSignature(a).split("|");
  const sb = edgeSignature(b).split("|");
  let match = 0;
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) if (sa[i] === sb[i]) match += 1;
  return match / Math.max(sa.length, sb.length);
}

/** The penalty a new candidate inherits from resembling a specific ghost cluster. */
export function ghostPenalty(candidate: CandidateShape, cluster: GhostCluster): number {
  const sim = shapeSimilarity(candidate, cluster.shape);
  const familyMatch = FAMILY(edgeSignature(candidate)) === FAMILY(edgeSignature(cluster.shape)) ? 1 : 0.5;
  return sim * cluster.severity * cluster.recencyWeight * familyMatch;
}

export interface GhostAssessment {
  /** Max penalty across all clusters (the most-relevant prior failure). */
  readonly maxPenalty: number;
  readonly worstCluster: string | null;
  /** True if the candidate is too close to a severe recent failure to proceed past WATCHLIST. */
  readonly suppressed: boolean;
  readonly note: string;
}

/** Assess a candidate against the whole ghost economy. */
export function assessAgainstGhosts(candidate: CandidateShape, clusters: readonly GhostCluster[], suppressThreshold = 0.5): GhostAssessment {
  let maxPenalty = 0;
  let worst: string | null = null;
  for (const c of clusters) {
    const p = ghostPenalty(candidate, c);
    if (p > maxPenalty) { maxPenalty = p; worst = c.id; }
  }
  return {
    maxPenalty: Number(maxPenalty.toFixed(3)),
    worstCluster: worst,
    suppressed: maxPenalty >= suppressThreshold,
    note: maxPenalty >= suppressThreshold
      ? `Strongly resembles a prior failure (${worst}); requires NEW evidence defeating that failure mode.`
      : "No disqualifying resemblance to a known dead edge.",
  };
}
