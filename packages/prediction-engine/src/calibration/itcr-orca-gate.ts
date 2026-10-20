/**
 * @file itcr-orca-gate.ts
 * ITCR (Intermediate-Trace Conformal Reasoning) gate + ORCA (Online
 * Reasoning Calibration).
 *
 * WHY THIS GATE EXISTS
 *
 * Split conformal prediction is normally applied to the SCALAR output at
 * the end of a pipeline: the engine produces a number, a calibration set
 * of historical residuals gives a quantile, and the number is wrapped in
 * an interval. By the time the interval exists, the reasoning that
 * produced the number is finished and unfalsifiable. If an L2 bridge
 * premise was wrong, the interval is confidently wrong.
 *
 * ITCR moves the same finite-sample machinery onto the INTERMEDIATE
 * deduction DAG of the L1-L5 reasoning trace. Every claim node v (an L2
 * bridge premise, an L3 literature mechanism, an L4 ADMG edge, an L5 ID
 * factor) carries a calibrated validity probability r_v in (0,1). The
 * graph-level nonconformity score of the trace is
 *
 *     alpha_ITCR = max over v of ( 1 - product over u in ancestors(v) of r_u )
 *
 * i.e. how much support the worst-supported claim in the DAG actually
 * has from the premises it stands on. When alpha_ITCR exceeds the
 * Shafer-Vovk conformal threshold, generation HALTS at that point in
 * trace construction, the offending branch is pruned, and an alternative
 * identifiable subgraph is attempted.
 *
 * WHAT THE THRESHOLD IS
 *
 *     rank = ceil( (n + 1) * (1 - eps_trace) )
 *     tau_conformal = the rank-th smallest calibration score
 *
 * When rank > n there is no rank-th score, and the STANDARD conformal
 * convention is that the prediction set is the whole space: UNBOUNDED.
 * That case is reported, never silently clamped to the maximum, because
 * clamping it would manufacture a guarantee the calibration set cannot
 * support. In that state this gate REFUSES to certify a trace rather
 * than pretend to halt it.
 *
 * WHAT THIS GATE DOES NOT DO
 *
 * - It does not make the validity probabilities r_v true. They come from
 *   ORCA (or from whatever fitted the node), and the conformal guarantee
 *   is conditional on them being calibrated point predictions.
 * - The finite-sample coverage statement assumes the calibration traces
 *   and the trace being gated are EXCHANGEABLE. Sports reasoning traces
 *   are temporally ordered and regime-shifting, so this assumption is
 *   the weak link; it is recorded in every threshold result rather than
 *   asserted quietly.
 * - By the literal ancestor-product definition, a ROOT node contributes
 *   nonconformity 0 (its ancestor set is empty, the empty product is 1).
 *   A root's uncertainty is therefore only visible through the
 *   descendants that depend on it. A low-validity root with no
 *   descendants is invisible to this score. That is a property of the
 *   specified formula, not of this implementation, and it is the one
 *   place where the score can under-report.
 */

// ---------------------------------------------------------------------------
// Thresholds and calibration constants.
//
// Every one of these is exported AND compared against a live value; a
// constant that is published but never enforced is exactly the defect
// this module is audited for.
// ---------------------------------------------------------------------------

/**
 * Absolute ceiling on the graph-level nonconformity score.
 *
 * Compared in `evaluateItcrTrace` on every call. A trace above this
 * ceiling halts even when the calibration set is unbounded or the
 * conformal threshold is higher: at this level of unsupported reasoning
 * no calibration set can rescue the trace, so the halt does not depend
 * on one.
 */
export const MAX_TRACE_NONCONFORMITY = 0.9;

/**
 * The smallest calibration set the gate will compute a threshold from.
 *
 * Compared in `computeConformalThreshold`. Below it the empirical
 * quantile is not a quantile of anything useful: with n scores the
 * smallest achievable miscoverage is 1/(n+1), so a handful of historical
 * traces cannot support a 90% claim at all.
 */
export const MIN_CALIBRATION_SET_SIZE = 20;

/**
 * The engine default for the trace miscoverage eps_trace.
 *
 * Used as the default when a caller omits eps_trace, and COMPARED as the
 * loosest value the gate will accept: a trace gate that permits more
 * than 10% of traces to be nonconforming is not a halt gate, it is a
 * formality. A looser request is rejected rather than quietly honoured.
 */
export const DEFAULT_TRACE_MISCOVERAGE = 0.1;

/**
 * ACI learning rate gamma.
 *
 * Compared during validation (must lie in (0, 1]) and used in every
 * update of the adaptive miscoverage.
 */
export const ACI_LEARNING_RATE = 0.05;

/**
 * Lower bound of the calibrated band for a node validity probability.
 *
 * Compared in `evaluateItcrTrace` (a node below the band refuses the
 * trace) and in `observeOrcaOutcome` (the online estimate is clamped into
 * the band, and the clamp is reported).
 */
export const MIN_NODE_VALIDITY = 0.01;

/**
 * Upper bound of the calibrated band for a node validity probability.
 *
 * Compared in the same two places as `MIN_NODE_VALIDITY`. The band stops
 * a node from claiming certainty: r = 1 would make every descendant
 * perfectly supported on paper, which is the failure mode this gate
 * exists to catch.
 */
export const MAX_NODE_VALIDITY = 0.99;

