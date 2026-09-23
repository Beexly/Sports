/**
 * arXiv:2511.07250v2 — MVU-Eval: Towards Multi-Video Understanding Evaluation for Multimodal LLMs
 *
 * Benchmark harness for streaming classification on sports data streams: prequential evaluation with ADWIN
 * drift detection, the Friedman + Nemenyi significance protocol, and sample/compute-efficiency frontiers
 * for the online model portfolio.
 *
 * Improvement: GSE builds GSE-MVU: a 200-500 QA-pair evaluation set over multi-angle NFL clips (broadcast + all-22 + end-zone) across 8 tasks, and adopts an MLLM for production clip work only if it clears a bar no current model meets.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt an MLLM for any GSE production clip task only if it scores >=70% overall on GSE-MVU AND >=60% on Spatial Understanding and KIR subtasks; REJECT as the evaluator's whole point is that the bar is aspirational.
 */

/** One prequential step: predict, then learn. */
export interface PrequentialStep {
  correct: boolean;
}

/** Prequential accuracy over the stream. */
export function prequentialAccuracy(steps: readonly PrequentialStep[]): number {
  if (steps.length === 0) throw new Error("prequentialAccuracy: no steps");
  return steps.filter((s) => s.correct).length / steps.length;
}

/**
 * ADWIN-lite drift detection: split the recent window in half; drift fires
 * when the means differ by more than epsilon (Hoeffding-flavored bound).
 */
export function adwinDrift(
  errors: readonly number[],
  epsilon: number,
): boolean {
  if (epsilon <= 0) throw new Error("adwinDrift: epsilon > 0");
  const n = errors.length;
  if (n < 4) return false;
  const half = Math.floor(n / 2);
  const a = errors.slice(0, half);
  const b = errors.slice(half);
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  return Math.abs(ma - mb) > epsilon;
}

/** Friedman rank sums: rank algorithms per dataset, sum ranks. */
export function friedmanRanks(scores: number[][]): number[] {
  // scores[d][a] = score of algorithm a on dataset d (higher = better)
  const A = scores[0]?.length ?? 0;
  const ranks = new Array<number>(A).fill(0);
  for (const row of scores) {
    const order = row.map((s, a) => ({ s, a })).sort((x, y) => y.s - x.s);
    order.forEach((o, r) => { ranks[o.a] = (ranks[o.a] ?? 0) + (r + 1); });
  }
  return ranks;
}

/**
 * Nemenyi critical difference for comparing average ranks.
 * CD = q_alpha * sqrt(A(A+1) / 6D).
 */
export function nemenyiCD(A: number, D: number, qAlpha = 2.728): number {
  if (A < 2 || D < 1) throw new Error("nemenyiCD: A >= 2, D >= 1");
  return qAlpha * Math.sqrt((A * (A + 1)) / (6 * D));
}
