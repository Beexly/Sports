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
  solveProximalBridge,
  type ProximalDataset,
  type ProximalBridgeResult,
} from "./proximal-bridge-id.js";
import {
  evaluateItcrTrace,
  ITCR_REFUSAL,
  type ItcrTrace,
  type ItcrGateResult,
} from "../calibration/itcr-orca-gate.js";
import {
  planHedgeBreakage,
  MIN_EXPANSION_E_VALUE,
  MIN_EXPANSION_CI_E_VALUE,
  type MediatorCandidate,
  type MediatorAttempt,
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
  /**
   * The intervention violates the positivity condition.
   *
   * The spec's G3 requires P(x | Pa(X) \ X) >= 0.01 alongside the
   * zero-hedge condition. Without it the identified functional is an
   * extrapolation into a region of the covariate space where no data
   * exists.
   */
  positivityViolation: "REFUSED_G3_POSITIVITY_VIOLATION",
  /**
   * The reasoning trace did not survive its conformal gate.
   *
   * The spec's ITCR applies split conformal prediction to the
   * intermediate deduction DAG, so a weak trace is HALTED before
   * publication. A causal claim built on a trace that fails its own
   * calibration is not a claim the engine is entitled to make.
   */
  itcrTraceHalted: "REFUSED_G3_ITCR_TRACE_HALTED",
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
  /**
   * The E-value of the effect being claimed.
   *
   * The spec's second activation condition. The gate runs BEFORE the
   * effect is estimated, so it cannot compute the E-value itself --
   * the caller has it (or will have it) from the contrast.
   *
   * When it is null or absent, no mediator expansion is ACTIVATED.
   * A robustness that could not be measured is not a robustness that
   * passed, and treating "unknown" as "fine" is the same defect as a
   * threshold that is exported and never checked.
   */
  readonly eValue?: number | null;
  /** The E-value floor for activating an expansion. The spec's is 1.35. */
  readonly minEValue?: number;
  /**
   * The CI E-value of the effect being claimed.
   *
   * The spec's G4 is a CONJUNCTION over TWO numbers: the point
   * E-value must clear 1.35 and the CI E-value must clear 1.10. The
   * expansion path checked only the first, so an expansion whose
   * confidence bound was nowhere near the null activated on the
   * strength of its point estimate alone.
   *
   * When it is null or absent, the conjunction FAILS -- the same
   * rule as the point E-value, for the same reason: an unmeasured
   * robustness is not a robustness that passed.
   */
  readonly ciEValue?: number | null;
  /** The CI E-value floor for activating an expansion. The spec's is 1.10. */
  readonly minCiEValue?: number;

  /**
   * The PROXIMAL data, when the caller has a treatment-inducing proxy
   * Z and an outcome-inducing proxy W.
   *
   * THIS IS WHAT TURNS A REFUSAL INTO AN ANSWER.
   *
   * When the effect is not identified -- a bow-arc A -> Y with
   * A <-> Y, and no observable mediator that can break the hedge --
   * the claim is refused, and the refusal is correct. But the spec's
   * section 4.4 also says the engine should EXECUTE the proximal
   * algorithm, and proximal causal inference is the alternative: if
   * the confounder U is proxied by Z and W, the effect IS
   * identified, by a different argument.
   *
   * So the gate runs the proximal solver on this path. If it admits
   * (all three of the condition number, the J-test and the E-value
   * pass), the claim becomes CAUSAL with the proximal g-formula as
   * its formula, and the verdict says so. If it refuses, the
   * refusal is REPORTED -- with the proximal refusal code and its
   * reason -- because "the proximal route also does not work, for
   * this specific reason" is a different and more useful finding than
   * silence.
   *
   * It is OPTIONAL because the caller may have no proxies. Absent
   * proxies, the refusal stands exactly as before.
   */
  readonly proximal?: ProximalDataset | null;

  /**
   * The treatment level a* in E[Y | do(A = a*)], and the control level
   * a0. Defaults to 1 and 0 -- the binary case.
   */
  readonly proximalTreatmentLevel?: number;
  readonly proximalControlLevel?: number;

  /**
   * The ITCR trace: the reasoning chain the claim rests on.
   *
   * THIS IS THE SPEC'S L1-L5 TRACE, SCORED BEFORE PUBLICATION.
   *
   * The ITCR gate applies split conformal prediction to the
   * intermediate deduction DAG rather than to the scalar output at
   * the end of the pipeline, so the trace can be HALTED and rethought
   * before it reaches the publish gate. A claim whose premises are
   * jointly weak is exactly what that is for.
   *
   * It is OPTIONAL. When the caller supplies no trace, the claim is
   * published exactly as before -- the trace is a guard, not a
   * licence. When the caller DOES supply one, the trace is scored,
   * and a trace that fails the conformal threshold HALTS the claim:
   * the claim is refused with the ITCR refusal, because a causal
   * claim built on a trace that does not survive its own calibration
   * is not a claim the engine is entitled to make.
   *
   * The calibration scores are the historical nonconformity scores.
   * They are REQUIRED alongside the trace: a conformal threshold
   * computed from nothing is not a threshold.
   */
  readonly itcrTrace?: ItcrTrace | null;

  /** The historical nonconformity scores the conformal threshold is computed from. */
  readonly itcrCalibrationScores?: readonly number[] | null;
  /**
   * The POSITIVITY of the intervention.
   *
   * The spec's G3 is a CONJUNCTION of TWO conditions:
   *
   *     the number of witnessing hedges is 0, AND
   *     P(x | Pa(X)_G \ X) >= 0.01
   *
   * Positivity says the intervened-upon value must be one that COULD
   * have occurred given its parents. Without it, the back-door
   * adjustment is an extrapolation to a point of the covariate space
   * where no data exists, and the "identified" functional is a formal
   * result about a region the engine has never observed.
   *
   * The gate has no data, so it cannot compute this -- the caller has
   * it, from the same fit the effect was estimated in. It is supplied
   * here.
   *
   * When it is null or absent, the claim is REFUSED. A positivity that
   * could not be checked is not a positivity that held, and the spec
   * makes it a conjunct of the gate rather than an optional
   * refinement.
   */
  readonly positivity?: number | null;
  /**
   * The positivity floor. The spec's is 0.01.
   */
  readonly minPositivity?: number;
}

