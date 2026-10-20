/**
 * do-calculus-id — complete Shpitser–Pearl identification for semi-Markovian ADMGs.
 *
 * WHY THIS EXISTS
 * The causal layer frequently wants P(y | do(x)). Before any estimator is fitted we
 * have to know whether that quantity is a function of the observational distribution
 * at all. Answering "no" late (by fitting something plausible) is the expensive
 * failure mode: an unidentifiable query does not fail loudly downstream, it returns a
 * number. This module is the gate. It returns either a symbolic estimand built only
 * from observational conditionals, or an explicit counterexample (a hedge) that proves
 * no such estimand exists.
 *
 * WHAT IS HERE
 *  - ADMG plumbing: induceSubgraph, mutilateADMG, getAncestors, getMaximalCComponents.
 *  - Exact d-separation in an ADMG (ancestral moralization with explicit latent nodes).
 *  - Tian–Pearl c-factor kernels: cFactorForComponent.
 *  - ID  — Shpitser & Pearl (AAAI 2006), the complete 7-line recursion.
 *  - IDC — Shpitser & Pearl (UAI 2006, UCLA CSL R-329), conditional interventions.
 *  - Hedge witnesses and ID-enabling edges (the HCID question: which observed mediator
 *    would break this hedge).
 *
 * CONVENTIONS
 *  - `CausalADMG.nodes` MUST be a topological order of `directed`; every public entry
 *    point validates this and throws on a malformed graph rather than looping.
 *  - A "C-component" is a maximal set connected by BIDIRECTED edges only. Directed
 *    connectivity is NOT used anywhere for C-components: doing so would make every
 *    DAG a single component and turn every query into a false hedge.
 *  - `OBSERVATIONAL_COND` factors are written against the observational joint P, with
 *    `given` = the predecessors of `target` in the topological order (the chain-rule
 *    factorization P(v) = prod_i P(v_i | v_<i)). This is the c-factor kernel form used
 *    by lines 6 and 7; it is what lets a line-7 reduction carry the conditioning it
 *    needs while the graph shrinks around it.
 *
 * References:
 *  - Shpitser & Pearl, "Identification of Joint Interventional Distributions in
 *    Recursive Semi-Markovian Causal Models", AAAI 2006, pp. 1219-1226.
 *  - Shpitser & Pearl, "Identification of Conditional Interventional Distributions",
 *    UAI 2006 (UCLA Cognitive Systems Laboratory tech report R-329).
 *  - Tian & Pearl, "A General Identification Condition for Causal Effects", AAAI 2002.
 *
 * Pure TypeScript, no I/O.
 */

export type NodeId = string;

export interface CausalADMG {
  /** Vertices in a topological order of `directed` (nodes[i] precedes nodes[j] for every i < j edge). */
  readonly nodes: readonly NodeId[];
  /** u -> v (a directed edge). */
  readonly directed: ReadonlyArray<readonly [NodeId, NodeId]>;
  /** u <-> v (a latent common cause of u and v). */
  readonly bidirected: ReadonlyArray<readonly [NodeId, NodeId]>;
}

/** A hedge witness: (F, F') with F' a strict C-component of F, both inside V \ X. */
export interface HedgeWitness {
  /** V(F) — the outer C-forest, i.e. the vertex set of the current graph. */
  readonly forestFull: readonly NodeId[];
  /** V(F') — the inner C-forest, i.e. S, the C-component of G[V \ X]. */
  readonly forestSub: readonly NodeId[];
}

export type SymbolicFactor =
  | { readonly kind: "OBSERVATIONAL_COND"; readonly target: NodeId; readonly given: readonly NodeId[] }
  | { readonly kind: "MARGINAL_SUM"; readonly sumOut: readonly NodeId[]; readonly body: SymbolicFactor }
  | { readonly kind: "PRODUCT"; readonly factors: readonly SymbolicFactor[] }
  | { readonly kind: "RATIO"; readonly numerator: SymbolicFactor; readonly denominator: SymbolicFactor };

export type IDResult =
  | { readonly ok: true; readonly formula: SymbolicFactor; readonly formulaClass: string }
  | {
      readonly ok: false;
      readonly code: "FAIL_HEDGE";
      readonly hedge: HedgeWitness;
      readonly enablingEdges: ReadonlyArray<readonly [NodeId, NodeId]>;
    };

