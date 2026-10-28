/**
 * periodic-timeseries-id — FINITE-WINDOW causal identification for PERIODIC ADMGs.
 *
 * WHAT THIS IS
 * A periodic ADMG is a causal graph whose structure repeats every time step:
 * V(G) = { (t, i) : t a time index, i in 0..w-1 }, with a TEMPLATE of edges
 * between time steps (directed: a direct effect; bidirected: a latent common
 * cause). This module answers "is P(Y | do X) identifiable in this periodic
 * graph?" by
 *
 *   1. computing the finite window that Jahn, Karnik & Schulman (2025)
 *      (Proposition 1) says is sufficient,
 *   2. UNROLLING the periodic template into that window, and
 *   3. running this repo's EXISTING Shpitser-Pearl engine
 *      (`runShpitserPearlID`, ./do-calculus-id.ts) on the unrolled window.
 *
 * The engine is NOT reimplemented here. Shpitser-Pearl is reused as-is: it is
 * complete, and its FAIL_HEDGE branch is exactly the "there exists a hedge for
 * X, Y" condition that Proposition 1 is stated in terms of.
 *
 * THE BOUND — USE THIS EXACTLY
 *
 *   Proposition 1 (Jahn, Karnik & Schulman 2025). Let G be a periodic causal
 *   graph with width w and latency L and let
 *       C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2).
 *   For subsets X, Y of V(G), P(Y | do X) is unidentifiable if and only if
 *   there exists a hedge for X, Y in G[ max(t_min(X) - C, 0), t_max(Y) ].
 *
 * So the window is [max(t_min(X) - C, 0), t_max(Y)], where
 *   w = the WIDTH   (variables per time step), and
 *   L = the LATENCY (the maximum time lag of any direct or latent causal
 *       effect — i.e. the largest lag appearing in the edge template).
 *
 * CORRECTION TO THE PROJECT GOAL SPEC — READ THIS
 * The goal spec states the bound as "2|V_slice|" with "latency 1". THAT IS
 * WRONG, and this module does not implement it:
 *   - the figure 2|V_slice| DOES NOT APPEAR in Jahn, Karnik & Schulman (2025),
 *     in Theorem 1 or in Proposition 1;
 *   - the paper's bound is C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2), which is
 *     EXPONENTIAL IN THE WIDTH w (the 2^(L*w) factor), not linear in the size
 *     of a time slice. 2|V_slice| = 2w would be LINEAR in w;
 *   - the spec's "latency 1" is the paper's L — an INPUT to C, not a
 *     replacement for it. At L = 1, w = 1 the paper's C is 32; 2|V_slice|
 *     would be 2.
 * The spec's figure is not even a looser (conservative) version of the paper's
 * bound: for every w >= 1 the paper's C is at least 32 and grows without
 * bound in w, so 2|V_slice| is a bound that is too small. A too-small window
 * is the one error that turns an UNIDENTIFIABLE effect into an "identifiable"
 * verdict, because the hedge that proves unidentifiability lives outside the
 * truncated window and is never seen.
 *
 * The paper's Theorem 1 is the GENERAL statement: there EXISTS a constant C
 * such that running the causal ID algorithm on the segment of G whose time
 * indices lie between t_min - C and t_max suffices to determine identifiability
 * of the causal effect of X on Y. Proposition 1 supplies that constant
 * EXPLICITLY, and the explicit constant is the one used here.
 *
 * WHY THE WINDOW IS NEVER TRUNCATED
 * C is exponential in w, so the window is finite but potentially enormous:
 * at L = 1 it is 33 time steps for w = 1, 2917 for w = 2, 524289 for w = 3.
 * A TRUNCATED window is not a smaller answer, it is a WRONG answer: by
 * Proposition 1 the effect is unidentifiable iff a hedge survives inside the
 * FULL window, and a hedge outside a truncated window is invisible, so
 * truncation reports "identifiable" for an effect that is not. This module
 * therefore REPORTS AND REFUSES: it throws `PeriodicWindowBudgetError` with
 * the required size, and it never truncates, never approximates the bound,
 * and never falls back to an unbounded search.
 *
 * SCOPE — WHAT IS IMPLEMENTED HERE, AND WHAT IS DELIBERATELY NOT
 * IMPLEMENTED:
 *   IMPLEMENTED
 *     - the periodic ADMG representation (width, latency, lagged edge template);
 *     - the Proposition 1 bound C, exactly, with input guards;
 *     - the window [max(t_min(X) - C, 0), t_max(Y)] and its size (time steps
 *       and node count) computed WITHOUT unrolling, so a caller can refuse an
 *       intractable request before paying for it;
 *     - unrolling the template into a finite ADMG in a deterministic
 *       topological order;
 *     - the identification query: unroll, then run the existing Shpitser-Pearl
 *       engine, reporting the window used, identifiability, the formula class
 *       and the symbolic formula, or the hedge witness;
 *     - budget refusal with a clear error.
 *   NOT IMPLEMENTED (and refused loudly rather than answered wrongly)
 *     - the paper's own periodic hedge-search and the "segment" construction of
 *       Theorem 1: the generic Shpitser-Pearl engine already decides the
 *       hedge question on the unrolled window, so a second implementation would
 *       be a second thing to get wrong;
 *     - a NUMERIC estimand: this module returns a SYMBOLIC formula; fitting
 *       it is the estimator's job, not the gate's;
 *     - queries the stated bound does not cover: outcomes that fall below the
 *       window's lower edge, or interventions that fall above its upper edge,
 *       are REFUSED (the paper's window is [max(t_min(X) - C, 0), t_max(Y)]
 *       and does not contain them);
 *     - a declared latency that disagrees with the template's maximum lag: the
 *       latency must MATCH the template. A larger declared latency widens the
 *       window and can report "unidentifiable" for an effect the theorem calls
 *       identifiable; a smaller one narrows the window and can hide the hedge
 *       entirely. Neither mismatch is a safe default, so both are refused;
 *     - within-slice directed cycles (an ADMG must be a DAG) — refused;
 *     - conditional interventions P(Y | do X, Z) with Z observed, and any
 *       non-periodic / irregular-time / continuous-time model class — out of
 *       scope; the repo's `runShpitserPearlIDC` exists, but Proposition 1's
 *       window is not stated for IDC and is not claimed here.
 *
 * References:
 *  - Erik Jahn, Karthik Karnik, Leonard J. Schulman, "Causal Identification in
 *    Time Series Models", PMLR v275 (AISTATS 2025). Theorem 1 (existence of a
 *    sufficient constant C) and Proposition 1 (the explicit C above).
 *  - Shpitser & Pearl, "Identification of Joint Interventional Distributions
 *    in Recursive Semi-Markovian Causal Models", AAAI 2006 — the ID algorithm
 *    used (via ./do-calculus-id.ts, not reimplemented here).
 *
 * Pure TypeScript, no I/O.
 */