/**
 * What the ITCR trace gate produced.
 */
export type ItcrTraceReport =
  | {
      readonly status: "ALLOW";
      readonly alpha_ITCR: number;
      readonly tau_conformal: number;
      readonly offender_node_id: string;
      readonly reason: string;
    }
  | {
      readonly status: "HALT";
      readonly alpha_ITCR: number;
      readonly tau_conformal: number;
      readonly offender_node_id: string;
      readonly reason: string;
    };

/**
 * What the PROXIMAL route produced on the not-identified path.
 *
 * A discriminated union, so a caller can route on the code rather
 * than parse prose.
 */
export type ProximalAttemptReport =
  | {
      readonly admitted: true;
      /** E[Y | do(A = a*)] - E[Y | do(A = a0)] from the proximal g-formula. */
      readonly ate: number;
      readonly treatedMean: number;
      readonly controlMean: number;
      readonly eValue: number | null;
      readonly ciEValue: number | null;
      readonly sampleSize: number;
      readonly reason: string;
    }
  | {
      readonly admitted: false;
      /** The proximal refusal code, e.g. PROXIMAL_CI_E_VALUE_TOO_LOW. */
      readonly code: string;
      readonly reason: string;
    };

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

  /**
   * The PROXIMAL attempt, when one was made.
   *
   * Null when the caller supplied no proximal data, or when the
   * effect was identified by an ordinary path and the proximal solver
   * was never needed.
   *
   * When the proximal solver ADMITTED, the claim is publishable and
   * this carries the recovered effect. When it REFUSED, this carries
   * the refusal code and the reason -- because "the proximal route
   * also does not work, because the instrument matrix is
   * ill-conditioned" is a specific, actionable finding, and a
   * refusal that omits it is hiding a measured result.
   */
  readonly proximal_attempt: ProximalAttemptReport | null;

  /**
   * The ITCR trace score, when a trace was supplied.
   *
   * Null when the caller supplied no trace, or when the trace HALTED
   * and the claim was refused -- in which case the REFUSAL is the
   * report, and it says why.
   *
   * When the trace was scored and ALLOWED, this says so, so a reader
   * can tell that the trace was checked rather than ignored.
   */
  readonly itcr_trace_score: ItcrTraceReport | null;
  /**
   * The expansion ATTEMPTS, so a caller that learns the E-value
   * LATER can finish the activation decision.
   *
   * The gate runs BEFORE the effect is estimated, so the E-value --
   * the spec's second activation condition -- is not known at gate
   * time. The gate therefore reports the attempts (each of which was
   * MEASURED: the expanded graph was built and ID re-run on it) and
   * leaves the activation decision to whoever has the E-value.
   *
   * `finalizeExpansion` is that function.
   */
  readonly expansion_attempts: readonly MediatorAttempt[];
  /** A human-readable explanation. */
  readonly reason: string;
}