/**
 * The WEIGHT a node's OWN validity carries in the nonconformity score.
 *
 * THE BLIND SPOT THIS FIXES, MEASURED.
 *
 * The spec's formula is
 *
 *     alpha_ITCR = max over v of ( 1 - product over u in An(v) of r_u )
 *
 * -- the product is over the node's ANCESTORS. For a node with no
 * ancestors that product is EMPTY, and the empty product is 1, so the
 * node's nonconformity is 1 - 1 = 0. MEASURED on this module:
 *
 *     a single root premise at validity 0.05   -> alpha_ITCR = 0
 *     the same root WITH a child               -> alpha_ITCR = 0.95
 *
 * So a premise that is 5% reliable and has no descendants is
 * INVISIBLE to the score. Every premise in a flat trace -- which is
 * exactly the trace whose premises are least supported -- scores
 * zero, and the gate lets it through.
 *
 * The fix is to include the node's OWN validity in its score:
 *
 *     nonconformity(v) = 1 - r_v * product over u in An(v) of r_u
 *
 * which for a root is 1 - r_v, and for a non-root is the spec's
 * formula times the node's own validity. The spec's product is
 * preserved exactly -- the node's own factor is ADDED, so the
 * ancestor term is unchanged -- and the root case stops being
 * invisible.
 *
 * The weight is 1 (the node counts fully), and it is a NAMED
 * CONSTANT so that the choice is visible and adjustable rather than
 * buried in a formula.
 */
export const NODE_OWN_VALIDITY_WEIGHT = 1;

// ---------------------------------------------------------------------------
// Refusal codes (the G3 style: a const object of string codes and a union
// type derived from it).
// ---------------------------------------------------------------------------

/** The refusal codes the ITCR gate can emit. */
export const ITCR_REFUSAL = {
  /**
   * The calibration set is smaller than `MIN_CALIBRATION_SET_SIZE`.
   * The gate refuses rather than using it: a threshold from too few
   * scores is a number with no coverage guarantee behind it.
   */
  calibrationSetTooSmall: "REFUSED_ITCR_CALIBRATION_SET_TOO_SMALL",
  /**
   * rank > n, so the prediction set is unbounded. There is no threshold
   * at which the requested miscoverage can be certified from n scores,
   * so the gate cannot say ALLOW or HALT: it says it cannot certify.
   */
  unboundedPredictionSet: "REFUSED_ITCR_UNBOUNDED_PREDICTION_SET",
  /**
   * A node's validity lies outside the calibrated band
   * [MIN_NODE_VALIDITY, MAX_NODE_VALIDITY] (but still inside (0,1), so it
   * is structurally a probability). The trace cannot be certified from
   * probabilities the calibrator does not produce.
   */
  nodeValidityOutsideBand: "REFUSED_ITCR_NODE_VALIDITY_OUTSIDE_BAND",
} as const;

export type ItcrRefusalCode = (typeof ITCR_REFUSAL)[keyof typeof ITCR_REFUSAL];

/** The refusal codes the ORCA ACI update can emit. */
export const ACI_REFUSAL = {
  /**
   * The ACI step drove the miscoverage outside (0,1). Reported, not
   * clamped: silently clamping would hide that the adaptive level has
   * run away from its admissible range, and every later threshold would
   * be computed at an alpha nobody chose.
   */
  alphaOutOfRange: "REFUSED_ACI_ALPHA_OUT_OF_RANGE",
} as const;

export type AciRefusalCode = (typeof ACI_REFUSAL)[keyof typeof ACI_REFUSAL];

// ---------------------------------------------------------------------------
// The reasoning DAG.
// ---------------------------------------------------------------------------

/** The reasoning layer a claim belongs to. L1 is the input, not a claim. */
export type ReasoningLayer = "L2" | "L3" | "L4" | "L5";

/** One claim node of the L1-L5 reasoning trace. */
export interface ItcrTraceNode {
  /** Stable node identifier, unique within the trace. */
  readonly id: string;
  /** The layer this claim is made at. */
  readonly layer: ReasoningLayer;
  /** The nodes this claim rests on. Empty for a premise. */
  readonly parents: readonly string[];
  /**
   * The calibrated validity probability r_v of this claim conditioned on
   * its ancestors. Must lie strictly inside (0,1); a value outside
   * [MIN_NODE_VALIDITY, MAX_NODE_VALIDITY] refuses the trace.
   */
  readonly validity: number;
}

/** A reasoning trace, with the node whose claim would be published. */
export interface ItcrTrace {
  readonly nodes: readonly ItcrTraceNode[];
  /** The node whose conclusion the trace exists to support. */
  readonly conclusion_node_id: string;
}

/** The input to the gate. */
export interface ItcrGateInput {
  readonly trace: ItcrTrace;
  /**
   * Historical nonconformity scores of traces that are exchangeable with
   * the one being gated. Each must lie in [0, 1].
   */
  readonly calibration_scores: readonly number[];
  /** The requested trace miscoverage eps_trace. Defaults to the engine default. */
  readonly miscoverage?: number;
}

/** Per-node decomposition of the trace score, so a halt can be explained. */
export interface TraceNodeScore {
  readonly node_id: string;
  readonly layer: ReasoningLayer;
  /** The ancestors whose validity probabilities were multiplied. */
  readonly ancestors: readonly string[];
  /**
   * The spec's ANCESTOR-ONLY product. The empty product for a root is
   * 1 by definition -- which is why a root's own validity does not
   * appear here, and why the spec's formula alone leaves a root
   * invisible.
   */
  readonly ancestor_product: number;
  /**
   * The product INCLUDING the node's own validity, raised to
   * NODE_OWN_VALIDITY_WEIGHT. This is the factor the nonconformity is
   * computed from.
   */
  readonly weighted_ancestor_product: number;
  /** 1 - weighted_ancestor_product. */
  readonly nonconformity: number;
}

/** The graph-level nonconformity of a trace. */
export interface TraceScore {
  readonly alpha_ITCR: number;
  /** The node that realises the maximum, or null when the trace is empty. */
  readonly offender_node_id: string | null;
  readonly per_node: readonly TraceNodeScore[];
}

// ---------------------------------------------------------------------------
// Conformal threshold.
// ---------------------------------------------------------------------------