import {
  runShpitserPearlID,
  type CausalADMG,
  type HedgeWitness,
  type IDResult,
  type NodeId,
  type SymbolicFactor,
} from "./do-calculus-id.js";

/**
 * THIS MODULE IS NOT WIRED INTO ANY LIVE PATH, and the flag says so.
 *
 * Every other unwired module in this directory carries `export const ENABLED = false`, and
 * the flag is the convention that says "this is research code; nothing in production calls
 * it". A module that is unwired but does not carry the flag is indistinguishable from one
 * that is unwired BY ACCIDENT, and the repo's zero-importer sweep is exactly the measurement
 * that has to find the second kind.
 *
 * The reason it is not wired is the same as for the rest: the periodic-ID verdict is a
 * research capability, and threading it into a production number changes predictions, which
 * is a human call.
 */
export const ENABLED = false;

// ---------------------------------------------------------------------------
/** Acceptance gate, lifted from the source. */
export const ACCEPTANCE_GATE = "---------------------------------------------------------------------------";

// ERRORS
// ---------------------------------------------------------------------------

/** Base class for every error this module raises. */
export class PeriodicIDError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PeriodicIDError";
  }
}

/**
 * The required window cannot be materialised.
 *
 * Raised when the window exceeds the caller's node / time-step budget, and
 * when the bound C is too large to be represented exactly as a JS number.
 *
 * This is a REFUSAL, not a failure of the graph. It is the safe direction:
 * the module cannot answer the question soundly, so it says so instead of
 * answering with a truncated window (which would report "identifiable" for an
 * effect that is not).
 */
export class PeriodicWindowBudgetError extends PeriodicIDError {
  /** Nodes the full window needs (timeSteps * width). */
  readonly requiredNodes: number;
  /** Time steps the full window spans. */
  readonly requiredTimeSteps: number;
  /** The node budget the caller supplied (or the default). */
  readonly budgetNodes: number;
  /** The time-step budget the caller supplied (or the default). */
  readonly budgetTimeSteps: number;

  constructor(
    message: string,
    details: {
      readonly requiredNodes: number;
      readonly requiredTimeSteps: number;
      readonly budgetNodes: number;
      readonly budgetTimeSteps: number;
    },
  ) {
    super(message);
    this.name = "PeriodicWindowBudgetError";
    this.requiredNodes = details.requiredNodes;
    this.requiredTimeSteps = details.requiredTimeSteps;
    this.budgetNodes = details.budgetNodes;
    this.budgetTimeSteps = details.budgetTimeSteps;
  }
}

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

