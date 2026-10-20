/**
 * THE SPEC'S SECTION 4.4: BREAKING HEDGES AUTOMATICALLY.
 *
 * When ID fails, the engine does not merely abort. It executes the
 * Hedge Collector (HCID) and the ID-EnablingEdges algorithm, and then
 * tries to BREAK the hedge with an observed mediator.
 *
 * THREE THINGS THE FIRST VERSION GOT WRONG, ALL MEASURED.
 *
 * 1. IT COLLECTED ONE HEDGE, NOT EVERY HEDGE.
 *
 *    The spec says HCID collects EVERY witnessing ID-hedge pair
 *    (S_i, S_i') blocking identification, and then takes the
 *    INTERSECTION of the candidate edges across all of them:
 *
 *      C = intersection over i of CandidateEdges(S_i, S_i')
 *
 *    The first version returned the hedge it happened to hit first.
 *    A single hedge's candidate edges can suggest a measurement that
 *    would break THAT hedge and leave the others intact, and the
 *    engine would then report a measurement that does not work.
 *
 *    The intersection is the honest answer: an edge that breaks only
 *    one of several hedges is not a measurement that makes the
 *    question answerable.
 *
 * 2. IT NEVER TESTED WHETHER THE MEDIATOR ACTUALLY WORKED.
 *
 *    The spec says the expanded graph G_e must "pass ID(Y, X, P, G_e)
 *    with zero hedges and pass Adversary Review (E-value >= 1.35)"
 *    before the mediator expansion is ACTIVATED. The first version
 *    listed edges and stopped. A listed edge is a hypothesis; an
 *    edge that demonstrably breaks the hedge is a measurement plan.
 *
 *    So this module ACTUALLY EXPANDS the graph with a candidate
 *    mediator and re-runs ID on it.
 *
 * 3. IT DID NOT ENFORCE THE OBSERVABILITY CONSTRAINTS.
 *
 *    The spec requires the mediator M to satisfy:
 *
 *      t_valid(U) <= t_valid(M) <= t_valid(V)   (it is point-in-time)
 *      N_M >= 30                                  (it has enough samples)
 *
 *    A mediator that is not observed at the time of the cause, or
 *    that has 12 observations, cannot break the hedge in practice.
 *    Both constraints are checked here, and a candidate that fails
 *    them is reported as INELIGIBLE rather than silently dropped.
 */
import {
  runShpitserPearlID,
  findIDEnablingEdgesForHedge,
  induceSubgraph,
  type CausalADMG,
  type HedgeWitness,
  type NodeId,
  type IDResult,
} from "./do-calculus-id.js";

/**
 * A signal that could serve as a mediator.
 *
 * The spec's V_reg -- the point-in-time observable signals, from the
 * signal registry (240+ families).
 */
export interface MediatorCandidate {
  /** The signal id, as the registry names it. */
  readonly signalId: string;
  /** The node this signal would occupy in the graph. */
  readonly node: NodeId;
  /**
   * The time the signal becomes valid, as a comparable number.
   *
   * The spec's t_valid. It is a NUMBER here rather than a timestamp
   * because the ordering is what matters -- a mediator must not be
   * observed BEFORE its cause, or it is an ancestor and not a
   * mediator -- and a numeric validity order makes that comparison
   * exact rather than approximate. Lower is earlier.
   */
  readonly tValid: number;
  /** The number of observations available for this signal. */
  readonly sampleCount: number;
  /** The direction the signal is measured on: higher means more of the cause. */
  readonly direction?: "higher" | "lower";
}

/** The spec's minimum sample count for a mediator: N_M >= 30. */
export const MIN_MEDIATOR_SAMPLES = 30;

/** The spec's E-value floor for an activated mediator expansion. */
export const MIN_EXPANSION_E_VALUE = 1.35;

/** One collected hedge and the edges that might break it. */
export interface CollectedHedge {
  readonly witness: HedgeWitness;
  /** The edges whose expansion with a mediator could break THIS hedge. */
  readonly candidateEdges: ReadonlyArray<readonly [NodeId, NodeId]>;
}

/** Why a candidate mediator was not usable. */
export type MediatorRejection =
  | "NOT_A_CANDIDATE_EDGE"
  | "T_VALID_BEFORE_CAUSE"
  | "T_VALID_AFTER_EFFECT"
  | "TOO_FEW_SAMPLES"
  | "EXPANSION_STILL_HEDGED";

