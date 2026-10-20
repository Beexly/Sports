/**
 * @file causal-claim-gate.ts
 * GATE G3: a causal claim may only be published if the effect it claims
 * is IDENTIFIABLE in the graph it was estimated in.
 *
 * WHY THIS GATE EXISTS (2026-10-20)
 *
 * The engine's causal path ends in `runInterventionTest`, which compares
 * the mean residual of STRONGLY ACTIVATED games against the mean
 * residual of WEAKLY ACTIVATED ones. That is an ASSOCIATION between
 * activation strength and residual. It is not an intervention, because
 * nothing was intervened on: the activation strength is a property of
 * the game, and a game with a strong activation may differ from a game
 * with a weak one in every way that has nothing to do with the premise.
 *
 * The spec's requirement is that a shock evaluation must pass
 * `runShpitserPearlIDC(ySet, xSet, zSet, gameADMG)` with `ok === true`
 * before a causal trace can be minted. In the words of the spec's own
 * Case 1: a confounded bow-arc must be REFUSED with
 * "REFUSED_G3_NON_IDENTIFIABLE_HEDGE" and the conclusion
 * "ASSOCIATION_ONLY".
 *
 * The subtlety: an identifiability check is only meaningful if the graph
 * it is run on is the graph the estimate was computed in. A gate that
 * runs on a DEFAULT graph while the estimate came from a different one
 * is decoration. So this module makes the graph EXPLICIT: a caller that
 * wants to publish a causal claim must supply the graph, and the gate
 * refuses when the graph is absent rather than assuming a friendly one.
 *
 * WHAT THIS GATE DOES NOT DO
 *
 * It does not decide whether the effect is TRUE. Identifiability is a
 * question about the graph, not about the data: it asks whether the
 * quantity has a functional expression in the observed distribution. A
 * perfectly identified effect can still be zero, and a zero effect can
 * be perfectly identified. The gate answers the first question, and
 * refuses to let an UNIDENTIFIABLE estimate be reported as a causal
 * effect.
 */
import {
  planHedgeBreakage,
  type MediatorCandidate,
} from "./hcid-mediator-expansion.js";
import {
  runShpitserPearlID,
  runShpitserPearlIDC,
  formatSymbolicFactor,
  type CausalADMG,
  type IDResult,
  type NodeId,
} from "./do-calculus-id.js";

/** The refusal codes this gate can emit. */
export const G3_REFUSAL = {
  /** The effect is not identified in the supplied graph: a hedge blocks it. */
  nonIdentifiableHedge: "REFUSED_G3_NON_IDENTIFIABLE_HEDGE",
  /** No graph was supplied, so identifiability cannot be established. */
  noGraph: "REFUSED_G3_NO_GRAPH",
  /** The graph does not contain the nodes the query names. */
  queryNotInGraph: "REFUSED_G3_QUERY_NOT_IN_GRAPH",
  /** The query is malformed: the outcome is also intervened on. */
  invalidQuery: "REFUSED_G3_INVALID_QUERY",
} as const;

export type G3RefusalCode = (typeof G3_REFUSAL)[keyof typeof G3_REFUSAL];

/** The graph and the query a causal claim is made in. */
export interface CausalClaimQuery {
  /** The outcome node(s). */
  readonly y: readonly NodeId[];
  /** The intervened-upon node(s). */
  readonly x: readonly NodeId[];
  /** The observed-but-not-intervened node(s) the claim is conditioned on. */
  readonly z?: readonly NodeId[];
  /**
   * The graph the estimate was computed in.
   *
   * REQUIRED for a causal claim. A caller that omits it gets a refusal,
   * not an assumption. The reason is that identifiability is a property
   * of a graph: checking it against a graph nobody estimated in proves
   * nothing, and defaulting to an acyclic graph would make every claim
   * identifiable and the gate worthless.
   */
  readonly graph: CausalADMG | null;
  /**
   * The point-in-time observable signals that could serve as mediators.
   *
   * The spec's V_reg. When the effect is not identified, the engine
   * runs HCID and the ID-EnablingEdges algorithm against these, and
   * the refusal says which of them would BREAK the hedge -- which is
   * a measurement plan, not a dead end.
   *
   * The registry in this repository does not carry t_valid or a sample
   * count, so a caller supplies them from wherever it knows them. A
   * candidate with no t_valid is treated as unconstrained, and one
   * with fewer than MIN_MEDIATOR_SAMPLES observations is ineligible.
   */
  readonly mediators?: readonly MediatorCandidate[];
}

