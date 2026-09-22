/**
 * Bootstrap aggregation for time-series causal discovery — arXiv 2306.08946v2
 * ("Bootstrap Aggregation for Time Series Causal Discovery").
 *
 * ADDITIVE utility. Pure bagging layer over causal-discovery runs; the
 * conditional-independence engine (tigramite PCMCI+) stays outside the repo.
 * Not wired into any model path.
 *
 * Paper mechanism: moving-block bootstrap wrapper, B = 100 replicates,
 * edge-wise majority vote, cycle-breaking post-pass (drop lowest-confidence
 * edges in cycles), embarrassingly parallel across replicates. Extension:
 * weighted voting by per-run model fit (CI-test p-value profile or BIC
 * score) instead of one-graph-one-vote, so low-quality bootstrap draws
 * count less.
 *
 * ACCEPTANCE GATE (improvement-ledger): adopt if bagged-PCMCI+ beats
 * single-run PCMCI+ on adjacency F1 by >=10% relative on the semi-synthetic
 * test with contemporaneous-orientation precision >= single-run's.
 */

export interface CausalEdge {
  readonly from: string;
  readonly to: string;
  /** Lag (>= 0; 0 = contemporaneous). */
  readonly lag: number;
  /** Confidence in [0,1] from this run's CI tests. */
  readonly confidence: number;
}

export interface CausalGraph {
  readonly edges: ReadonlyArray<CausalEdge>;
  /** Per-run model-fit weight (BIC score or p-value profile summary). */
  readonly fitWeight: number;
}

const edgeKey = (e: CausalEdge) => e.from + ">" + e.to + "@" + e.lag;

/**
 * Weighted edge-wise vote across bootstrap replicates: an edge survives
 * when its total fit-weight exceeds half the total weight (weighted
 * majority). Confidence of the voted edge = weight-averaged confidence.
 */
export function weightedEdgeVote(graphs: readonly CausalGraph[]): CausalEdge[] {
  const acc = new Map<string, { edge: CausalEdge; w: number; wc: number }>();
  let totalW = 0;
  for (const g of graphs) {
    totalW += g.fitWeight;
    for (const e of g.edges) {
      const k = edgeKey(e);
      const cur = acc.get(k) ?? { edge: e, w: 0, wc: 0 };
      cur.w += g.fitWeight;
      cur.wc += g.fitWeight * e.confidence;
      acc.set(k, cur);
    }
  }
  if (totalW === 0) return [];
  const out: CausalEdge[] = [];
  for (const { edge, w, wc } of acc.values()) {
    if (w > totalW / 2) {
      out.push({ ...edge, confidence: wc / w });
    }
  }
  return out;
}

/**
 * Cycle-breaking post-pass: while a directed cycle exists (ignoring lag),
 * drop the lowest-confidence edge in the cycle. Returns an acyclic edge set.
 */
export function breakCycles(edges: readonly CausalEdge[]): CausalEdge[] {
  let remaining = [...edges];
  for (;;) {
    const cycle = findCycle(remaining);
    if (!cycle) return remaining;
    let dropIdx = cycle[0]!;
    for (const i of cycle) {
      if (remaining[i]!.confidence < remaining[dropIdx]!.confidence) dropIdx = i;
    }
    remaining = remaining.filter((_, i) => i !== dropIdx);
  }
}

/** Find one directed cycle (node sequence as edge indices), or null. */
function findCycle(edges: readonly CausalEdge[]): number[] | null {
  const adj = new Map<string, number[]>();
  edges.forEach((e, i) => {
    const arr = adj.get(e.from) ?? [];
    arr.push(i);
    adj.set(e.from, arr);
  });
  const state = new Map<string, number>(); // 0=unvisited 1=in-stack 2=done
  const stack: number[] = [];
  const edgeStack: number[] = [];
  let found: number[] | null = null;
  const visit = (node: string): void => {
    if (found) return;
    state.set(node, 1);
    stack.push(0);
    for (const ei of adj.get(node) ?? []) {
      const to = edges[ei]!.to;
      const st = state.get(to) ?? 0;
      if (st === 1) {
        // Cycle: the closing back-edge plus edgeStack from first occurrence of `to`.
        const cyc: number[] = [ei];
        for (let k = edgeStack.length - 1; k >= 0; k--) {
          cyc.push(edgeStack[k]!);
          if (edges[edgeStack[k]!]!.from === to) break;
        }
        found = cyc;
        return;
      }
      if (st === 0) {
        edgeStack.push(ei);
        visit(to);
        edgeStack.pop();
        if (found) return;
      }
    }
    stack.pop();
    state.set(node, 2);
  };
  for (const e of edges) {
    if ((state.get(e.from) ?? 0) === 0) visit(e.from);
    if (found) break;
  }
  return found;
}

/**
 * Moving-block bootstrap resample indices for a series of length n.
 * Returns n indices sampled as blocks of length blockLen (wraps at the end).
 */
export function movingBlockIndices(
  n: number,
  blockLen: number,
  rand: () => number,
): number[] {
  if (n <= 0 || blockLen <= 0) return [];
  const out: number[] = [];
  while (out.length < n) {
    const start = Math.floor(rand() * n);
    for (let k = 0; k < blockLen && out.length < n; k++) {
      out.push((start + k) % n);
    }
  }
  return out;
}

/** Adjacency F1 of estimated edges vs ground-truth edges (direction+lag). */
export function adjacencyF1(
  estimated: readonly CausalEdge[],
  truth: readonly CausalEdge[],
): number {
  const t = new Set(truth.map(edgeKey));
  const e = new Set(estimated.map(edgeKey));
  let tp = 0;
  for (const k of e) if (t.has(k)) tp++;
  const precision = e.size === 0 ? 1 : tp / e.size;
  const recall = t.size === 0 ? 1 : tp / t.size;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/** Contemporaneous-orientation precision (lag-0 edges only). */
export function contemporaneousPrecision(
  estimated: readonly CausalEdge[],
  truth: readonly CausalEdge[],
): number {
  return adjacencyF1(
    estimated.filter((e) => e.lag === 0),
    truth.filter((e) => e.lag === 0),
  );
}