/**
 * A node of a periodic graph: its TIME index and its index WITHIN the slice.
 * This pair IS the node's identity — there is no other node id.
 */
export interface PeriodicNodeRef {
  readonly timeIndex: number;
  readonly withinSliceIndex: number;
}

/**
 * One edge of the periodic TEMPLATE.
 *
 * `lag` is the number of time steps between the endpoints:
 *   - `lag = 0` — the endpoints are in the SAME time slice (contemporaneous);
 *   - `lag >= 1` — `from` is at time t and `to` is at time t + lag.
 *
 * A `directed` edge is a direct causal effect; a `bidirected` edge is a
 * latent common cause. Both are forward in time: no edge ever points back.
 */
export type PeriodicTemplateEdge =
  | {
      readonly kind: "directed";
      readonly from: number;
      readonly to: number;
      readonly lag: number;
    }
  | {
      readonly kind: "bidirected";
      readonly from: number;
      readonly to: number;
      readonly lag: number;
    };

/**
 * A periodic ADMG: a width, a latency, and a template of edges between time
 * steps.
 *
 * `latency` MUST equal the maximum lag appearing in `template` — see the
 * module header for why a mismatch is unsound in both directions.
 */
export interface PeriodicADMG {
  /** w — the number of variables in each time slice. */
  readonly width: number;
  /** L — the latency: the maximum time lag of any direct or latent effect. */
  readonly latency: number;
  /** The edge template, applied at every time step. */
  readonly template: readonly PeriodicTemplateEdge[];
  /** Optional display names for the within-slice variables (length = width). */
  readonly labels?: readonly string[];
}

/** A causal query against a periodic graph. */
export interface PeriodicQuery {
  /** X — the intervention set. */
  readonly x: readonly PeriodicNodeRef[];
  /** Y — the outcome set (non-empty, disjoint from X). */
  readonly y: readonly PeriodicNodeRef[];
}

/**
 * The finite window Proposition 1 prescribes, and its size.
 *
 * The window is [tLo, tHi] with tLo = max(t_min(X) - C, 0) and tHi = t_max(Y).
 * `nodeCount` is timeSteps * width — the number of nodes an unroll produces.
 */
export interface PeriodicWindow {
  /** w — the width the window was computed for. */
  readonly width: number;
  /** L — the latency the window was computed for. */
  readonly latency: number;
  /** C — the Proposition 1 bound used. */
  readonly bound: number;
  /** The lower edge: max(t_min(X) - C, 0). */
  readonly tLo: number;
  /** The upper edge: t_max(Y). */
  readonly tHi: number;
  /** tHi - tLo + 1. */
  readonly timeSteps: number;
  /** timeSteps * width. */
  readonly nodeCount: number;
  /** min over X of the time index (0 when X is empty — see the header). */
  readonly tMinX: number;
  /** max over Y of the time index. */
  readonly tMaxY: number;
  /**
   * True when t_min(X) - C < 0, i.e. the raw lower edge was negative and was
   * clamped up to 0. (When t_min(X) - C == 0 the lower edge is 0 without any
   * clamping being needed, and this flag is false.)
   */
  readonly clampedAtZero: boolean;
  /**
   * False only when X is empty. For a non-empty X the window is exactly the
   * one Proposition 1 states. For X = ∅ the paper's t_min(X) is undefined, so
   * this module uses t_min(∅) := 0, which yields the full history
   * [0, t_max(Y)] — a SUPERSET of the theorem's window, and therefore
   * conservative: it can only add hedges, never remove one.
   */
  readonly boundApplies: boolean;
}

/** A periodic graph unrolled into a finite window. */
export interface UnrolledPeriodicGraph {
  /** The window that was unrolled. */
  readonly window: PeriodicWindow;
  /** The finite ADMG, in a deterministic topological order of `directed`. */
  readonly admg: CausalADMG;
  /** The node ids, in the ADMG's topological order. */
  readonly nodes: readonly NodeId[];
  /** Node id -> (timeIndex, withinSliceIndex). */
  readonly refOf: ReadonlyMap<NodeId, PeriodicNodeRef>;
  /** (timeIndex, withinSliceIndex) -> node id. */
  readonly idOf: ReadonlyMap<string, NodeId>;
}

/** Caller-supplied limits on how big a window this module may materialise. */
export interface PeriodicIDOptions {
  /** Maximum number of nodes to materialise. Default: DEFAULT_MAX_NODES. */
  readonly maxNodes?: number;
  /** Maximum number of time steps to materialise. Default: DEFAULT_MAX_TIME_STEPS. */
  readonly maxTimeSteps?: number;
}