/**
 * Formula classes emitted by the ID recursion. Stable strings — downstream code
 * switches on these, so they are exported as a const object rather than inlined.
 */
export const FormulaClass = {
  /** Line 1: the query was already observational (x = empty). */
  ObservationalMarginal: "OBSERVATIONAL_MARGINAL",
  /** Line 4: the query factored across >= 2 C-components (front-door lives here). */
  CComponentFactorization: "FRONT_DOOR_OR_C_COMPONENT_FACTORIZATION",
  /** Line 6: S is itself a C-component of G, so the c-factor is the answer (back-door lives here). */
  BackDoorOrDirectCFactor: "BACK_DOOR_OR_DIRECT_C_FACTOR",
  /** Line 7: the Tian–Pearl c-factor reduction into a larger C-component S' was required. */
  TianCFactorRatio: "TIAN_C_FACTOR_RATIO",
} as const;

/** Recursion guard: ID strictly shrinks X or V at every step, so this only fires on malformed input. */
const MAX_RECURSION_DEPTH = 512;

/** Namespace for the synthetic latent vertices used by isDSeparated. */
const LATENT_PREFIX = "\u0000latent\u0000";

function observationalCond(target: NodeId, given: readonly NodeId[]): SymbolicFactor {
  return { kind: "OBSERVATIONAL_COND", target, given: [...given] };
}

function marginalSum(sumOut: readonly NodeId[], body: SymbolicFactor): SymbolicFactor {
  if (sumOut.length === 0) return body;
  return { kind: "MARGINAL_SUM", sumOut: [...sumOut], body };
}

function productOf(factors: readonly SymbolicFactor[]): SymbolicFactor {
  const first = factors[0];
  if (first === undefined) throw new Error("causal: cannot build a product of zero factors");
  return factors.length === 1 ? first : { kind: "PRODUCT", factors: [...factors] };
}

function setEquals(a: ReadonlySet<NodeId>, b: ReadonlySet<NodeId>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function assertNever(value: never): never {
  throw new Error(`causal: unreachable symbolic factor ${JSON.stringify(value)}`);
}

/**
 * Validate the ADMG invariant this module relies on: unique node ids and `nodes`
 * in a topological order of `directed`. Cheap, and it converts a class of silent
 * wrong answers (a backwards edge makes "ancestors" meaningless) into a throw.
 */
function assertWellFormed(g: CausalADMG): void {
  const order = new Map<NodeId, number>();
  g.nodes.forEach((node, index) => {
    if (order.has(node)) throw new Error(`causal graph: duplicate node "${node}"`);
    order.set(node, index);
  });
  for (const [u, v] of g.directed) {
    const iu = order.get(u);
    const iv = order.get(v);
    if (iu === undefined || iv === undefined) {
      throw new Error(`causal graph: directed edge ${u} -> ${v} references an unknown node`);
    }
    if (iu >= iv) {
      throw new Error(`causal graph: nodes must be a topological order, but ${u} -> ${v} goes backwards`);
    }
  }
  for (const [u, v] of g.bidirected) {
    if (!order.has(u) || !order.has(v)) {
      throw new Error(`causal graph: bidirected edge ${u} <-> ${v} references an unknown node`);
    }
  }
}

function assertKnownNodes(g: CausalADMG, nodes: Iterable<NodeId>, label: string): void {
  const known = new Set<NodeId>(g.nodes);
  for (const node of nodes) {
    if (!known.has(node)) throw new Error(`${label}: unknown node "${node}"`);
  }
}

/** Return the induced ADMG G[S]: nodes and edges of G with both endpoints in S, topological order preserved. */
export function induceSubgraph(g: CausalADMG, subset: ReadonlySet<NodeId>): CausalADMG {
  return {
    nodes: g.nodes.filter((n) => subset.has(n)),
    directed: g.directed.filter(([u, v]) => subset.has(u) && subset.has(v)),
    bidirected: g.bidirected.filter(([u, v]) => subset.has(u) && subset.has(v)),
  };
}

/**
 * Graph mutilation G_{overline{overX}, underline{underZ}}:
 *  - delete every edge pointing INTO overX (directed and bidirected alike — an
 *    intervention on X cuts the arrows into X, including the latent ones);
 *  - delete every directed edge emerging FROM underZ.
 * Nodes are never removed, so the topological order survives and callers can keep
 * using the original node list for chain-rule conditionals.
 */
export function mutilateADMG(
  g: CausalADMG,
  overX: ReadonlySet<NodeId>,
  underZ: ReadonlySet<NodeId> = new Set<NodeId>(),
): CausalADMG {
  return {
    nodes: [...g.nodes],
    directed: g.directed.filter(([u, v]) => !overX.has(v) && !underZ.has(u)),
    bidirected: g.bidirected.filter(([u, v]) => !overX.has(u) && !overX.has(v)),
  };
}

/**
 * An(Y)_G: every node with a directed path into Y, plus Y itself.
 * Directed edges only — bidirected confounding does not create ancestry. That is
 * exactly why line 2 may prune non-ancestors even in a confounded graph.
 * Nodes not present in `g` are ignored.
 */
export function getAncestors(g: CausalADMG, targets: ReadonlySet<NodeId>): Set<NodeId> {
  const inGraph = new Set<NodeId>(g.nodes);
  const parents = new Map<NodeId, NodeId[]>();
  for (const node of g.nodes) parents.set(node, []);
  for (const [u, v] of g.directed) {
    if (!inGraph.has(u) || !inGraph.has(v)) continue;
    const list = parents.get(v);
    if (list !== undefined) list.push(u);
  }

  const seen = new Set<NodeId>();
  const stack: NodeId[] = [];
  for (const target of targets) {
    if (!inGraph.has(target) || seen.has(target)) continue;
    seen.add(target);
    stack.push(target);
  }
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const parent of parents.get(current) ?? []) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      stack.push(parent);
    }
  }
  return seen;
}

