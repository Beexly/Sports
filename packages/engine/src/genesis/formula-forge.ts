/**
 * GENESIS LAYER — Formula Forge (Invention 46).
 *
 * GSE should not wait for humans to hand-design every signal. The Forge generates candidate
 * equations from a target + a structural form + variables, and scores each by a fitness that turns
 * "creativity" into something measurable. Borrowing the discipline of symbolic regression: a formula
 * only matters if it COMPRESSES reality, improves decisions, and survives falsification.
 *
 *   FormulaFitness = OOS_decision_gain + compression + causal_plausibility + cross_surface_survival
 *                  + actionability − complexity − leakage − rights − ghost_similarity − concept_drift
 *
 * Pure + deterministic. The Forge proposes; the constitution and prosecutors decide.
 */

export type FormulaForm = "ratio" | "product" | "linear" | "blend";

export interface ForgeSpec {
  readonly id: string;
  readonly target: string;
  readonly form: FormulaForm;
  readonly variables: readonly string[];
  readonly assumptions: readonly string[];
  readonly falsifier: string;
  readonly leakageRisk: number;
  readonly expectedDecisionUse: string;
}

export interface CandidateFormula {
  readonly id: string;
  readonly target: string;
  readonly expression: string;
  readonly variables: readonly string[];
  readonly assumptions: readonly string[];
  readonly falsifier: string;
  readonly complexityScore: number;
  readonly leakageRisk: number;
  readonly expectedDecisionUse: string;
}

/** 0..1 complexity from variable count + form cost (more variables / richer form = higher). */
export function complexityScore(variableCount: number, form: FormulaForm): number {
  const formCost = form === "linear" ? 2 : form === "blend" ? 3 : 1;
  return Number(Math.min(1, (variableCount + formCost) / 12).toFixed(4));
}

function buildExpression(form: FormulaForm, target: string, v: readonly string[]): string {
  switch (form) {
    case "ratio": {
      const half = Math.max(1, Math.ceil(v.length / 2));
      return `${target} ≈ (${v.slice(0, half).join(" + ")}) / (1 + ${v.slice(half).join(" + ") || "0"})`;
    }
    case "product": return `${target} ≈ ${v.join(" × ")}`;
    case "linear": return `${target} ≈ ${v.map((x, i) => `a${i}·${x}`).join(" + ")}`;
    case "blend": return `${target} ≈ Σ wᵢ·{${v.join(", ")}} (normalized)`;
  }
}

/** Forge one candidate formula from a spec. */
export function forgeFormula(spec: ForgeSpec): CandidateFormula {
  return {
    id: spec.id,
    target: spec.target,
    expression: buildExpression(spec.form, spec.target, spec.variables),
    variables: spec.variables,
    assumptions: spec.assumptions,
    falsifier: spec.falsifier,
    complexityScore: complexityScore(spec.variables.length, spec.form),
    leakageRisk: spec.leakageRisk,
    expectedDecisionUse: spec.expectedDecisionUse,
  };
}