/** The verdict of a periodic identification query. */
export interface PeriodicIDResult {
  /** The window actually used. */
  readonly window: PeriodicWindow;
  /** True iff P(Y | do X) is identifiable (Proposition 1: iff no hedge in the window). */
  readonly identifiable: boolean;
  /** The formula class the existing engine returned, or null when unidentifiable. */
  readonly formulaClass: string | null;
  /** The symbolic formula the existing engine returned, or null when unidentifiable. */
  readonly formula: SymbolicFactor | null;
  /** The hedge witness, or null when the effect is identifiable. */
  readonly hedge: HedgeWitness | null;
  /** The ID-enabling edges of the hedge, or an empty array when identifiable. */
  readonly enablingEdges: ReadonlyArray<readonly [NodeId, NodeId]>;
  /** The unrolled window, for callers that want the concrete graph. */
  readonly unrolled: UnrolledPeriodicGraph;
  /** The raw result of the existing engine, verbatim. */
  readonly idResult: IDResult;
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/**
 * Default node budget. Chosen so that a plausible small periodic graph
 * (w = 2, L = 1 -> a 2917-step, 5834-node window) still runs, while the next
 * width up (w = 3, L = 1 -> 1,572,867 nodes) is refused instead of attempted.
 */
export const DEFAULT_MAX_NODES = 50_000;

/** Default time-step budget. See DEFAULT_MAX_NODES. */
export const DEFAULT_MAX_TIME_STEPS = 50_000;

// ---------------------------------------------------------------------------
// THE BOUND
// ---------------------------------------------------------------------------

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new PeriodicIDError(
      `periodic-timeseries-id: ${name} must be a positive integer (>= 1), got ${String(value)}`,
    );
  }
}

/**
 * The Proposition 1 bound, EXACTLY, as a BigInt:
 *
 *     C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2)
 *
 * BigInt because the value is exponential in w and stops being exactly
 * representable as a JS number at small widths (w = 7, L = 1 already
 * overflows Number.MAX_SAFE_INTEGER).
 *
 * @throws PeriodicIDError if width or latency is not a positive integer.
 */
export function horizonBoundCBigInt(width: number, latency: number): bigint {
  assertPositiveInteger(width, "width");
  assertPositiveInteger(latency, "latency");
  const lw = BigInt(latency) * BigInt(width); // L*w
  const twoPowLw = 1n << lw; // 2^(L*w)
  const base = lw + 1n; // L*w + 1
  const exponent = 2n * lw + 2n; // 2*L*w + 2
  return BigInt(latency) * twoPowLw * base ** exponent;
}

/**
 * The Proposition 1 bound, EXACTLY:
 *
 *     C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2)
 *
 * Worked examples (hand-computed, and asserted in the test file):
 *   w = 1, L = 1: 1 * 2^1 * 2^4        = 32
 *   w = 2, L = 1: 1 * 2^2 * 3^6        = 4 * 729 = 2916
 *   w = 3, L = 1: 1 * 2^3 * 4^8        = 8 * 65536 = 524288
 *
 * C GROWS EXPONENTIALLY IN THE WIDTH w (the 2^(L*w) factor). The window is
 * finite but potentially enormous, so a caller MUST be able to see the size
 * before materialising it: use `computePeriodicWindow` (no unrolling) or
 * `reportPeriodicWindowSize`, and the `maxNodes` budget on
 * `identifyPeriodicEffect`.
 *
 * @throws PeriodicIDError if width or latency is not a positive integer.
 * @throws PeriodicWindowBudgetError if C is not exactly representable as a
 *   safe JS integer (at which point the window is un-materialisable anyway).
 */
export function horizonBoundC(width: number, latency: number): number {
  const exact = horizonBoundCBigInt(width, latency);
  if (exact > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new PeriodicWindowBudgetError(
      `periodic-timeseries-id: the Proposition 1 bound C for w=${width}, L=${latency} is ${exact.toString()}, ` +
        `which is larger than Number.MAX_SAFE_INTEGER (${String(Number.MAX_SAFE_INTEGER)}). ` +
        `The window for this graph is not materialisable, and it is NOT truncated: ` +
        `a truncated window can hide the hedge that proves P(Y | do X) unidentifiable.`,
      {
        requiredNodes: Number.POSITIVE_INFINITY,
        requiredTimeSteps: Number.POSITIVE_INFINITY,
        budgetNodes: DEFAULT_MAX_NODES,
        budgetTimeSteps: DEFAULT_MAX_TIME_STEPS,
      },
    );
  }
  return Number(exact);
}

// ---------------------------------------------------------------------------
// NODE IDENTITY
// ---------------------------------------------------------------------------

