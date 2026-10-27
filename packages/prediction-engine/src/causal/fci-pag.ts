/**
 * FCI (Fast Causal Inference) partial-ancestral-graph discovery with latent confounders,
 * a PAG -> ADMG projection that feeds do-calculus-id.ts, and a precision-preconditioned
 * (scale-invariant) DYNOTEARS contemporaneous stage.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM:
 *  - FCI (Spirtes, Meek & Richardson 1995; Zhang 2008, "On the completeness of orientation
 *    rules for causal discovery in the presence of latent confounders and selection bias",
 *    Artificial Intelligence 172(16-17):1873-1896, doi:10.1016/j.artint.2008.08.001):
 *    PC skeleton with
 *    Fisher-z conditional-independence tests, Possible-D-Sep re-testing, collider orientation
 *    (R0), then Zhang's orientation rules to a fixpoint. The output is a PAG whose marks
 *    (tail / arrowhead / circle) state exactly what the data can and cannot identify when
 *    latent confounders may exist. A circle means "arrowhead or tail": unresolved.
 *  - PAG -> ADMG projection: the maximally-confounded representative (mark rule below), so the
 *    existing Shpitser-Pearl ID can consume it.
 *    (CITATION CORRECTED 2026-10-20. The header previously read "JMLR 9:2081-2108" and
 *    truncated the title to "...for constructing partial ancestral graphs". The paper is
 *    in ARTIFICIAL INTELLIGENCE 172(16-17):1873-1896, and its title is "...for causal
 *    discovery in the presence of latent confounders and selection bias". JMLR 9:1437-1474
 *    is Zhang's OTHER 2008 paper, "Causal Reasoning with Ancestral Graphs" -- a different
 *    paper, in a different venue, with different content. A citation that points at the
 *    wrong paper is the literature-side version of the defect this audit hunts: a
 *    reference that reads as provenance without being checkable. The rules themselves
 *    were implemented from the right source, so the code is unaffected.)
 *  - DYNOTEARS contemporaneous W: scale-invariant non-equal-variance Gaussian likelihood
 *    + L1 + augmented Lagrangian on h(W) = tr(exp(W o W)) - d, optionally restricted to the
 *    FCI-admissible support.
 *  - The VERIFIED-literature term L_lit: the spec's coupling of CITABLE_VERIFIED premises to the
 *    TOTAL causal effect matrix T(W) = (I-W)^{-1} - I, with its exact analytic gradient. Only
 *    CITABLE_VERIFIED premises may enter it.
 *  - The per-edge L1 penalty lambda_{1,ij}: where an HONESTLY_UNCITED_PRIOR goes. It carries no
 *    magnitude, so it cannot enter L_lit; it only relaxes the sparsity penalty on the edge it
 *    proposes, so the empirical likelihood decides whether that edge exists.
 *
 * WHAT IS IMPLEMENTED vs APPROXIMATED (read before trusting an output):
 *  1. Possible-D-Sep IS implemented, not approximated: pds(a,b) is the set of nodes reachable
 *     from a on a path whose interior nodes are each a collider on that path or a member of a
 *     triangle (Zhang 2008 sec. 3). Two documented deviations from "test every subset":
 *     subset size is capped at maxConditioningSetSize, and the re-test batch uses the same
 *     Benjamini-Hochberg rule as the skeleton instead of a per-test level.
 *  2. Orientation rules: R1, R3, R4 (discriminating path) are implemented, and R2 and R8 are
 *     implemented only in PART. R5-R7 (uncovered circle-path, single-tail propagation, and
 *     uncovered non-collider tail) are NOT implemented, so this PAG can carry more circles
 *     than a complete FCI would leave. R9/R10 are replaced by `completeAncestral`, which only
 *     performs cycle-avoiding completions: it is sound but weaker than R9/R10. Net effect: the
 *     output is a valid PAG that may be less oriented than the true one. It never orients
 *     against a rule; it can fail to orient.
 *
 *     THE TWO PARTIAL RULES, PRECISELY (measured 2026-10-20):
 *       - R2 requires the CIRCLE at the NEAR end (markAt(a,c) === "circle"). Zhang's R2
 *         antecedent puts the circle at the FAR end with any mark at the near end, so every
 *         case where the near end is already a tail is missed. That is a FAILURE TO ORIENT,
 *         which is the safe direction.
 *       - The rule this module previously called "R8" is NOT Zhang's R8. Zhang's R8 turns a
 *         partially directed edge `A o-> C` into a DIRECTED one by writing a TAIL at the
 *         near end (Zhang 2008, p. 1881). That rule is now `ruleR8`, transcribed verbatim
 *         from the publisher PDF, and it is wired into the fixpoint. The module's own
 *         arrowhead-at-the-far-end rule is now named `ruleArrowheadAtDescendant`, and the
 *         branch that stands in for its second disjunct requires an ARROWHEAD at c on the
 *         b-c edge -- `b o-> c` -- so that c is a descendant of a and the orientation is
 *         forced. Without that guard the branch oriented AGAINST a rule (it wrote an
 *         arrowhead at c on a case where `c -> b` was equally consistent); that was found
 *         and fixed on 2026-10-20, and the regression test for it is
 *         "prevents the descendant-arrowhead rule from ORIENTING AGAINST A RULE" in
 *         fci-pag.test.ts.
 *     R5, R6, R7, R8, R9 and R10 are implemented (the R5-R7 block on journal p. 1880, the
 *         R8-R10 block on p. 1881), transcribed VERBATIM from the publisher PDF -- the
 *         extracted rule text is quoted in the source above the implementations. R5-R7 are
 *         the selection-bias rules and are the ONLY source of the undirected edges that R6
 *         consumes, so without them the tail half of AFCI was unreachable rather than merely
 *         incomplete. Each rule has a positive case and a negative case in
 *         fci-pag.test.ts, so a rule that fires on everything is caught as surely as one
 *         that never fires.
 *     The path searches R5/R9/R10 need are exponential in the worst case and are bounded by
 *         PATH_SEARCH_BUDGET; hitting the bound means "no path", i.e. the rule fails to
 *         fire. That is the safe direction: a rule that fails to fire is incomplete, a rule
 *         that fires wrongly is unsound.
 *  3. R3's notation in the source ("D o-* B, ... orient D *-> B") is ambiguous. The only mark
 *     that can change is the circle at D, so we set the arrowhead at D (the reading used by
 *     Tetrad's FciOrient). Reading it literally as "arrowhead at B" would make the rule a
 *     no-op whenever B is already an arrowhead, which is the premise.
 *  4. R4 needs a separating set for (D,C). When the pair is still adjacent no sepset exists and
 *     the rule is skipped rather than guessed.
 *  5. Assumptions: linearity, Gaussianity and faithfulness. Fisher-z cannot see non-linear or
 *     non-Gaussian dependence; a failed test is not evidence of absence.
 *  6. DYNOTEARS here is CONTEMPORANEOUS ONLY. Lagged terms (A) are out of scope.
 *  6b. MEASURED LIMIT of this estimator, stated because it is easy to over-claim: the profile
 *     likelihood saturates, so at the default lambda1 = 0.01 the L1 term is ~3% of the objective's
 *     scale and cannot pay for sparsity. On a 4-node diamond (0->1, 0->2, 1->3, 2->3) at n = 4000
 *     the unrestricted fit returns FIVE edges including a spurious 1-2 (|W| = 0.69), and no value
 *     of lambda1 on the L1 path recovers the true four (the spurious coefficient is larger than
 *     the true ones). Restricted with `allowedEdges` = the FCI skeleton it returns exactly the
 *     true four edges, which is the intended pipeline: the PAG decides the support, DYNOTEARS
 *     decides only the directions and weights inside it. The lambda1 continuation below is a
 *     warm-start device that helps but does not remove this; it is not a substitute for tuning.
 *     Directions inside a Markov equivalence class are still arbitrary (a chain comes back
 *     reversed about half the time) because no Gaussian score can distinguish them.
 *  7. matExp: the 1803.01422v2 `matExp` is a raw 30-term Taylor series with no scaling and
 *     squaring. Measured against the closed form h(c) = 3*sum_m c^(6m)/(3m)! - 3 on a 3-cycle
 *     it is exact to 1e-9 at c=3 but has 2.3e-4 relative error at c=4, 7.7e-1 at c=6 and 1.0 at
 *     c=8 (exp(40) comes out 16x too small). The augmented Lagrangian walks through exactly
 *     those weights, so this module uses `matExpScaleSquaring` (norm-scaled 24-term Taylor, then
 *     repeated squaring): <= 3e-14 relative error on the same cases.
 *
 * MARK RULE for pagToAdmg (the one thing downstream consumes):
 *  - tail/arrowhead        -> DIRECTED u -> v.
 *  - arrowhead/arrowhead   -> BIDIRECTED u <-> v (a latent common cause).
 *  - ANY circle at either end -> BIDIRECTED, never directed. A circle means "arrowhead or
 *    tail"; keeping the arrowhead reading is the conservative choice for identifiability
 *    because a bidirected edge can only make an effect harder to identify, never easier.
 *    This includes the (tail, circle) case, where the tail is deliberately over-ridden to an
 *    arrowhead: erring toward extra confounding is the safe direction.
 *  - tail/tail (an undirected edge, only possible with selection variables) -> BIDIRECTED, so
 *    the projection never claims a direction or an independence it did not establish.
 *  - The projection is therefore the MAXIMALLY CONFOUNDED representative of the PAG's Markov
 *    equivalence class. It is deliberately pessimistic: an `ok` identification verdict on it
 *    is suggestive, not a proof, about the true MAG (a proof would require enumerating the
 *    class). A `not identifiable` verdict is the safe one to act on.
 *
 * ACCEPTANCE GATE: ADOPT the FCI-pruned feature set only if (a) held-out Brier on 2024-2025
 * is within 0.002 of the full-feature baseline while using <= 60% of features, (b) the
 * skeleton Jaccard across season-blocked folds is >= 0.5, and (c) oriented edges agree with
 * domain-known football directions on >= 80% of high-confidence edges. Gate status: NOT
 * EVALUATED (requires historical walk-forward data absent from this environment).
 *
 * owner: Motif-lab | bucket: MODEL | lane: causal_discovery | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

import type { CausalADMG, NodeId } from "./do-calculus-id.js";
import { isAcyclic } from "./dag-nocurl.js";
import { partialCorr, pcorPvalue } from "./2003-03685v2-pcmci-team-panel.js";

export const ENABLED = false;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Endpoint mark of an edge at one of its two nodes. A circle is "arrowhead or tail". */
export type EdgeMark = "tail" | "arrowhead" | "circle";

/** One PAG edge. `markU` is the mark at `u`, `markV` the mark at `v`; `u < v` by construction. */
export interface FciEdge {
  readonly u: number;
  readonly v: number;
  readonly markU: EdgeMark;
  readonly markV: EdgeMark;
}

/** Result of `fci`. `edges` is the learned PAG; `sepsets` explains every deletion. */
export interface FciResult {
  readonly nodes: readonly number[];
  readonly edges: readonly FciEdge[];
  readonly sepsets: ReadonlyMap<string, readonly number[]>;
  readonly skeleton: readonly [number, number][];
  readonly separated: readonly [number, number][];
  readonly step: "skeleton" | "possible-dsep" | "orient" | "done";
}

/** Options for `fci`. */
export interface FciOptions {
  /** Per-family FDR level applied with Benjamini-Hochberg within each conditioning level. Default 0.05. */
  readonly alpha?: number;
  /** Largest conditioning set tested in the skeleton and pds phases. Default 3. */
  readonly maxConditioningSetSize?: number;
  /**
   * Optional separating-set oracle. When supplied it REPLACES the Fisher-z test everywhere:
   * return a set that separates (i,j) to delete the edge, or null to keep it. Used to drive the
   * skeleton/orientation machinery deterministically from a known graph.
   */
  readonly conditioning?: (i: number, j: number) => number[] | null;
}

/** A projected ADMG over the numeric PAG nodes: what `pagToAdmg` returns. */
export interface PagAdmg {
  readonly nodes: number[];
  readonly directed: [number, number][];
  readonly bidirected: [number, number][];
}

