/**
 * arXiv 1901.09890v1: Few-shot Learning with Meta Metric Learners
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Meta metric learners learn a distance metric across tasks so that K-shot adaptation on a new task is accurate. Our regime librarian embeds historical seasons, retrieves the most similar regimes by cosine similarity, and runs prototype classification in the learned metric space; a random-retrieval ablation isolates the retrieval's contribution.
 *
 * Record improvement (verbatim):
 * Add a regime-librarian retrieval layer for new-regime prediction: retrieve top-s most related historical team-seasons via per-season matching networks, then adapt with a meta-metric-learner at K in {2,4} observed games, falling back to the league-average prior when no season is better than chance.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff the retrieval+meta-metric-learner beats plain Matching Network by >=3pp accuracy on new-regime win prediction at K in {2,4} (2023-2025 test regimes), AND the random-auxiliary ablation shows no gain (proving retrieval, not just extra data, drives it).
 */

export const ENABLED = false;

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / Math.sqrt(Math.max(na * nb, 1e-24));
}

export interface LibrarySeason {
  id: string;
  embedding: number[];
}

/** Retrieve the top-s most similar seasons to the query embedding. */
export function retrieveTopS(
  query: number[],
  library: LibrarySeason[],
  s: number,
): string[] {
  return [...library]
    .sort((a, b) => cosineSim(query, b.embedding) - cosineSim(query, a.embedding))
    .slice(0, s)
    .map((l) => l.id);
}

/**
 * Learn per-feature metric scales from auxiliary tasks: Fisher score
 * (between-class / within-class variance) per feature, averaged over tasks,
 * normalized to mean 1. Informative features get scales > 1.
 */
export function learnMetricScales(tasks: { X: number[][]; y: number[] }[]): number[] {
  const d = tasks[0]!.X[0]!.length;
  const scores = new Array<number>(d).fill(0);
  for (const task of tasks) {
    for (let j = 0; j < d; j++) {
      const x0: number[] = [];
      const x1: number[] = [];
      for (let i = 0; i < task.X.length; i++) (task.y[i] === 1 ? x1 : x0).push(task.X[i]![j]!);
      if (x0.length === 0 || x1.length === 0) continue;
      const m0 = x0.reduce((a, b) => a + b, 0) / x0.length;
      const m1 = x1.reduce((a, b) => a + b, 0) / x1.length;
      const v0 = x0.reduce((a, b) => a + (b - m0) ** 2, 0) / x0.length;
      const v1 = x1.reduce((a, b) => a + (b - m1) ** 2, 0) / x1.length;
      scores[j]! += (m1 - m0) ** 2 / Math.max(v0 + v1, 1e-9);
    }
  }
  const mean = scores.reduce((a, b) => a + b, 0) / d / Math.max(tasks.length, 1);
  return scores.map((s) => s / Math.max(tasks.length, 1) / Math.max(mean, 1e-9));
}

export function scaledDistance(a: number[], b: number[], scales: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += scales[i]! * (a[i]! - b[i]!) ** 2;
  return Math.sqrt(Math.max(s, 0));
}

/** Prototype classifier in the learned metric space (1-shot-friendly). */
export function prototypePredict(
  supportX: number[][],
  supportY: number[],
  query: number[],
  scales: number[],
): number {
  const protos = new Map<number, { sum: number[]; n: number }>();
  for (let i = 0; i < supportX.length; i++) {
    const c = supportY[i]!;
    let p = protos.get(c);
    if (!p) {
      p = { sum: new Array<number>(query.length).fill(0), n: 0 };
      protos.set(c, p);
    }
    for (let j = 0; j < query.length; j++) p.sum[j]! += supportX[i]![j]!;
    p.n++;
  }
  let best = 0;
  let bestD = Infinity;
  for (const [c, p] of protos) {
    const proto = p.sum.map((v) => v / p.n);
    const d = scaledDistance(proto, query, scales);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function accuracy(preds: number[], ys: number[]): number {
  let h = 0;
  for (let i = 0; i < ys.length; i++) if (preds[i] === ys[i]) h++;
  return h / ys.length;
}

/** Gate: adopt on the paper's joint criterion. */
export function librarianGate(
  metaMetricAcc: number,
  matchingNetAcc: number,
  randomRetrievalAcc: number,
): "ADAPT" | "REJECT" {
  const gain = metaMetricAcc - matchingNetAcc;
  const retrievalAlone = randomRetrievalAcc - matchingNetAcc;
  if (gain >= 0.03 && retrievalAlone < 0.02) return "ADAPT";
  return "REJECT";
}