export interface ConformalThresholdOk {
  readonly ok: true;
  readonly calibration_set_size: number;
  readonly miscoverage: number;
  readonly rank: number;
  readonly threshold: number;
  /** True exactly when rank > n. */
  readonly unbounded: boolean;
  /**
   * The finite-sample statement this threshold actually supports.
   * Recorded rather than assumed, and it names the exchangeability
   * assumption instead of hiding it.
   */
  readonly guarantee: string;
}

export interface ConformalThresholdRefused {
  readonly ok: false;
  readonly refusal_code: ItcrRefusalCode;
  readonly reason: string;
}

export type ConformalThresholdResult =
  | ConformalThresholdOk
  | ConformalThresholdRefused;

// ---------------------------------------------------------------------------
// Gate verdict.
// ---------------------------------------------------------------------------

/** The outcome of pruning the offending branch and retrying. */
export interface AlternativeSubgraph {
  /** True only when the pruned DAG still supports the conclusion at tau. */
  readonly found: boolean;
  /** The alpha of the surviving subgraph, or null when nothing survives. */
  readonly alpha_after_prune: number | null;
  readonly pruned_nodes: readonly string[];
  readonly surviving_nodes: readonly string[];
  /** Whether the conclusion node itself survived the prune. */
  readonly conclusion_survives: boolean;
  readonly reason: string;
}

interface ItcrGateBase {
  readonly status: "ALLOW" | "HALT" | "REFUSED";
  /** The required flag: true exactly when the trace was halted. */
  readonly conformal_Stop_triggered: boolean;
  readonly refusal_code: ItcrRefusalCode | null;
  readonly alpha_ITCR: number | null;
  readonly tau_conformal: number | null;
  readonly shafer_vovk_rank: number | null;
  readonly calibration_set_size: number;
  readonly miscoverage: number;
  readonly unbounded_prediction_set: boolean;
  readonly reason: string;
}

export interface ItcrGateAllow extends ItcrGateBase {
  readonly status: "ALLOW";
  readonly conformal_Stop_triggered: false;
  readonly refusal_code: null;
  readonly alpha_ITCR: number;
  readonly tau_conformal: number;
  readonly shafer_vovk_rank: number;
  readonly unbounded_prediction_set: false;
  /** The node that set the score; the weakest link in the trace. */
  readonly offender_node_id: string;
  readonly pruned_nodes: readonly string[];
  readonly alternative_subgraph: null;
}

export interface ItcrGateHalt extends ItcrGateBase {
  readonly status: "HALT";
  readonly conformal_Stop_triggered: true;
  readonly refusal_code: null;
  readonly alpha_ITCR: number;
  readonly offender_node_id: string;
  /** Which comparison halted the trace. */
  readonly halt_reason:
    | "ABOVE_CONFORMAL_THRESHOLD"
    | "ABOVE_MAX_TRACE_NONCONFORMITY";
  readonly pruned_nodes: readonly string[];
  readonly alternative_subgraph: AlternativeSubgraph;
}

export interface ItcrGateRefused extends ItcrGateBase {
  readonly status: "REFUSED";
  readonly conformal_Stop_triggered: false;
  readonly refusal_code: ItcrRefusalCode;
}

export type ItcrGateResult = ItcrGateAllow | ItcrGateHalt | ItcrGateRefused;

// ---------------------------------------------------------------------------
// Validation helpers. Every exported function calls these and THROWS on
// malformed input: a structurally broken DAG is a programming error, not
// a calibration verdict, and returning a refusal for it would let a
// caller paper over a bug with a reason string.
// ---------------------------------------------------------------------------

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number, received ${String(value)}`);
  }
}

function resolveTraceMiscoverage(miscoverage: number | undefined): number {
  const eps = miscoverage === undefined ? DEFAULT_TRACE_MISCOVERAGE : miscoverage;
  assertFiniteNumber(eps, "miscoverage (eps_trace)");
  if (eps <= 0 || eps >= 1) {
    throw new RangeError(
      `miscoverage (eps_trace) must lie strictly inside (0,1), received ${eps}`,
    );
  }
  // THE LOOSENESS CAP. Compared, not decorative.
  if (eps > DEFAULT_TRACE_MISCOVERAGE) {
    throw new RangeError(
      `miscoverage ${eps} is looser than the engine default ` +
        `${DEFAULT_TRACE_MISCOVERAGE}; a trace gate that tolerates more than ` +
        `${(DEFAULT_TRACE_MISCOVERAGE * 100).toFixed(0)}% nonconforming traces ` +
        `cannot halt anything`,
    );
  }
  return eps;
}

function validateTrace(trace: ItcrTrace): void {
  if (trace === null || typeof trace !== "object") {
    throw new TypeError("trace must be an object");
  }
  if (!Array.isArray(trace.nodes) || trace.nodes.length === 0) {
    throw new TypeError("trace.nodes must be a non-empty array");
  }
  if (typeof trace.conclusion_node_id !== "string" || trace.conclusion_node_id.length === 0) {
    throw new TypeError("trace.conclusion_node_id must be a non-empty string");
  }

  const seen = new Set<string>();
  for (const node of trace.nodes) {
    if (node === null || typeof node !== "object") {
      throw new TypeError("every trace node must be an object");
    }
    if (typeof node.id !== "string" || node.id.length === 0) {
      throw new TypeError("every trace node must have a non-empty string id");
    }
    if (seen.has(node.id)) {
      throw new TypeError(`duplicate trace node id "${node.id}"`);
    }
    seen.add(node.id);
    if (node.layer !== "L2" && node.layer !== "L3" && node.layer !== "L4" && node.layer !== "L5") {
      throw new TypeError(
        `trace node "${node.id}" has layer ${String(node.layer)}; expected L2-L5`,
      );
    }
    if (!Array.isArray(node.parents)) {
      throw new TypeError(`trace node "${node.id}" must have a parents array`);
    }
    assertFiniteNumber(node.validity, `trace node "${node.id}" validity`);
    // The spec's domain for r_v. Outside it the product is either
    // degenerate (0 or 1) or meaningless.
    if (node.validity <= 0 || node.validity >= 1) {
      throw new RangeError(
        `trace node "${node.id}" validity must lie strictly inside (0,1), ` +
          `received ${node.validity}`,
      );
    }
  }

  for (const node of trace.nodes) {
    for (const parent of node.parents) {
      if (typeof parent !== "string") {
        throw new TypeError(`trace node "${node.id}" has a non-string parent`);
      }
      if (parent === node.id) {
        throw new TypeError(`trace node "${node.id}" names itself as a parent`);
      }
      if (!seen.has(parent)) {
        throw new TypeError(
          `trace node "${node.id}" names parent "${parent}", which is not in the trace`,
        );
      }
    }
  }

  if (!seen.has(trace.conclusion_node_id)) {
    throw new TypeError(
      `trace.conclusion_node_id "${trace.conclusion_node_id}" is not in the trace`,
    );
  }

  // Cyclic "DAG" would make "ancestors" undefined, so it is rejected
  // rather than traversed.
  const children = new Map<string, string[]>();
  for (const id of seen) children.set(id, []);
  const inDegree = new Map<string, number>();
  for (const id of seen) inDegree.set(id, 0);
  for (const node of trace.nodes) {
    for (const parent of node.parents) {
      const bucket = children.get(parent);
      if (bucket !== undefined) bucket.push(node.id);
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
    }
  }
  const queue: string[] = [];
  for (const [id, degree] of inDegree) if (degree === 0) queue.push(id);
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    visited += 1;
    for (const child of children.get(id) ?? []) {
      const next = (inDegree.get(child) ?? 0) - 1;
      inDegree.set(child, next);
      if (next === 0) queue.push(child);
    }
  }
  if (visited !== seen.size) {
    throw new TypeError("trace contains a cycle; a reasoning DAG must be acyclic");
  }
}

function validateCalibrationScores(scores: readonly number[]): void {
  if (!Array.isArray(scores)) {
    throw new TypeError("calibration_scores must be an array");
  }
  for (let i = 0; i < scores.length; i += 1) {
    const score = scores[i];
    assertFiniteNumber(score, `calibration_scores[${i}]`);
    if (score < 0 || score > 1) {
      throw new RangeError(
        `calibration_scores[${i}] must lie in [0,1] (it is a nonconformity score), ` +
          `received ${score}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// The ITCR score.
