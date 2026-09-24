/**
 * arXiv 1803.01422v2: DAGs with NO TEARS: Continuous Optimization for Structure Learning
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * NOTEARS turns combinatorial DAG search into continuous optimization: minimize least-squares + l1 subject to the smooth acyclicity constraint h(W) = tr(exp(W o W)) - d = 0, solved by augmented Lagrangian. We use it to learn a stable causal graph over the team-week feature panel and prune to the Markov blanket of the outcome.
 *
 * Record improvement (verbatim):
 * Build the NO TEARS causal-graph layer for GSE's feature stack: NOTEARS (continuous DAG optimization with l1, threshold omega via bootstrap stability selection) on a ~35-node team-week panel (EPA/play, dropback/rush EPA, pressure rates, turnover/explosive rates, 3rd-down, red-zone TD%, pace, PROE, rest days, travel, QB EPA, injury counts, market spread/total), run per-season on nflverse 2015-2026; keep edges with stability >= 0.6; the prediction stack uses only the Markov blanket of the spread-cover target -- confounded leaves pruned. Improvement beyond the paper: DYNOTEARS dynamic extension learning contemporaneous W plus lagged A jointly from team-week sequences, plus NOTEARS-MLP for nonlinear edges, then compare stability (hypothesis: lag-aware graphs flip contemporaneous edges, e.g. defensive EPA -> offensive EPA becomes last-week defensive EPA -> this-week offensive EPA only; nonlinear variant surfaces threshold effects like pressure only mattering above ~30%).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the graph-pruned feature set only if ALL hold: (a) held-out Brier on 2024-2025 with <=60% of features is within 0.002 of the full-feature baseline (parity) or better; (b) learned-edge Jaccard similarity across season-blocked folds >= 0.5; (c) directed edges respect known football directionality on >=80% of high-confidence edges. Reject if Brier worsens by >0.003 or stability < 0.5.
 */

export const ENABLED = false;

export type Edge = [number, number];

function zeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => new Array<number>(m).fill(0));
}

/** Matrix exponential via Taylor series (fine for small d). */
export function matExp(A: number[][]): number[][] {
  const d = A.length;
  let result = zeros(d, d);
  let term = zeros(d, d);
  for (let i = 0; i < d; i++) {
    result[i]![i] = 1;
    term[i]![i] = 1;
  }
  for (let k = 1; k <= 30; k++) {
    const next = zeros(d, d);
    for (let i = 0; i < d; i++)
      for (let j = 0; j < d; j++) {
        let s = 0;
        for (let l = 0; l < d; l++) s += term[i]![l]! * A[l]![j]!;
        next[i]![j] = s / k;
      }
    term = next;
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) result[i]![j]! += term[i]![j]!;
  }
  return result;
}

/**
 * NOTEARS acyclicity constraint h(W) = tr(exp(W o W)) - d and its gradient
 * grad h = (exp(W o W))^T o 2W. h(W) = 0 iff W encodes a DAG.
 */
export function acyclicity(W: number[][]): { h: number; grad: number[][] } {
  const d = W.length;
  const S = W.map((row) => row.map((w) => w * w));
  const E = matExp(S);
  let tr = 0;
  for (let i = 0; i < d; i++) tr += E[i]![i]!;
  const grad = W.map((row, i) => row.map((w, j) => E[j]![i]! * 2 * w));
  return { h: tr - d, grad };
}

/** Threshold a weighted adjacency into a hard edge set. */
export function thresholdEdges(W: number[][], omega: number): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < W.length; i++)
    for (let j = 0; j < W.length; j++)
      if (i !== j && Math.abs(W[i]![j]!) > omega) edges.push([i, j]);
  return edges;
}

/** Jaccard similarity of two edge sets (stability across folds). */
export function jaccardEdges(a: Edge[], b: Edge[]): number {
  const ka = new Set(a.map(([i, j]) => `${i}->${j}`));
  const kb = new Set(b.map(([i, j]) => `${i}->${j}`));
  let inter = 0;
  for (const k of ka) if (kb.has(k)) inter++;
  const union = ka.size + kb.size - inter;
  return union === 0 ? 1 : inter / union;
}

/**
 * NOTEARS via augmented Lagrangian: minimize 0.5/n ||X - XW||_F^2 + l1|W|_1
 * s.t. h(W) = 0. Diagonal forced to 0 (no self-loops).
 */
export function notearsFit(
  X: number[][],
  l1 = 0.1,
  iters = 1500,
  lr = 0.02,
): number[][] {
  const n = X.length;
  const d = X[0]!.length;
  let W = zeros(d, d);
  let alpha = 0;
  let rho = 1;
  for (let t = 0; t < iters; t++) {
    // R = XW - X ; G = (1/n) X'R
    const R: number[][] = Array.from({ length: n }, (_, r) => {
      const row = new Array<number>(d).fill(0);
      for (let j = 0; j < d; j++) {
        let s = 0;
        for (let k = 0; k < d; k++) s += X[r]![k]! * W[k]![j]!;
        row[j] = s - X[r]![j]!;
      }
      return row;
    });
    const G = zeros(d, d);
    for (let i = 0; i < d; i++)
      for (let j = 0; j < d; j++) {
        let s = 0;
        for (let r = 0; r < n; r++) s += X[r]![i]! * R[r]![j]!;
        G[i]![j] = s / n;
      }
    const { h, grad: gradH } = acyclicity(W);
    const penalty = alpha + rho * h;
    for (let i = 0; i < d; i++)
      for (let j = 0; j < d; j++) {
        if (i === j) {
          W[i]![j] = 0;
          continue;
        }
        const l1sub = W[i]![j]! > 0 ? 1 : W[i]![j]! < 0 ? -1 : 0;
        W[i]![j]! -= lr * (G[i]![j]! + l1 * l1sub + penalty * gradH[i]![j]!);
      }
    if (t % 100 === 99) {
      alpha += rho * h;
      rho = Math.min(rho * 1.5, 1e4);
    }
  }
  return W;
}

/** Ancestors' Markov-blanket-style feature pruning: keep nodes with any learned edge. */
export function pruneToGraph(W: number[][], omega: number, target: number): number[] {
  const edges = thresholdEdges(W, omega);
  const keep = new Set<number>([target]);
  for (const [i, j] of edges) {
    keep.add(i);
    keep.add(j);
  }
  return [...keep].sort((a, b) => a - b);
}
