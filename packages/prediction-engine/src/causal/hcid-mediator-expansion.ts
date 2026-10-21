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
import { eValue, eValueForCi } from "./e-value.js";

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

/**
 * The spec's CI E-value floor for an activated mediator expansion.
 *
 * The spec's G4 is a CONJUNCTION over TWO numbers: the POINT E-value
 * must clear 1.35, and the CONFIDENCE-INTERVAL E-value must clear
 * 1.10. The CI floor is lower on purpose -- it is a floor on a BOUND,
 * not a central claim -- and the publishable path in
 * literature-retrieval.ts already enforces exactly this conjunction.
 *
 * The expansion path did not have the second number at all, so the
 * conjunction was a single number wearing two hats.
 */
export const MIN_EXPANSION_CI_E_VALUE = 1.10;

/**
 * The minimum observations PER ARM before a residual contrast can be
 * turned into an E-value.
 *
 * The spec's floor is 30. Below it the standard error of the
 * standardized difference is too wide for the CI bound to say
 * anything, and an E-value computed from it would be a number without
 * a meaning.
 */
export const MIN_E_VALUE_ARM_SAMPLES = 30;

/**
 * The VanderWeele & Ding (2017) conversion from a standardized mean
 * difference to an approximate risk ratio.
 *
 * Their Table 2: for a continuous outcome, a standardized difference
 * of d corresponds to an approximate risk ratio of exp(0.91 * d). The
 * E-value is then computed from that ratio by the canonical
 * `eValue()` in e-value.js -- so there is ONE E-value formula in this
 * repository, not two.
 */
export const VD_SD_TO_RR_FACTOR = 0.91;

/** The two-sided 95% normal quantile. */
export const Z_975 = 1.96;

/**
 * What a residual contrast measures.
 *
 * The contrast is a difference in MEANS (the residual scale), and the
 * E-value needs a RATIO. The standardized difference d is the bridge:
 * it is scale-free, and exp(0.91 * d) is the approximate risk ratio
 * that d corresponds to.
 */
export interface ResidualContrastStats {
  readonly treatedMean: number;
  readonly controlMean: number;
  readonly pooledSd: number;
  readonly nTreated: number;
  readonly nControl: number;
  /** The standardized mean difference. */
  readonly standardizedDifference: number;
  /** Its standard error. */
  readonly standardError: number;
  /** The approximate risk ratio the point difference corresponds to. */
  readonly pointRiskRatio: number;
  /** The approximate risk ratio the CI lower bound corresponds to. */
  readonly ciLowerRiskRatio: number;
  /** The E-value of the point estimate. */
  readonly measuredEValue: number | null;
  /** The E-value of the confidence-interval bound closest to the null. */
  readonly measuredCiEValue: number | null;
}

/**
 * MEASURE the E-value of a residual contrast.
 *
 * VanderWeele & Ding (2017), Annals of Internal Medicine 167(4):268-274,
 * Tables 1 and 2: a standardized mean difference d corresponds to an
 * approximate risk ratio of exp(0.91 * d), and the E-value of a risk
 * ratio RR >= 1 is RR + sqrt(RR * (RR - 1)). The E-value of the
 * confidence interval is the E-value of the bound closest to the null.
 *
 * The E-value formulas are NOT re-derived here. They come from
 * `eValue()` and `eValueForCi()` in e-value.js, so the engine has one
 * E-value definition rather than two that can drift apart.
 *
 * Returns null when the contrast cannot support an E-value:
 *
 *   - an arm with fewer than MIN_E_VALUE_ARM_SAMPLES observations.
 *     The standard error of d is then too wide for the CI bound to
 *     mean anything, and an E-value computed from it would be a
 *     number without a meaning.
 *   - a degenerate spread (a pooled SD of zero, or a non-finite one).
 *     The contrast would be a division by zero.
 *
 * A null return is NOT a passed E-value. It is an unmeasured one, and
 * an unmeasured robustness is not a robustness that passed.
 */