/**
 * C(G): the maximal C-components, i.e. the connected components of G using
 * BIDIRECTED edges only. Each component is returned in topological order, and the
 * components themselves are ordered by their first member so results are stable.
 */
export function getMaximalCComponents(g: CausalADMG): Set<NodeId>[] {
  const neighbours = new Map<NodeId, NodeId[]>();
  for (const node of g.nodes) neighbours.set(node, []);
  for (const [u, v] of g.bidirected) {
    if (u === v) continue;
    neighbours.get(u)?.push(v);
    neighbours.get(v)?.push(u);
  }

  const assigned = new Set<NodeId>();
  const components: Set<NodeId>[] = [];
  for (const start of g.nodes) {
    if (assigned.has(start)) continue;
    const members = new Set<NodeId>([start]);
    assigned.add(start);
    const stack: NodeId[] = [start];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) break;
      for (const neighbour of neighbours.get(current) ?? []) {
        if (assigned.has(neighbour)) continue;
        assigned.add(neighbour);
        members.add(neighbour);
        stack.push(neighbour);
      }
    }
    components.push(new Set<NodeId>(g.nodes.filter((n) => members.has(n))));
  }
  return components;
}

/**
 * Exact d-separation test for ADMGs: is setY independent of setZ given `cond`?
 *
 * WHY this way: a bidirected arc u <-> v is a latent common cause. Materializing it
 * as an explicit vertex L with L -> u and L -> v turns the ADMG into a DAG whose
 * d-separation is exactly the ADMG's m-separation, and the classic recipe applies:
 * restrict to An(Y u Z u cond), moralize (marry co-parents), drop `cond`, and look
 * for a path. The latent stays in the graph but is never conditioned on, so the
 * u - L - v path is open exactly when the confounding is unblocked.
 *
 * `isDSeparated` returns true when NO open path exists. setY and setZ should be
 * disjoint; a node in `cond` is never traversed.
 */