/** Options for `dynotearsFit`. */
export interface DynotearsOptions {
  readonly lambda1?: number;
  readonly rho?: number;
  readonly alpha?: number;
  readonly maxIter?: number;
  readonly tol?: number;
  readonly edgeThreshold?: number;
  readonly allowedEdges?: readonly (readonly [number, number])[];
  /**
   * The VERIFIED literature constraints -- the spec's S_lit^ClassA.
   *
   * Each entry is a measured total effect that a CITABLE_VERIFIED
   * premise asserts: `delta` is the effect the literature says the
   * edge (from -> to) has, and `weight` is how much that premise is
   * trusted relative to the others.
   *
   * ONLY CITABLE_VERIFIED PREMISES MAY APPEAR HERE. An
   * HONESTLY_UNCITED_PRIOR has no source document, so its number is a
   * guess; a guess that enters L_lit pulls the estimated W toward
   * that guess and the SCM inherits the guess as structure. That is
   * precisely the corruption this whole reconciliation exists to
   * remove, so the caller must not be able to do it by accident.
   *
   * The constraint is on the TOTAL effect T_ij(W) = [(I-W)^{-1} - I]_ij
   * -- the effect along all directed paths -- not on the direct
   * coefficient W_ij, because a literature premise is about the
   * effect you would OBSERVE, and the observed effect is the total
   * one.
   */
  readonly classALiterature?: readonly ClassALiteratureConstraint[];
  /** The weight on the literature term. Zero disables it. */
  readonly muLit?: number;
  /**
   * The per-edge L1 penalty multipliers -- the spec's lambda_{1,ij}.
   *
   * This is where an HONESTLY_UNCITED_PRIOR goes. It is NOT a
   * literature constraint: its number never enters L_lit, so it can
   * never pull W toward a magnitude with no source behind it. It only
   * relaxes the sparsity penalty on the edge it proposes, so that the
   * EMPIRICAL likelihood decides whether that edge exists.
   *
   * The spec's value for a prior-proposed edge is 0.25 * lambda_1.
   */
  readonly edgePenalties?: readonly EdgePenalty[];
}

/**
 * One verified literature constraint: a measured total effect on an
 * edge, with the trust weight of the premise that asserts it.
 */
export interface ClassALiteratureConstraint {
  /** The source node index (the cause). */
  readonly from: number;
  /** The target node index (the effect). */
  readonly to: number;
  /** The asserted total effect. */
  readonly delta: number;
  /** The trust weight. Must be >= 0. */
  readonly weight: number;
  /** The premise id, for the report. Proves the constraint is sourced. */
  readonly premiseId?: string;
}

/** Result of `dynotearsFit`. `W` is in original data units; `edges` is thresholded on the standardized fit. */
export interface DynotearsResult {
  /** Contemporaneous coefficients in ORIGINAL data units: x_j = sum_k W[k][j] x_k + e_j. */
  readonly W: number[][];
  /** h(W) at the returned `W` (not at the standardized fit); zero iff the support is acyclic. */
  readonly h: number;
  /** Exact gradient of h at the returned `W`, same units. */
  readonly grad: number[][];
  /** Edges with |Wstandardized| > edgeThreshold, sorted by (from, to). */
  readonly edges: readonly [number, number][];
  /** The augmented-Lagrangian objective at the returned W, evaluated in standardized units. */
  readonly loss: number;
  /** Coefficients on the z-scored columns. `edges` is `|Wstandardized| > edgeThreshold` here. */
  readonly Wstandardized: number[][];
}

// ---------------------------------------------------------------------------
// Small linear algebra
// ---------------------------------------------------------------------------

function zeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => new Array<number>(m).fill(0));
}

function identity(n: number): number[][] {
  const out = zeros(n, n);
  for (let i = 0; i < n; i++) out[i]![i] = 1;
  return out;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const p = B.length;
  const m = B[0]!.length;
  const out = zeros(n, m);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < p; k++) {
      const a = A[i]![k]!;
      if (a === 0) continue;
      for (let j = 0; j < m; j++) out[i]![j]! += a * B[k]![j]!;
    }
  }
  return out;
}

/**
 * Matrix exponential by scaling and squaring: exp(A) = exp(A/2^s)^(2^s) with
 * ||A/2^s||_F <= 0.5, so a 24-term Taylor series is at machine precision before squaring.
 * Verified against the closed form on diagonal input and against a 300-term reference on
 * 5x5 matrices up to ||A||_F = 40 (<= 3e-14 relative).
 */
export function matExpScaleSquaring(A: number[][]): number[][] {
  const d = A.length;
  if (d === 0) return [];
  if (A.some((row) => row.length !== d)) throw new Error("matExpScaleSquaring: not square");
  let norm = 0;
  for (const row of A) for (const v of row) norm += v * v;
  norm = Math.sqrt(norm);
  if (!Number.isFinite(norm)) return A.map((row) => row.map(() => Number.POSITIVE_INFINITY));
  let s = 0;
  while (norm > 0.5 * Math.pow(2, s) && s < 1024) s++;
  const scale = Math.pow(2, -s);
  const B = A.map((row) => row.map((v) => v * scale));
  let result = identity(d);
  let term = identity(d);
  for (let k = 1; k <= 24; k++) {
    term = matMul(term, B).map((row) => row.map((v) => v / k));
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) result[i]![j]! += term[i]![j]!;
  }
  for (let r = 0; r < s; r++) result = matMul(result, result);
  return result;
}

/**
 * NOTEARS acyclicity h(W) = tr(exp(W o W)) - d with its exact gradient
 * grad = (exp(W o W))^T o (2W). h(W) = 0 exactly when the support of W is acyclic.
 * Uses `matExpScaleSquaring`, not the repo's unscaled Taylor series (see the header).
 */
export function acyclicityExact(W: number[][]): { h: number; grad: number[][] } {
  const d = W.length;
  if (d === 0) return { h: 0, grad: [] };
  const S = W.map((row) => row.map((w) => w * w));
  const E = matExpScaleSquaring(S);
  let tr = 0;
  for (let i = 0; i < d; i++) tr += E[i]![i]!;
  const grad = W.map((row, i) => row.map((w, j) => E[j]![i]! * 2 * w));
  return { h: tr - d, grad };
}

/** Gauss-Jordan inverse with partial pivoting, plus the determinant. Null when singular. */
function inverseWithDet(M: number[][]): { inv: number[][]; det: number } | null {
  const n = M.length;
  const A = M.map((row, i) => [...row, ...identity(n)[i]!]);
  let det = 1;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r]![col]!) > Math.abs(A[piv]![col]!)) piv = r;
    }
    if (Math.abs(A[piv]![col]!) < 1e-12) return null;
    if (piv !== col) {
      const tmp = A[col]!;
      A[col] = A[piv]!;
      A[piv] = tmp;
      det = -det;
    }
    const diag = A[col]![col]!;
    det *= diag;
    for (let k = 0; k < 2 * n; k++) A[col]![k]! /= diag;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r]![col]!;
      if (f === 0) continue;
      for (let k = 0; k < 2 * n; k++) A[r]![k]! -= f * A[col]![k]!;
    }
  }
  const inv = A.map((row) => row.slice(n));
  return { inv, det };
}

// ---------------------------------------------------------------------------
// Conditional-independence test (shared with the PCMCI+ module)
// ---------------------------------------------------------------------------

/**
 * Fisher-z test of conditional independence of columns i and j given `cond`.
 *
 * z = 0.5*sqrt(n - |S| - 3)*log((1+r)/(1-r)) and p = 2*(1 - Phi(|z|)); independent when
 * p >= alpha, equivalently |z| <= Phi^-1(1 - alpha/2). The p-value form is used because the
 * skeleton applies Benjamini-Hochberg to a batch of tests. `partialCorr` and `pcorPvalue` are
 * the PCMCI+ module's implementations (ridge-residualized partial correlation, same Fisher-z).
 *
 * Returns null when the test is not defined (dof <= 0), which keeps the edge.
 */
function ciPvalue(
  data: number[][],
  i: number,
  j: number,
  cond: readonly number[],
): number | null {
  const n = data.length;
  if (n - cond.length - 3 <= 0) return null;
  const r = partialCorr(data, i, j, [...cond]);
  if (!Number.isFinite(r)) return null;
  const p = pcorPvalue(r, n, cond.length);
  return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : null;
}

/**
 * Benjamini-Hochberg rejection mask for one family of CI tests. A rejection means "still
 * dependent": the null here is INDEPENDENCE, so the skeleton deletes an edge precisely when the
 * test is NOT rejected. (Inverting that is the classic way to make PC delete every edge: strong
 * dependence produces p = 0, which BH marks as rejected.)
 *
 * For a single test this reduces to the nominal rule p <= alpha, so a 2-variable skeleton behaves
 * classically. Note the honest limitation: BH controls the rate of falsely declaring DEPENDENCE,
 * not the rate of falsely declaring independence; the latter is not FDR-controlled by any
 * p-value procedure.
 */
function bhReject(pvals: readonly number[], alpha: number): boolean[] {
  const m = pvals.length;
  const rejected = new Array<boolean>(m).fill(false);
  if (m === 0) return rejected;
  const order = pvals
    .map((p, index) => ({ p, index }))
    .sort((a, b) => a.p - b.p || a.index - b.index);
  let k = -1;
  for (let r = 0; r < m; r++) {
    if (order[r]!.p <= (alpha * (r + 1)) / m) k = r;
  }
  for (let r = 0; r <= k; r++) rejected[order[r]!.index] = true;
  return rejected;
}

/** All size-k subsets of `nodes`, ascending, deterministic. */
function subsetsOfSize(nodes: readonly number[], k: number): number[][] {
  const out: number[][] = [];
  if (k < 0 || k > nodes.length) return out;
  const acc: number[] = [];
  const walk = (start: number): void => {
    if (acc.length === k) {
      out.push(acc.slice());
      return;
    }
    for (let i = start; i < nodes.length; i++) {
      acc.push(nodes[i]!);
      walk(i + 1);
      acc.pop();
    }
  };
  walk(0);
  return out;
}

// ---------------------------------------------------------------------------
// Internal PAG representation
// ---------------------------------------------------------------------------

interface MutableEdge {
  u: number;
  v: number;
  markU: EdgeMark;
  markV: EdgeMark;
}

type EdgeMap = Map<string, MutableEdge>;

function pairKey(i: number, j: number): string {
  return i < j ? `${i},${j}` : `${j},${i}`;
}

function toEdgeMap(edges: readonly FciEdge[], d: number): EdgeMap {
  const g: EdgeMap = new Map();
  for (const e of edges) {
    if (e.u === e.v) throw new Error("pag: self-loop");
    if (e.u < 0 || e.v < 0 || e.u >= d || e.v >= d) throw new Error("pag: node out of range");
    const u = Math.min(e.u, e.v);
    const v = Math.max(e.u, e.v);
    const key = pairKey(u, v);
    if (g.has(key)) throw new Error(`pag: duplicate edge ${u}-${v}`);
    g.set(key, {
      u,
      v,
      markU: e.u === u ? e.markU : e.markV,
      markV: e.u === u ? e.markV : e.markU,
    });
  }
  return g;
}

function fromEdgeMap(g: EdgeMap): FciEdge[] {
  const out: FciEdge[] = [];
  for (const rec of g.values()) {
    out.push({ u: rec.u, v: rec.v, markU: rec.markU, markV: rec.markV });
  }
  out.sort((a, b) => a.u - b.u || a.v - b.v);
  return out;
}

/** Mark at `i` on edge {i,j}, or null when i and j are not adjacent. */
function markAt(g: EdgeMap, i: number, j: number): EdgeMark | null {
  const rec = g.get(pairKey(i, j));
  if (rec === undefined) return null;
  return rec.u === i ? rec.markU : rec.markV;
}

/** Set the mark at `i` on edge {i,j}. Returns true only when the mark actually changed. */
function setMark(g: EdgeMap, i: number, j: number, mark: EdgeMark): boolean {
  const rec = g.get(pairKey(i, j));
  if (rec === undefined) return false;
  const current = rec.u === i ? rec.markU : rec.markV;
  if (current === mark) return false;
  if (rec.u === i) rec.markU = mark;
  else rec.markV = mark;
  return true;
}

function isAdj(g: EdgeMap, i: number, j: number): boolean {
  return g.has(pairKey(i, j));
}

function neighborsOf(g: EdgeMap, i: number): number[] {
  const out: number[] = [];
  for (const rec of g.values()) {
    if (rec.u === i) out.push(rec.v);
    else if (rec.v === i) out.push(rec.u);
  }
  out.sort((a, b) => a - b);
  return out;
}

function adjacencyPairs(g: EdgeMap): [number, number][] {
  const out: [number, number][] = [];
  for (const rec of g.values()) out.push([rec.u, rec.v]);
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out;
}

function directedEdge(g: EdgeMap, from: number, to: number): boolean {
  return markAt(g, from, to) === "tail" && markAt(g, to, from) === "arrowhead";
}