export function computeMeasuredEValueFromResiduals(
  treatedResiduals: readonly number[],
  controlResiduals: readonly number[],
): ResidualContrastStats | null {
  const n1 = treatedResiduals.length;
  const n0 = controlResiduals.length;
  if (n1 < MIN_E_VALUE_ARM_SAMPLES || n0 < MIN_E_VALUE_ARM_SAMPLES) {
    return null;
  }
  const mean1 = treatedResiduals.reduce((a, b) => a + b, 0) / n1;
  const mean0 = controlResiduals.reduce((a, b) => a + b, 0) / n0;
  const var1 = treatedResiduals.reduce((acc, v) => acc + (v - mean1) ** 2, 0) / (n1 - 1);
  const var0 = controlResiduals.reduce((acc, v) => acc + (v - mean0) ** 2, 0) / (n0 - 1);
  const pooledSd = Math.sqrt(
    ((n1 - 1) * var1 + (n0 - 1) * var0) / (n1 + n0 - 2),
  );
  if (!Number.isFinite(pooledSd) || pooledSd <= 1e-8) return null;

  const d = Math.abs(mean1 - mean0) / pooledSd;
  const standardError = Math.sqrt(
    (n1 + n0) / (n1 * n0) + (d * d) / (2 * (n1 + n0)),
  );
  const dLower = Math.max(0, d - Z_975 * standardError);
  const rrPoint = Math.exp(VD_SD_TO_RR_FACTOR * d);
  const rrLower = Math.exp(VD_SD_TO_RR_FACTOR * dLower);

  return {
    treatedMean: mean1,
    controlMean: mean0,
    pooledSd,
    nTreated: n1,
    nControl: n0,
    standardizedDifference: d,
    standardError,
    pointRiskRatio: rrPoint,
    ciLowerRiskRatio: rrLower,
    // The canonical formulas. rrPoint >= 1 always (d >= 0), and
    // rrLower >= 1 too, so eValue() never has to invert.
    measuredEValue: eValue(rrPoint),
    measuredCiEValue: eValueForCi(rrLower, rrLower),
  };
}

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
  /**
   * The CI E-value the activation was judged against. Null when
   * unknown.
   *
   * The spec's G4 is a CONJUNCTION over two numbers, so this is not
   * optional decoration: a report that says "the E-value passed"
   * without saying whether the CI bound passed is a report about
   * half the gate.
   */
  readonly ciEValue: number | null;
  /** The floor the CI E-value was judged against. The spec's is 1.10. */
  readonly minCiEValue: number;
  /**
   * Whether BOTH E-values passed their floors.
   *
   * This is the spec's conjunction. When the CI E-value is not
   * supplied, it is treated as NOT PASSED -- a robustness that could
   * not be measured is not a robustness that passed, and treating
   * "unknown" as "fine" is the same defect as a threshold that is
   * exported and never checked.
   */
  readonly eValuePasses: boolean;
  /** Whether the POINT E-value passed its floor. Reported separately. */
  readonly pointEValuePasses: boolean;
  /** Whether the CI E-value passed its floor. Reported separately. */
  readonly ciEValuePasses: boolean;
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
    /**
     * The CI E-value of the effect the expansion would estimate.
     *
     * The spec's G4 is a CONJUNCTION: the point E-value must clear
     * 1.35 AND the CI E-value must clear 1.10. The CI floor is lower
     * on purpose -- it is a floor on a BOUND, not a central claim.
     *
     * When it is null or absent, the conjunction FAILS. The expansion
     * is then reported as breaking the hedge but fragile, which is
     * the honest state: the point estimate is robust but the
     * confidence bound was not measured, so the claim is not
     * publishable.
     */
    readonly ciEValue?: number | null;
    /** The CI E-value floor. The spec's is 1.10. */
    readonly minCiEValue?: number;
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
  const minCiE = opts?.minCiEValue ?? MIN_EXPANSION_CI_E_VALUE;
  const ciEValue = opts?.ciEValue ?? null;

  // THE CONJUNCTION. Both numbers, both floors.
  //
  // The point E-value says "how strong would confounding have to be
  // to explain the POINT estimate away". The CI E-value says the same
  // about the BOUND closest to the null -- and the bound is the
  // honest number, because a point estimate can be far from its own
  // interval.
  //
  // Before this, the expansion path checked the point number alone,
  // so an expansion whose CI bound was nowhere near the null
  // activated as long as its point estimate was far enough from it.
  // The publishable path in literature-retrieval.ts already enforced
  // both; the expansion path did not.
  const pointEValuePasses = eValue !== null && eValue >= minE;
  const ciEValuePasses = ciEValue !== null && ciEValue >= minCiE;
  const eValuePasses = pointEValuePasses && ciEValuePasses;

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
    ciEValue,
    minCiEValue: minCiE,
    eValuePasses,
    pointEValuePasses,
    ciEValuePasses,
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