/** The nine seed targets named in the directive, forged as candidates (not yet validated). */
export const SEED_FORMULAS: readonly CandidateFormula[] = [
  forgeFormula({ id: "absorption_lag", target: "AbsorptionLag", form: "ratio", variables: ["role_shock_size", "name_value", "public_attention"], assumptions: ["surface refresh rate is roughly constant"], falsifier: "lag is uncorrelated with shock size out-of-sample", leakageRisk: 0.05, expectedDecisionUse: "timing of waiver/DFS entry" }),
  forgeFormula({ id: "fantasy_absorption_half_life", target: "FantasyAbsorptionHalfLife", form: "ratio", variables: ["gap_size", "platform_update_speed", "roster_scarcity"], assumptions: ["gap closes monotonically"], falsifier: "half-life does not shrink with platform speed", leakageRisk: 0.05, expectedDecisionUse: "which surface to exploit first" }),
  forgeFormula({ id: "dfs_leverage_survival", target: "DFSLeverageSurvival", form: "product", variables: ["salary_inefficiency", "ceiling", "role_certainty", "ownership_discount", "correlation"], assumptions: ["ownership estimate is unbiased"], falsifier: "leverage survives but ROI does not, OOS", leakageRisk: 0.1, expectedDecisionUse: "DFS overweight vs fade" }),
  forgeFormula({ id: "waiver_action_utility", target: "WaiverActionUtility", form: "product", variables: ["future_role_value", "scarcity_curvature", "roster_fit", "playoff_utility", "acquisition_probability"], assumptions: ["FAAB budget is fungible"], falsifier: "utility uncorrelated with realized roster gain", leakageRisk: 0.05, expectedDecisionUse: "FAAB band" }),
  forgeFormula({ id: "trade_dislocation_value", target: "TradeDislocationValue", form: "linear", variables: ["true_ros_value", "counterparty_perceived_value", "manager_bias_exploitability", "roster_fit_gain"], assumptions: ["counterparty value is observable from offers"], falsifier: "no buy-low premium realized OOS", leakageRisk: 0.1, expectedDecisionUse: "trade for / away" }),
  forgeFormula({ id: "belief_refractive_index", target: "BeliefRefractiveIndex", form: "ratio", variables: ["observed_belief_move", "causally_expected_belief_move"], assumptions: ["expected move is estimable from role mass"], falsifier: "BRI does not predict reversion", leakageRisk: 0.05, expectedDecisionUse: "fade overreaction / buy underreaction" }),
  forgeFormula({ id: "action_half_life", target: "ActionHalfLife", form: "ratio", variables: ["decision_value_t0", "decay_rate", "surface_lock_distance"], assumptions: ["decay is exponential within the window"], falsifier: "decay rate is not stable by surface", leakageRisk: 0.05, expectedDecisionUse: "choose action expression by surface" }),
  forgeFormula({ id: "opportunity_conservation_error", target: "OpportunityConservationError", form: "linear", variables: ["removed_opportunity", "redistributed", "strategy_shift", "efficiency_decay", "opponent_effect"], assumptions: ["channels are independently measurable"], falsifier: "error does not localize the mispriced sibling", leakageRisk: 0.05, expectedDecisionUse: "find the under-credited inheritor" }),
  forgeFormula({ id: "fantasy_betting_entanglement_alpha", target: "FantasyBettingEntanglementAlpha", form: "product", variables: ["prop_role_confirmation", "fantasy_platform_lag", "decision_window_remaining", "scarcity_curvature"], assumptions: ["prop confirms role before fantasy reacts"], falsifier: "no fantasy edge follows a confirmed prop move, OOS", leakageRisk: 0.1, expectedDecisionUse: "cross-surface waiver/DFS edge" }),
];

export interface FormulaEvidence {
  readonly outOfSampleDecisionGain: number;
  readonly compressionGain: number;
  readonly causalPlausibility: number;
  readonly crossSurfaceSurvival: number;
  readonly actionability: number;
  readonly complexityPenalty: number;
  readonly leakageRisk: number;
  readonly rightsRisk: number;
  readonly ghostSimilarityPenalty: number;
  readonly conceptDriftPenalty: number;
}

export type FormulaStatus = "candidate" | "promoted" | "buried";

export interface FormulaFitnessResult {
  readonly fitness: number;
  readonly status: FormulaStatus;
  readonly reasons: readonly string[];
}

/** Score a forged formula's fitness and classify it. */
export function scoreFormulaFitness(e: FormulaEvidence): FormulaFitnessResult {
  const fitness = Number((
    e.outOfSampleDecisionGain + e.compressionGain + e.causalPlausibility + e.crossSurfaceSurvival + e.actionability
    - e.complexityPenalty - e.leakageRisk - e.rightsRisk - e.ghostSimilarityPenalty - e.conceptDriftPenalty
  ).toFixed(4));
  const reasons: string[] = [];
  if (e.leakageRisk >= 0.5) { reasons.push("Leakage risk too high — buried (correctness)."); return { fitness, status: "buried", reasons }; }
  if (e.ghostSimilarityPenalty >= 0.5) { reasons.push("Resembles a buried dead-edge cluster — buried."); return { fitness, status: "buried", reasons }; }
  if (fitness <= 0) { reasons.push("Non-positive fitness after penalties — buried."); return { fitness, status: "buried", reasons }; }
  if (fitness >= 1.2 && e.crossSurfaceSurvival >= 0.4 && e.actionability > 0) { reasons.push("High fitness + cross-surface survival + actionable — promoted to a tracked formula."); return { fitness, status: "promoted", reasons }; }
  reasons.push("Positive but unproven — remains a candidate pending OOS evidence.");
  return { fitness, status: "candidate", reasons };
}