export function isDSeparated(
  g: CausalADMG,
  setY: ReadonlySet<NodeId>,
  setZ: ReadonlySet<NodeId>,
  cond: ReadonlySet<NodeId>,
): boolean {
  const directed: Array<readonly [NodeId, NodeId]> = [...g.directed];
  const latents: NodeId[] = [];
  g.bidirected.forEach(([u, v], index) => {
    const latent = `${LATENT_PREFIX}${index}`;
    latents.push(latent);
    directed.push([latent, u], [latent, v]);
  });
  const augmented: CausalADMG = { nodes: [...g.nodes, ...latents], directed, bidirected: [] };

  const ancestors = getAncestors(augmented, new Set<NodeId>([...setY, ...setZ, ...cond]));

  const moralAdj = new Map<NodeId, Set<NodeId>>();
  const parentsOf = new Map<NodeId, NodeId[]>();
  for (const node of ancestors) {
    moralAdj.set(node, new Set<NodeId>());
    parentsOf.set(node, []);
  }
  for (const [u, v] of directed) {
    if (!ancestors.has(u) || !ancestors.has(v)) continue;
    moralAdj.get(u)?.add(v);
    moralAdj.get(v)?.add(u);
    parentsOf.get(v)?.push(u);
  }
  for (const [, parents] of parentsOf) {
    for (let i = 0; i < parents.length; i += 1) {
      for (let j = i + 1; j < parents.length; j += 1) {
        const left = parents[i];
        const right = parents[j];
        if (left === undefined || right === undefined) continue;
        moralAdj.get(left)?.add(right);
        moralAdj.get(right)?.add(left);
      }
    }
  }

  const visited = new Set<NodeId>();
  const stack: NodeId[] = [];
  for (const source of setY) {
    if (cond.has(source) || !ancestors.has(source) || visited.has(source)) continue;
    visited.add(source);
    stack.push(source);
  }
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (setZ.has(current)) return false; // an open path reached Z: d-connected
    for (const neighbour of moralAdj.get(current) ?? []) {
      if (cond.has(neighbour) || visited.has(neighbour)) continue;
      visited.add(neighbour);
      stack.push(neighbour);
    }
  }
  return true;
}

/**
 * Q[S] — the Tian–Pearl c-factor kernel of a C-component S:
 *   Q[S] = prod_{v_i in S} P(v_i | v_<i)
 * where v_<i ranges over ALL predecessors of v_i in the supplied order (by default
 * G's own topological order). Conditioning on predecessors outside S is deliberate:
 * it is what makes Q[S] a kernel that still carries the variables line 7 needs, and
 * prod over all components of G reconstructs P(V) exactly.
 *
 * Throws unless `component` is one of the maximal C-components of `g` — calling it
 * on an arbitrary subset silently produces a factor that is not a c-factor.
 */
export function cFactorForComponent(
  g: CausalADMG,
  component: ReadonlySet<NodeId>,
  order: readonly NodeId[] = g.nodes,
): SymbolicFactor {
  if (component.size === 0) throw new Error("cFactorForComponent: empty component");
  const isComponent = getMaximalCComponents(g).some((c) => setEquals(c, component));
  if (!isComponent) {
    throw new Error("cFactorForComponent: the supplied set is not a maximal C-component of the graph");
  }
  for (const member of component) {
    if (!order.includes(member)) {
      throw new Error(`cFactorForComponent: node "${member}" is missing from the supplied order`);
    }
  }
  const factors = order
    .filter((n) => component.has(n))
    .map((n) => observationalCond(n, order.slice(0, order.indexOf(n))));
  return productOf(factors);
}

/**
 * ID-enabling edges for a hedge (the HCID question): which directed edges inside the
 * outer forest F, if a mediator on that edge were observed, would break the hedge and
 * let ID proceed?
 *
 * The edges that distinguish F from F' are those not internal to F': an edge shared by
 * both forests cannot be what separates them, while every other edge in F is part of
 * the structure that makes F a strict superset of F'. Returning them in topological
 * order (u, then v) keeps output stable for logging and diffing.
 */