/** True when a directed path from -> ... -> to exists (length >= 1). */
function hasDirectedPath(g: EdgeMap, from: number, to: number, d: number): boolean {
  const seen = new Array<boolean>(d).fill(false);
  const stack: number[] = [from];
  seen[from] = true;
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const next of neighborsOf(g, cur)) {
      if (!directedEdge(g, cur, next)) continue;
      if (next === to) return true;
      if (seen[next]) continue;
      seen[next] = true;
      stack.push(next);
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Phase 1: skeleton (PC adjacency search with BH-FDR batches)
// ---------------------------------------------------------------------------

interface SkeletonOutcome {
  readonly g: EdgeMap;
  readonly sepsets: Map<string, readonly number[]>;
  readonly separated: [number, number][];
}

function runSkeleton(
  data: number[][],
  d: number,
  alpha: number,
  maxCond: number,
  conditioning: ((i: number, j: number) => number[] | null) | undefined,
  tested: Set<string>,
): SkeletonOutcome {
  const g: EdgeMap = new Map();
  const sepsets = new Map<string, readonly number[]>();
  const separated: [number, number][] = [];
  for (let i = 0; i < d; i++) {
    for (let j = i + 1; j < d; j++) {
      g.set(pairKey(i, j), { u: i, v: j, markU: "circle", markV: "circle" });
    }
  }

  if (conditioning !== undefined) {
    for (const [i, j] of adjacencyPairs(g)) {
      const s = conditioning(i, j);
      if (s === null) continue;
      const set = [...s].filter((c) => c !== i && c !== j).sort((a, b) => a - b);
      g.delete(pairKey(i, j));
      sepsets.set(pairKey(i, j), set);
      separated.push([i, j]);
    }
    return { g, sepsets, separated };
  }

  for (let l = 0; l <= maxCond; l++) {
    // Snapshot the adjacency at the start of the level so the batch is order-independent.
    const pairs = adjacencyPairs(g);
    const batch: { i: number; j: number; S: number[]; p: number }[] = [];
    for (const [i, j] of pairs) {
      if (!isAdj(g, i, j)) continue;
      const others = neighborsOf(g, i).filter((v) => v !== j);
      if (others.length < l) continue;
      for (const S of subsetsOfSize(others, l)) {
        const key = `${pairKey(i, j)}|${S.join(",")}`;
        if (tested.has(key)) continue;
        tested.add(key);
        const p = ciPvalue(data, i, j, S);
        if (p === null) continue;
        batch.push({ i, j, S, p });
      }
    }
    if (batch.length === 0) continue;
    const dependent = bhReject(
      batch.map((t) => t.p),
      alpha,
    );
    // An edge is deleted only by a NON-rejected test (independence). Per pair keep the single
    // most independent separating set: the largest p among the non-rejected candidates.
    const best = new Map<string, { i: number; j: number; S: number[]; p: number }>();
    for (let t = 0; t < batch.length; t++) {
      if (dependent[t]) continue;
      const cur = batch[t]!;
      const key = pairKey(cur.i, cur.j);
      const prev = best.get(key);
      if (prev === undefined || cur.p > prev.p) best.set(key, cur);
    }
    for (const [key, hit] of best) {
      if (!g.has(key)) continue;
      g.delete(key);
      sepsets.set(key, hit.S);
      separated.push([hit.i, hit.j]);
    }
  }
  return { g, sepsets, separated };
}

// ---------------------------------------------------------------------------
// Phase 2: Possible-D-Sep
// ---------------------------------------------------------------------------

function inTriangle(g: EdgeMap, v: number): boolean {
  const nb = neighborsOf(g, v);
  for (let a = 0; a < nb.length; a++) {
    for (let b = a + 1; b < nb.length; b++) {
      if (isAdj(g, nb[a]!, nb[b]!)) return true;
    }
  }
  return false;
}

function isColliderOn(g: EdgeMap, prev: number, v: number, next: number): boolean {
  return markAt(g, v, prev) === "arrowhead" && markAt(g, v, next) === "arrowhead";
}

/**
 * Possible-D-Sep(a,b) on the current graph: every node c != a,b for which there is a path from
 * a to c whose interior nodes are each a collider on the path or a member of a triangle.
 * `b` is blocked as an interior node (the pair's own edge is never a conduit).
 *
 * This is the full definition, not an approximation of it. State is (previous, current) so a
 * node can be legitimately revisited from a different direction; the visited set bounds the walk.
 */
function possibleDSepInternal(g: EdgeMap, a: number, b: number): number[] {
  const out = new Set<number>();
  const seen = new Set<string>();
  const stack: { prev: number; cur: number }[] = [];
  for (const c of neighborsOf(g, a)) {
    if (c === b) continue;
    out.add(c);
    stack.push({ prev: a, cur: c });
  }
  while (stack.length > 0) {
    const { prev, cur } = stack.pop()!;
    const state = `${prev}|${cur}`;
    if (seen.has(state)) continue;
    seen.add(state);
    for (const next of neighborsOf(g, cur)) {
      if (next === prev || next === b) continue;
      // `cur` is an interior node here: it must be a collider on prev-cur-next, or a triangle member.
      const allowed = isColliderOn(g, prev, cur, next) || inTriangle(g, cur);
      if (!allowed) continue;
      out.add(next);
      stack.push({ prev: cur, cur: next });
    }
  }
  out.delete(a);
  out.delete(b);
  return [...out].sort((x, y) => x - y);
}

/** Public wrapper: Possible-D-Sep of (a,b) for a supplied PAG. */
export function possibleDSep(
  d: number,
  edges: readonly FciEdge[],
  a: number,
  b: number,
): number[] {
  const g = toEdgeMap(edges, d);
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error("possibleDSep: bad nodes");
  return possibleDSepInternal(g, a, b);
}

// ---------------------------------------------------------------------------
// Phase 3: orientation
// ---------------------------------------------------------------------------

/** R0: unshielded triple i - k - j with k not in sepset(i,j) becomes i *-> k <-* j. */
function orientColliders(
  g: EdgeMap,
  sepsets: ReadonlyMap<string, readonly number[]>,
  d: number,
): boolean {
  let changed = false;
  for (const [key, sep] of sepsets) {
    const parts = key.split(",");
    const i = Number(parts[0]);
    const j = Number(parts[1]);
    if (isAdj(g, i, j)) continue;
    for (let k = 0; k < d; k++) {
      if (k === i || k === j) continue;
      if (!isAdj(g, k, i) || !isAdj(g, k, j)) continue;
      if (sep.includes(k)) continue;
      if (setMark(g, k, i, "arrowhead")) changed = true;
      if (setMark(g, k, j, "arrowhead")) changed = true;
    }
  }
  return changed;
}

/** R1: A *-> B o-* C with A,C non-adjacent forces B -> C. */
function ruleR1(g: EdgeMap): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const b of [rec.u, rec.v]) {
      for (const a of neighborsOf(g, b)) {
        if (markAt(g, b, a) !== "arrowhead") continue; // a *-> b
        for (const c of neighborsOf(g, b)) {
          if (c === a) continue;
          if (markAt(g, b, c) !== "circle") continue; // b o-* c
          if (isAdj(g, a, c)) continue;
          if (setMark(g, b, c, "tail")) changed = true;
          if (setMark(g, c, b, "arrowhead")) changed = true;
        }
      }
    }
  }
  return changed;
}

/** R2: A -> B *-> C or A *-> B -> C, with A o-* C, forces an arrowhead at C. */
function ruleR2(g: EdgeMap): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const a of [rec.u, rec.v]) {
      for (const c of [rec.u, rec.v]) {
        if (a === c) continue;
        if (markAt(g, a, c) !== "circle") continue; // a o-* c
        for (const b of neighborsOf(g, a)) {
          if (b === c || !isAdj(g, b, c)) continue;
          const aToB = markAt(g, a, b) === "tail" && markAt(g, b, a) === "arrowhead";
          const bToC = markAt(g, b, c) === "tail" && markAt(g, c, b) === "arrowhead";
          const arrowAtB = markAt(g, b, a) === "arrowhead";
          const arrowAtC = markAt(g, c, b) === "arrowhead";
          if ((aToB && arrowAtC) || (arrowAtB && bToC)) {
            if (setMark(g, c, a, "arrowhead")) changed = true;
          }
        }
      }
    }
  }
  return changed;
}

/**
 * R3: A *-> B <-* C and A *-> D <-* C with A,C non-adjacent and D o-* B forces an arrowhead at D.
 * The circle at D is the only mark that can change (see header note 3).
 */
function ruleR3(g: EdgeMap): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const b of [rec.u, rec.v]) {
      for (const a of neighborsOf(g, b)) {
        if (markAt(g, b, a) !== "arrowhead") continue; // a *-> b
        for (const c of neighborsOf(g, b)) {
          if (c === a || isAdj(g, a, c)) continue;
          if (markAt(g, b, c) !== "arrowhead") continue; // c *-> b
          for (const dd of neighborsOf(g, a)) {
            if (dd === b || dd === c || !isAdj(g, dd, c) || !isAdj(g, dd, b)) continue;
            if (markAt(g, dd, a) !== "arrowhead") continue; // a *-> d
            if (markAt(g, dd, c) !== "arrowhead") continue; // c *-> d
            if (markAt(g, dd, b) !== "circle") continue; // d o-* b
            if (setMark(g, dd, b, "arrowhead")) changed = true;
          }
        }
      }
    }
  }
  return changed;
}

/** True when `v` is a parent of `c`: v -> c. */
function isParentOf(g: EdgeMap, v: number, c: number): boolean {
  return markAt(g, v, c) === "tail" && markAt(g, c, v) === "arrowhead";
}

/**
 * Search for a discriminating path pi = <D, ..., A, B, C> for B, returning D or null.
 *
 * Zhang 2008 definition: A adjacent to B, B adjacent to C, A and C non-adjacent, and every
 * vertex on pi between D and A is a collider on pi and a parent of C. The walk runs backwards
 * from A, so the collider test at an interior node needs its predecessor on that side.
 */
function findDiscriminatingPaths(
  g: EdgeMap,
  a: number,
  b: number,
  c: number,
  d: number,
): number[] {
  const out: number[] = [];
  const onPath = new Set<number>([a, b, c]);
  const walk = (prev: number, cur: number, depth: number): void => {
    // Every node reached from A is a legal far endpoint D: the interior nodes between D and A
    // are exactly the ones the walk already validated when it moved past them.
    out.push(cur);
    if (depth > d) return;
    for (const next of neighborsOf(g, cur)) {
      if (next === prev || onPath.has(next)) continue;
      // `cur` is interior once we extend: it must be a collider on prev-cur-next and a parent of C.
      if (!isParentOf(g, cur, c)) continue;
      if (!isColliderOn(g, prev, cur, next)) continue;
      onPath.add(cur);
      walk(cur, next, depth + 1);
      onPath.delete(cur);
    }
  };
  for (const first of neighborsOf(g, a)) {
    if (first === b || first === c) continue;
    walk(a, first, 1);
  }
  return out;
}

/**
 * R4: if pi = <D,...,A,B,C> is a discriminating path for B and B o-* C, then B -> C when
 * B is in sepset(D,C), otherwise A *-> B *-> C.
 */
function ruleR4(g: EdgeMap, sepsets: ReadonlyMap<string, readonly number[]>, d: number): boolean {
  let changed = false;
  for (const [b, c] of adjacencyPairs(g)) {
    for (const [bb, cc] of [
      [b, c],
      [c, b],
    ] as const) {
      if (markAt(g, bb, cc) !== "circle") continue;
      for (const a of neighborsOf(g, bb)) {
        if (a === cc || isAdj(g, a, cc)) continue;
        if (markAt(g, bb, a) === "tail") continue; // collider premise at bb fails
        for (const dNode of findDiscriminatingPaths(g, a, bb, cc, d)) {
          const sep = sepsets.get(pairKey(dNode, cc));
          if (sep === undefined) continue; // no separating set: cannot decide, do not guess
          if (sep.includes(bb)) {
            if (setMark(g, bb, cc, "tail")) changed = true;
            if (setMark(g, cc, bb, "arrowhead")) changed = true;
          } else {
            if (setMark(g, bb, a, "arrowhead")) changed = true;
            if (setMark(g, cc, bb, "arrowhead")) changed = true;
          }
        }
      }
    }
  }
  return changed;
}

/**
 * The descendant-arrowhead rule: A -> B -> C or A -> B o-> C, with A o-* C, forces an
 * arrowhead at C.
 *
 * THIS IS NOT ZHANG'S R8. It was previously mislabelled as such in this module. Zhang's R8
 * turns a partially directed edge `A o-> C` into a DIRECTED one by writing a TAIL at the
 * NEAR end (Zhang 2008, p. 1881: "R8 If alpha -> beta -> gamma or alpha -o beta -> gamma,
 * and alpha o-> gamma, orient alpha o-> gamma as alpha -> gamma"). That rule is now
 * `ruleR8` below, transcribed from the paper.
 *
 * This rule instead writes an ARROWHEAD at the FAR end of an edge whose near end is a
 * circle. It is sound by the descendant argument: the arrowhead at C on the B-C edge is
 * definite, so C is a child of B, and A -> B makes C a descendant of A, so the A-C edge
 * cannot be C -> A. That is why the branch requires `b o-> c` (arrowhead at C) and not
 * merely a circle at B: with a circle at C the point C need not be a descendant of A, and
 * the branch would orient AGAINST a rule. That was found and fixed on 2026-10-20; the
 * regression test is "prevents the descendant-arrowhead rule from ORIENTING AGAINST A
 * RULE" in fci-pag.test.ts.
 */