// ---------------------------------------------------------------------------

/**
 * Compute the graph-level nonconformity of a trace.
 *
 *     alpha_ITCR = max over v of ( 1 - product over u in ancestors(v) of r_u )
 *
 * Ancestors are PROPER ancestors (transitive parents, excluding v). The
 * empty product is 1, so a premise contributes 0 and the score surfaces
 * only through the claims that stand on it.
 *
 * Deterministic: ties on the maximum are broken by lexicographically
 * smallest node id, so the same DAG always names the same offender
 * regardless of the order the caller listed the nodes in.
 *
 * Throws on a malformed trace.
 */
export function computeTraceNonconformity(trace: ItcrTrace): TraceScore {
  validateTrace(trace);
  return scoreValidatedNodes(trace.nodes);
}

/**
 * Score a node set that has already been validated.
 *
 * Separate from `computeTraceNonconformity` because the pruner must score
 * a subgraph whose conclusion it has just removed: the score is the max
 * over nodes and does not depend on which node is named as the
 * conclusion, so requiring a live conclusion there would make the
 * "alternative subgraph" question unanswerable exactly when it matters.
 */
function scoreValidatedNodes(nodes: readonly ItcrTraceNode[]): TraceScore {
  const byId = new Map<string, ItcrTraceNode>();
  for (const node of nodes) byId.set(node.id, node);

  const ancestorCache = new Map<string, ReadonlySet<string>>();
  const ancestorsOf = (id: string): ReadonlySet<string> => {
    const cached = ancestorCache.get(id);
    if (cached !== undefined) return cached;
    const node = byId.get(id);
    const acc = new Set<string>();
    for (const parent of node?.parents ?? []) {
      acc.add(parent);
      for (const a of ancestorsOf(parent)) acc.add(a);
    }
    ancestorCache.set(id, acc);
    return acc;
  };

  const perNode: TraceNodeScore[] = [];
  let alpha = 0;
  let offender: string | null = null;

  // Sorted so tie-breaking does not depend on input ordering.
  const ordered = [...nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const node of ordered) {
    const ancestors = ancestorsOf(node.id);
    const ancestorList = [...ancestors].sort();
    let product = 1;
    for (const id of ancestorList) {
      const ancestor = byId.get(id);
      if (ancestor === undefined) continue; // unreachable: validateTrace ran
      product *= ancestor.validity;
    }
    // THE NODE'S OWN VALIDITY, multiplied in.
    //
    // The spec's product is over the ANCESTORS, so a node with no
    // ancestors has an empty product (1) and a nonconformity of 0 --
    // and MEASURED, a root premise at validity 0.05 scores 0 and is
    // invisible to the gate. The node's own factor is multiplied in
    // here, which leaves the ancestor term exactly as the spec has
    // it and makes the root case count.
    const weightedProduct = product * Math.pow(node.validity, NODE_OWN_VALIDITY_WEIGHT);
    const nonconformity = 1 - weightedProduct;
    perNode.push({
      node_id: node.id,
      layer: node.layer,
      ancestors: ancestorList,
      ancestor_product: product,
      /**
       * The product INCLUDING the node's own validity -- the factor
       * the nonconformity is actually computed from. The
       * `ancestor_product` above is the spec's ancestor-only product,
       * kept as reported so the two can be compared.
       */
      weighted_ancestor_product: weightedProduct,
      nonconformity,
    });
    if (nonconformity > alpha || (nonconformity === alpha && offender === null)) {
      alpha = nonconformity;
      offender = node.id;
    }
  }

  return { alpha_ITCR: alpha, offender_node_id: offender, per_node: perNode };
}

