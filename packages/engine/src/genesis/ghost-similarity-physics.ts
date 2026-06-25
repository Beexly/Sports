/**
 * GENESIS LAYER — Ghost Similarity Physics (Invention 49).
 *
 * Failed concepts become active defensive intelligence. A great system remembers exactly HOW it was
 * fooled. Each dead edge is a feature-space cluster; a new candidate is penalized for resembling one.
 * This generalizes the categorical ghost economy to continuous feature vectors shared across betting
 * and fantasy.
 *
 *   GhostPenalty = similarity(candidate, ghost_cluster) × failure_severity × market_family_match
 *                  × recency_weight × sample_reliability
 *
 * Pure + deterministic.
 */

export interface GhostFeatureCluster {
  readonly id: string;
  /** Centroid feature vector (each component 0..1). */
  readonly centroid: readonly number[];
  readonly failureSeverity: number; // 0..1
  readonly marketFamily: string;
  readonly recencyWeight: number;   // 0..1
  readonly sampleReliability: number; // 0..1
}

export interface GhostCandidate {
  readonly features: readonly number[];
  readonly marketFamily: string;
}

/** Similarity (0..1) between two equal-length 0..1 feature vectors = 1 − mean absolute difference. */
export function featureSimilarity(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i]! - b[i]!);
  return Number((1 - sum / n).toFixed(4));
}

/** Penalty a candidate inherits from resembling a specific ghost cluster. */
export function ghostSimilarityPenalty(candidate: GhostCandidate, cluster: GhostFeatureCluster): number {
  const sim = featureSimilarity(candidate.features, cluster.centroid);
  const familyMatch = candidate.marketFamily === cluster.marketFamily ? 1 : 0.5;
  return Number((sim * cluster.failureSeverity * familyMatch * cluster.recencyWeight * cluster.sampleReliability).toFixed(4));
}

export interface GhostSimilarityAssessment {
  readonly maxPenalty: number;
  readonly worstCluster: string | null;
  readonly suppressed: boolean;
  readonly note: string;
}

/** Assess a candidate against the whole ghost field. */
export function assessGhostSimilarity(candidate: GhostCandidate, clusters: readonly GhostFeatureCluster[], suppressThreshold = 0.5): GhostSimilarityAssessment {
  let maxPenalty = 0, worst: string | null = null;
  for (const c of clusters) {
    const p = ghostSimilarityPenalty(candidate, c);
    if (p > maxPenalty) { maxPenalty = p; worst = c.id; }
  }
  return {
    maxPenalty: Number(maxPenalty.toFixed(4)),
    worstCluster: worst,
    suppressed: maxPenalty >= suppressThreshold,
    note: maxPenalty >= suppressThreshold
      ? `Resembles dead-edge cluster ${worst} (penalty ${maxPenalty.toFixed(2)}) — requires NEW evidence defeating that failure mode.`
      : "No disqualifying resemblance to a known dead edge.",
  };
}