function ruleArrowheadAtDescendant(g: EdgeMap): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const a of [rec.u, rec.v]) {
      for (const c of [rec.u, rec.v]) {
        if (a === c) continue;
        if (markAt(g, a, c) !== "circle") continue;
        for (const b of neighborsOf(g, a)) {
          if (b === c || !isAdj(g, b, c)) continue;
          const aToB = markAt(g, a, b) === "tail" && markAt(g, b, a) === "arrowhead";
          if (!aToB) continue;
          const bToC = markAt(g, b, c) === "tail" && markAt(g, c, b) === "arrowhead";
          // THE `b o-> c` DISJUNCT, AND THE GUARD THAT MAKES IT SOUND.
          //
          // `markAt(g, b, c) === "circle"` says the b-c edge is `b o-* c` --
          // circle at b. That ALONE is not enough to conclude anything
          // about the a-c edge, because `b o-* c` is consistent with
          // `c -> b` as well as `b -> c`, and under `c -> b` the point c
          // is NOT a descendant of a, so no arrowhead at c is forced.
          //
          // MEASURED 2026-10-20. The branch as it stood checked only the
          // circle at b, and on the input
          //
          //     0 -> 1,  1 o-- 2,  0 o-o 2
          //
          // it wrote an arrowhead at 2 on the 0-2 edge. But the MAG
          //
          //     2 -> 0,  0 -> 1,  2 -> 1
          //
          // is CONSISTENT with that input -- 2->0 puts a tail at 2 on the
          // 0-2 edge, not an arrowhead -- so the arrowhead was NOT forced.
          // The module's own header says "It never orients against a
          // rule", and this branch was orienting against one.
          //
          // THE FIX: require the mark at C on the b-c edge to be an
          // ARROWHEAD, i.e. `b o-> c`. Then c is a sink of the b-c
          // relation -- whether b -> c or b <-> c -- so c IS a descendant
          // of a, and the arrowhead at c is forced. That is Zhang's R2
          // second disjunct (`A *-> B -> C`), not a new rule.
          //
          // With a CIRCLE at c the branch is left alone: it fails to
          // orient, which is the safe direction.
          const bCircleC = markAt(g, b, c) === "circle" && markAt(g, c, b) === "arrowhead";
          if (bToC || bCircleC) {
            if (setMark(g, c, a, "arrowhead")) changed = true;
          }
        }
      }
    }
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Zhang (2008) R5-R10 -- transcribed from the publisher PDF.
//
// SOURCE: Zhang, J. (2008). "On the completeness of orientation rules for causal discovery in
// the presence of latent confounders and selection bias." Artificial Intelligence
// 172(16-17):1873-1896. doi:10.1016/j.artint.2008.08.001. Journal pages 1880-1881
// (PDF pp. 8-9), Section 4 "Extra orientation rules and tail completeness".
//
// VERBATIM, journal p. 1880 (Definitions 9-10 and R5-R7):
//
//   Definition 9 (uncovered path). In a PMG, a path p = <V0,...,Vn> is said to be uncovered if
//   for every 1 <= i <= n-1, V(i-1) and V(i+1) are not adjacent, i.e., if every consecutive
//   triple on the path is unshielded.
//
//   Definition 10 (potentially directed path). In a PMG, a path p = <V0,...,Vn> is said to be
//   potentially directed (abbreviated as p.d.) from V0 to Vn if for every 0 <= i <= n-1, the
//   edge between Vi and V(i+1) is not into Vi or out of V(i+1). ... A special case of a p.d.
//   path is where every edge on the path is of the form o-o; we call such a path a circle path.
//
//   R5 For every (remaining) alpha o-o beta, if there is an uncovered circle path
//      p = <alpha, gamma, ..., theta, beta> between alpha and beta s.t. alpha, theta are not
//      adjacent and beta, gamma are not adjacent, then orient alpha o-o beta and every edge on
//      p as undirected edges (-).
//
//   R6 If alpha - beta o-* gamma (alpha and gamma may or may not be adjacent), then orient
//      beta o-* gamma as beta -* gamma.
//
//   R7 If alpha -o beta o-* gamma, and alpha, gamma are not adjacent, then orient beta o-* gamma
//      as beta -* gamma.
//
// VERBATIM, journal p. 1881 (R8-R10):
//
//   R8 If alpha -> beta -> gamma or alpha -o beta -> gamma, and alpha o-> gamma, orient alpha
//      o-> gamma as alpha -> gamma.
//
//   R9 If alpha o-> gamma, and p = <alpha, beta, theta, ..., gamma> is an uncovered p.d. path
//      from alpha to gamma such that gamma and beta are not adjacent, then orient alpha o-> gamma
//      as alpha -> gamma.
//
//   R10 Suppose alpha o-> gamma, beta -> gamma <- theta, p1 is an uncovered p.d. path from
//      alpha to beta, and p2 is an uncovered p.d. path from alpha to theta. Let mu be the vertex
//      adjacent to alpha on p1 (mu could be beta), and omega be the vertex adjacent to alpha on
//      p2 (omega could be theta). If mu and omega are distinct, and are not adjacent, then orient
//      alpha o-> gamma as alpha -> gamma.
//
// MARK VOCABULARY. Zhang writes an edge as <mark at X>--<mark at Y>, so `o-o` is a circle at
// both ends, `o-*` a circle at the first end and anything at the second, `-o` a tail at the
// first end and a circle at the second, `o->` a circle at the first end and an arrowhead at
// the second, and a bare `-` an UNDIRECTED edge -- tail at both ends, which is how this module
// already represents one (see the MARK RULE note in the header).
//
// NOTE ON R8. Zhang's R8 writes a TAIL at the near end (it turns `o->` into `->`). It is NOT
// the rule this module previously called R8; that one writes an ARROWHEAD at the far end and is
// now named `ruleArrowheadAtDescendant`.
//
// NOTE ON THE PATH SEARCHES. R5, R9 and R10 all ask for the existence of a path with local
// constraints (unshielded consecutive triples, p.d. steps). Such a search is exponential in
// the worst case, so it is bounded: PATH_SEARCH_BUDGET caps the number of edges examined, and
// the depth is capped at the node count. When the budget is exhausted the search returns
// "no path", which is the SAFE direction -- the rule then fails to fire and nothing is
// oriented. A rule that fails to fire is incomplete; a rule that fires wrongly is unsound.
// ---------------------------------------------------------------------------

/** A bound on the path searches below, so a dense graph cannot make a rule run forever. */
const PATH_SEARCH_BUDGET = 20000;

/** The edge {a,b} carries a circle at BOTH ends (Zhang's `o-o`). */
function isCircleCircle(g: EdgeMap, a: number, b: number): boolean {
  return markAt(g, a, b) === "circle" && markAt(g, b, a) === "circle";
}

/** The edge {a,b} is undirected: a tail at both ends (Zhang's bare `-`). */
function isUndirected(g: EdgeMap, a: number, b: number): boolean {
  return markAt(g, a, b) === "tail" && markAt(g, b, a) === "tail";
}

/**
 * Zhang Definition 10: the step u -> v is potentially directed, i.e. the edge between u and v
 * is "not into u" (u carries no arrowhead) and "not out of v" (v carries no tail).
 */
function isPdStep(g: EdgeMap, u: number, v: number): boolean {
  return markAt(g, u, v) !== "arrowhead" && markAt(g, v, u) !== "tail";
}

/**
 * R5's antecedent search: an uncovered circle path from `a` to `b`, or null.
 *
 * "Circle path" (Def 10, special case): every edge on the path is `o-o`.
 * "Uncovered" (Def 9): every consecutive triple on the path is unshielded.
 * R5 adds the two wrap-around conditions that make the CYCLE <a,...,b,a> uncovered: `a` is
 * non-adjacent to the second-to-last node and `b` is non-adjacent to the second node.
 *
 * Returns the path as node indices (including both endpoints) or null.
 */
function findUncoveredCirclePath(g: EdgeMap, a: number, b: number, d: number): number[] | null {
  // BFS over path LENGTH, so the witness found is the SHORTEST one. That is the same choice
  // pcalg's minUncovCircPath makes, and it keeps the set of edges turned undirected as small
  // as the rule allows: a longer witness would orient MORE edges, and while each application
  // of R5 is sound, the minimal witness is the one the rule is stated over.
  let frontier: number[][] = [[a]];
  let budget = PATH_SEARCH_BUDGET;
  while (frontier.length > 0) {
    const next: number[][] = [];
    for (const path of frontier) {
      const last = path[path.length - 1]!;
      for (const nb of neighborsOf(g, last)) {
        if (budget-- <= 0) return null;
        if (path.includes(nb)) continue;
        if (!isCircleCircle(g, last, nb)) continue;
        if (path.length >= 2) {
          const prev = path[path.length - 2]!;
          if (isAdj(g, prev, nb)) continue; // every consecutive triple must be unshielded
        }
        const extended = [...path, nb];
        if (nb === b) {
          // The cycle's two wrap-around triples: (theta, b, a) and (b, a, gamma).
          const gamma = extended[1]!;
          const theta = extended[extended.length - 2]!;
          if (extended.length >= 4 && !isAdj(g, a, theta) && !isAdj(g, b, gamma)) return extended;
          continue; // b is the endpoint: the path ends here
        }
        if (extended.length < d) next.push(extended);
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Is there an uncovered potentially directed path from `from` to `to` whose SECOND node is
 * `second`?
 *
 * "p.d." (Def 10): every step is not into its tail and not out of its head.
 * "Uncovered" (Def 9): every consecutive triple on the path is unshielded.
 *
 * `second === to` is the single-edge case (the path is just the edge from--to), which has no
 * consecutive triple and is therefore uncovered. R10 needs it: "mu could be beta".
 */
function uncoveredPdPathExists(
  g: EdgeMap,
  from: number,
  to: number,
  second: number,
  d: number,
): boolean {
  if (from === second || !isAdj(g, from, second)) return false;
  if (!isPdStep(g, from, second)) return false;
  if (to === second) return true;
  const path: number[] = [from, second];
  const onPath = new Set<number>([from, second]);
  let budget = PATH_SEARCH_BUDGET;
  const walk = (): boolean => {
    const last = path[path.length - 1]!;
    for (const next of neighborsOf(g, last)) {
      if (budget-- <= 0) return false;
      if (onPath.has(next)) continue;
      if (!isPdStep(g, last, next)) continue;
      if (path.length >= 2) {
        const prev = path[path.length - 2]!;
        if (isAdj(g, prev, next)) continue; // every consecutive triple must be unshielded
      }
      path.push(next);
      onPath.add(next);
      if (next === to) return true;
      if (path.length < d && walk()) return true;
      path.pop();
      onPath.delete(next);
    }
    return false;
  };
  return walk();
}

/**
 * R5: for every remaining circle-circle edge, an uncovered circle path makes that edge AND
 * every edge on the path undirected.
 */
function ruleR5(g: EdgeMap, d: number): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const [alpha, beta] of [
      [rec.u, rec.v],
      [rec.v, rec.u],
    ] as const) {
      if (!isCircleCircle(g, alpha, beta)) continue;
      const path = findUncoveredCirclePath(g, alpha, beta, d);
      if (path === null) continue;
      if (setMark(g, alpha, beta, "tail")) changed = true;
      if (setMark(g, beta, alpha, "tail")) changed = true;
      for (let i = 0; i + 1 < path.length; i++) {
        const u = path[i]!;
        const v = path[i + 1]!;
        if (setMark(g, u, v, "tail")) changed = true;
        if (setMark(g, v, u, "tail")) changed = true;
      }
    }
  }
  return changed;
}

/** R6: an undirected edge at beta turns beta's circle toward gamma into a tail. */
function ruleR6(g: EdgeMap): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const [beta, gamma] of [
      [rec.u, rec.v],
      [rec.v, rec.u],
    ] as const) {
      if (markAt(g, beta, gamma) !== "circle") continue; // beta o-* gamma
      let hasUndirected = false;
      for (const alpha of neighborsOf(g, beta)) {
        if (isUndirected(g, alpha, beta)) {
          hasUndirected = true;
          break;
        }
      }
      if (!hasUndirected) continue;
      if (setMark(g, beta, gamma, "tail")) changed = true;
    }
  }
  return changed;
}

/**
 * R7: alpha -o beta o-* gamma with alpha, gamma non-adjacent turns beta's circle toward
 * gamma into a tail.
 */