/**
 * Check whether a causal claim may be published.
 *
 * A claim is publishable when the effect it names is identified in the
 * graph it was estimated in. Everything else is ASSOCIATION_ONLY.
 */
/**
 * RUN THE ITCR GATE, if the caller supplied a trace to score.
 *
 * Returns null when there is no trace -- a caller with no reasoning
 * trace gets the claim exactly as before.
 *
 * A THROWN exception is caught and turned into a refusal, for the same
 * reason the proximal one is: the gate must always return a verdict.
 * A malformed trace is the caller's problem, and a crash out of the
 * gate is worse than a verdict that says the trace could not be
 * scored.
 */
function runItcrGate(query: CausalClaimQuery): ItcrGateResult | null {
  const trace = query.itcrTrace;
  if (trace === null || trace === undefined) return null;
  const calibration = query.itcrCalibrationScores;
  if (calibration === null || calibration === undefined) {
    // A trace with no calibration set has no threshold. There is no
    // score to compare against, so the gate cannot say ALLOW -- and
    // it cannot say HALT either, because a HALT needs a comparison.
    // It refuses, which is the honest answer.
    return {
      status: "REFUSED",
      conformal_Stop_triggered: false,
      refusal_code: ITCR_REFUSAL.noCalibrationSet,
      alpha_ITCR: null,
      tau_conformal: null,
      shafer_vovk_rank: null,
      calibration_set_size: 0,
      miscoverage: 0,
      unbounded_prediction_set: false,
      reason:
        "a reasoning trace was supplied with no calibration scores, so no conformal " +
        "threshold exists and the trace cannot be scored",
    };
  }

  try {
    return evaluateItcrTrace({ trace, calibration_scores: calibration });
  } catch (error) {
    return {
      status: "REFUSED",
      conformal_Stop_triggered: false,
      refusal_code: ITCR_REFUSAL.nodeValidityOutsideBand,
      alpha_ITCR: null,
      tau_conformal: null,
      shafer_vovk_rank: null,
      calibration_set_size: calibration.length,
      miscoverage: 0,
      unbounded_prediction_set: false,
      reason: `the ITCR gate threw on the supplied trace: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * RUN THE PROXIMAL SOLVER, if the caller supplied the data for it.
 *
 * Returns null when there is nothing to run -- no proximal dataset, or
 * no proxies in it. A caller without proxies gets the ordinary
 * refusal, unchanged.
 *
 * A solver that THROWS is caught here, because a malformed dataset is
 * the caller's problem and the gate's job is to report a refusal, not
 * to propagate an exception out of a gate that is supposed to always
 * return a verdict. The thrown message is carried into the report, so
 * the failure is not swallowed.
 */
function runProximalAttempt(query: CausalClaimQuery): ProximalAttemptReport | null {
  const dataset = query.proximal;
  if (dataset === null || dataset === undefined) return null;
  if (dataset.treatmentProxy === null || dataset.treatmentProxy === undefined) return null;
  if (dataset.outcomeProxy === null || dataset.outcomeProxy === undefined) return null;

  let result: ProximalBridgeResult;
  try {
    result = solveProximalBridge(dataset, {
      treatmentLevel: query.proximalTreatmentLevel ?? 1,
      controlLevel: query.proximalControlLevel ?? 0,
    });
  } catch (error) {
    return {
      admitted: false,
      code: "PROXIMAL_SOLVER_THREW",
      reason: `the proximal solver threw on the supplied data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (result.ok) {
    return {
      admitted: true,
      ate: result.ate,
      treatedMean: result.treatedMean,
      controlMean: result.controlMean,
      eValue: result.eValue,
      ciEValue: result.ciEValue,
      sampleSize: result.sampleSize,
      // The admitted result carries no `reason` -- it carries the
      // numbers. The verdict's own reason says what was concluded.
      reason:
        `the proximal bridge was admitted on ${result.sampleSize} rows ` +
        `(ATE ${result.ate.toFixed(6)}, E-value ${(result.eValue ?? 0).toFixed(3)})`,
    };
  }
  return {
    admitted: false,
    code: result.code,
    reason: result.reason,
  };
}

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

  // THE ITCR GATE, BEFORE ANYTHING IS PUBLISHED.
  //
  // The spec's ITCR applies split conformal prediction to the
  // intermediate deduction DAG, so a trace can be HALTED and rethought
  // before it reaches the publish gate. A causal claim whose premises
  // are jointly weak is exactly what that is for.
  //
  // It runs FIRST, before the graph is even consulted, because a trace
  // that halts makes the identification question moot: there is no
  // point deciding whether the effect is identified when the
  // reasoning that got us there does not survive its own calibration.
  //
  // The trace is OPTIONAL. Absent a trace, the claim proceeds exactly
  // as before. Present a trace, the trace is scored -- and a HALT
  // refuses the claim, because a causal claim built on a trace that
  // does not survive its own calibration is not a claim the engine is
  // entitled to make.
  const itcrResult = runItcrGate(query);
  // The score, for the verdict. Computed ONCE here so every return
  // site below can report the same numbers the gate decided on.
  const itcrScore: ItcrTraceReport | null =
    itcrResult === null
      ? null
      : itcrResult.status === "ALLOW"
        ? {
            status: "ALLOW",
            alpha_ITCR: itcrResult.alpha_ITCR ?? 0,
            tau_conformal: itcrResult.tau_conformal ?? 0,
            offender_node_id: itcrResult.offender_node_id,
            reason: itcrResult.reason,
          }
        : itcrResult.status === "HALT"
          ? {
              status: "HALT",
              alpha_ITCR: itcrResult.alpha_ITCR ?? 0,
              tau_conformal: itcrResult.tau_conformal ?? 0,
              offender_node_id: itcrResult.offender_node_id,
              reason: itcrResult.reason,
            }
          : null;
  if (itcrResult !== null && itcrResult.status !== "ALLOW") {
    // It HALTED, or it could not certify. Either way the claim does
    // not go out, and the reason says which.
    //
    // The refusal carries the score, so a reader can see the numbers
    // that caused it. The REFUSED case has no alpha (nothing was
    // scored), which is why the report type distinguishes HALT from
    // ALLOW.
    return {
      ...refuse(
        G3_REFUSAL.itcrTraceHalted,
        itcrResult.status === "HALT"
          ? `the reasoning trace does not survive its conformal gate: its nonconformity ` +
            `${(itcrResult.alpha_ITCR ?? 0).toFixed(4)} exceeds the threshold ` +
            `${(itcrResult.tau_conformal ?? 0).toFixed(4)} (the weakest node is ` +
            `${itcrResult.offender_node_id}), so the claim is halted before publication`
          : `the reasoning trace could not be certified: ${itcrResult.refusal_code}`,
      ),
      itcr_trace_score: itcrScore,
    };
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
    // THE POSITIVITY CONDITION.
    //
    // The spec's G3 is a CONJUNCTION: zero hedges AND
    // P(x | Pa(X) \ X) >= 0.01. The effect being IDENTIFIED is only
    // half of it.
    //
    // Positivity says the intervened-upon value must be one that
    // could have occurred given its parents. Without it, the
    // back-door adjustment is an extrapolation to a point of the
    // covariate space where no data exists -- the functional is
    // formally correct and empirically meaningless.
    //
    // The gate has no data, so the caller supplies it. A MISSING
    // positivity REFUSES: a positivity that could not be checked is
    // not a positivity that held, and the spec makes it a conjunct of
    // the gate rather than an optional refinement. Refusing here is
    // the conservative direction -- it can only withhold a claim, and
    // the alternative is publishing an extrapolation.
    const minPositivity = query.minPositivity ?? 0.01;
    const positivity = query.positivity ?? null;
    if (positivity === null) {
      return refuse(
        G3_REFUSAL.positivityViolation,
        "the effect is identified, but the positivity condition could not be " +
          `checked: P(${[...x].join(",")} | Pa(X) \\ X) was not supplied. A ` +
          "positivity that cannot be checked is not a positivity that held.",
      );
    }
    if (positivity < minPositivity) {
      return refuse(
        G3_REFUSAL.positivityViolation,
        `the effect is identified, but the intervention violates positivity: ` +
          `P(${[...x].join(",")} | Pa(X) \\ X) = ${positivity.toFixed(6)} < ` +
          `${minPositivity}. The identified functional would be an ` +
          "extrapolation into a region of the covariate space with no data.",
      );
    }
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
      expansion_attempts: [],
      // The ordinary path identified it, so the proximal solver was
      // never needed. The field is null rather than absent, so a
      // caller can tell "not attempted" from "attempted and refused".
      proximal_attempt: null,
      // And the trace score, if a trace was scored. A trace that was
      // scored and ALLOWED is reported, so a reader can tell the
      // trace was checked rather than ignored.
      itcr_trace_score: itcrScore,
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
  const report = planHedgeBreakage(y, x, graph, query.mediators ?? [], {
    eValue: query.eValue ?? null,
    ...(query.minEValue === undefined ? {} : { minEValue: query.minEValue }),
    ciEValue: query.ciEValue ?? null,
    ...(query.minCiEValue === undefined ? {} : { minCiEValue: query.minCiEValue }),
  });
  const enabling = report.commonEdges;
  const activating = report.activating;

  // THE PROXIMAL ROUTE.
  //
  // The effect is not identified by the ordinary path. The spec's
  // section 4.4 says the engine should EXECUTE the proximal algorithm
  // here, and it is the difference between a refusal and an answer:
  // if the confounder is proxied, the effect IS identified, by a
  // different argument.
  //
  // So the proximal solver runs on this path, and its result is
  // reported whether it admits or refuses.
  const proximalAttempt = runProximalAttempt(query);
  if (proximalAttempt !== null && proximalAttempt.admitted) {
    // IT ADMITTED. The claim is CAUSAL, by the proximal g-formula.
    //
    // The proximal solver's own gates did the work: the condition
    // number, the J-test, and BOTH E-value floors. The caller is told
    // which route produced the number, because a proximal estimate
    // and a g-formula estimate are not the same claim.
    return {
      publishable: true,
      refusal_code: null,
      conclusion: "CAUSAL",
      formula: `proximal g-formula: E[Y | do(A = ${query.proximalTreatmentLevel ?? 1})] - ` +
        `E[Y | do(A = ${query.proximalControlLevel ?? 0})] = ${proximalAttempt.ate.toFixed(6)}`,
      formula_class: "PROXIMAL_BRIDGE",
      enabling_edges: [],
      hedge_forest_full: null,
      hedge_forest_sub: null,
      hedge_count: 0,
      activating_mediators: [],
      expansion_attempts: [],
      proximal_attempt: proximalAttempt,
      itcr_trace_score: itcrScore,
      reason:
        `the effect is not identified by the ordinary path, but it IS identified by PROXIMAL ` +
        `CAUSAL INFERENCE: the treatment-inducing and outcome-inducing proxies satisfy the ` +
        `bridge conditions (the instrument matrix is well-conditioned, the holdout J-test ` +
        `passes, and the effect's E-value is ${(proximalAttempt.eValue ?? 0).toFixed(3)}), so the ` +
        `proximal g-formula identifies the effect at ${proximalAttempt.ate.toFixed(6)}.`,
    };
  }

  const proximalNote =
    proximalAttempt !== null
      ? ` The proximal route was also tried: ${
          proximalAttempt.admitted
            ? "it admitted the effect"
            : `it refused (${proximalAttempt.code}): ${proximalAttempt.reason}`
        }`
      : "";

  const reason = (() => {
    if (activating.length > 0) {
      return (
        `the effect is not identified: a hedge over {${result.hedge.forestSub.join(", ")}} ` +
        `blocks it. Measuring ${activating.map((a) => a.signalId).join(", ")} ` +
        `would break it: the expanded graph identifies the effect with zero hedges, ` +
        `and the effect passes the adversary review (E-value ${report.eValue!.toFixed(3)} ` +
        `>= ${report.minEValue}).`
      );
    }
    if (report.breaksHedgeButFragile.length > 0) {
      // The expansion WORKS but the effect is too fragile to state as
      // causal. That is a different, and more actionable, finding than
      // "no measurement helps".
      return (
        `the effect is not identified: a hedge over {${result.hedge.forestSub.join(", ")}} ` +
        `blocks it. Measuring ${report.breaksHedgeButFragile
          .map((a) => a.signalId)
          .join(", ")} would break the hedge, but the effect does not pass the ` +
        `adversary review` +
        (report.eValue === null
          ? " (its E-value could not be measured, and an unmeasured robustness is not a passed one)"
          : ` (E-value ${report.eValue.toFixed(3)} < ${report.minEValue})`) +
        ", so the expansion is not activated."
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
  })() + proximalNote;

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
    expansion_attempts: report.attempts,
    // The proximal attempt, when one was made. It refused, or it
    // would have returned above.
    proximal_attempt: proximalAttempt,
    // And the trace score, when a trace was scored.
    itcr_trace_score: itcrScore,
    reason,
  };
}

/**
 * FINISH THE ACTIVATION DECISION, once the E-value is known.
 *
 * The gate runs BEFORE the effect is estimated, so the spec's second
 * activation condition -- "passes Adversary Review (E-value >= 1.35)"
 * -- is not available at gate time. The gate reports the ATTEMPTS
 * (each measured: the expanded graph was built and ID re-run on it),
 * and this function applies the E-value to them.
 *
 * The result is the same shape the gate would have produced had the
 * E-value been known up front, so the two paths cannot disagree.
 */
export function finalizeExpansion(
  attempts: readonly MediatorAttempt[],
  eValue: number | null,
  minEValue = MIN_EXPANSION_E_VALUE,
  ciEValue: number | null = null,
  minCiEValue = MIN_EXPANSION_CI_E_VALUE,
): {
  readonly activating: readonly MediatorAttempt[];
  readonly breaksHedgeButFragile: readonly MediatorAttempt[];
  readonly eValuePasses: boolean;
  readonly pointEValuePasses: boolean;
  readonly ciEValuePasses: boolean;
} {
  const breaks = attempts.filter((a) => a.eligible && a.breaksHedge);
  // A robustness that could not be measured is not a robustness that
  // passed.
  //
  // THE CONJUNCTION. The spec's G4 has TWO numbers and TWO floors:
  // the point E-value must clear 1.35 AND the CI E-value must clear
  // 1.10. This function checked only the first, so a call that
  // supplied a point E-value and no CI E-value activated an
  // expansion whose confidence bound was never measured.
  const pointEValuePasses = eValue !== null && eValue >= minEValue;
  const ciEValuePasses = ciEValue !== null && ciEValue >= minCiEValue;
  const eValuePasses = pointEValuePasses && ciEValuePasses;
  return {
    activating: eValuePasses ? breaks : [],
    breaksHedgeButFragile: eValuePasses ? [] : breaks,
    eValuePasses,
    pointEValuePasses,
    ciEValuePasses,
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
    expansion_attempts: [],
    // These refusals happen BEFORE the hedge path, so no proximal
    // attempt was made.
    proximal_attempt: null,
    // No trace score either -- these refusals happen before the ITCR
    // gate runs.
    itcr_trace_score: null,
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
