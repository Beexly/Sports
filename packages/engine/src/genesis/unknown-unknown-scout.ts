/**
 * GENESIS LAYER — Unknown-Unknown Scout (Invention 50).
 *
 * GSE should not only test known hypotheses — it should search for UNKNOWN categories of edge:
 * repeated residuals with no current explanation, surfaces that disagree strangely, value that moves
 * before the box score, situations where the ontology has no word. Borrowing the principle of
 * novelty / quality-diversity search: do not only look where old edge definitions say to look. A new
 * concept is allowed to exist only if it explains something old concepts could not, improves a
 * decision, survives replay, and can be falsified. Pure + deterministic.
 *
 *   NoveltyScore = distance_from_ontology + residual_explanation_gain + cross_surface_repeatability
 *                + decision_leverage_gain − complexity − hallucination_risk − proof_gap
 */

export interface ResidualObservation {
  readonly id: string;
  readonly label: string;        // a human-readable handle for the residual cluster
  readonly surface: string;
  readonly residual: number;     // 0..1 unexplained magnitude
  readonly explainedByExistingConcept: boolean;
  readonly distanceFromOntology: number; // 0..1 how far from any existing concept
  readonly recurrence: number;   // 0..1 how often this shape repeats
  readonly crossSurface: number; // 0..1 shows up across surfaces
  readonly decisionLeverageGain: number; // 0..1
  readonly complexity: number;
  readonly hallucinationRisk: number;
  readonly proofGap: number;
}

export interface NoveltyProposal {
  readonly conceptName: string;
  readonly sourceId: string;
  readonly formulaSketch: string;
  readonly mechanism: string;
  readonly surfacesAffected: readonly string[];
  readonly falsifier: string;
  readonly noveltyScore: number;
  readonly decisionLeverageScore: number;
  readonly governanceRisk: number;
  readonly recommendedExperiment: string;
}

function noveltyScore(o: ResidualObservation): number {
  return Number((
    0.25 * o.distanceFromOntology + 0.2 * o.residual + 0.25 * o.crossSurface + 0.2 * o.recurrence + 0.1 * o.decisionLeverageGain
    - 0.15 * o.complexity - 0.2 * o.hallucinationRisk - 0.15 * o.proofGap
  ).toFixed(4));
}

/**
 * Scout for residual clusters that current ontology cannot explain and propose new concepts. Only
 * UNEXPLAINED, sufficiently novel residuals graduate to a proposal; everything else is left alone.
 */
export function scoutUnknowns(observations: readonly ResidualObservation[], opts: { noveltyThreshold?: number } = {}): NoveltyProposal[] {
  const threshold = opts.noveltyThreshold ?? 0.35;
  return observations
    // Governance hard-stop: never propose a concept off a residual with high hallucination risk or a
    // large proof gap, no matter how novel — a high novelty score must not buy past these guards.
    .filter((o) => !o.explainedByExistingConcept && o.hallucinationRisk < 0.6 && o.proofGap < 0.8)
    .map((o) => ({ o, score: noveltyScore(o) }))
    .filter((x) => x.score >= threshold)
    .map(({ o, score }) => ({
      conceptName: `candidate:${o.label}`,
      sourceId: o.id,
      formulaSketch: `${o.label} ≈ f(${o.surface}_residual, cross_surface_repeatability)`,
      mechanism: `An unexplained, recurring ${o.surface} residual that the current ontology has no word for.`,
      surfacesAffected: [o.surface],
      falsifier: `The residual disappears or fails to recur out-of-sample.`,
      noveltyScore: score,
      decisionLeverageScore: o.decisionLeverageGain,
      governanceRisk: o.hallucinationRisk,
      recommendedExperiment: `Replay ${o.surface} across prior weeks; confirm recurrence and cross-surface presence before naming a concept.`,
    }))
    .sort((a, b) => b.noveltyScore - a.noveltyScore);
}