export interface CausalClaimVerdict {
  /** True only when the effect is identified and may be published as causal. */
  readonly publishable: boolean;
  /** The refusal code when not publishable. */
  readonly refusal_code: G3RefusalCode | null;
  /**
   * The conclusion the engine is permitted to state. When the effect is
   * not identified, the only honest conclusion is that the observed
   * contrast is an ASSOCIATION.
   */
  readonly conclusion: "CAUSAL" | "ASSOCIATION_ONLY";
  /** The identification formula, when identified. */
  readonly formula: string | null;
  /** The class of the identification formula. */
  readonly formula_class: string | null;
  /**
   * The edges whose expansion with an observed mediator could break the
   * hedge. Non-empty exactly when the effect was refused: these are the
   * measurements that would make the question answerable.
   */
  readonly enabling_edges: ReadonlyArray<readonly [NodeId, NodeId]>;
  /** The hedge witness, when the effect was refused. */
  readonly hedge_forest_full: readonly NodeId[] | null;
  readonly hedge_forest_sub: readonly NodeId[] | null;
  /**
   * How many witnessing hedges there were.
   *
   * More than one means the candidate edges are the INTERSECTION
   * across all of them -- an edge that breaks only one of several is
   * not a measurement that makes the question answerable.
   */
  readonly hedge_count: number;
  /**
   * The mediators that DEMONSTRABLY break the hedge: the expanded
   * graph was built and ID was re-run on it, and it identified the
   * effect with zero hedges.
   *
   * Empty when no registered mediator works, and that is the honest
   * answer -- a refusal that names a measurement which does not work
   * is worse than a refusal that names none.
   */
  readonly activating_mediators: readonly string[];
  /** A human-readable explanation. */
  readonly reason: string;
}

/**
 * Check whether a causal claim may be published.
 *
 * A claim is publishable when the effect it names is identified in the
 * graph it was estimated in. Everything else is ASSOCIATION_ONLY.
 */
export function evaluateCausalClaim(query: CausalClaimQuery): CausalClaimVerdict {
  const y = new Set<NodeId>(query.y);
  const x = new Set<NodeId>(query.x);

  if (y.size === 0 || x.size === 0) {
    return refuse(
      G3_REFUSAL.invalidQuery,
      "the query must name at least one outcome and one intervened-upon node",
    );
  }

  // A query that intervenes on its own outcome is P(x | do(x)), which is
  // not a causal question. Refusing it is better than answering it.
  for (const n of y) {
    if (x.has(n)) {
      return refuse(
        G3_REFUSAL.invalidQuery,
        `the outcome ${n} is also intervened upon; P(${n} | do(${n})) is not a causal question`,
      );
    }
  }

  const graph = query.graph;
  if (graph === null || graph === undefined) {
    return refuse(
      G3_REFUSAL.noGraph,
      "no graph was supplied; identifiability is a property of a graph, and " +
        "checking it against a graph the estimate was not computed in proves nothing",
    );
  }

  // Every node the query names must be in the graph. A query about a
  // node the graph does not contain is not a question the graph can
  // answer, and answering it anyway would be a guess.
  const inGraph = new Set<NodeId>(graph.nodes);
  for (const n of [...y, ...x, ...(query.z ?? [])]) {
    if (!inGraph.has(n)) {
      return refuse(
        G3_REFUSAL.queryNotInGraph,
        `node ${n} is not in the supplied graph`,
      );
    }
  }

  const z = new Set<NodeId>(query.z ?? []);
  const result: IDResult = z.size > 0
    ? runShpitserPearlIDC(y, x, z, graph)
    : runShpitserPearlID(y, x, graph);

  if (result.ok) {
    return {
      publishable: true,
      refusal_code: null,
      conclusion: "CAUSAL",
      formula: formatSymbolicFactor(result.formula),
      formula_class: result.formulaClass,
      enabling_edges: [],
      hedge_forest_full: null,
      hedge_forest_sub: null,
      hedge_count: 0,
      activating_mediators: [],
      reason: `the effect is identified as ${result.formulaClass}`,
    };
  }

  // The effect is not identified. The observed contrast is an
  // ASSOCIATION and may only be reported as one.
  //
  // THE REPORT IS THE POINT. A refusal that says only "not
  // identified" tells nobody what to do next. The spec's section 4.4
  // says the engine should execute HCID and the ID-EnablingEdges
  // algorithm, and the result of that -- the collection of EVERY
  // witnessing hedge, the INTERSECTION of their candidate edges, and
  // the mediators that demonstrably break the hedge -- is the
  // measurement plan.
  //
  // So the verdict carries the plan, and the REASON names the
  // specific signal that would change the answer.
  const report = planHedgeBreakage(y, x, graph, query.mediators ?? []);
  const enabling = report.commonEdges;
  const activating = report.activating;

  const reason = (() => {
    if (activating.length > 0) {
      return (
        `the effect is not identified: a hedge over {${result.hedge.forestSub.join(", ")}} ` +
        `blocks it. Measuring ${activating.map((a) => a.signalId).join(", ")} ` +
        `would break it: the expanded graph identifies the effect with zero hedges.`
      );
    }
    if (enabling.length > 0) {
      // EVERY attempt is reported, eligible or not. A rejected
      // candidate is still information -- "this signal was
      // considered and it has 12 observations" tells a reader the
      // signal is not the answer, which is more useful than silence.
      const tried = report.attempts;
      const why = tried.length > 0
        ? ` (the registered mediators were tried: ${tried
            .map(
              (a) =>
                `${a.signalId} ${
                  a.breaksHedge
                    ? "would break it"
                    : a.rejection === "TOO_FEW_SAMPLES"
                      ? `ineligible: ${a.rejection} (N < 30)`
                      : a.rejection ?? "did not break the hedge"
                }`,
            )
            .join("; ")})`
        : "";
      return (
        `the effect is not identified: a hedge over {${result.hedge.forestSub.join(", ")}} ` +
        `blocks it. Measuring a mediator on ${enabling
          .map(([u, v]) => `${u} -> ${v}`)
          .join(", ")} could break the hedge${why}.`
      );
    }
    return (
      `the effect is not identified: a hedge over {${result.hedge.forestSub.join(", ")}} blocks it, ` +
      "and no directed edge inside the forest could break it with a mediator."
    );
  })();

  return {
    publishable: false,
    refusal_code: G3_REFUSAL.nonIdentifiableHedge,
    conclusion: "ASSOCIATION_ONLY",
    formula: null,
    formula_class: null,
    enabling_edges: enabling,
    hedge_forest_full: result.hedge.forestFull,
    hedge_forest_sub: result.hedge.forestSub,
    hedge_count: report.hedges.length,
    activating_mediators: activating.map((a) => a.signalId),
    reason,
  };
}