function ruleR7(g: EdgeMap): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const [beta, gamma] of [
      [rec.u, rec.v],
      [rec.v, rec.u],
    ] as const) {
      if (markAt(g, beta, gamma) !== "circle") continue; // beta o-* gamma
      for (const alpha of neighborsOf(g, beta)) {
        if (alpha === gamma) continue;
        if (markAt(g, alpha, beta) !== "tail") continue; // alpha -o beta
        if (markAt(g, beta, alpha) !== "circle") continue;
        // alpha and gamma must be non-adjacent for the circle to become a tail.
        if (isAdj(g, alpha, gamma)) continue;
        if (setMark(g, beta, gamma, "tail")) changed = true;
        break;
      }
    }
  }
  return changed;
}

/**
 * R8: alpha -> beta -> gamma or alpha -o beta -> gamma, with alpha o-> gamma, turns the
 * circle at alpha into a tail -- the edge becomes alpha -> gamma.
 */
function ruleR8(g: EdgeMap): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const [alpha, gamma] of [
      [rec.u, rec.v],
      [rec.v, rec.u],
    ] as const) {
      if (markAt(g, alpha, gamma) !== "circle") continue; // alpha o-> gamma
      if (markAt(g, gamma, alpha) !== "arrowhead") continue;
      for (const beta of neighborsOf(g, alpha)) {
        if (beta === gamma) continue;
        if (markAt(g, alpha, beta) !== "tail") continue; // alpha -> beta, or alpha -o beta
        const atBeta = markAt(g, beta, alpha);
        if (atBeta !== "arrowhead" && atBeta !== "circle") continue;
        if (markAt(g, beta, gamma) !== "tail") continue; // beta -> gamma
        if (markAt(g, gamma, beta) !== "arrowhead") continue;
        if (setMark(g, alpha, gamma, "tail")) changed = true;
        break;
      }
    }
  }
  return changed;
}

/**
 * R9: alpha o-> gamma, with an uncovered p.d. path from alpha to gamma whose second node is
 * non-adjacent to gamma, turns the circle at alpha into a tail.
 */
function ruleR9(g: EdgeMap, d: number): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const [alpha, gamma] of [
      [rec.u, rec.v],
      [rec.v, rec.u],
    ] as const) {
      if (markAt(g, alpha, gamma) !== "circle") continue; // alpha o-> gamma
      if (markAt(g, gamma, alpha) !== "arrowhead") continue;
      for (const beta of neighborsOf(g, alpha)) {
        if (beta === gamma) continue;
        if (!isPdStep(g, alpha, beta)) continue;
        if (isAdj(g, beta, gamma)) continue; // gamma and beta must be non-adjacent
        if (!uncoveredPdPathExists(g, alpha, gamma, beta, d)) continue;
        if (setMark(g, alpha, gamma, "tail")) changed = true;
        break;
      }
    }
  }
  return changed;
}

/**
 * R10: alpha o-> gamma with two parents beta -> gamma <- theta, and two uncovered p.d. paths
 * from alpha (one to beta, one to theta) whose first steps land on distinct, non-adjacent
 * vertices, turns the circle at alpha into a tail.
 */
function ruleR10(g: EdgeMap, d: number): boolean {
  let changed = false;
  for (const rec of g.values()) {
    for (const [alpha, gamma] of [
      [rec.u, rec.v],
      [rec.v, rec.u],
    ] as const) {
      if (markAt(g, alpha, gamma) !== "circle") continue; // alpha o-> gamma
      if (markAt(g, gamma, alpha) !== "arrowhead") continue;
      const parents: number[] = [];
      for (const x of neighborsOf(g, gamma)) {
        if (markAt(g, x, gamma) === "tail" && markAt(g, gamma, x) === "arrowhead") parents.push(x);
      }
      if (parents.length < 2) continue;
      // `fired` is LOCAL to this edge, and it must be declared OUTSIDE the beta/theta loops:
      // the intent is "orient this edge at most once, then stop trying the other parent
      // pairs". Using the shared `changed` flag instead would make the breaks below skip the
      // remaining (alpha,gamma) pairs as soon as ANY earlier edge was oriented, so only one
      // edge per call would ever be done -- and the result would depend on iteration order
      // rather than on the rule.
      let fired = false;
      for (const beta of parents) {
        for (const theta of parents) {
          if (beta === theta) continue;
          for (const mu of neighborsOf(g, alpha)) {
            if (!uncoveredPdPathExists(g, alpha, beta, mu, d)) continue;
            for (const omega of neighborsOf(g, alpha)) {
              if (omega === mu) continue;
              if (isAdj(g, mu, omega)) continue;
              if (!uncoveredPdPathExists(g, alpha, theta, omega, d)) continue;
              if (setMark(g, alpha, gamma, "tail")) changed = true;
              fired = true;
              break;
            }
            if (fired) break;
          }
          if (fired) break;
        }
        if (fired) break;
      }
    }
  }
  return changed;
}

/**
 * Ancestral completion, standing in for R9/R10: a circle is resolved only when the alternative
 * would create a directed or almost-directed cycle, so every completion here is forced.
 *  - circle at v and u => v  -> the arrowhead at v (u -> v) would close a cycle: v -> u.
 *  - circle at v and v => u  -> the tail at v (v -> u) would close a cycle: arrowhead at v.
 */
function completeAncestral(g: EdgeMap, d: number): boolean {
  let changed = false;
  for (const [u, v] of adjacencyPairs(g)) {
    for (const [to, from] of [
      [v, u],
      [u, v],
    ] as const) {
      if (markAt(g, to, from) !== "circle") continue;
      if (hasDirectedPath(g, from, to, d)) {
        if (setMark(g, to, from, "arrowhead")) changed = true;
      } else if (hasDirectedPath(g, to, from, d)) {
        if (setMark(g, to, from, "tail")) changed = true;
      }
    }
  }
  return changed;
}

/**
 * The orientation rules, as individually switchable ids.
 *
 * WHY THIS EXISTS. Every one of these rules is applied inside one fixpoint loop, and the
 * rules INTERACT: on a hand-built graph, `completeAncestral` and R2 can fire on exactly the
 * same configuration as R8 or R9. A test that asserts "the graph came out oriented" then
 * passes even when the rule it names is deleted -- it is testing the fixpoint, not the rule.
 * That is not a hypothetical: the mutation sweep in
 * packages/prediction-engine/reconciliation/_mutation_sweep_r5_r10.mjs caught exactly that
 * for R8.
 *
 * pcalg's `udag2pag` has the same switch (`rules = c(TRUE, TRUE, ...)`) and the same reason.
 * Exposing it here means each rule can be exercised on its own, which is the only way a test
 * can say anything specific about THAT rule.
 */
export type OrientationRule =
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "descendantArrowhead"
  | "R5"
  | "R6"
  | "R7"
  | "R8"
  | "R9"
  | "R10"
  | "ancestralCompletion";

/** Every rule id, in the order the fixpoint applies them. */
export const ALL_ORIENTATION_RULES: readonly OrientationRule[] = [
  "R1",
  "R2",
  "R3",
  "R4",
  "descendantArrowhead",
  "R5",
  "R6",
  "R7",
  "R8",
  "R9",
  "R10",
  "ancestralCompletion",
];

function applyOrientationRules(
  g: EdgeMap,
  sepsets: ReadonlyMap<string, readonly number[]>,
  d: number,
  enabled?: ReadonlySet<OrientationRule>,
): void {
  const on = (rule: OrientationRule): boolean => enabled === undefined || enabled.has(rule);
  let changed = true;
  let guard = 0;
  while (changed && guard < 500) {
    guard++;
    changed = false;
    if (on("R1") && ruleR1(g)) changed = true;
    if (on("R2") && ruleR2(g)) changed = true;
    if (on("R3") && ruleR3(g)) changed = true;
    if (on("R4") && ruleR4(g, sepsets, d)) changed = true;
    if (on("descendantArrowhead") && ruleArrowheadAtDescendant(g)) changed = true;
    // Zhang (2008) R5-R10. R5 first, because R6 and R7 consume the undirected edges it
    // produces; R8-R10 then complete the tails R0-R4 leave behind.
    if (on("R5") && ruleR5(g, d)) changed = true;
    if (on("R6") && ruleR6(g)) changed = true;
    if (on("R7") && ruleR7(g)) changed = true;
    if (on("R8") && ruleR8(g)) changed = true;
    if (on("R9") && ruleR9(g, d)) changed = true;
    if (on("R10") && ruleR10(g, d)) changed = true;
    if (on("ancestralCompletion") && completeAncestral(g, d)) changed = true;
  }
  if (guard >= 500) throw new Error("fci: orientation rules did not reach a fixpoint");
}

/**
 * Apply collider orientation (R0) and Zhang's rules to a supplied PAG and return the closed PAG.
 * Exposed so each rule can be exercised directly on a hand-built graph; `fci` uses the same code.
 *
 * @param rules when given, ONLY these rules are applied. R0 (collider orientation) always
 *              runs, because it is the orientation of the sepsets rather than a rule that
 *              competes with the others.
 */
export function orientPag(
  d: number,
  edges: readonly FciEdge[],
  sepsets: ReadonlyMap<string, readonly number[]> = new Map(),
  rules?: readonly OrientationRule[],
): FciEdge[] {
  const g = toEdgeMap(edges, d);
  orientColliders(g, sepsets, d);
  applyOrientationRules(g, sepsets, d, rules === undefined ? undefined : new Set(rules));
  return fromEdgeMap(g);
}

// ---------------------------------------------------------------------------
// FCI
// ---------------------------------------------------------------------------

function possibleDsepPrune(
  data: number[][],
  g: EdgeMap,
  sepsets: Map<string, readonly number[]>,
  separated: [number, number][],
  alpha: number,
  maxCond: number,
  tested: Set<string>,
  conditioning: ((i: number, j: number) => number[] | null) | undefined,
): boolean {
  if (conditioning !== undefined) {
    // The caller supplied the oracle, so it replaces the statistical re-test here too; otherwise
    // the two phases would disagree about which graph they are describing.
    let removed = false;
    for (const [i, j] of adjacencyPairs(g)) {
      const s = conditioning(i, j);
      if (s === null) continue;
      const set = [...s].filter((c) => c !== i && c !== j).sort((a, b) => a - b);
      g.delete(pairKey(i, j));
      sepsets.set(pairKey(i, j), set);
      separated.push([i, j]);
      removed = true;
    }
    return removed;
  }
  const pairs = adjacencyPairs(g);
  const batch: { i: number; j: number; S: number[]; p: number }[] = [];
  for (const [i, j] of pairs) {
    const pds = possibleDSepInternal(g, i, j).filter((v) => v !== i && v !== j);
    if (pds.length === 0) continue;
    const max = Math.min(maxCond, pds.length);
    for (let l = 0; l <= max; l++) {
      for (const S of subsetsOfSize(pds, l)) {
        const key = `${pairKey(i, j)}|${S.join(",")}`;
        if (tested.has(key)) continue;
        tested.add(key);
        const p = ciPvalue(data, i, j, S);
        if (p === null) continue;
        batch.push({ i, j, S, p });
      }
    }
  }
  if (batch.length === 0) return false;
  const dependent = bhReject(
    batch.map((t) => t.p),
    alpha,
  );
  const best = new Map<string, { i: number; j: number; S: number[]; p: number }>();
  for (let t = 0; t < batch.length; t++) {
    if (dependent[t]) continue;
    const cur = batch[t]!;
    const key = pairKey(cur.i, cur.j);
    const prev = best.get(key);
    if (prev === undefined || cur.p > prev.p) best.set(key, cur);
  }
  let removed = false;
  for (const [key, hit] of best) {
    if (!g.has(key)) continue;
    g.delete(key);
    sepsets.set(key, hit.S);
    separated.push([hit.i, hit.j]);
    removed = true;
  }
  return removed;
}

/**
 * Fast Causal Inference: learn a PAG over the columns of `data` in the presence of possible
 * latent confounders and selection bias.
 *
 * Order of operations: PC skeleton with Fisher-z + BH-FDR per level, R0 collider orientation,
 * Possible-D-Sep re-testing with re-orientation until no edge is deleted, then R1-R4/R8 plus
 * ancestral completion to a fixpoint. See the module header for what is approximated.
 *
 * @param data rows = observations, columns = variables
 * @param opts alpha (FDR level), maxConditioningSetSize, optional separating-set oracle
 */