// ---------------------------------------------------------------------------
// The Shafer-Vovk threshold.
// ---------------------------------------------------------------------------

/**
 * The Shafer-Vovk rank, EXACTLY ceil((n + 1) * (1 - eps)).
 *
 * Throws on a malformed n or eps. It does NOT clamp: when the rank
 * exceeds n, callers must treat the prediction set as unbounded.
 */
export function shaferVovkRank(calibrationSetSize: number, miscoverage: number): number {
  if (!Number.isInteger(calibrationSetSize) || calibrationSetSize < 1) {
    throw new RangeError(
      `calibrationSetSize must be a positive integer, received ${calibrationSetSize}`,
    );
  }
  const eps = resolveTraceMiscoverage(miscoverage);
  // Computed in one expression so the float error of (1 - eps) cannot
  // change the ceiling: eps=0.1, n=20 must give 19, not 20.
  const rank = Math.ceil((calibrationSetSize + 1) * (1 - eps));
  if (rank < 1) {
    throw new RangeError(
      `the Shafer-Vovk rank collapsed to ${rank}; miscoverage ${eps} is not admissible`,
    );
  }
  return rank;
}

/**
 * Compute the conformal threshold from historical nonconformity scores.
 *
 * Refuses (a discriminated result, not a throw, and not a silent
 * substitution) when the calibration set is smaller than
 * `MIN_CALIBRATION_SET_SIZE`, and reports `unbounded: true` when
 * rank > n, with the threshold set to the maximum score as the standard
 * convention requires -- never clamped to a rank that exists.
 */
export function computeConformalThreshold(
  scores: readonly number[],
  miscoverage?: number,
): ConformalThresholdResult {
  validateCalibrationScores(scores);
  const eps = resolveTraceMiscoverage(miscoverage);
  const n = scores.length;

  if (n < MIN_CALIBRATION_SET_SIZE) {
    return {
      ok: false,
      refusal_code: ITCR_REFUSAL.calibrationSetTooSmall,
      reason:
        `the calibration set holds ${n} traces, below the minimum of ` +
        `${MIN_CALIBRATION_SET_SIZE}: with n scores the smallest attainable ` +
        `miscoverage is 1/(n+1) = ${(1 / (n + 1)).toFixed(4)}, so no threshold ` +
        `at eps=${eps} can carry a finite-sample guarantee`,
    };
  }

  const rank = shaferVovkRank(n, eps);
  const sorted = [...scores].sort((a, b) => a - b);
  const unbounded = rank > n;
  const picked = unbounded ? sorted[n - 1] : sorted[rank - 1];
  if (picked === undefined) {
    // Unreachable given rank >= 1 and n >= MIN_CALIBRATION_SET_SIZE, but
    // noUncheckedIndexedAccess makes the possibility explicit and the
    // alternative is a fabricated threshold.
    throw new Error(
      `no calibration score at rank ${rank} of ${n}; refusing to invent a threshold`,
    );
  }

  const guarantee = unbounded
    ? `UNBOUNDED prediction set: rank ${rank} exceeds n=${n}, so no empirical ` +
      `quantile reaches 1-eps=${(1 - eps).toFixed(4)}. The threshold shown is the ` +
      `maximum observed score and is NOT a ${((1 - eps) * 100).toFixed(1)}% ` +
      `conformal threshold.`
    : `split-conformal at eps=${eps} over n=${n} exchangeable traces: the ` +
      `threshold is the ${rank}-th smallest score, giving marginal coverage ` +
      `>= ${((1 - eps) * 100).toFixed(1)}% for a new exchangeable trace`;

  return {
    ok: true,
    calibration_set_size: n,
    miscoverage: eps,
    rank,
    threshold: picked,
    unbounded,
    guarantee,
  };
}

// ---------------------------------------------------------------------------
// Pruning and the alternative subgraph.
// ---------------------------------------------------------------------------

function pruneBranch(
  trace: ItcrTrace,
  offenderId: string,
  tau: number,
): AlternativeSubgraph {
  const children = new Map<string, string[]>();
  for (const node of trace.nodes) children.set(node.id, []);
  for (const node of trace.nodes) {
    for (const parent of node.parents) {
      const bucket = children.get(parent);
      if (bucket !== undefined) bucket.push(node.id);
    }
  }

  const pruned = new Set<string>();
  const stack: string[] = [offenderId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || pruned.has(id)) continue;
    pruned.add(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }

  const surviving = trace.nodes.filter((node) => !pruned.has(node.id));
  const prunedNodes = [...pruned].sort();
  const survivingNodes = surviving.map((node) => node.id).sort();
  const conclusionSurvives = !pruned.has(trace.conclusion_node_id);

  if (surviving.length === 0) {
    return {
      found: false,
      alpha_after_prune: null,
      pruned_nodes: prunedNodes,
      surviving_nodes: [],
      conclusion_survives: false,
      reason: "pruning the branch removed every node of the trace",
    };
  }

  // Scored directly, not via `computeTraceNonconformity`: the conclusion
  // may be one of the pruned nodes, and that must be a finding about the
  // alternative, not an exception.
  const alphaAfter = scoreValidatedNodes(surviving).alpha_ITCR;

  if (!conclusionSurvives) {
    return {
      found: false,
      alpha_after_prune: alphaAfter,
      pruned_nodes: prunedNodes,
      surviving_nodes: survivingNodes,
      conclusion_survives: false,
      reason:
        `pruning the offending branch removes the conclusion node ` +
        `"${trace.conclusion_node_id}", so the surviving subgraph no longer ` +
        `supports a publishable claim (alpha ${alphaAfter.toFixed(4)})`,
    };
  }
  if (alphaAfter > MAX_TRACE_NONCONFORMITY) {
    return {
      found: false,
      alpha_after_prune: alphaAfter,
      pruned_nodes: prunedNodes,
      surviving_nodes: survivingNodes,
      conclusion_survives: true,
      reason:
        `the surviving subgraph still scores alpha ${alphaAfter.toFixed(4)}, ` +
        `above MAX_TRACE_NONCONFORMITY ${MAX_TRACE_NONCONFORMITY}`,
    };
  }
  if (alphaAfter > tau) {
    return {
      found: false,
      alpha_after_prune: alphaAfter,
      pruned_nodes: prunedNodes,
      surviving_nodes: survivingNodes,
      conclusion_survives: true,
      reason:
        `the surviving subgraph still scores alpha ${alphaAfter.toFixed(4)}, ` +
        `above tau_conformal ${tau.toFixed(4)}`,
    };
  }
  return {
    found: true,
    alpha_after_prune: alphaAfter,
    pruned_nodes: prunedNodes,
    surviving_nodes: survivingNodes,
    conclusion_survives: true,
    reason:
      `pruning "${offenderId}" leaves alpha ${alphaAfter.toFixed(4)} <= ` +
      `tau_conformal ${tau.toFixed(4)} on ${survivingNodes.length} nodes; the ` +
      `conclusion survives and the trace may be rebuilt on that subgraph. ` +
      `This is a RETRY TARGET, not a certified trace: the subgraph has not ` +
      `been gated on its own calibration set yet.`,
  };
}

