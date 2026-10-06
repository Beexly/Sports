/**
 * Rank-space ensemble fusion with RSC diversity weights
 *
 * Research port: arXiv:2603.10916
 * Normalized lane: experimental | Doctrine: PROPRIETARY_EDGE
 *
 * Pure port of the paper's rank-space fusion operator: per-game win
 * probabilities from each model are converted to ranks, then fused via rank
 * combination with Rank-Sum-Correlation (RSC) diversity weights — models
 * whose rankings disagree more with the consensus get upweighted, so the
 * fusion rewards complementary information rather than herding. Competes
 * against production score-averaging on existing model outputs; the fused
 * ranks map back to probabilities through the empirical rank-to-probability
 * curve of the training window.
 *
 * ACCEPTANCE GATE: ADAPT conditional on the paper's reproducibility checks;
 * import only the rank-space fusion operator and RSC diversity-weight idea,
 * rejecting the 74.60% headline as evidence.
 */

export interface ModelProbs {
  model: string;
  /** P(home win) per game, aligned across models */
  probs: number[];
}

export interface FusionResult {
  fusedRanks: number[];
  /** RSC diversity weight per model */
  weights: Record<string, number>;
  /** fused probabilities via the rank-to-probability map */
  fusedProbs: number[];
}

/** Convert probabilities to ranks (1 = highest probability). Average ties. */
export function toRanks(probs: number[]): number[] {
  const order = probs
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p - a.p);
  const ranks = new Array<number>(probs.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && (order[j + 1]?.p ?? 0) === (order[i]?.p ?? 0)) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      const o = order[k];
      if (o) ranks[o.i] = avg;
    }
    i = j + 1;
  }
  return ranks;
}

/** Pool-adjacent-violators isotonic regression (non-increasing). */
function isotonicNonIncreasing(values: number[]): number[] {
  const blocks: Array<{ sum: number; n: number }> = values.map((v) => ({ sum: v, n: 1 }));
  let i = 0;
  while (i < blocks.length - 1) {
    const a = blocks[i];
    const b = blocks[i + 1];
    if (a && b && a.sum / a.n < b.sum / b.n) {
      blocks.splice(i, 2, { sum: a.sum + b.sum, n: a.n + b.n });
      if (i > 0) i--;
    } else {
      i++;
    }
  }
  const out: number[] = [];
  for (const blk of blocks) {
    const mean = blk.sum / blk.n;
    for (let k = 0; k < blk.n; k++) out.push(mean);
  }
  return out;
}

function spearman(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = (a[i] ?? 0) - ma;
    const db = (b[i] ?? 0) - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  if (va === 0 || vb === 0) return 0;
  return cov / Math.sqrt(va * vb);
}

/**
 * RSC diversity weights: each model's weight is proportional to its mean
 * rank-distance (1 - Spearman correlation) from the other models' rankings.
 * More contrarian models get more weight.
 */
export function rscWeights(rankings: number[][]): number[] {
  const m = rankings.length;
  if (m === 0) return [];
  if (m === 1) return [1];
  const diversity = rankings.map((r, i) => {
    let sum = 0;
    let n = 0;
    for (let j = 0; j < m; j++) {
      if (i === j) continue;
      const other = rankings[j];
      if (!other) continue;
      sum += 1 - spearman(r, other);
      n++;
    }
    return n === 0 ? 0 : Math.max(0, sum / n);
  });
  const total = diversity.reduce((s, v) => s + v, 0);
  if (total === 0) return rankings.map(() => 1 / m);
  return diversity.map((d) => d / total);
}

/**
 * Rank-space fusion: rank each model's probabilities, weight by RSC
 * diversity, combine into fused ranks, and map back to probabilities via
 * the empirical rank->probability curve fit on the training window.
 */
export function rankSpaceFusion(models: ModelProbs[], trainOutcomes?: number[]): FusionResult {
  const weights: Record<string, number> = {};
  if (models.length === 0) return { fusedRanks: [], weights, fusedProbs: [] };
  const n = models[0]?.probs.length ?? 0;
  const rankings = models.map((m) => toRanks(m.probs));
  const w = rscWeights(rankings);
  models.forEach((m, i) => {
    weights[m.model] = w[i] ?? 0;
  });
  const fusedRanks: number[] = [];
  for (let g = 0; g < n; g++) {
    let s = 0;
    for (let i = 0; i < models.length; i++) {
      s += (w[i] ?? 0) * ((rankings[i]?.[g] ?? 0));
    }
    fusedRanks.push(s);
  }
  // Rank -> probability map: isotonic-ish empirical curve from training
  // outcomes sorted by fused rank (lower rank = higher prob).
  let fusedProbs = fusedRanks.map(() => 0.5);
  if (trainOutcomes && trainOutcomes.length === n) {
    const order = fusedRanks.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r);
    // Rank -> probability map: isotonic (non-increasing in rank) fit of
    // training outcomes ordered by fused rank. Lower rank = higher prob.
    const smoothed = isotonicNonIncreasing(order.map((o) => trainOutcomes[o.i] ?? 0));
    const out = new Array<number>(n);
    order.forEach((o, k) => {
      out[o.i] = smoothed[k] ?? 0.5;
    });
    fusedProbs = out;
  }
  return { fusedRanks, weights, fusedProbs };
}

/** Production baseline: plain score averaging of model probabilities. */
export function scoreAverage(models: ModelProbs[]): number[] {
  if (models.length === 0) return [];
  const n = models[0]?.probs.length ?? 0;
  const out: number[] = [];
  for (let g = 0; g < n; g++) {
    let s = 0;
    for (const m of models) s += m.probs[g] ?? 0.5;
    out.push(s / models.length);
  }
  return out;
}

export const GSE_RANK_FUSION_ENABLED = false;