/** The result of trying one mediator against one edge. */
export interface MediatorAttempt {
  readonly signalId: string;
  readonly node: NodeId;
  readonly edge: readonly [NodeId, NodeId];
  readonly eligible: boolean;
  readonly rejection: MediatorRejection | null;
  /**
   * True when the expanded graph identifies the effect with ZERO
   * hedges -- the spec's condition for activating the expansion.
   */
  readonly breaksHedge: boolean;
  /** The formula class the expanded graph yields, when it breaks the hedge. */
  readonly formulaClass: string | null;
}

/** The whole HCID + ID-EnablingEdges result. */
export interface HedgeBreakageReport {
  /** EVERY witnessing hedge, not just the first. */
  readonly hedges: readonly CollectedHedge[];
  /**
   * The INTERSECTION of the candidate edges across every hedge.
   *
   * This is the spec's C. It is empty when the hedges have no common
   * edge, and that is the honest answer: no single measurement breaks
   * all of them.
   */
  readonly commonEdges: ReadonlyArray<readonly [NodeId, NodeId]>;
  /** Every attempt made, eligible or not. */
  readonly attempts: readonly MediatorAttempt[];
  /** The attempts that demonstrably break every hedge. */
  readonly activating: readonly MediatorAttempt[];
  /**
   * The attempts that break the hedge but do NOT activate, because
   * the effect fails the adversary review.
   *
   * "This measurement would make the question answerable, but the
   * answer would be fragile" is a materially different statement from
   * "this measurement would make the question answerable", and the
   * reader needs both.
   */
  readonly breaksHedgeButFragile: readonly MediatorAttempt[];
  /** The E-value the activation was judged against. Null when unknown. */
  readonly eValue: number | null;
  /** The floor the E-value was judged against. The spec's is 1.35. */
  readonly minEValue: number;
  /** Whether the E-value passed the floor. */
  readonly eValuePasses: boolean;
}

/**
 * Collect EVERY witnessing hedge for a query.
 *
 * The ID recursion returns the FIRST hedge it meets. This walks the
 * same recursion and gathers all of them, so the candidate-edge
 * intersection is over the real set of blockers.
 *
 * The recursion is re-implemented here rather than refactored out of
 * do-calculus-id.ts for one reason: the ID algorithm's contract is
 * that it returns one result, and changing it to return a SET would
 * change every caller. A separate collector that shares the same
 * primitives (C-components, ancestors, the same line-by-line rules)
 * is additive and cannot break the existing callers.
 */
