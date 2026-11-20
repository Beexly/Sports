/**
 * Clean-room Affinity-Diversity Reranker (`affinity-diversity-reranker.ts`)
 *
 * Greedily selects a top-K subset of grounded equation premises that balances
 * individual statistical affinity (prior weight + conditioned log-odds magnitude)
 * against cluster & lexical redundancy so repeated variations of the same signal
 * do not crowd out orthogonal cross-family evidence.
 */

import type { Premise } from "./mcp-cognitive-router.js";

export type RerankablePremise = Premise & {
  readonly rawLogOddsDelta?: number;
  readonly signalFamilyIdx?: number;
  readonly category?: string;
};

export interface AffinityDiversityOptions {
  readonly topK?: number;
  /** Weight in [0, 1] placed on individual affinity vs marginal diversity (default 0.72). */
  readonly lambda?: number;
  /** Penalty per prior selected premise sharing the same cluster (default 0.20). */
  readonly clusterPenalty?: number;
}

function tokenize(text: string): ReadonlySet<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return new Set(tokens);
}

function jaccardSimilarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const tok of a) {
    if (b.has(tok)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function baseAffinity(item: RerankablePremise, maxLogOdds: number): number {
  const simPart = Number.isFinite(item.similarity) ? Math.min(1, Math.max(0, item.similarity)) : 0;
  const deltaAbs =
    typeof item.rawLogOddsDelta === "number" && Number.isFinite(item.rawLogOddsDelta)
      ? Math.abs(item.rawLogOddsDelta)
      : 0;
  const deltaNorm = maxLogOdds > 0 ? Math.min(1, deltaAbs / maxLogOdds) : 0;
  const trustBonus = item.verificationTier === "CITABLE_VERIFIED" ? 0.15 : item.verificationTier === "COMPUTED" ? 0.05 : 0;
  return 0.55 * simPart + 0.30 * deltaNorm + trustBonus;
}

/**
 * Re-rank equation premises for top-K affinity + diversity (pure, deterministic).
 */
export function rerankAffinityDiversePremises<T extends RerankablePremise>(
  candidates: readonly T[],
  opts: AffinityDiversityOptions = {},
): T[] {
  const topK = opts.topK ?? candidates.length;
  if (topK <= 0 || candidates.length === 0) return [];
  if (candidates.length <= 1) return candidates.slice(0, topK);

  const lambda = Math.min(1, Math.max(0, opts.lambda ?? 0.72));
  const clusterPenalty = Math.max(0, opts.clusterPenalty ?? 0.20);

  let maxLogOdds = 0;
  for (const c of candidates) {
    const absD = typeof c.rawLogOddsDelta === "number" && Number.isFinite(c.rawLogOddsDelta) ? Math.abs(c.rawLogOddsDelta) : 0;
    if (absD > maxLogOdds) maxLogOdds = absD;
  }

  const tokenCache = candidates.map((c) => tokenize(`${c.cluster} ${c.premise}`));
  const affinities = candidates.map((c) => baseAffinity(c, maxLogOdds));
  const remaining = new Set<number>(candidates.map((_, idx) => idx));
  const maxLexSimByIdx = new Float64Array(candidates.length);
  const selectedIndices: number[] = [];
  const selectedClusterCounts = new Map<string, number>();

  while (selectedIndices.length < topK && remaining.size > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (const idx of remaining) {
      const item = candidates[idx]!;
      const aff = affinities[idx]!;
      const maxLexSim = maxLexSimByIdx[idx]!;
      const sameClusterCount = selectedClusterCounts.get(item.cluster) ?? 0;
      const clusterPen = Math.min(0.6, sameClusterCount * clusterPenalty);
      const redundancy = Math.min(1, 0.7 * maxLexSim + clusterPen);
      const mmrScore = lambda * aff - (1 - lambda) * redundancy;

      if (
        mmrScore > bestScore + 1e-12 ||
        (Math.abs(mmrScore - bestScore) <= 1e-12 && bestIdx >= 0 && item.id < candidates[bestIdx]!.id)
      ) {
        bestScore = mmrScore;
        bestIdx = idx;
      }
    }

    if (bestIdx < 0) break;
    remaining.delete(bestIdx);
    selectedIndices.push(bestIdx);
    const chosenCluster = candidates[bestIdx]!.cluster;
    selectedClusterCounts.set(chosenCluster, (selectedClusterCounts.get(chosenCluster) ?? 0) + 1);

    const bestTokens = tokenCache[bestIdx]!;
    for (const idx of remaining) {
      const sim = jaccardSimilarity(tokenCache[idx]!, bestTokens);
      if (sim > maxLexSimByIdx[idx]!) {
        maxLexSimByIdx[idx] = sim;
      }
    }
  }

  return selectedIndices.map((idx) => candidates[idx]!);
}