export function fci(data: number[][], opts: FciOptions = {}): FciResult {
  const n = data.length;
  if (n === 0) throw new Error("fci: need at least one observation");
  const d = data[0]!.length;
  if (d < 2) throw new Error("fci: need at least two variables");
  for (const row of data) {
    if (row.length !== d) throw new Error("fci: ragged data matrix");
  }
  const alpha = opts.alpha ?? 0.05;
  if (!(alpha > 0 && alpha < 1)) throw new Error("fci: alpha must lie in (0,1)");
  const rawMax = opts.maxConditioningSetSize ?? 3;
  if (!Number.isInteger(rawMax) || rawMax < 0) {
    throw new Error("fci: maxConditioningSetSize must be a non-negative integer");
  }
  const maxCond = Math.min(rawMax, Math.max(0, d - 2));

  const tested = new Set<string>();
  const sk = runSkeleton(data, d, alpha, maxCond, opts.conditioning, tested);
  const g = sk.g;
  const sepsets = sk.sepsets;
  const separated = sk.separated;

  orientColliders(g, sepsets, d);
  for (let round = 0; round < 4; round++) {
    const removed = possibleDsepPrune(
      data,
      g,
      sepsets,
      separated,
      alpha,
      maxCond,
      tested,
      opts.conditioning,
    );
    orientColliders(g, sepsets, d);
    if (!removed) break;
  }

  applyOrientationRules(g, sepsets, d);

  const nodes: number[] = [];
  for (let i = 0; i < d; i++) nodes.push(i);
  return {
    nodes,
    edges: fromEdgeMap(g),
    sepsets,
    skeleton: adjacencyPairs(g),
    separated: separated.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    step: "done",
  };
}

// ---------------------------------------------------------------------------
// PAG -> ADMG
// ---------------------------------------------------------------------------

/**
 * Project a PAG onto an ADMG. Mark rule (see the header for the reasoning):
 * tail/arrowhead -> directed; arrowhead/arrowhead -> bidirected; any circle at either end ->
 * bidirected; tail/tail -> bidirected. Nothing is ever promoted to a direction.
 */
export function pagToAdmg(pag: FciResult): PagAdmg {
  const directed: [number, number][] = [];
  const bidirected: [number, number][] = [];
  for (const e of pag.edges) {
    const forward = e.markU === "tail" && e.markV === "arrowhead";
    const backward = e.markU === "arrowhead" && e.markV === "tail";
    if (forward) directed.push([e.u, e.v]);
    else if (backward) directed.push([e.v, e.u]);
    else bidirected.push([e.u, e.v]);
  }
  directed.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  bidirected.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { nodes: [...pag.nodes].sort((a, b) => a - b), directed, bidirected };
}

/**
 * The ADMG the discovery pipeline produced, as the do-calculus graph.
 *
 * THE MISSING LINK. The pipeline (FCI -> DYNOTEARS -> ADMG) and the
 * gate (Shpitser-Pearl ID/IDC over an ADMG) were both complete and
 * neither knew about the other. A caller who had a game matrix and
 * wanted a causal verdict had to know that `discoverCausalStructure`
 * exists, that its `admg` is a `PagAdmg` over NUMERIC node indices,
 * that `admgToCausalADMG` converts it, and that the result's node ids
 * are `v0`, `v1`, ... rather than the signal names the literature
 * edges use. That is four pieces of knowledge to assemble, and a
 * caller who got it wrong would be checking identifiability against
 * a graph with the wrong node names -- which the gate rejects, but
 * with a refusal that looks like "not identified" rather than "you
 * wired it wrong".
 *
 * This is the adapter, and it takes the SIGNAL NAMES so the graph
 * comes out named the way the literature edges name their endpoints.
 *
 * The result's `nodeNames` is the mapping back, so a caller can find
 * which node is which signal.
 */
export interface NamedCausalGraph {
  /** The graph, with node ids equal to the signal names. */
  readonly graph: CausalADMG;
  /** The signal name of each node, in the graph's node order. */
  readonly nodeNames: readonly NodeId[];
}

/**
 * Convert the pipeline's ADMG into a do-calculus graph whose nodes are
 * the SIGNAL NAMES.
 *
 * @param admg   the pipeline's `PagAdmg` (numeric node indices)
 * @param names  the signal name for each numeric node, in index order
 */
export function pipelineGraphToCausalADMG(
  admg: { readonly nodes: readonly number[]; readonly directed: readonly (readonly [number, number])[]; readonly bidirected: readonly (readonly [number, number])[] },
  names: readonly NodeId[],
): NamedCausalGraph {
  const nameOf = (n: number): NodeId => names[n] ?? `v${n}`;
  // The TOPOLOGICAL ORDER comes from `admgToCausalADMG`, which does it
  // with Kahn's algorithm and throws on a directed cycle. This
  // function must not re-implement that: two implementations of a
  // topological sort is two chances to disagree, and the disagreement
  // would show up as a graph the gate accepts in one place and
  // rejects in another.
  //
  // `admgToCausalADMG` is given a NAME FUNCTION, so it is given one
  // that carries the original numeric id. Its node order is then the
  // topological order of the original ids, and the signal names are
  // applied to the ids -- not to the positions, because a signal name
  // belongs to a VARIABLE and not to a position in an ordering.
  const withIds = admgToCausalADMG(
    {
      nodes: [...admg.nodes],
      directed: admg.directed.map(([u, v]) => [u, v] as [number, number]),
      bidirected: admg.bidirected.map(([u, v]) => [u, v] as [number, number]),
    },
    (n) => `n${n}`,
  );
  const order: number[] = withIds.nodes.map((id) => Number(id.slice(1)));
  // Any node the numbered graph did not emit (should not happen) goes
  // at the end, so nothing is silently dropped.
  for (const n of admg.nodes) if (!order.includes(n)) order.push(n);

  const nodes = order.map(nameOf);
  const pos = new Map<number, number>();
  order.forEach((n, i) => pos.set(n, i));

  // The edges are sorted by their SOURCE's position, so the directed
  // list comes out in the same order the nodes do.
  const directed = admg.directed
    .map(([u, v]) => ({ from: u, to: v }))
    .sort((a, b) => pos.get(a.from)! - pos.get(b.from)! || pos.get(a.to)! - pos.get(b.to)!)
    .map((e) => [nameOf(e.from), nameOf(e.to)] as const);
  const bidirected = admg.bidirected.map(([u, v]) => [nameOf(u), nameOf(v)] as const);

  // The order is topological BY CONSTRUCTION now, but the CausalADMG
  // type's requirement is load-bearing, so it is checked rather than
  // assumed.
  const namePos = new Map<NodeId, number>();
  nodes.forEach((n, i) => namePos.set(n, i));
  for (const [u, v] of directed) {
    if (namePos.get(u)! >= namePos.get(v)!) {
      throw new Error(
        `pipelineGraphToCausalADMG: the edge ${u}->${v} is not in topological order`,
      );
    }
  }
  return { graph: { nodes, directed, bidirected }, nodeNames: nodes };
}

/**
 * Build the `graphForEdge` the causal edge sweep needs, from a
 * discovered structure and the signal names.
 *
 * This is the one-call wiring:
 *
 *   const { structure } = discoverCausalStructure(matrix, { ... });
 *   const graphForEdge = graphForEdgeFromDiscovery(structure, signalNames);
 *   await runCausalEdgeSuite(db, { graphForEdge });
 *
 * The sweep then asks the gate whether each edge's effect is
 * identified IN THE GRAPH THE PIPELINE DISCOVERED, rather than in a
 * graph the edge asserts about itself.
 */
export function graphForEdgeFromDiscovery(
  admg: { readonly nodes: readonly number[]; readonly directed: readonly (readonly [number, number])[]; readonly bidirected: readonly (readonly [number, number])[] },
  names: readonly NodeId[],
): (edge: { readonly cause_signal: string; readonly effect_signal: string }) => CausalADMG | null {
  const named = pipelineGraphToCausalADMG(admg, names);
  const index = new Map<string, number>();
  named.nodeNames.forEach((n, i) => index.set(n, i));
  return (edge) => {
    const u = index.get(edge.cause_signal);
    const v = index.get(edge.effect_signal);
    // An edge whose endpoints are not in the discovered graph gets NO
    // graph, not a partial one. The gate then refuses it with
    // NO_GRAPH, which is the honest answer: the effect was not
    // estimated in any graph we have.
    if (u === undefined || v === undefined) return null;
    return named.graph;
  };
}

/**
 * Convert a numeric ADMG into the do-calculus `CausalADMG`: string ids, and `nodes` emitted in a
 * topological order of `directed` (Kahn, smallest index first, so the output is deterministic).
 * Throws on a directed cycle rather than handing a cyclic "DAG" to Shpitser-Pearl.
 */
export function admgToCausalADMG(
  admg: PagAdmg,
  name: (node: number) => NodeId = (node) => `v${node}`,
): CausalADMG {
  const nodes = [...admg.nodes].sort((a, b) => a - b);
  const index = new Map<number, number>();
  for (let i = 0; i < nodes.length; i++) index.set(nodes[i]!, i);
  const out: number[][] = nodes.map(() => []);
  const indeg = new Array<number>(nodes.length).fill(0);
  for (const [u, v] of admg.directed) {
    const iu = index.get(u);
    const iv = index.get(v);
    if (iu === undefined || iv === undefined) {
      throw new Error(`admgToCausalADMG: directed edge ${u} -> ${v} uses an unknown node`);
    }
    if (iu === iv) throw new Error(`admgToCausalADMG: self loop at ${u}`);
    out[iu]!.push(iv);
    indeg[iv]! += 1;
  }
  const ready: number[] = [];
  for (let i = 0; i < nodes.length; i++) if (indeg[i] === 0) ready.push(i);
  const order: number[] = [];
  while (ready.length > 0) {
    ready.sort((a, b) => a - b);
    const cur = ready.shift()!;
    order.push(cur);
    for (const next of out[cur]!) {
      indeg[next]! -= 1;
      if (indeg[next] === 0) ready.push(next);
    }
  }
  if (order.length !== nodes.length) {
    throw new Error(
      "admgToCausalADMG: the projected directed edges contain a cycle; refusing to hand a cyclic graph to do-calculus",
    );
  }
  const label = nodes.map((node) => name(node));
  return {
    nodes: order.map((i) => label[i]!),
    directed: admg.directed.map(([u, v]) => [name(u), name(v)] as const),
    bidirected: admg.bidirected.map(([u, v]) => [name(u), name(v)] as const),
  };
}

/** PAG -> ADMG -> CausalADMG in one step, ready for runShpitserPearlID. */
export function pagToCausalADMG(
  pag: FciResult,
  name?: (node: number) => NodeId,
): CausalADMG {
  return admgToCausalADMG(pagToAdmg(pag), name);
}

// ---------------------------------------------------------------------------
// Precision-preconditioned, scale-invariant DYNOTEARS
// ---------------------------------------------------------------------------

/**
 * Precision preconditioning: z-score every column and return the sample CORRELATION matrix
 * gram = (1/n) Z^T Z (unit diagonal). Everything the estimator needs about the data lives in
 * gram, so the inner loop is O(d^3) and independent of n, and rescaling an input column is a
 * no-op by construction. A constant column keeps sd = 1, so its deviations are exactly 0.
 */