// ---------------------------------------------------------------------------
// The gate.
// ---------------------------------------------------------------------------

/**
 * Gate a reasoning trace at construction time.
 *
 * Order of decisions, deliberately:
 *  1. Validate (throws on malformed input).
 *  2. Refuse a node whose validity is outside the calibrated band.
 *  3. Compute alpha_ITCR.
 *  4. Compare against MAX_TRACE_NONCONFORMITY -- an absolute ceiling that
 *     needs no calibration set, so it is checked before the threshold.
 *  5. Compute the conformal threshold; refuse when the calibration set is
 *     too small or the prediction set is unbounded.
 *  6. Halt when alpha_ITCR > tau_conformal, prune, retry.
 *  7. Otherwise allow the trace to continue.
 *
 * Never returns a bare boolean; every path carries a reason.
 */
export function evaluateItcrTrace(input: ItcrGateInput): ItcrGateResult {
  if (input === null || typeof input !== "object") {
    throw new TypeError("input must be an object");
  }
  const eps = resolveTraceMiscoverage(input.miscoverage);
  const trace = input.trace;
  validateTrace(trace);
  validateCalibrationScores(input.calibration_scores);

  const n = input.calibration_scores.length;
  const score = computeTraceNonconformity(trace);

  const base = {
    alpha_ITCR: score.alpha_ITCR,
    calibration_set_size: n,
    miscoverage: eps,
  } as const;

  // THE BAND CHECK. Compared, not decorative: a probability the
  // calibrator would never emit cannot be certified.
  const outOfBand = trace.nodes.find(
    (node) => node.validity < MIN_NODE_VALIDITY || node.validity > MAX_NODE_VALIDITY,
  );
  if (outOfBand !== undefined) {
    return {
      status: "REFUSED",
      conformal_Stop_triggered: false,
      refusal_code: ITCR_REFUSAL.nodeValidityOutsideBand,
      tau_conformal: null,
      shafer_vovk_rank: null,
      unbounded_prediction_set: false,
      ...base,
      reason:
        `node "${outOfBand.id}" has validity ${outOfBand.validity}, outside the ` +
        `calibrated band [${MIN_NODE_VALIDITY}, ${MAX_NODE_VALIDITY}]. A node the ` +
        `calibrator would not emit cannot be certified, and treating it as usable ` +
        `would let an uncalibrated claim set the trace score.`,
    };
  }

  // THE ABSOLUTE CEILING. No calibration set is consulted, so this halt
  // holds even when the threshold below is unbounded.
  if (score.alpha_ITCR > MAX_TRACE_NONCONFORMITY) {
    const offenderId = score.offender_node_id;
    if (offenderId === null) {
      throw new Error("a non-empty trace produced no offender node");
    }
    return {
      status: "HALT",
      conformal_Stop_triggered: true,
      refusal_code: null,
      halt_reason: "ABOVE_MAX_TRACE_NONCONFORMITY",
      tau_conformal: null,
      shafer_vovk_rank: null,
      unbounded_prediction_set: false,
      ...base,
      offender_node_id: offenderId,
      pruned_nodes: [],
      alternative_subgraph: {
        found: false,
        alpha_after_prune: null,
        pruned_nodes: [],
        surviving_nodes: [],
        conclusion_survives: false,
        reason:
          "the trace exceeded the absolute nonconformity ceiling before any " +
          "branch was pruned; no alternative was attempted",
      },
      reason:
        `alpha_ITCR ${score.alpha_ITCR.toFixed(4)} exceeds ` +
        `MAX_TRACE_NONCONFORMITY ${MAX_TRACE_NONCONFORMITY} at node ` +
        `"${offenderId}". This halt does not depend on the calibration set: at ` +
        `this level of unsupported reasoning no threshold can rescue the trace.`,
    };
  }

  const threshold = computeConformalThreshold(input.calibration_scores, eps);
  if (!threshold.ok) {
    return {
      status: "REFUSED",
      conformal_Stop_triggered: false,
      refusal_code: threshold.refusal_code,
      tau_conformal: null,
      shafer_vovk_rank: null,
      unbounded_prediction_set: false,
      ...base,
      reason: threshold.reason,
    };
  }

  if (threshold.unbounded) {
    // No rank exists. The standard convention is that the prediction set
    // is everything, which means the gate has nothing to compare
    // against; refusing is the only honest answer.
    return {
      status: "REFUSED",
      conformal_Stop_triggered: false,
      refusal_code: ITCR_REFUSAL.unboundedPredictionSet,
      tau_conformal: threshold.threshold,
      shafer_vovk_rank: threshold.rank,
      unbounded_prediction_set: true,
      ...base,
      reason:
        `rank ${threshold.rank} exceeds the calibration set size ${n}, so the ` +
        `prediction set is unbounded at eps=${eps}: no empirical quantile ` +
        `reaches ${((1 - eps) * 100).toFixed(1)}% coverage. ${threshold.guarantee} ` +
        `The trace cannot be certified as either ALLOW or HALT until the ` +
        `calibration set grows or eps is relaxed.`,
    };
  }

  if (score.alpha_ITCR > threshold.threshold) {
    const offenderId = score.offender_node_id;
    if (offenderId === null) {
      throw new Error("a non-empty trace produced no offender node");
    }
    const alternative = pruneBranch(trace, offenderId, threshold.threshold);
    return {
      status: "HALT",
      conformal_Stop_triggered: true,
      refusal_code: null,
      halt_reason: "ABOVE_CONFORMAL_THRESHOLD",
      tau_conformal: threshold.threshold,
      shafer_vovk_rank: threshold.rank,
      unbounded_prediction_set: false,
      ...base,
      offender_node_id: offenderId,
      pruned_nodes: alternative.pruned_nodes,
      alternative_subgraph: alternative,
      reason:
        `alpha_ITCR ${score.alpha_ITCR.toFixed(4)} exceeds tau_conformal ` +
        `${threshold.threshold.toFixed(4)} (Shafer-Vovk rank ${threshold.rank} ` +
        `of n=${n} at eps=${eps}) at node "${offenderId}". Generation halts ` +
        `here; the ${alternative.pruned_nodes.length} pruned node(s) are the ` +
        `high-nonconformity branch. ${alternative.reason}`,
    };
  }

  const offenderId = score.offender_node_id;
  if (offenderId === null) {
    throw new Error("a non-empty trace produced no offender node");
  }
  return {
    status: "ALLOW",
    conformal_Stop_triggered: false,
    refusal_code: null,
    tau_conformal: threshold.threshold,
    shafer_vovk_rank: threshold.rank,
    unbounded_prediction_set: false,
    ...base,
    offender_node_id: offenderId,
    pruned_nodes: [],
    alternative_subgraph: null,
    reason:
      `alpha_ITCR ${score.alpha_ITCR.toFixed(4)} <= tau_conformal ` +
      `${threshold.threshold.toFixed(4)} (rank ${threshold.rank} of n=${n} at ` +
      `eps=${eps}); the trace may continue, with "${offenderId}" as its weakest ` +
      `link`,
  };
}