/** The node id of a (timeIndex, withinSliceIndex) pair. */
export function nodeIdOf(ref: PeriodicNodeRef): NodeId {
  return `t${ref.timeIndex}_v${ref.withinSliceIndex}`;
}

/** The map key of a (timeIndex, withinSliceIndex) pair. */
export function refKeyOf(ref: PeriodicNodeRef): string {
  return `${ref.timeIndex}#${ref.withinSliceIndex}`;
}

/** A human-readable description of a node, using the graph's labels if given. */
export function describePeriodicRef(
  ref: PeriodicNodeRef,
  graph?: Pick<PeriodicADMG, "labels">,
): string {
  const label = graph?.labels?.[ref.withinSliceIndex];
  const name = label === undefined ? `v${ref.withinSliceIndex}` : label;
  return `${name}@t${ref.timeIndex}`;
}

// ---------------------------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------------------------

interface ValidatedGraph {
  readonly width: number;
  readonly latency: number;
  readonly maxLag: number;
}

function validateGraph(graph: PeriodicADMG): ValidatedGraph {
  assertPositiveInteger(graph.width, "width");
  assertPositiveInteger(graph.latency, "latency");

  if (graph.template.length === 0) {
    throw new PeriodicIDError(
      "periodic-timeseries-id: the template has no edges. A periodic ADMG needs at least one " +
        "template edge; an edgeless template has latency 0, and the Proposition 1 bound is " +
        "defined for latency L >= 1.",
    );
  }

  let maxLag = 0;
  graph.template.forEach((edge, index) => {
    // The declared type is a closed union, but the graph arrives from a
    // caller, so the kind is re-checked at runtime. The cast keeps the
    // exhaustiveness check from narrowing `edge` to `never`.
    const kind = (edge as { readonly kind?: string }).kind;
    if (kind !== "directed" && kind !== "bidirected") {
      throw new PeriodicIDError(
        `periodic-timeseries-id: template edge ${index} has unknown kind "${String(kind)}"`,
      );
    }
    if (!Number.isInteger(edge.from) || edge.from < 0 || edge.from >= graph.width) {
      throw new PeriodicIDError(
        `periodic-timeseries-id: template edge ${index} has from=${String(edge.from)}, which is not a ` +
          `valid within-slice index for width ${graph.width}`,
      );
    }
    if (!Number.isInteger(edge.to) || edge.to < 0 || edge.to >= graph.width) {
      throw new PeriodicIDError(
        `periodic-timeseries-id: template edge ${index} has to=${String(edge.to)}, which is not a ` +
          `valid within-slice index for width ${graph.width}`,
      );
    }
    if (!Number.isInteger(edge.lag) || edge.lag < 0) {
      throw new PeriodicIDError(
        `periodic-timeseries-id: template edge ${index} has lag=${String(edge.lag)}, which is not a ` +
          `non-negative integer`,
      );
    }
    if (edge.lag > maxLag) maxLag = edge.lag;
  });

  if (graph.labels !== undefined && graph.labels.length !== graph.width) {
    throw new PeriodicIDError(
      `periodic-timeseries-id: ${graph.labels.length} labels were supplied for width ${graph.width}; ` +
        `the lengths must match`,
    );
  }

  if (maxLag !== graph.latency) {
    throw new PeriodicIDError(
      `periodic-timeseries-id: the declared latency (${graph.latency}) does not match the maximum lag ` +
        `in the template (${maxLag}). The latency must match exactly, because a mismatch is unsound in ` +
        `BOTH directions: a LARGER declared latency widens the window, and a hedge that exists only in ` +
        `the wider window would report "unidentifiable" for an effect the theorem calls identifiable; a ` +
        `SMALLER declared latency narrows the window, and the hedge that proves unidentifiability may ` +
        `fall outside it, reporting "identifiable" for an effect that is not. Declare the true latency.`,
    );
  }

  return { width: graph.width, latency: graph.latency, maxLag };
}

function validateQuery(graph: PeriodicADMG, query: PeriodicQuery): void {
  const { width } = validateGraph(graph);
  if (query.y.length === 0) {
    throw new PeriodicIDError("periodic-timeseries-id: the outcome set Y must be non-empty");
  }
  const yKeys = new Set<string>();
  for (const ref of query.y) {
    assertValidRef(ref, width, "Y");
    const key = refKeyOf(ref);
    if (yKeys.has(key)) {
      throw new PeriodicIDError(
        `periodic-timeseries-id: the outcome set Y contains ${describePeriodicRef(ref, graph)} twice`,
      );
    }
    yKeys.add(key);
  }
  for (const ref of query.x) {
    assertValidRef(ref, width, "X");
    if (yKeys.has(refKeyOf(ref))) {
      throw new PeriodicIDError(
        `periodic-timeseries-id: ${describePeriodicRef(ref, graph)} is both an outcome and an intervention`,
      );
    }
  }
}