export function collectIDHedges(
  ySet: ReadonlySet<NodeId>,
  xSet: ReadonlySet<NodeId>,
  g: CausalADMG,
  maxHedges = 64,
): CollectedHedge[] {
  const out: CollectedHedge[] = [];
  const seen = new Set<string>();

  const push = (witness: HedgeWitness) => {
    const key = `${witness.forestFull.slice().sort().join(",")}|${witness.forestSub
      .slice()
      .sort()
      .join(",")}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ witness, candidateEdges: findIDEnablingEdgesForHedge(g, witness) });
  };

  // The collector mirrors idRec's structure. The ONLY difference is
  // that a failure is recorded rather than returned, so the search
  // continues into the sibling branches.
  const rec = (
    y: ReadonlySet<NodeId>,
    x: ReadonlySet<NodeId>,
    graph: CausalADMG,
    depth: number,
  ): void => {
    if (depth > 24 || out.length >= maxHedges) return;
    if (x.size === 0) return;

    // Line 2: prune non-ancestors of Y.
    const anY = ancestorsOf(graph, y);
    if (anY.size < graph.nodes.length) {
      rec(y, intersect(x, anY), induceSubgraph(graph, anY), depth + 1);
      return;
    }

    // Line 3: insert do(w) for the nodes with no path into Y.
    const overX = mutilate(graph, x);
    const anYOverX = ancestorsOf(overX, y);
    const extra = graph.nodes.filter((n) => !x.has(n) && !anYOverX.has(n));
    if (extra.length > 0) {
      rec(y, new Set([...x, ...extra]), graph, depth + 1);
      return;
    }

    // Line 4: factor over the C-components of G[V \ X].
    const vMinusX = new Set(graph.nodes.filter((n) => !x.has(n)));
    const components = cComponents(induceSubgraph(graph, vMinusX));
    if (components.length > 1) {
      for (const component of components) {
        const complement = new Set(graph.nodes.filter((n) => !component.has(n)));
        rec(component, complement, graph, depth + 1);
      }
      return;
    }
    const s = components[0];
    if (s === undefined) return;
    const sSet = new Set<NodeId>(s);

    // Line 5: the hedge.
    const graphComponents = cComponents(graph);
    if (graphComponents.length === 1) {
      push({
        forestFull: [...graph.nodes],
        forestSub: graph.nodes.filter((n) => sSet.has(n)),
      });
      return;
    }

    // Line 6: S is itself a C-component -> identifiable, no hedge.
    if (graphComponents.some((c) => sameSet(new Set(c), sSet))) return;

    // Line 7: recurse into the strictly larger C-component S'.
    const superComponent = graphComponents.find(
      (c) => c.size > sSet.size && [...sSet].every((n) => c.has(n)),
    );
    if (superComponent === undefined) return;
    const xSuper = new Set([...x].filter((n) => superComponent.has(n)));
    rec(y, xSuper, induceSubgraph(graph, superComponent), depth + 1);
  };

  rec(ySet, xSet, g, 0);
  return out;
}

/** The intersection of the candidate edges across every collected hedge. */
/**
 * THE WHOLE THING: HCID, the intersection, and the expansion attempts.
 *
 * This is the spec's section 4.4 end to end:
 *
 *   1. collect EVERY witnessing hedge
 *   2. take the INTERSECTION of their candidate edges
 *   3. for each candidate edge and each registered mediator, check the
 *      observability constraints and then ACTUALLY EXPAND the graph
 *      and re-run ID
 *   4. report the expansions that demonstrably break the hedge
 *
 * The caller decides what to do with the report. The engine's rule
 * (in the gate) is: an expansion is ACTIVATED only when it breaks
 * EVERY hedge and the expanded effect passes the adversary review
 * (E-value >= 1.35). Otherwise the answer stays
 * REFUSED_G3_NON_IDENTIFIABLE_HEDGE, and the report is what tells a
 * human WHICH MEASUREMENT would change the answer.
 */
export function planHedgeBreakage(
  ySet: ReadonlySet<NodeId>,
  xSet: ReadonlySet<NodeId>,
  g: CausalADMG,
  candidates: readonly MediatorCandidate[],
  opts?: {
    /**
     * The E-value of the effect the expansion would estimate.
     *
     * THE SPEC'S SECOND CONDITION. "If the expanded graph G_e passes
     * ID(Y, X, P, G_e) with zero hedges AND passes Adversary Review
     * (E-value >= 1.35), the mediator expansion is activated."
     *
     * Breaking the hedge makes the effect IDENTIFIABLE. It does not
     * make it ROBUST: an identified effect can still be explained away
     * by an unmeasured confounder. The two conditions are independent
     * and BOTH are required.
     *
     * When the E-value is null -- not computed, or undefined because
     * the contrast had no usable rate ratio -- the expansion is NOT
     * activating. A robustness that could not be measured is not a
     * robustness that passed, and treating "unknown" as "fine" is
     * the same defect as a threshold that is exported and never
     * checked.
     */
    readonly eValue?: number | null;
    /** The E-value floor. The spec's is 1.35. */
    readonly minEValue?: number;
  },
): HedgeBreakageReport {
  setMediatorValidityPool(candidates);
  const hedges = collectIDHedges(ySet, xSet, g);
  const commonEdges = intersectCandidateEdges(hedges);

  const attempts: MediatorAttempt[] = [];
  for (const edge of commonEdges) {
    for (const candidate of candidates) {
      attempts.push(tryMediatorExpansion(ySet, xSet, g, edge, candidate));
    }
  }

  // THE ACTIVATION GATE. Both conditions, and both measured.
  //
  //   1. the expanded graph identifies the effect with ZERO HEDGES
  //      (re-run ID on the expanded graph -- a measurement)
  //   2. the effect passes the ADVERSARY REVIEW, i.e. its E-value is
  //      at least the spec's 1.35
  //
  // The E-value is the SAME for every candidate, because it is a
  // property of the effect being estimated and not of which mediator
  // made it identifiable. So it is checked once, here, rather than
  // per attempt.
  const minE = opts?.minEValue ?? MIN_EXPANSION_E_VALUE;
  const eValue = opts?.eValue ?? null;
  const eValuePasses = eValue !== null && eValue >= minE;

  // An expansion that breaks the hedge but cannot pass the adversary
  // review is still REPORTED -- as an attempt that breaks the hedge
  // but is not activating -- because "this measurement would make the
  // question answerable but the answer would be fragile" is a
  // materially different statement from "this measurement would make
  // the question answerable".
  const breaksHedge = attempts.filter((a) => a.eligible && a.breaksHedge);
  const activating = eValuePasses ? breaksHedge : [];

  return {
    hedges,
    commonEdges,
    attempts,
    activating,
    breaksHedgeButFragile: eValuePasses ? [] : breaksHedge,
    eValue,
    minEValue: minE,
    eValuePasses,
  };
}

export function intersectCandidateEdges(
  hedges: readonly CollectedHedge[],
): ReadonlyArray<readonly [NodeId, NodeId]> {
  if (hedges.length === 0) return [];
  const key = (e: readonly [NodeId, NodeId]) => `${e[0]}\u0000${e[1]}`;
  const first = hedges[0]!.candidateEdges;
  const out: Array<readonly [NodeId, NodeId]> = [];
  for (const e of first) {
    // An edge that is a candidate for EVERY hedge breaks every hedge.
    if (hedges.every((h) => h.candidateEdges.some((c) => key(c) === key(e)))) out.push(e);
  }
  return out;
}

/**
 * Try a mediator against a candidate edge: does expanding the graph
 * with it actually break the hedge?
 *
 * The expansion replaces the edge U -> V with U -> M -> V. That is the
 * spec's "expanding a directed edge e = (U -> V) ... with a mediator
 * M that sits causally on edge e = (U -> M -> V)".
 *
 * The result is a NEW graph, and ID is re-run on it. The expansion
 * breaks the hedge when the new graph identifies the effect with ZERO
 * hedges -- the spec's condition.
 */
export function tryMediatorExpansion(
  ySet: ReadonlySet<NodeId>,
  xSet: ReadonlySet<NodeId>,
  g: CausalADMG,
  edge: readonly [NodeId, NodeId],
  candidate: MediatorCandidate,
): MediatorAttempt {
  const base: MediatorAttempt = {
    signalId: candidate.signalId,
    node: candidate.node,
    edge,
    eligible: false,
    rejection: null,
    breaksHedge: false,
    formulaClass: null,
  };

  if (candidate.sampleCount < MIN_MEDIATOR_SAMPLES) {
    return { ...base, rejection: "TOO_FEW_SAMPLES" };
  }

  const expanded = expandWithMediator(g, edge, candidate);
  if (expanded === null) return { ...base, rejection: "NOT_A_CANDIDATE_EDGE" };

  // The mediator must sit BETWEEN the cause and the effect in validity
  // time. A mediator observed before its cause is an ancestor of it,
  // not a mediator; one observed after the effect cannot break a
  // contemporaneous hedge.
  //
  // The cause's and the effect's own validity times come from the
  // SAME pool -- the graph's nodes are signals too, and a signal's
  // t_valid is a property of the signal, not of the edge it sits on.
  // So the pool holds every signal's validity, and the edge's
  // endpoints are looked up in it.
  const tOf = new Map<NodeId, number>();
  for (const c of candidatesForEdge) tOf.set(c.node, c.tValid);
  const tU = tOf.get(edge[0]);
  const tV = tOf.get(edge[1]);
  const tM = candidate.tValid;
  if (tU !== undefined && tM < tU) return { ...base, rejection: "T_VALID_BEFORE_CAUSE" };
  if (tV !== undefined && tM > tV) return { ...base, rejection: "T_VALID_AFTER_EFFECT" };

  const res: IDResult = runShpitserPearlID(ySet, xSet, expanded);
  if (!res.ok) return { ...base, eligible: true, rejection: "EXPANSION_STILL_HEDGED" };
  return {
    ...base,
    eligible: true,
    rejection: null,
    breaksHedge: true,
    formulaClass: res.formulaClass,
  };
}

/**
 * The candidates whose validity times are known, for the t_valid
 * ordering check. Set by the caller before trying attempts; a node
 * with no entry is treated as having no constraint.
 */
let candidatesForEdge: readonly MediatorCandidate[] = [];

/** Set the candidate pool the t_valid check consults. */
export function setMediatorValidityPool(pool: readonly MediatorCandidate[]): void {
  candidatesForEdge = pool;
}

/**
 * Replace the edge U -> V with U -> M -> V.
 *
 * Returns null when the edge is not in the graph, or when the mediator
 * is already a node -- adding a node that is already there would
 * silently change what the graph means.
 */
export function expandWithMediator(
  g: CausalADMG,
  edge: readonly [NodeId, NodeId],
  candidate: MediatorCandidate,
): CausalADMG | null {
  const [u, v] = edge;
  if (!g.directed.some(([a, b]) => a === u && b === v)) return null;
  if (g.nodes.includes(candidate.node)) return null;

  // The mediator goes between U and V in the topological order, which
  // is required: U -> M -> V demands M after U and before V.
  const uIdx = g.nodes.indexOf(u);
  const vIdx = g.nodes.indexOf(v);
  if (uIdx < 0 || vIdx < 0 || uIdx >= vIdx) return null;

  const nodes = [...g.nodes];
  nodes.splice(uIdx + 1, 0, candidate.node);

  const directed: Array<readonly [NodeId, NodeId]> = [];
  for (const [a, b] of g.directed) {
    if (a === u && b === v) {
      directed.push([u, candidate.node]);
      directed.push([candidate.node, v]);
    } else {
      directed.push([a, b]);
    }
  }
  return { nodes, directed, bidirected: [...g.bidirected] };
}

// ---------------------------------------------------------------------------
// The local primitives the collector needs. They mirror the ones in
// do-calculus-id.ts and are re-implemented here so the collector does
// not have to export internals of the ID module.
// ---------------------------------------------------------------------------

function ancestorsOf(g: CausalADMG, targets: ReadonlySet<NodeId>): Set<NodeId> {
  const revAdj = new Map<NodeId, NodeId[]>();
  for (const n of g.nodes) revAdj.set(n, []);
  for (const [u, v] of g.directed) revAdj.get(v)?.push(u);
  const visited = new Set<NodeId>(targets);
  const queue = [...targets];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const p of revAdj.get(cur) ?? []) {
      if (!visited.has(p)) {
        visited.add(p);
        queue.push(p);
      }
    }
  }
  return visited;
}

function mutilate(g: CausalADMG, over: ReadonlySet<NodeId>): CausalADMG {
  return {
    nodes: [...g.nodes],
    directed: g.directed.filter(([u, v]) => !over.has(v)),
    bidirected: g.bidirected.filter(([u, v]) => !over.has(u) && !over.has(v)),
  };
}

/**
 * The maximal C-components of a graph: the connected components under
 * the BIDIRECTED edges only, each returned as a SET so that `.has`
 * and `.size` mean what the call sites expect.
 */
function cComponents(g: CausalADMG): Set<NodeId>[] {
  const biAdj = new Map<NodeId, NodeId[]>();
  for (const n of g.nodes) biAdj.set(n, []);
  for (const [u, v] of g.bidirected) {
    biAdj.get(u)?.push(v);
    biAdj.get(v)?.push(u);
  }
  const visited = new Set<NodeId>();
  const out: Set<NodeId>[] = [];
  for (const n of g.nodes) {
    if (visited.has(n)) continue;
    const comp: NodeId[] = [];
    const queue = [n];
    visited.add(n);
    while (queue.length > 0) {
      const cur = queue.pop()!;
      comp.push(cur);
      for (const nb of biAdj.get(cur) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    out.push(new Set(g.nodes.filter((x) => comp.includes(x))));
  }
  return out;
}

function sameSet(a: ReadonlySet<NodeId>, b: ReadonlySet<NodeId>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function intersect(a: ReadonlySet<NodeId>, b: ReadonlySet<NodeId>): Set<NodeId> {
  return new Set([...a].filter((x) => b.has(x)));
}