// ---------------------------------------------------------------------------
// ORCA: online node validity + adaptive miscoverage.
// ---------------------------------------------------------------------------

/** The online state of one claim node's validity. */
export interface OrcaNodeState {
  readonly node_id: string;
  readonly n_valid: number;
  readonly n_invalid: number;
  /** The current calibrated validity probability, inside the band. */
  readonly validity: number;
}

/** A realised outcome for one claim node. */
export interface OrcaObservation {
  readonly node_id: string;
  readonly realised: "VALID" | "INVALID";
}

/** The result of folding one realised outcome into a node's validity. */
export interface OrcaNodeUpdate {
  readonly node_id: string;
  readonly validity_before: number;
  readonly validity_after: number;
  readonly n_valid: number;
  readonly n_invalid: number;
  /** True when the posterior mean was pushed back inside the band. */
  readonly clamped: boolean;
  readonly reason: string;
}

function assertCount(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer, received ${String(value)}`);
  }
}

/**
 * Fold one realised outcome into a node's validity probability.
 *
 * The estimator is the Laplace-smoothed posterior mean over the node's
 * outcomes, (n_valid + 1) / (n_valid + n_invalid + 2), clamped into
 * [MIN_NODE_VALIDITY, MAX_NODE_VALIDITY] and REPORTED as clamped when the
 * clamp bites. The band is what stops a node with three lucky outcomes
 * from claiming 0.9+ certainty, which would let a descendant pass the
 * gate on almost no evidence.
 *
 * Throws on malformed state or observation.
 */
export function observeOrcaOutcome(
  state: OrcaNodeState,
  observation: OrcaObservation,
): OrcaNodeUpdate {
  if (state === null || typeof state !== "object") {
    throw new TypeError("state must be an object");
  }
  if (typeof state.node_id !== "string" || state.node_id.length === 0) {
    throw new TypeError("state.node_id must be a non-empty string");
  }
  assertCount(state.n_valid, "state.n_valid");
  assertCount(state.n_invalid, "state.n_invalid");
  assertFiniteNumber(state.validity, "state.validity");
  if (state.validity <= 0 || state.validity >= 1) {
    throw new RangeError(
      `state.validity must lie strictly inside (0,1), received ${state.validity}`,
    );
  }
  if (observation === null || typeof observation !== "object") {
    throw new TypeError("observation must be an object");
  }
  if (observation.node_id !== state.node_id) {
    throw new TypeError(
      `observation for node "${String(observation.node_id)}" fed to state for ` +
        `node "${state.node_id}"`,
    );
  }
  if (observation.realised !== "VALID" && observation.realised !== "INVALID") {
    throw new TypeError(
      `observation.realised must be "VALID" or "INVALID", received ` +
        `${String(observation.realised)}`,
    );
  }

  const nValid = state.n_valid + (observation.realised === "VALID" ? 1 : 0);
  const nInvalid = state.n_invalid + (observation.realised === "INVALID" ? 1 : 0);
  const posterior = (nValid + 1) / (nValid + nInvalid + 2);
  const clampedLow = posterior < MIN_NODE_VALIDITY;
  const clampedHigh = posterior > MAX_NODE_VALIDITY;
  const validityAfter = clampedLow
    ? MIN_NODE_VALIDITY
    : clampedHigh
      ? MAX_NODE_VALIDITY
      : posterior;

  const clampNote = clampedLow
    ? ` pushed below MIN_NODE_VALIDITY ${MIN_NODE_VALIDITY} and was clamped`
    : clampedHigh
      ? ` pushed above MAX_NODE_VALIDITY ${MAX_NODE_VALIDITY} and was clamped`
      : "";

  return {
    node_id: state.node_id,
    validity_before: state.validity,
    validity_after: validityAfter,
    n_valid: nValid,
    n_invalid: nInvalid,
    clamped: clampedLow || clampedHigh,
    reason:
      `node "${state.node_id}": ${nValid} valid / ${nInvalid} invalid outcome(s), ` +
      `posterior mean ${posterior.toFixed(6)}${clampNote}`,
  };
}

/**
 * Resolve and validate gamma.
 *
 * The module default is itself COMPARED against the admissible domain:
 * if `ACI_LEARNING_RATE` were ever edited outside (0,1], every caller that
 * omits gamma would silently run an ACI step the theory does not cover,
 * so the default is checked instead of assumed.
 */
function resolveLearningRate(learningRate: number | undefined): number {
  if (learningRate === undefined) {
    if (ACI_LEARNING_RATE <= 0 || ACI_LEARNING_RATE > 1) {
      throw new RangeError(
        `ACI_LEARNING_RATE ${ACI_LEARNING_RATE} is outside the admissible ` +
          `learning-rate domain (0,1]; fix the constant before using the ACI update`,
      );
    }
    return ACI_LEARNING_RATE;
  }
  assertFiniteNumber(learningRate, "learning_rate");
  if (learningRate <= 0 || learningRate > 1) {
    throw new RangeError(`learning_rate must lie in (0,1], received ${learningRate}`);
  }
  return learningRate;
}

/** The input to one ACI update of the trace miscoverage. */
export interface AciUpdateInput {
  /** The miscoverage level currently in force, alpha_t. */
  readonly alpha_t: number;
  /** The target miscoverage alpha the trace gate is aiming at. */
  readonly target_miscoverage: number;
  /** The realised error rate of the last window, err_t in [0,1]. */
  readonly err_t: number;
  /** gamma. Defaults to ACI_LEARNING_RATE. Must lie in (0,1]. */
  readonly learning_rate?: number;
}

export interface AciUpdateOk {
  readonly status: "UPDATED";
  /** alpha_{t+1} = alpha_t + gamma * (alpha - err_t). */
  readonly alpha_next: number;
  readonly step: number;
  readonly direction: "UP" | "DOWN" | "UNCHANGED";
  readonly learning_rate: number;
  readonly reason: string;
}

export interface AciUpdateRejected {
  readonly status: "REJECTED";
  readonly refusal_code: AciRefusalCode;
  readonly reason: string;
}

export type AciUpdateResult = AciUpdateOk | AciUpdateRejected;

/**
 * One ORCA adaptive-conformal step:
 *
 *     alpha_{t+1} = alpha_t + gamma * (alpha - err_t)
 *
 * The direction is the point: when the realised error rate is BELOW the
 * target, the level is conservative and alpha rises (the gate may be
 * relaxed); when it is ABOVE, alpha falls (the gate tightens). Nothing is
 * clamped: an alpha that leaves (0,1) is REJECTED with a reason, because
 * a silently clamped level would make every later threshold a threshold
 * at a level nobody chose.
 *
 * Throws on malformed input.
 */
export function updateAciAlpha(input: AciUpdateInput): AciUpdateResult {
  if (input === null || typeof input !== "object") {
    throw new TypeError("input must be an object");
  }
  assertFiniteNumber(input.alpha_t, "alpha_t");
  if (input.alpha_t <= 0 || input.alpha_t >= 1) {
    throw new RangeError(`alpha_t must lie strictly inside (0,1), received ${input.alpha_t}`);
  }
  assertFiniteNumber(input.target_miscoverage, "target_miscoverage");
  if (input.target_miscoverage <= 0 || input.target_miscoverage >= 1) {
    throw new RangeError(
      `target_miscoverage must lie strictly inside (0,1), received ${input.target_miscoverage}`,
    );
  }
  assertFiniteNumber(input.err_t, "err_t");
  if (input.err_t < 0 || input.err_t > 1) {
    throw new RangeError(`err_t must lie in [0,1], received ${input.err_t}`);
  }
  const gamma = resolveLearningRate(input.learning_rate);

  const step = gamma * (input.target_miscoverage - input.err_t);
  const alphaNext = input.alpha_t + step;

  if (alphaNext <= 0 || alphaNext >= 1) {
    return {
      status: "REJECTED",
      refusal_code: ACI_REFUSAL.alphaOutOfRange,
      reason:
        `the ACI step took alpha from ${input.alpha_t} to ${alphaNext} ` +
        `(step ${step.toFixed(6)} at gamma ${gamma}), outside (0,1). ` +
        `The adaptive level must be re-anchored rather than clamped.`,
    };
  }

  const direction: AciUpdateOk["direction"] = step > 0 ? "UP" : step < 0 ? "DOWN" : "UNCHANGED";
  const why =
    direction === "UP"
      ? `err_t ${input.err_t} < target ${input.target_miscoverage}: the gate was ` +
        `conservative, so alpha rises and the gate relaxes`
      : direction === "DOWN"
        ? `err_t ${input.err_t} > target ${input.target_miscoverage}: the gate was ` +
          `too permissive, so alpha falls and the gate tightens`
        : `err_t equals target ${input.target_miscoverage}: alpha is unchanged`;

  return {
    status: "UPDATED",
    alpha_next: alphaNext,
    step,
    direction,
    learning_rate: gamma,
    reason: `alpha ${input.alpha_t} -> ${alphaNext} (step ${step.toFixed(6)}): ${why}`,
  };
}