function standardizeGram(X: number[][]): { gram: number[][]; sd: number[] } {
  const n = X.length;
  const d = X[0]!.length;
  const mean = new Array<number>(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mean[j]! += row[j]!;
  for (let j = 0; j < d; j++) mean[j]! /= n;
  const sd = new Array<number>(d).fill(0);
  for (const row of X) {
    for (let j = 0; j < d; j++) {
      const dev = row[j]! - mean[j]!;
      sd[j]! += dev * dev;
    }
  }
  for (let j = 0; j < d; j++) {
    sd[j] = Math.sqrt(Math.max(0, sd[j]! / n));
    if (!(sd[j]! > 1e-12)) sd[j] = 1;
  }
  const gram = zeros(d, d);
  for (const row of X) {
    const z = row.map((v, j) => (v - mean[j]!) / sd[j]!);
    for (let a = 0; a < d; a++) {
      if (z[a] === 0) continue;
      for (let b = a; b < d; b++) gram[a]![b]! += z[a]! * z[b]!;
    }
  }
  for (let a = 0; a < d; a++) {
    for (let b = a; b < d; b++) {
      gram[a]![b]! /= n;
      gram[b]![a] = gram[a]![b]!;
    }
  }
  return { gram, sd };
}

interface ColumnStats {
  readonly mse: number[];
  /** cross[k][j] = (1/n)(Z^T R)[k][j] */
  readonly cross: number[][];
}

/**
 * Per-column mean squared residual and the cross-moment matrix, computed from the Gram matrix:
 * mse_j = gram[j][j] - 2 w^T gram[:,j] + w^T gram w, cross = gram - gram W. O(d^3), never n.
 */
function columnStats(gram: number[][], W: number[][]): ColumnStats {
  const d = W.length;
  const mse = new Array<number>(d).fill(1);
  const cross = zeros(d, d);
  for (let j = 0; j < d; j++) {
    const gw = new Array<number>(d).fill(0); // gw[k] = sum_l gram[k][l] W[l][j]
    for (let k = 0; k < d; k++) {
      let s = 0;
      for (let l = 0; l < d; l++) s += gram[k]![l]! * W[l]![j]!;
      gw[k] = s;
    }
    let quad = 0;
    for (let k = 0; k < d; k++) quad += W[k]![j]! * gw[k]!;
    mse[j] = Math.max(gram[j]![j]! - 2 * gw[j]! + quad, 1e-12);
    for (let k = 0; k < d; k++) cross[k]![j] = gram[k]![j]! - gw[k]!;
  }
  return { mse, cross };
}

/**
 * Smooth part of the objective:
 *   sum_j 0.5*log(mse_j) - d*log|det(I-W)| + (rho/2)*h^2 + alpha*h
 * (the L1 term is handled by the proximal step, not here). Infinity when I-W is singular.
 *
 * THIS IS THE NON-EQUAL-VARIANCE (l_NV) LIKELIHOOD, and it is the
 * Kaiser & Sipos (2021) objective the project spec names.
 *
 * NAMED 2026-10-20. The objective was implemented correctly -- the
 * per-column variance `mse_j` is PROFILED rather than replaced by the
 * average, which is exactly what l_NV is -- but the strings "Kaiser"
 * and "Sipos" appeared nowhere in the repository, and a reviewer
 * reading the spec's "remediating the Kaiser & Sipos 2021
 * variance-sorting pathology" would have had no way to tell that the
 * pathology was already addressed. An unnamed implementation of a
 * named fix reads as an unfixed fix.
 *
 * WHAT IS AND IS NOT THE SAME AS THE SPEC'S FORM. The spec writes
 *
 *   l_NV = 1/2 sum_j ln((1/n)||r_j||^2) - ln|det(I - W_0)| + ...
 *
 * and this implements
 *
 *   sum_j 0.5*log(mse_j) - d*log|det(I-W)| + ...
 *
 * The per-column term is the same. The determinant term differs by a
 * factor of d: the spec folds `sum_j ln|det(I-W)|` into `-d*ln|det(I-W)|`,
 * and the code's comment says so explicitly ("equivalently the
 * expression implemented in `smoothObjective`, which folds the sum over
 * j into `-d*log|det(I-W)|`"). So the two agree up to a constant factor
 * on the log-determinant, which does not change the argmin of the
 * penalized objective -- but the DETERMINANT TERM IS NOT A CONSTANT
 * and the folding is a genuine re-weighting of it, so this is noted
 * rather than waved away.
 *
 * WHAT IS NOT IMPLEMENTED AT ALL: the LAGGED matrices A_1..A_p. The
 * spec's multi-lag DYNOTEARS is out of scope here, and this module's
 * header says so. The `periodic-timeseries-id.ts` module the spec
 * names for it does not exist in this repository.
 */
function smoothObjective(gram: number[][], W: number[][], alphaAL: number, rho: number): number {
  const d = W.length;
  const { mse } = columnStats(gram, W);
  let loss = 0;
  for (let j = 0; j < d; j++) loss += 0.5 * Math.log(mse[j]!);
  const eyeMinusW = identity(d).map((row, i) => row.map((v, j) => v - W[i]![j]!));
  const inv = inverseWithDet(eyeMinusW);
  if (inv === null) return Number.POSITIVE_INFINITY;
  const absDet = Math.abs(inv.det);
  if (!(absDet > 1e-12)) return Number.POSITIVE_INFINITY;
  loss -= d * Math.log(absDet);
  const { h } = acyclicityExact(W);
  if (!Number.isFinite(h)) return Number.POSITIVE_INFINITY;
  loss += (rho / 2) * h * h + alphaAL * h;
  return Number.isFinite(loss) ? loss : Number.POSITIVE_INFINITY;
}

/**
 * Analytic gradient of the smooth part, with the exact h gradient:
 *   d/dW[k][j] of sum_j 0.5 log(mse_j) = -(1/n)(Z^T R)[k][j] / mse_j
 *   d/dW of -d log|det(I-W)|           = d * (I-W)^{-T}
 *   d/dW of (rho/2)h^2 + alpha*h       = (rho*h + alpha) * (exp(W o W))^T o 2W
 */
function smoothGradient(
  W: number[][],
  alphaAL: number,
  rho: number,
  stats: ColumnStats,
): number[][] | null {
  const d = W.length;
  const eyeMinusW = identity(d).map((row, i) => row.map((v, j) => v - W[i]![j]!));
  const inv = inverseWithDet(eyeMinusW);
  if (inv === null) return null;
  const absDet = Math.abs(inv.det);
  if (!(absDet > 1e-12)) return null;
  const out = zeros(d, d);
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) {
      if (k === j) continue;
      out[k]![j] = -stats.cross[k]![j]! / stats.mse[j]!;
      out[k]![j]! += d * inv.inv[j]![k]!;
    }
  }
  const { h, grad } = acyclicityExact(W);
  const coef = rho * h + alphaAL;
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) out[k]![j]! += coef * grad[k]![j]!;
  }
  return out;
}

/**
 * The VERIFIED-literature term L_lit and its exact gradient.
 *
 * EXPORTED so a test can finite-difference it. The spec's gradient
 * has a transpose on both M's, and a transpose that is wrong in either
 * place produces a gradient that is finite-difference wrong in a way
 * that still "converges" -- to a different W, and plausibly. Only a
 * finite difference catches that, and only an exported term can be
 * finite-differenced.
 *
 * The spec:
 *
 *   L_lit(W) = (mu_lit / 2) * sum_{(i,j) in S_lit^ClassA}
 *                w_ij^eff * (T_ij(W) - Delta_ij^ClassA)^2
 *
 * where T(W) = (I - W)^{-1} - I is the total causal effect matrix, so
 * T_ij is the effect of i on j along ALL directed paths.
 *
 * THE GRADIENT, exactly:
 *
 *   d L_lit / dW = mu_lit * M^T * (Omega o (T - Delta)) * M^T
 *
 * with M = (I - W)^{-1}, and Omega_ij = w_ij^eff on the constrained
 * pairs and 0 elsewhere. The derivation: T = M - I, so
 * dT_ij/dW_ab = M_ia M_bj, and
 *
 *   d/dW_ab of (1/2) w_ij (T_ij - D_ij)^2
 *     = w_ij (T_ij - D_ij) * dT_ij/dW_ab
 *     = w_ij (T_ij - D_ij) * M_ia M_bj
 *
 * Summing over (i,j) with the mask gives
 *   sum_ij Omega_ij (T_ij - D_ij) M_ia M_bj
 *     = [ M^T (Omega o (T - Delta)) M^T ]_ab
 *
 * Note the TRANSPOSE on both M's: the index order in the quadratic
 * form is (i,j) for the constraint and (a,b) for the gradient, and
 * getting that transposed wrong is the classic way to produce a
 * gradient that is finite-difference WRONG in a way that still
 * "converges" -- to a different W.
 *
 * Returns null when I - W is singular: the term is not differentiable
 * there, and the caller must treat that as a fit failure rather than
 * as a large-but-finite value.
 */
export function literatureTerm(
  W: number[][],
  constraints: readonly ClassALiteratureConstraint[],
  muLit: number,
): { value: number; grad: number[][] } | null {
  const d = W.length;
  const zero = zeros(d, d);
  if (constraints.length === 0 || muLit === 0) return { value: 0, grad: zero };

  const eyeMinusW = identity(d).map((row, i) => row.map((v, j) => v - W[i]![j]!));
  const inv = inverseWithDet(eyeMinusW);
  if (inv === null) return null;
  const M = inv.inv;

  // T = M - I
  const T = M.map((row, i) => row.map((v, j) => v - (i === j ? 1 : 0)));

  // Omega o (T - Delta): only the constrained pairs carry a value.
  const residual = zeros(d, d);
  let value = 0;
  for (const c of constraints) {
    if (c.from < 0 || c.to < 0 || c.from >= d || c.to >= d) continue;
    if (c.from === c.to) continue;
    const t = T[c.from]![c.to]!;
    const r = t - c.delta;
    residual[c.from]![c.to]! = c.weight * r;
    value += c.weight * r * r;
  }
  value = (muLit / 2) * value;

  // grad = muLit * M^T * residual * M^T
  //
  // The (a,b) entry of M^T * residual * M^T is
  //
  //   sum_{i,j} (M^T)_{ai} * residual_{ij} * (M^T)_{jb}
  //     = sum_{i,j} M_{ia} * residual_{ij} * M_{bj}
  //
  // so the LAST factor is M[b][j] -- the ROW b, COLUMN j. Writing
  // M[j][b] instead is the transpose of it, and it is wrong: the
  // transpose of a gradient is a gradient of a different function, so
  // the fit still converges and still looks plausible, to a DIFFERENT
  // W. A finite difference is the only thing that catches this, and it
  // did: with M[j][b] the (0,1) entry was 0.21545 where the true
  // value is 0.23892.
  const grad = zeros(d, d);
  for (let a = 0; a < d; a++) {
    for (let b = 0; b < d; b++) {
      let s = 0;
      for (let i = 0; i < d; i++) {
        const mi = M[i]![a]!;
        if (mi === 0) continue;
        for (let j = 0; j < d; j++) {
          const rij = residual[i]![j]!;
          if (rij === 0) continue;
          s += mi * rij * M[b]![j]!;
        }
      }
      grad[a]![b]! = muLit * s;
    }
  }
  return { value, grad };
}

/** Soft-threshold step restricted to the allowed support; diagonal and disallowed entries are exactly 0. */
/**
 * The per-edge L1 penalty multipliers.
 *
 * The spec: an HONESTLY_UNCITED_PRIOR is excluded from S_lit^ClassA --
 * so its number never enters L_lit and can never pull W toward a
 * number with no source document behind it. But it is NOT discarded:
 * it is preserved as a STRUCTURAL EDGE-EXISTENCE HYPOTHESIS, and the
 * way an unverified hypothesis gets empirical weight is by RELAXING
 * the sparsity penalty on the edge it proposes.
 *
 *   lambda_{1,ij} = 0.25 * lambda_1     for a proposed-by-prior edge
 *   lambda_{1,ij} = lambda_1           everywhere else
 *
 * The reasoning: a prior that has no source cannot justify a specific
 * MAGNITUDE, but it can justify the QUESTION "does this edge exist?"
 * -- and the empirical likelihood in ell_NV answers that question
 * when the penalty on it is small enough that the data is allowed to
 * keep the edge if the data supports it. A prior-proposed edge that
 * the data rejects is pruned by the data, which is the only honest
 * way for a prior to lose.
 *
 * This is NOT the same as letting the prior's NUMBER into the
 * objective. The prior contributes zero to L_lit here. It only lowers
 * the bar for the edge to survive.
 */
export interface EdgePenalty {
  /** The source node index (the cause). */
  readonly from: number;
  /** The target node index (the effect). */
  readonly to: number;
  /** The multiplier on lambda_1 for this edge. Must be >= 0. */
  readonly multiplier: number;
  /** The premise id, for the report. */
  readonly premiseId?: string;
}

function proxStep(
  W: number[][],
  G: number[][],
  step: number,
  lambda1: number,
  allowed: boolean[][],
  edgePenalty?: readonly EdgePenalty[],
): number[][] {
  const d = W.length;
  const out = zeros(d, d);
  // The multiplier lookup, built once per step rather than per entry.
  const mult = new Map<string, number>();
  for (const p of edgePenalty ?? []) mult.set(`${p.from}->${p.to}`, p.multiplier);
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) {
      if (k === j || !allowed[k]![j]) continue;
      // The threshold is PER EDGE, because the penalty is per edge.
      const m = mult.get(`${k}->${j}`) ?? 1;
      const t = step * lambda1 * m;
      const v = W[k]![j]! - step * G[k]![j]!;
      out[k]![j] = Math.sign(v) * Math.max(0, Math.abs(v) - t);
    }
  }
  return out;
}

/**
 * Largest absolute off-diagonal entry of the correlation matrix. At W = 0 the objective's gradient
 * is exactly -(that correlation) on every off-diagonal entry, so this is the smallest lambda for
 * which W = 0 is a stationary point: the natural start of the continuation path.
 */
function maxAbsCorrelation(gram: number[][]): number {
  const d = gram.length;
  let mx = 0;
  for (let a = 0; a < d; a++) {
    for (let b = a + 1; b < d; b++) mx = Math.max(mx, Math.abs(gram[a]![b]!));
  }
  return mx;
}

/** Geometric continuation path from "W = 0 is optimal" down to the requested lambda1. */
function lambdaSchedule(lambda1: number, corrMax: number): number[] {
  if (!(lambda1 > 0)) return [0];
  const out: number[] = [];
  let lam = Math.max(corrMax, lambda1);
  for (let k = 0; k < 12 && lam > lambda1 * 1.0001; k++) {
    out.push(lam);
    lam /= 4;
  }
  out.push(lambda1);
  return out;
}

function frob2(M: number[][]): number {
  let s = 0;
  for (const row of M) for (const v of row) s += v * v;
  return s;
}

/**
 * Inner proximal-gradient solve for one augmented-Lagrangian multiplier pair. Backtracking on the
 * smooth objective only (correct for the composite objective), with the support mask re-applied
 * by `proxStep` on every iteration.
 */
