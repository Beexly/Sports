/**
 * arXiv 2401.01505v5: Sports-QA: A Large-Scale Video Question Answering Benchmark for Complex and Professional Sports
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Treat NGS tracking sequences as the 'video' for football QA: transformer encoder over tracking frames with AFA-style multi-focal attention (focal lengths {5,25,100} frames ~ {0.5s,2.5s,10s}), question encoder replaced by a play-context encoder (down/distance, personnel, score) -- 'what happens next' play-outcome classification -- with focal lengths learnable per attention head and mixing weights alpha_f conditioned on play context (short focus for line-of-scrimmage chaos, long focus for developing routes).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Treat NGS tracking sequences as the 'video' for football QA: transformer encoder over tracking frames with AFA-style multi-focal attention (focal lengths {5,25,100} frames ~ {0.5s,2.5s,10s}), question encoder replaced by a play-context encoder (down/distance, personnel, score) - 'what happens next' play-outcome classification - with focal lengths learnable per attention head and mixing weights alpha_f conditioned on play context (short focus for line-of-scrimmage chaos, long focus for developing routes).
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt if AFA beats standard attention by >=1.5pp accuracy AND >=1.0pp macro-F1 on the 2024 holdout; reject otherwise (the paper's own margin is ~1.2pp - demand at least parity with that on football data).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: nlp | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Scaled dot-product attention for one query row. */
export function attentionRow(q: number[], K: number[][], V: number[][]): number[] {
  const d = q.length;
  const scores = K.map((k) => k.reduce((s, v, i) => s + v * q[i]!, 0) / Math.sqrt(d));
  const mx = Math.max(...scores);
  const e = scores.map((s) => Math.exp(s - mx));
  const tot = e.reduce((a, b) => a + b, 0);
  const dOut = V[0]!.length;
  const out = new Array<number>(dOut).fill(0);
  e.forEach((w, i) => {
    const nw = w / tot;
    for (let j = 0; j < dOut; j++) out[j]! += nw * V[i]![j]!;
  });
  return out;
}

/** Trajectory attention map: per-frame attention weights. */
export function trajectoryAttention(traj: number[][], queryIdx: number): number[] {
  const q = traj[queryIdx]!;
  const scores = traj.map((k) => k.reduce((s, v, i) => s + v * q[i]!, 0) / Math.sqrt(q.length));
  const mx = Math.max(...scores);
  const e = scores.map((s) => Math.exp(s - mx));
  const tot = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / tot);
}

/** Temporal smoothing of an attention map (moving average). */
export function smoothAttention(weights: number[], radius: number): number[] {
  return weights.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(weights.length - 1, i + radius); j++) {
      s += weights[j]!;
      c++;
    }
    return s / c;
  });
}

/** Cosine similarity between embeddings. */
export function cosineSimNlp(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

/** Rank clips by cosine similarity to a query embedding. */
export function rankClips(query: number[], clips: number[][]): number[] {
  return clips
    .map((c, i) => [cosineSimNlp(query, c), i] as [number, number])
    .sort((a, b) => b[0] - a[0])
    .map(([, i]) => i);
}

/** Recall@k for a ranked list against the relevant set. */
export function recallAtK(ranked: number[], relevant: Set<number>, k: number): number {
  if (relevant.size === 0) return 1;
  const top = ranked.slice(0, k);
  const hit = top.filter((i) => relevant.has(i)).length;
  return hit / relevant.size;
}

/** Stratify QA accuracy by question type (comparison/calculation/inference/tracking). */
export function qaTypeAccuracy(
  types: string[],
  correct: boolean[],
): Record<string, { acc: number; n: number }> {
  const agg = new Map<string, { c: number; n: number }>();
  types.forEach((t, i) => {
    const e = agg.get(t) ?? { c: 0, n: 0 };
    e.n++;
    if (correct[i]) e.c++;
    agg.set(t, e);
  });
  const out: Record<string, { acc: number; n: number }> = {};
  for (const [t, e] of agg) out[t] = { acc: e.c / e.n, n: e.n };
  return out;
}

/** Game-state-conditioned retrieval score: visual sim + state bonus. */
export function stateConditionedScore(
  visualSim: number,
  queryState: number[],
  clipState: number[],
  stateWeight: number,
): number {
  let d = 0;
  for (let i = 0; i < queryState.length; i++) d += (queryState[i]! - clipState[i]!) ** 2;
  return visualSim + stateWeight * Math.exp(-d);
}