function refuse(code: G3RefusalCode, reason: string): CausalClaimVerdict {
  return {
    publishable: false,
    refusal_code: code,
    conclusion: "ASSOCIATION_ONLY",
    formula: null,
    formula_class: null,
    enabling_edges: [],
    hedge_forest_full: null,
    hedge_forest_sub: null,
    hedge_count: 0,
    activating_mediators: [],
    reason,
  };
}

/**
 * Build the graph for a single premise's edge, from the signals it
 * names.
 *
 * The engine's causal edges are (cause_signal -> effect_signal) pairs
 * derived from a premise. There is no stored PAG, so the graph that can
 * be DEFENDED from the data is the one the causal_edge row describes:
 * a directed edge from the cause to the effect, and NO bidirected arcs
 * -- because a latent confounder is not observable, and inventing one
 * would make every claim unidentifiable, while inventing none would
 * make every claim identifiable. Neither is honest.
 *
 * So this returns the graph the row actually asserts, and a caller that
 * knows of a latent confounder must supply it. What this function
 * guarantees is the weaker but true statement: on the graph the data
 * asserts, with no claimed latent confounding, the effect is identified
 * by the back-door criterion. A claim that requires a latent confounder
 * to be non-identified must say so by supplying the arc.
 */
export function graphFromCausalEdge(
  causeSignal: string,
  effectSignal: string,
  extras?: {
    readonly additionalNodes?: readonly NodeId[];
    readonly bidirected?: ReadonlyArray<readonly [NodeId, NodeId]>;
    readonly directed?: ReadonlyArray<readonly [NodeId, NodeId]>;
  },
): CausalADMG {
  const nodes: NodeId[] = [];
  const seen = new Set<NodeId>();
  const add = (n: NodeId) => {
    if (!seen.has(n)) {
      seen.add(n);
      nodes.push(n);
    }
  };
  add(causeSignal);
  add(effectSignal);
  for (const n of extras?.additionalNodes ?? []) add(n);

  const directed: Array<readonly [NodeId, NodeId]> = [
    [causeSignal, effectSignal],
    ...(extras?.directed ?? []),
  ];
  const bidirected: Array<readonly [NodeId, NodeId]> = [...(extras?.bidirected ?? [])];

  // A topological order: a node that is not the target of any directed
  // edge comes first. The ID algorithm requires one, and refuses a
  // malformed graph rather than producing a wrong answer.
  const targets = new Set(directed.map(([, v]) => v));
  const ordered = [...nodes].sort((a, b) => {
    const aIsTarget = targets.has(a) ? 1 : 0;
    const bIsTarget = targets.has(b) ? 1 : 0;
    return aIsTarget - bIsTarget;
  });

  return { nodes: ordered, directed, bidirected };
}