function innerSolve(
  gram: number[][],
  W0: number[][],
  lambda1: number,
  alphaAL: number,
  rho: number,
  allowed: boolean[][],
  iters: number,
  classALit: readonly ClassALiteratureConstraint[],
  muLit: number,
  edgePenalty: readonly EdgePenalty[],
): number[][] {
  let W = W0.map((row) => row.slice());
  // The full smooth objective: the likelihood and the acyclicity
  // penalty, PLUS the verified-literature term. The literature term is
  // part of the smooth objective (it is a smooth quadratic in T(W)),
  // so it belongs in the same backtracking line search -- a separate
  // step for it would break the descent guarantee.
  const fullObjective = (Wc: number[][]): number => {
    const base = smoothObjective(gram, Wc, alphaAL, rho);
    if (!Number.isFinite(base)) return Number.POSITIVE_INFINITY;
    const lit = literatureTerm(Wc, classALit, muLit);
    if (lit === null) return Number.POSITIVE_INFINITY;
    return base + lit.value;
  };
  const fullGradient = (Wc: number[][], stats: ColumnStats): number[][] | null => {
    const base = smoothGradient(Wc, alphaAL, rho, stats);
    if (base === null) return null;
    const lit = literatureTerm(Wc, classALit, muLit);
    if (lit === null) return null;
    for (let a = 0; a < base.length; a++) {
      for (let b = 0; b < base.length; b++) base[a]![b]! += lit.grad[a]![b]!;
    }
    return base;
  };
  let f = fullObjective(W);
  if (!Number.isFinite(f)) {
    W = zeros(W.length, W.length);
    f = fullObjective(W);
  }
  let step = 0.25;
  for (let it = 0; it < iters; it++) {
    const stats = columnStats(gram, W);
    const G = fullGradient(W, stats);
    if (G === null) break;
    const g2 = frob2(G);
    let accepted = false;
    for (let ls = 0; ls < 45; ls++) {
      const Wc = proxStep(W, G, step, lambda1, allowed, edgePenalty);
      const fc = fullObjective(Wc);
      if (Number.isFinite(fc) && fc <= f - 1e-4 * step * g2) {
        const prev = f;
        W = Wc;
        f = fc;
        step *= 1.3;
        accepted = true;
        if (prev - fc < 1e-12 * Math.max(1, Math.abs(fc))) it = iters;
        break;
      }
      step *= 0.5;
    }
    if (!accepted) break;
  }
  return W;
}

/**
 * DYNOTEARS, contemporaneous block only: minimize
 *   sum_j [0.5*log((1/n)||r_j||^2) - log|det(I-W)|] + lambda1*||W||_1 + (rho/2)*h^2 + alpha*h
 * (equivalently the expression implemented in `smoothObjective`, which folds the sum over j into
 * `-d*log|det(I-W)|`). Lagged terms are out of scope.
 *
 * SCALE INVARIANCE: the fit runs on z-scored columns, so rescaling an input column cannot change
 * the standardized solution or the discovered edge set; `W` is mapped back to original units
 * afterwards (W_orig[k][j] = W_std[k][j] * sd_j / sd_k). `edges` is thresholded on the
 * standardized coefficients, which is the only scale-free choice.
 *
 * SUPPORT RESTRICTION: when `allowedEdges` is given, every other off-diagonal entry is held at
 * exactly 0 for the entire optimization (proxStep never writes it), so NOTEARS cannot orient an
 * edge the PAG forbids.
 *
 * @param X rows = observations, columns = variables
 * @param opts lambda1, rho, alpha, maxIter (outer AL iterations), tol, edgeThreshold, allowedEdges
 */
export function dynotearsFit(X: number[][], opts: DynotearsOptions = {}): DynotearsResult {
  const n = X.length;
  if (n === 0) throw new Error("dynotearsFit: need at least one observation");
  const d = X[0]!.length;
  if (d === 0) throw new Error("dynotearsFit: need at least one variable");
  for (const row of X) {
    if (row.length !== d) throw new Error("dynotearsFit: ragged data matrix");
    for (const v of row) if (!Number.isFinite(v)) throw new Error("dynotearsFit: non-finite value");
  }
  const lambda1 = opts.lambda1 ?? 0.01;
  const rho0 = opts.rho ?? 1.0;
  const alpha0 = opts.alpha ?? 1.0;
  const maxIter = opts.maxIter ?? 50;
  const tol = opts.tol ?? 1e-7;
  const edgeThreshold = opts.edgeThreshold ?? 0.05;
  for (const [name, v] of [
    ["lambda1", lambda1],
    ["rho", rho0],
    ["alpha", alpha0],
    ["tol", tol],
    ["edgeThreshold", edgeThreshold],
  ] as const) {
    if (!(v >= 0) || !Number.isFinite(v)) throw new Error(`dynotearsFit: ${name} must be >= 0`);
  }
  if (!Number.isInteger(maxIter) || maxIter < 1) {
    throw new Error("dynotearsFit: maxIter must be a positive integer");
  }

  const allowed: boolean[][] = Array.from({ length: d }, () => new Array<boolean>(d).fill(false));
  if (opts.allowedEdges === undefined) {
    for (let k = 0; k < d; k++) for (let j = 0; j < d; j++) allowed[k]![j] = k !== j;
  } else {
    for (const [k, j] of opts.allowedEdges) {
      if (!Number.isInteger(k) || !Number.isInteger(j) || k < 0 || j < 0 || k >= d || j >= d) {
        throw new Error(`dynotearsFit: allowedEdges entry ${k}->${j} out of range`);
      }
      if (k !== j) allowed[k]![j] = true;
    }
  }

  const { gram, sd } = standardizeGram(X);
  const innerIters = 160;

  // The VERIFIED literature constraints. Validation is strict, because a
  // malformed constraint is a constraint that silently does not apply
  // -- and a literature premise that silently does not apply is the
  // same failure as one that was never read.
  const classALit: ClassALiteratureConstraint[] = [];
  const muLit = opts.muLit ?? 1.0;
  if (!(muLit >= 0) || !Number.isFinite(muLit)) {
    throw new Error("dynotearsFit: muLit must be >= 0 and finite");
  }
  for (const c of opts.classALiterature ?? []) {
    if (!Number.isInteger(c.from) || !Number.isInteger(c.to)) {
      throw new Error("dynotearsFit: a literature constraint has a non-integer node index");
    }
    if (c.from < 0 || c.to < 0 || c.from >= d || c.to >= d) {
      throw new Error(
        `dynotearsFit: literature constraint ${c.from}->${c.to} is out of range for ${d} variables`,
      );
    }
    if (c.from === c.to) {
      throw new Error("dynotearsFit: a literature constraint cannot be a self-edge");
    }
    if (!Number.isFinite(c.delta)) {
      throw new Error("dynotearsFit: a literature constraint has a non-finite delta");
    }
    if (!Number.isFinite(c.weight) || c.weight < 0) {
      throw new Error("dynotearsFit: a literature constraint has a negative or non-finite weight");
    }
    classALit.push({ from: c.from, to: c.to, delta: c.delta, weight: c.weight, premiseId: c.premiseId });
  }

  // The per-edge L1 penalty multipliers. Same strict validation: a
  // penalty that is silently dropped is a prior that is silently
  // discarded, which is the same as deleting it.
  const edgePenalties: EdgePenalty[] = [];
  for (const p of opts.edgePenalties ?? []) {
    if (!Number.isInteger(p.from) || !Number.isInteger(p.to)) {
      throw new Error("dynotearsFit: an edge penalty has a non-integer node index");
    }
    if (p.from < 0 || p.to < 0 || p.from >= d || p.to >= d) {
      throw new Error(
        `dynotearsFit: edge penalty ${p.from}->${p.to} is out of range for ${d} variables`,
      );
    }
    if (p.from === p.to) {
      throw new Error("dynotearsFit: an edge penalty cannot be a self-edge");
    }
    if (!Number.isFinite(p.multiplier) || p.multiplier < 0) {
      throw new Error("dynotearsFit: an edge penalty has a negative or non-finite multiplier");
    }
    edgePenalties.push({ from: p.from, to: p.to, multiplier: p.multiplier, premiseId: p.premiseId });
  }

  // Continuation (homotopy) on lambda1. This is a WARM-START device, not a change of objective:
  // the last stage minimizes exactly the requested lambda1. Without it the proximal path from
  // W = 0 walks straight into the dense basin (the profile likelihood is flat across the Markov
  // equivalence class, so every correlation-shaped W is an equally good stationary point and a
  // small lambda1 cannot pull the fit back out). Starting at the lambda where W = 0 is optimal and
  // shrinking by 4 follows the L1 path towards sparser stationary points.
  // Measured caveat (header note 6b): at lambda1 = 0.01 the path still ends sparse ONLY on data
  // whose coefficient scale makes 0.01 meaningful, so the unrestricted diamond still over-fits.
  // The continuation makes the fit deterministic and better conditioned; it is not a fix.
  const schedule = lambdaSchedule(lambda1, maxAbsCorrelation(gram));
  let W = zeros(d, d);
  let alphaAL = alpha0;
  let rho = Math.max(rho0, 1);
  let best: { W: number[][]; loss: number } | null = null;

  for (let stage = 0; stage < schedule.length; stage++) {
    const lambda = schedule[stage]!;
    const isFinal = stage === schedule.length - 1;
    alphaAL = alpha0;
    rho = Math.max(rho0, 1);
    const outers = isFinal ? maxIter : 4;
    for (let outer = 0; outer < outers; outer++) {
      W = innerSolve(gram, W, lambda, alphaAL, rho, allowed, innerIters, classALit, muLit, edgePenalties);
      const { h } = acyclicityExact(W);
      if (isFinal) {
        const lit = literatureTerm(W, classALit, muLit);
        const loss =
          smoothObjective(gram, W, alphaAL, rho) +
          lambda1 * frob1(W) +
          (lit === null ? Number.POSITIVE_INFINITY : lit.value);
        if (Number.isFinite(loss) && isAcyclic(W) && (best === null || loss < best.loss)) {
          best = { W: W.map((row) => row.slice()), loss };
        }
      }
      if (h < tol) break;
      alphaAL += rho * h;
      rho = Math.min(rho * 4, 1e8);
    }
  }

  const chosen = best !== null && !isAcyclic(W) ? best.W : W;
  const Wstandardized = chosen.map((row) => row.slice());
  const Wout = chosen.map((row, k) => row.map((v, j) => (v * sd[j]!) / sd[k]!));
  // h and grad are reported AT THE RETURNED W, in original units: a caller who finite-differences
  // the returned matrix must get the returned gradient (scale changes h's magnitude even though it
  // cannot change whether h is zero, so this is not cosmetic).
  const { h, grad } = acyclicityExact(Wout);
  const edges: [number, number][] = [];
  for (let k = 0; k < d; k++) {
    for (let j = 0; j < d; j++) {
      if (k === j || !allowed[k]![j]) continue;
      if (Math.abs(Wstandardized[k]![j]!) > edgeThreshold) edges.push([k, j]);
    }
  }
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lossLit = literatureTerm(Wstandardized, classALit, muLit);
  const lossOut =
    smoothObjective(gram, Wstandardized, alphaAL, rho) +
    lambda1 * frob1(Wstandardized) +
    (lossLit === null ? Number.POSITIVE_INFINITY : lossLit.value);
  return {
    W: Wout,
    h,
    grad,
    edges,
    loss: Number.isFinite(lossOut) ? lossOut : Number.POSITIVE_INFINITY,
    Wstandardized,
  };
}

function frob1(W: number[][]): number {
  let s = 0;
  for (const row of W) for (const v of row) s += Math.abs(v);
  return s;
}

// ---------------------------------------------------------------------------
// Integration: FCI -> PAG -> ADMG
// ---------------------------------------------------------------------------

/**
 * Run FCI and project the PAG onto an ADMG in one call.
 *
 * `edgeThreshold` is accepted for call-site symmetry with `dynotearsFit`; a PAG carries no edge
 * weights, so it has no effect here (documented rather than silently reinterpreted).
 */
export function discoverCausalStructure(
  data: number[][],
  opts: {
    readonly alpha?: number;
    readonly maxConditioningSetSize?: number;
    readonly edgeThreshold?: number;
  } = {},
): { readonly pag: FciResult; readonly admg: PagAdmg } {
  if (opts.edgeThreshold !== undefined && !(opts.edgeThreshold >= 0)) {
    throw new Error("discoverCausalStructure: edgeThreshold must be >= 0");
  }
  const pag = fci(data, {
    ...(opts.alpha === undefined ? {} : { alpha: opts.alpha }),
    ...(opts.maxConditioningSetSize === undefined
      ? {}
      : { maxConditioningSetSize: opts.maxConditioningSetSize }),
  });
  return { pag, admg: pagToAdmg(pag) };
}
