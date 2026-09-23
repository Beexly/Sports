/**
 * arXiv 2211.04534v1: Going for GOAL: A Resource for Grounded Football Commentaries
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build 'GOAL-NFL': NFL highlight clips paired with broadcast commentary transcripts; implement the four grounding tasks with CLIP-style video-text encoders; use retrieval (the paper's strong task: R@1 63%) for a 'find the clip for this storyline' product feature; skip generation entirely (the paper's own numbers don't clear any usable bar) -- and condition retrieval on game state (score, clock, down/distance) as an extra input, which should disambiguate visually similar moments (e.g., any touchdown) and is directly available in GSE's data.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build 'GOAL-NFL': NFL highlight clips paired with broadcast commentary transcripts; implement the four grounding tasks with CLIP-style video-text encoders; use retrieval (the paper's strong task: R@1 63%) for a 'find the clip for this storyline' product feature; skip generation entirely (the paper's own numbers don't clear any usable bar) — and condition retrieval on game state (score, clock, down/distance) as an extra input, which should disambiguate visually similar moments (e.g., any touchdown) and is directly available in GSE's data.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT the retrieval task into the clip-search product iff a CLIP-style modern baseline beats the paper's R@1 by >=5 points on GOAL-NFL pilot data; REJECT the generation task entirely.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: nlp | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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