function assertValidRef(ref: PeriodicNodeRef, width: number, label: string): void {
  if (!Number.isInteger(ref.timeIndex) || ref.timeIndex < 0) {
    throw new PeriodicIDError(
      `periodic-timeseries-id: ${label} node has timeIndex=${String(ref.timeIndex)}, which is not a ` +
        `non-negative integer`,
    );
  }
  if (!Number.isInteger(ref.withinSliceIndex) || ref.withinSliceIndex < 0 || ref.withinSliceIndex >= width) {
    throw new PeriodicIDError(
      `periodic-timeseries-id: ${label} node has withinSliceIndex=${String(ref.withinSliceIndex)}, which is ` +
        `not a valid within-slice index for width ${width}`,
    );
  }
}

// ---------------------------------------------------------------------------
// THE WINDOW
// ---------------------------------------------------------------------------

/**
 * Compute the finite window Proposition 1 prescribes:
 *
 *     [max(t_min(X) - C, 0), t_max(Y)],  C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2)
 *
 * This function does NOT unroll anything: it is the SIZE REPORT, so a caller
 * can see how many time steps and how many nodes the answer would need
 * before paying for it. `reportPeriodicWindowSize` is the same function under
 * the name that says what it is for.
 *
 * @throws PeriodicIDError if the graph or the query is malformed, or if the
 *   query is not covered by the paper's window (see the module header).
 */
export function computePeriodicWindow(graph: PeriodicADMG, query: PeriodicQuery): PeriodicWindow {
  const { width, latency } = validateGraph(graph);
  validateQuery(graph, query);

  const tMaxY = query.y.reduce((acc, ref) => Math.max(acc, ref.timeIndex), Number.NEGATIVE_INFINITY);
  const hasIntervention = query.x.length > 0;
  const tMinX = hasIntervention
    ? query.x.reduce((acc, ref) => Math.min(acc, ref.timeIndex), Number.POSITIVE_INFINITY)
    : 0;

  const bound = horizonBoundC(width, latency);
  const rawLower = tMinX - bound;
  const tLo = Math.max(rawLower, 0);
  const tHi = tMaxY;

  if (hasIntervention && tMinX > tMaxY) {
    throw new PeriodicIDError(
      `periodic-timeseries-id: the intervention set starts at t=${tMinX} but the latest outcome is at ` +
        `t=${tMaxY}. The Proposition 1 window [max(t_min(X) - C, 0), t_max(Y)] does not contain the ` +
        `intervention in that case, and the paper states no bound for an intervention that post-dates ` +
        `the outcome. This query is out of scope.`,
    );
  }

  const timeSteps = tHi - tLo + 1;

  // The window must CONTAIN X and Y, or the identification query cannot even
  // be posed on it. Proposition 1's window is defined by t_min(X) and
  // t_max(Y), so a query whose outcomes sit below the lower edge is not
  // covered by the bound and is refused rather than answered.
  for (const ref of [...query.x, ...query.y]) {
    if (ref.timeIndex < tLo || ref.timeIndex > tHi) {
      const inX = query.x.some((r) => refKeyOf(r) === refKeyOf(ref));
      throw new PeriodicIDError(
        `periodic-timeseries-id: ${describePeriodicRef(ref, graph)} (${inX ? "X" : "Y"}) lies outside the ` +
          `Proposition 1 window [${tLo}, ${tHi}] (C = ${bound}, w = ${width}, L = ${latency}). The paper's ` +
          `bound covers the window [max(t_min(X) - C, 0), t_max(Y)] and says nothing about queries whose ` +
          `nodes fall outside it, so this query is out of scope rather than answered on a truncated window.`,
      );
    }
  }

  return {
    width,
    latency,
    bound,
    tLo,
    tHi,
    timeSteps,
    nodeCount: timeSteps * width,
    tMinX,
    tMaxY,
    clampedAtZero: rawLower < 0,
    boundApplies: hasIntervention,
  };
}

/**
 * The SIZE of the window a query would need, WITHOUT unrolling.
 *
 * Alias of `computePeriodicWindow`, named for what a caller wants from it:
 * "how many time steps and how many nodes is this going to cost, and can I
 * afford it?" The answer is exact — it is not an estimate.
 */
export function reportPeriodicWindowSize(
  graph: PeriodicADMG,
  query: PeriodicQuery,
): PeriodicWindow {
  return computePeriodicWindow(graph, query);
}

// ---------------------------------------------------------------------------
// UNROLLING
// ---------------------------------------------------------------------------