export function findIDEnablingEdgesForHedge(
  g: CausalADMG,
  hedge: HedgeWitness,
): ReadonlyArray<readonly [NodeId, NodeId]> {
  const full = new Set<NodeId>(hedge.forestFull);
  const sub = new Set<NodeId>(hedge.forestSub);
  const seen = new Set<string>();
  const edges: Array<readonly [NodeId, NodeId]> = [];
  for (const [u, v] of g.directed) {
    if (!full.has(u) || !full.has(v)) continue;
    if (sub.has(u) && sub.has(v)) continue;
    const key = `${u}\u0000${v}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([u, v]);
  }
  return edges;
}

/** P(V) as the chain-rule product prod_i P(v_i | v_<i) over the graph's topological order. */
function jointDistribution(g: CausalADMG): SymbolicFactor {
  return productOf(g.nodes.map((node, index) => observationalCond(node, g.nodes.slice(0, index))));
}

/**
 * Shpitser & Pearl (2006) ID: identify P(y | do(x)) from P and G.
 *
 * Returns either a symbolic estimand (ok: true) or a hedge witness proving the query
 * is not identifiable (ok: false, code FAIL_HEDGE). It never returns a numeric answer
 * and never guesses: the caller decides what to do with a hedge.
 *
 * @param ySet outcome set (non-empty, disjoint from xSet)
 * @param xSet intervention set
 * @param g causal ADMG, nodes in topological order
 * @param activeQFactor distribution to answer against. Defaults to P(V); the recursion
 *        passes marginals (line 2), the running joint (lines 3-4) or a c-factor kernel (line 7).
 */
export function runShpitserPearlID(
  ySet: ReadonlySet<NodeId>,
  xSet: ReadonlySet<NodeId>,
  g: CausalADMG,
  activeQFactor?: SymbolicFactor,
): IDResult {
  assertWellFormed(g);
  assertKnownNodes(g, ySet, "runShpitserPearlID(y)");
  assertKnownNodes(g, xSet, "runShpitserPearlID(x)");
  if (ySet.size === 0) throw new Error("runShpitserPearlID: the outcome set y must be non-empty");
  for (const outcome of ySet) {
    if (xSet.has(outcome)) {
      throw new Error(`runShpitserPearlID: "${outcome}" is both an outcome and an intervention`);
    }
  }
  return idRec(ySet, xSet, g, activeQFactor ?? jointDistribution(g), 0);
}

function idRec(
  ySet: ReadonlySet<NodeId>,
  xSet: ReadonlySet<NodeId>,
  g: CausalADMG,
  dist: SymbolicFactor,
  depth: number,
): IDResult {
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error("runShpitserPearlID: recursion depth exceeded — check that nodes is a topological order");
  }

  // Line 1: x = empty -> P(y) = sum over V \ Y of P(V).
  if (xSet.size === 0) {
    const sumOut = g.nodes.filter((n) => !ySet.has(n));
    return {
      ok: true,
      formula: marginalSum(sumOut, dist),
      formulaClass: FormulaClass.ObservationalMarginal,
    };
  }

  // Line 2: prune non-ancestors of Y. They can neither cause nor confound Y's effect
  // once X is fixed, so marginalising them out first keeps the recursion small.
  const ancestorsOfY = getAncestors(g, ySet);
  if (ancestorsOfY.size < g.nodes.length) {
    const pruned = g.nodes.filter((n) => !ancestorsOfY.has(n));
    const xPruned = new Set<NodeId>([...xSet].filter((n) => ancestorsOfY.has(n)));
    return idRec(
      ySet,
      xPruned,
      induceSubgraph(g, ancestorsOfY),
      marginalSum(pruned, dist),
      depth + 1,
    );
  }

  // Line 3: W = (V \ X) \ An(Y)_{G_{overline X}}. Those nodes have no directed path into
  // Y once X is cut, so by rule 3 of do-calculus P_x(y) = P_{x,w}(y) for any w.
  const ancestorsOfYOverX = getAncestors(mutilateADMG(g, xSet), ySet);
  const extraInterventions = g.nodes.filter((n) => !xSet.has(n) && !ancestorsOfYOverX.has(n));
  if (extraInterventions.length > 0) {
    return idRec(ySet, new Set<NodeId>([...xSet, ...extraInterventions]), g, dist, depth + 1);
  }

  // Line 4: factorise over the C-components of G[V \ X]. Each factor is identified with
  // the OTHER components intervened on, so the product is over independent subproblems.
  const vMinusX = new Set<NodeId>(g.nodes.filter((n) => !xSet.has(n)));
  const cComponents = getMaximalCComponents(induceSubgraph(g, vMinusX));
  if (cComponents.length > 1) {
    const factors: SymbolicFactor[] = [];
    for (const component of cComponents) {
      const complement = new Set<NodeId>(g.nodes.filter((n) => !component.has(n)));
      const sub: IDResult = idRec(component, complement, g, dist, depth + 1);
      if (!sub.ok) return sub;
      factors.push(sub.formula);
    }
    const sumOut = g.nodes.filter((n) => !ySet.has(n) && !xSet.has(n));
    return {
      ok: true,
      formula: marginalSum(sumOut, productOf(factors)),
      formulaClass: FormulaClass.CComponentFactorization,
    };
  }
  const single = cComponents[0];
  if (single === undefined) {
    throw new Error("runShpitserPearlID: C-component partition is empty for a non-empty vertex set");
  }
  const sComponent = single;
  if (sComponent.size === g.nodes.length) {
    // x = empty is handled at line 1, so S can never be all of V here.
    throw new Error("runShpitserPearlID: internal invariant violated — S = V with a non-empty intervention set");
  }

  // Line 5: if G is itself one C-component, S is a strict C-subset of it and (G, G[S])
  // is a hedge: no observational functional can separate the latent dependence.
  const graphComponents = getMaximalCComponents(g);
  if (graphComponents.length === 1) {
    const hedge: HedgeWitness = {
      forestFull: [...g.nodes],
      forestSub: g.nodes.filter((n) => sComponent.has(n)),
    };
    return {
      ok: false,
      code: "FAIL_HEDGE",
      hedge,
      enablingEdges: findIDEnablingEdgesForHedge(g, hedge),
    };
  }

  // Line 6: S itself is a C-component of G -> the c-factor is directly observational.
  if (graphComponents.some((c) => setEquals(c, sComponent))) {
    const factors = g.nodes
      .filter((n) => sComponent.has(n))
      .map((n) => observationalCond(n, g.nodes.slice(0, g.nodes.indexOf(n))));
    const sumOut = g.nodes.filter((n) => sComponent.has(n) && !ySet.has(n));
    return {
      ok: true,
      formula: marginalSum(sumOut, productOf(factors)),
      formulaClass: FormulaClass.BackDoorOrDirectCFactor,
    };
  }

  // Line 7: S sits strictly inside a larger C-component S'. Answer the query in the
  // sub-model G[S'] against the c-factor kernel Q[S']; the kernels still reference the
  // predecessors outside S', which is what preserves identifiability of e.g. front-door.
  const superComponent = graphComponents.find(
    (c) => c.size > sComponent.size && [...sComponent].every((n) => c.has(n)),
  );
  if (superComponent === undefined) {
    throw new Error(
      "runShpitserPearlID: internal invariant violated — no C-component strictly contains S",
    );
  }
  const xSuper = new Set<NodeId>([...xSet].filter((n) => superComponent.has(n)));
  const nested = idRec(
    ySet,
    xSuper,
    induceSubgraph(g, superComponent),
    cFactorForComponent(g, superComponent),
    depth + 1,
  );
  if (!nested.ok) return nested;
  return { ok: true, formula: nested.formula, formulaClass: FormulaClass.TianCFactorRatio };
}

/**
 * Shpitser & Pearl (2006, R-329) IDC: identify P(y | do(x), z) — a conditional
 * intervention, where z stays OBSERVED rather than intervened.
 *
 * Step 1 applies rule 2 of do-calculus per conditioning variable: if Z_i is
 * d-separated from (Y, z \ {Z_i}) given (X, z \ {Z_i}) in G_{overline X, underline{Z_i}},
 * then observing Z_i and doing Z_i agree, and Z_i can be moved into the action set.
 * Step 2 identifies the joint P_x(y, z) with ID and normalises by summing y out of that
 * SAME joint — the denominator must be the marginal of the numerator, or the ratio is
 * not a conditional distribution.
 *
 * Failure is propagated, never swallowed: if the joint is not identifiable, there is no
 * ratio to build and the hedge is returned.
 */
export function runShpitserPearlIDC(
  ySet: ReadonlySet<NodeId>,
  xSet: ReadonlySet<NodeId>,
  zSet: ReadonlySet<NodeId>,
  g: CausalADMG,
): IDResult {
  assertWellFormed(g);
  assertKnownNodes(g, ySet, "runShpitserPearlIDC(y)");
  assertKnownNodes(g, xSet, "runShpitserPearlIDC(x)");
  assertKnownNodes(g, zSet, "runShpitserPearlIDC(z)");
  if (ySet.size === 0) throw new Error("runShpitserPearlIDC: the outcome set y must be non-empty");
  for (const outcome of ySet) {
    if (xSet.has(outcome)) {
      throw new Error(`runShpitserPearlIDC: "${outcome}" is both an outcome and an intervention`);
    }
  }
  for (const conditioned of zSet) {
    if (xSet.has(conditioned)) {
      throw new Error(`runShpitserPearlIDC: "${conditioned}" cannot be both conditioned on and intervened on`);
    }
  }
  if (zSet.size === 0) return runShpitserPearlID(ySet, xSet, g);
  return idcRec(ySet, xSet, zSet, g, true, 0);
}

function idcRec(
  ySet: ReadonlySet<NodeId>,
  xSet: ReadonlySet<NodeId>,
  zSet: ReadonlySet<NodeId>,
  g: CausalADMG,
  conditional: boolean,
  depth: number,
): IDResult {
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error("runShpitserPearlIDC: recursion depth exceeded");
  }

  // Step 1 (rule 2 / action-observation exchange), one Z_i at a time.
  for (const conditioned of zSet) {
    const zRest = new Set<NodeId>([...zSet].filter((n) => n !== conditioned));
    const mutilated = mutilateADMG(g, xSet, new Set<NodeId>([conditioned]));
    const targets = new Set<NodeId>([...ySet, ...zRest]);
    const given = new Set<NodeId>([...xSet, ...zRest]);
    if (isDSeparated(mutilated, targets, new Set<NodeId>([conditioned]), given)) {
      return idcRec(
        ySet,
        new Set<NodeId>([...xSet, conditioned]),
        zRest,
        g,
        conditional,
        depth + 1,
      );
    }
  }

  // Step 2: identify the joint P_x(y, z), then normalise over y.
  const joint = new Set<NodeId>([...ySet, ...zSet]);
  const jointResult = runShpitserPearlID(joint, xSet, g);
  if (!jointResult.ok) return jointResult;
  if (zSet.size === 0) {
    // Everything in z became an action (rule 2). The formula is still a conditional
    // distribution evaluated at the observed values, so the class keeps its prefix.
    if (!conditional) return jointResult;
    return {
      ok: true,
      formula: jointResult.formula,
      formulaClass: `CONDITIONAL_${jointResult.formulaClass}`,
    };
  }
  const denominator = marginalSum(
    g.nodes.filter((n) => ySet.has(n)),
    jointResult.formula,
  );
  return {
    ok: true,
    formula: { kind: "RATIO", numerator: jointResult.formula, denominator },
    formulaClass: `CONDITIONAL_${jointResult.formulaClass}`,
  };
}

/** Convenience gate: true iff P(y | do(x)) is identifiable in `g`. */
export function isIdentifiable(
  ySet: ReadonlySet<NodeId>,
  xSet: ReadonlySet<NodeId>,
  g: CausalADMG,
): boolean {
  return runShpitserPearlID(ySet, xSet, g).ok;
}

/**
 * Render a symbolic factor as a compact string, e.g.
 *   Sum_{z}[(P(z|w) * P(y|w,z,x))]
 * Intended for logs, receipts and test failure messages — not a parser target.
 */
export function formatSymbolicFactor(factor: SymbolicFactor): string {
  switch (factor.kind) {
    case "OBSERVATIONAL_COND":
      return factor.given.length === 0
        ? `P(${factor.target})`
        : `P(${factor.target}|${factor.given.join(",")})`;
    case "MARGINAL_SUM":
      return `Sum_{${factor.sumOut.join(",")}}[${formatSymbolicFactor(factor.body)}]`;
    case "PRODUCT":
      return `(${factor.factors.map((f) => formatSymbolicFactor(f)).join(" * ")})`;
    case "RATIO":
      return `${formatSymbolicFactor(factor.numerator)} / ${formatSymbolicFactor(factor.denominator)}`;
    default:
      return assertNever(factor);
  }
}
