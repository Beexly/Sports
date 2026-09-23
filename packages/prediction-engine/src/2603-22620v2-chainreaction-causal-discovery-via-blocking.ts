/**
 * arXiv:2603.22620v2 — Chain-Reaction Causal Discovery via Blocking Interventions
 *
 * Causal graph discovery for the injury model: NOTEARS-style DAG learning over team-context variables,
 * back-door adjustment sets read off the graph, and a refutation suite (placebo treatment, random common
 * cause, data-subset) that each estimate must pass.
 *
 * Improvement: GSE runs a do(X=0) engine sandbox: the pipeline executes on frozen historical slates with one feature/source blocked at a time, recovering the true dependency DAG (which downstream outputs change) and identifying zero-effect features as pruning candidates.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the sandbox protocol if it recovers all 5 known dependencies with no false negatives AND identifies >=3 features with zero downstream effect; REJECT the tree assumption and allow multi-parent DAG structure.
 */

/** A directed edge in the learned causal graph. */
export interface CausalEdge {
  from: string;
  to: string;
  weight: number;
}

/**
 * Acyclicity score h(W) = tr(exp(W o W)) - d (NOTEARS). Zero iff acyclic.
 * Computed via the power series of the Hadamard square.
 */
export function notearsAcyclicity(W: number[][]): number {
  const d = W.length;
  // M = W o W
  let M = W.map((row, i) => row.map((w, j) => w * (W[i]?.[j] ?? 0)));
  // exp(M) via truncated series; trace - d
  let E: number[][] = M.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
  let P: number[][] = E.map((row) => [...row]);
  let fact = 1;
  for (let k = 1; k <= 12; k++) {
    fact *= k;
    // P = P @ M
    const Pn = P.map((row, i) => row.map((_, j) => {
      let s = 0;
      for (let l = 0; l < d; l++) s += (P[i]?.[l] ?? 0) * (M[l]?.[j] ?? 0);
      return s;
    }));
    P = Pn;
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) E[i]![j] = (E[i]?.[j] ?? 0) + (P[i]?.[j] ?? 0) / fact;
  }
  let tr = 0;
  for (let i = 0; i < d; i++) tr += E[i]?.[i] ?? 0;
  return tr - d;
}

/** Back-door adjustment set: parents of treatment excluding descendants of outcome. */
export function backdoorSet(
  edges: readonly CausalEdge[],
  treatment: string,
  outcome: string,
): string[] {
  const parents = edges.filter((e) => e.to === treatment).map((e) => e.from);
  // Descendants of outcome (simple BFS)
  const desc = new Set<string>();
  const queue = [outcome];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const e of edges) {
      if (e.from === cur && !desc.has(e.to)) {
        desc.add(e.to);
        queue.push(e.to);
      }
    }
  }
  return parents.filter((p) => p !== outcome && !desc.has(p));
}

/** Refutation: placebo estimate must be ~0; subset estimates must agree in sign. */
export function refutationSuite(
  mainEstimate: number,
  placeboEstimate: number,
  subsetEstimates: readonly number[],
  tol = 0.05,
): { placeboOk: boolean; subsetOk: boolean } {
  const placeboOk = Math.abs(placeboEstimate) <= tol;
  const sign = Math.sign(mainEstimate);
  const subsetOk = subsetEstimates.every((e) => Math.sign(e) === sign || Math.abs(e) <= tol);
  return { placeboOk, subsetOk };
}