/** A minimal binary min-heap over non-negative integers. */
class MinHeap {
  private readonly items: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(value: number): void {
    this.items.push(value);
    let i = this.items.length - 1;
    while (i > 0) {
      const parentIndex = (i - 1) >> 1;
      const parent = this.items[parentIndex];
      if (parent === undefined || parent <= value) break;
      this.items[i] = parent;
      i = parentIndex;
    }
    this.items[i] = value;
  }

  pop(): number | undefined {
    const top = this.items[0];
    if (top === undefined) return undefined;
    const last = this.items.pop();
    if (last === undefined) return top;
    const n = this.items.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let bestIndex = -1;
        let bestValue = last;
        if (left < n) {
          const leftValue = this.items[left];
          if (leftValue !== undefined && leftValue < bestValue) {
            bestIndex = left;
            bestValue = leftValue;
          }
        }
        if (right < n) {
          const rightValue = this.items[right];
          if (rightValue !== undefined && rightValue < bestValue) {
            bestIndex = right;
            bestValue = rightValue;
          }
        }
        if (bestIndex === -1) break;
        this.items[i] = bestValue;
        i = bestIndex;
      }
      this.items[i] = last;
    }
    return top;
  }
}

/**
 * Kahn's algorithm with a min-heap, so the topological order is DETERMINISTIC
 * (ties broken by node index, i.e. by (time, within-slice index)) and stable
 * across runs.
 */
function topologicalOrder(
  nodeCount: number,
  edges: ReadonlyArray<readonly [number, number]>,
): number[] {
  const indegree = new Array<number>(nodeCount).fill(0);
  const outgoing: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const [u, v] of edges) {
    const list = outgoing[u];
    if (list !== undefined) list.push(v);
    indegree[v] = (indegree[v] ?? 0) + 1;
  }

  const ready = new MinHeap();
  for (let i = 0; i < nodeCount; i += 1) {
    if ((indegree[i] ?? 0) === 0) ready.push(i);
  }

  const order: number[] = [];
  for (;;) {
    const next = ready.pop();
    if (next === undefined) break;
    order.push(next);
    for (const v of outgoing[next] ?? []) {
      const degree = (indegree[v] ?? 0) - 1;
      indegree[v] = degree;
      if (degree === 0) ready.push(v);
    }
  }

  if (order.length !== nodeCount) {
    throw new PeriodicIDError(
      `periodic-timeseries-id: the unrolled window contains a directed cycle (${order.length} of ` +
        `${nodeCount} nodes could be ordered). Template edges must go forward in time and the ` +
        `contemporaneous (lag 0) edges must be acyclic, otherwise the window is not an ADMG.`,
    );
  }
  return order;
}

/**
 * Unroll the periodic template into the finite window [tLo, tHi].
 *
 * The result is a `CausalADMG` whose `nodes` are in a deterministic topological
 * order of `directed`, which is what the existing Shpitser-Pearl engine
 * requires. Node identity stays the pair (timeIndex, withinSliceIndex); the
 * string ids are a rendering of it, and `refOf` / `idOf` map back and forth.
 *
 * The number of nodes is exactly timeSteps * width.
 */
export function unrollPeriodicWindow(
  graph: PeriodicADMG,
  window: PeriodicWindow,
): UnrolledPeriodicGraph {
  const { width } = validateGraph(graph);
  const { tLo, tHi, timeSteps } = window;
  const nodeCount = timeSteps * width;

  const refsByIndex: PeriodicNodeRef[] = new Array<PeriodicNodeRef>(nodeCount);
  const idsByIndex: NodeId[] = new Array<NodeId>(nodeCount);
  for (let t = tLo; t <= tHi; t += 1) {
    for (let i = 0; i < width; i += 1) {
      const index = (t - tLo) * width + i;
      refsByIndex[index] = { timeIndex: t, withinSliceIndex: i };
      idsByIndex[index] = nodeIdOf({ timeIndex: t, withinSliceIndex: i });
    }
  }

  const indexDirected: Array<readonly [number, number]> = [];
  const indexBidirected: Array<readonly [number, number]> = [];
  for (const edge of graph.template) {
    for (let t = tLo; t + edge.lag <= tHi; t += 1) {
      const from = (t - tLo) * width + edge.from;
      const to = (t + edge.lag - tLo) * width + edge.to;
      if (edge.kind === "directed") indexDirected.push([from, to]);
      else indexBidirected.push([from, to]);
    }
  }

  const order = topologicalOrder(nodeCount, indexDirected);

  const nodes: NodeId[] = [];
  const refOf = new Map<NodeId, PeriodicNodeRef>();
  const idOf = new Map<string, NodeId>();
  for (const index of order) {
    const id = idsByIndex[index];
    const ref = refsByIndex[index];
    if (id === undefined || ref === undefined) continue;
    nodes.push(id);
    refOf.set(id, ref);
    idOf.set(refKeyOf(ref), id);
  }

  const directed: Array<readonly [NodeId, NodeId]> = [];
  for (const [u, v] of indexDirected) {
    const from = idsByIndex[u];
    const to = idsByIndex[v];
    if (from === undefined || to === undefined) continue;
    directed.push([from, to]);
  }
  const bidirected: Array<readonly [NodeId, NodeId]> = [];
  for (const [u, v] of indexBidirected) {
    const from = idsByIndex[u];
    const to = idsByIndex[v];
    if (from === undefined || to === undefined) continue;
    bidirected.push([from, to]);
  }

  return {
    window,
    admg: { nodes, directed, bidirected },
    nodes,
    refOf,
    idOf,
  };
}

