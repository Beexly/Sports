/**
 * arXiv 2010.00526v1: LiveQA: A Question Answering Dataset over Sports Live
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * 'LiveQA-NFL': sample 2024 NFL games, extract play-by-play + drive text from nflverse; auto-generate quiz questions in the four types (comparison/calculation/inference/tracking) with evidence-location labels; evaluate GSE's game-summary/LLM pipelines; regression test for any live-event narration product; counterfactual questions ('if that 4th-down conversion had failed, who gets the ball?') requiring branching timeline reasoning.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build 'LiveQA-NFL': sample 2024 NFL games, extract play-by-play + drive text from nflverse; auto-generate quiz questions in the four types (comparison/calculation/inference/tracking) with evidence-location labels; evaluate GSE's game-summary/LLM pipelines on it; use it as the regression test for any live-event narration product; improvement experiment: add counterfactual questions ('if that 4th-down conversion had failed, who gets the ball?') requiring branching timeline reasoning.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT as the standard GSE timeline-QA benchmark if a 200-question pilot shows the four question types are answerable by humans at >=90% (validating question quality); REJECT if auto-generated questions are noisy (human accuracy <80%).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: nlp | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

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
