/**
 * GENESIS LAYER — Proof-Weighted Creativity (Invention 64).
 *
 * Creativity is rewarded ONLY when it survives proof gates. A cool name with no compression and no
 * decision leverage is "language without substance" and must be rejected, not celebrated. A high
 * hallucination risk or strong ghost resemblance is a hard stop. Pure + deterministic.
 *
 *   CreativityScore = Novelty + Compression + DecisionLeverage + CrossSurfaceSupport
 *                   − HallucinationRisk − Complexity − GhostSimilarity − GovernanceRisk
 */

export interface CreativityInputs {
  readonly novelty: number;
  readonly compression: number;
  readonly decisionLeverage: number;
  readonly crossSurfaceSupport: number;
  readonly hallucinationRisk: number;
  readonly complexity: number;
  readonly ghostSimilarity: number;
  readonly governanceRisk: number;
}

export type CreativityVerdict = "proof_backed_creative" | "promising_unproven" | "language_without_substance" | "hallucination_risk";

export interface CreativityResult {
  readonly creativityScore: number;
  readonly verdict: CreativityVerdict;
  readonly note: string;
}

/** Score a creative hypothesis, gating novelty behind proof. */
export function scoreCreativity(i: CreativityInputs): CreativityResult {
  const creativityScore = Number((
    i.novelty + i.compression + i.decisionLeverage + i.crossSurfaceSupport
    - i.hallucinationRisk - i.complexity - i.ghostSimilarity - i.governanceRisk
  ).toFixed(4));

  let verdict: CreativityVerdict;
  if (i.ghostSimilarity >= 0.5 || i.hallucinationRisk >= 0.6) verdict = "hallucination_risk";
  else if (creativityScore <= 0 || (i.novelty > 0.5 && i.compression < 0.1 && i.decisionLeverage < 0.1)) verdict = "language_without_substance";
  else if (creativityScore >= 0.6 && i.crossSurfaceSupport >= 0.3) verdict = "proof_backed_creative";
  else verdict = "promising_unproven";

  return {
    creativityScore,
    verdict,
    note: verdict === "language_without_substance"
      ? "Adds vocabulary without compression or decision leverage — reject."
      : verdict === "hallucination_risk"
        ? "Too close to a known ghost or too high a hallucination risk — reject."
        : verdict === "proof_backed_creative"
          ? "Novel AND compressing AND cross-surface-supported — proof-backed creative."
          : "Promising but unproven — keep as a candidate, do not promote.",
  };
}