// ---------------------------------------------------------------------------
// THE QUERY
// ---------------------------------------------------------------------------

function enforceWindowBudget(window: PeriodicWindow, options: PeriodicIDOptions): void {
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const maxTimeSteps = options.maxTimeSteps ?? DEFAULT_MAX_TIME_STEPS;

  if (window.nodeCount > maxNodes || window.timeSteps > maxTimeSteps) {
    throw new PeriodicWindowBudgetError(
      `periodic-timeseries-id: REFUSING the query. The Proposition 1 window for w=${window.width}, ` +
        `L=${window.latency} is [${window.tLo}, ${window.tHi}] — ${window.timeSteps} time steps, ` +
        `${window.nodeCount} nodes (C = ${window.bound}) — which exceeds the budget of ${maxNodes} nodes / ` +
        `${maxTimeSteps} time steps. The window is NOT truncated and the bound is NOT approximated: ` +
        `Proposition 1 puts the hedge that proves unidentifiability inside the FULL window, so a ` +
        `truncated window would report "identifiable" for an effect that is not. Raise maxNodes / ` +
        `maxTimeSteps, or narrow the query.`,
      {
        requiredNodes: window.nodeCount,
        requiredTimeSteps: window.timeSteps,
        budgetNodes: maxNodes,
        budgetTimeSteps: maxTimeSteps,
      },
    );
  }
}

/**
 * Answer a causal-identification query against a periodic graph.
 *
 * 1. compute the window Proposition 1 prescribes (and refuse if it is over
 *    the caller's budget — never truncate);
 * 2. unroll the periodic template into that window;
 * 3. run the repo's EXISTING Shpitser-Pearl engine on the unrolled window.
 *
 * By Proposition 1, the engine's verdict on the window IS the verdict on the
 * periodic graph: P(Y | do X) is unidentifiable iff a hedge for X, Y survives
 * inside the window, and `runShpitserPearlID` fails exactly when such a hedge
 * exists.
 *
 * @throws PeriodicIDError if the graph or query is malformed or out of scope.
 * @throws PeriodicWindowBudgetError if the window cannot be materialised.
 */
export function identifyPeriodicEffect(
  graph: PeriodicADMG,
  query: PeriodicQuery,
  options: PeriodicIDOptions = {},
): PeriodicIDResult {
  const window = computePeriodicWindow(graph, query);
  enforceWindowBudget(window, options);

  const unrolled = unrollPeriodicWindow(graph, window);

  const xSet = new Set<NodeId>();
  for (const ref of query.x) {
    const id = unrolled.idOf.get(refKeyOf(ref));
    if (id === undefined) {
      throw new PeriodicIDError(
        `periodic-timeseries-id: the intervention ${describePeriodicRef(ref, graph)} is not in the ` +
          `unrolled window [${window.tLo}, ${window.tHi}]`,
      );
    }
    xSet.add(id);
  }
  const ySet = new Set<NodeId>();
  for (const ref of query.y) {
    const id = unrolled.idOf.get(refKeyOf(ref));
    if (id === undefined) {
      throw new PeriodicIDError(
        `periodic-timeseries-id: the outcome ${describePeriodicRef(ref, graph)} is not in the ` +
          `unrolled window [${window.tLo}, ${window.tHi}]`,
      );
    }
    ySet.add(id);
  }

  const idResult = runShpitserPearlID(ySet, xSet, unrolled.admg);

  return {
    window,
    identifiable: idResult.ok,
    formulaClass: idResult.ok ? idResult.formulaClass : null,
    formula: idResult.ok ? idResult.formula : null,
    hedge: idResult.ok ? null : idResult.hedge,
    enablingEdges: idResult.ok ? [] : idResult.enablingEdges,
    unrolled,
    idResult,
  };
}
