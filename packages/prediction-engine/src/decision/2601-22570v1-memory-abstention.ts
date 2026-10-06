// ============================================================
// Memory-augmented abstention gate (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2601.22570v1 — "Leveraging Data to Say No: Memory Augmented Plug-and-Play Selective Prediction"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: memory-augmented plug-and-play selective prediction —
 * at prediction time the model retrieves the k nearest historical
 * game-states from memory, corrects its confidence by the neighbors'
 * realized accuracy, and abstains (or down-stakes) when the corrected
 * confidence is low. The memory lookup is plug-and-play: no retraining,
 * just a corrected confidence = base confidence blended with neighbor
 * accuracy.
 *
 * IMPROVEMENT (from ledger): GSE layers a memory-augmented abstention gate over pick posting: at prediction time it retrieves the k nearest historical game-states, corrects model confidence by neighbor accuracy, and skips or down-stakes low-corrected-confidence games.
 *
 * ACCEPTANCE GATE: ADOPT if on 2024 the memory-augmented abstention policy yields higher ROI at matched coverage than raw-confidence abstention, with AURC reduced by >=10% relative.
 */

/** Squared Euclidean distance between embedding vectors. */
export function embeddingDistance(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + (x - b[i]!) ** 2, 0);
}

/** Indices of the k nearest memory states to the query embedding. */
export function nearestNeighbors(
  query: number[],
  memoryEmbeddings: number[][],
  k: number,
): number[] {
  return memoryEmbeddings
    .map((m, i) => [embeddingDistance(query, m), i] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .slice(0, Math.max(1, Math.min(k, memoryEmbeddings.length)))
    .map(([, i]) => i);
}

/**
 * Memory-corrected confidence: blend of base confidence and neighbor
 * realized accuracy.
 */
export function correctedConfidence(
  baseConfidence: number,
  neighborCorrect: (0 | 1)[],
  blendWeight: number,
): number {
  if (neighborCorrect.length === 0) return baseConfidence;
  const neighborAcc = neighborCorrect.reduce<number>((a, b) => a + b, 0) / neighborCorrect.length;
  return (1 - blendWeight) * baseConfidence + blendWeight * neighborAcc;
}

/** Down-stake factor: corrected confidence mapped to [0, 1] stake scale. */
export function downStakeFactor(correctedConf: number, skipThreshold: number): number {
  if (correctedConf < skipThreshold) return 0;
  return Math.min(1, (correctedConf - skipThreshold) / Math.max(1 - skipThreshold, 1e-12));
}

export interface RiskCoveragePoint {
  coverage: number;
  risk: number;
}

/**
 * AURC: area under the risk-coverage curve. Picks are sorted by descending
 * confidence (most-confident first, i.e. covered first); risk at each
 * coverage = error rate of the covered (most-confident) subset. Lower is
 * better.
 */
export function aurc(confidences: number[], correct: (0 | 1)[]): number {
  const n = confidences.length;
  if (n === 0) return 0;
  const order = confidences.map((c, i) => i).sort((a, b) => confidences[b]! - confidences[a]!);
  let area = 0;
  let errors = 0;
  for (let i = 0; i < n; i++) {
    if (correct[order[i]!] === 0) errors++;
    const coverage = (i + 1) / n;
    area += (errors / (i + 1)) * (1 / n);
    void coverage;
  }
  return area;
}

export interface MemoryGate {
  memoryRoi: number;
  rawRoi: number;
  aurcReduction: number;
  passes: boolean;
}

/**
 * Acceptance-gate helper: memory-augmented policy has higher ROI at
 * matched coverage with AURC reduced by ≥10% relative.
 */
export function memoryGatePasses(
  memoryRoi: number,
  rawRoi: number,
  memoryAurc: number,
  rawAurc: number,
): MemoryGate {
  const aurcReduction = rawAurc > 0 ? (rawAurc - memoryAurc) / rawAurc : 0;
  return {
    memoryRoi,
    rawRoi,
    aurcReduction,
    passes: memoryRoi > rawRoi && aurcReduction >= 0.1,
  };
}
