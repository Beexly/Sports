import { describe, it, expect } from "vitest";
import { scoreAcquisition, rankAcquisition, type AcquisitionInputs } from "../acquisition-governor.js";
import { reliabilityFromGenome } from "../source-quality-score.js";
import { GENOME_ODDS_API, GENOME_ENTERPRISE, GENOME_FORBIDDEN, GENOME_SLEEPER, ENDPOINTS_ODDS_API } from "../source-mesh-fixtures.js";
import type { SourceGenome } from "../source-genome.js";

function inputs(genome: SourceGenome, endpoints = ENDPOINTS_ODDS_API, over: Partial<AcquisitionInputs> = {}): AcquisitionInputs {
  const novelty = genome.uniqueFacts.length / Math.max(1, genome.uniqueFacts.length + genome.duplicateFacts.length);
  return {
    genome, reliability: reliabilityFromGenome(genome).reliability, novelty, freshnessAlpha: 0.5,
    decisionLeverage: genome.decisionLeverage, proofValue: genome.proofValue, integrationComplexity: 0.3, endpoints, ...over,
  };
}

describe("Acquisition Governor", () => {
  it("never recommends USE_NOW for a forbidden source", () => {
    expect(scoreAcquisition(inputs(GENOME_FORBIDDEN)).recommendation).toBe("DO_NOT_USE");
  });
  it("sends a high-rights-risk source to RIGHTS_REVIEW, not live", () => {
    const risky: SourceGenome = { ...GENOME_SLEEPER, rightsRisk: 0.7 };
    expect(scoreAcquisition(inputs(risky)).recommendation).toBe("RIGHTS_REVIEW");
  });
  it("sends a paid source to PAID_EVALUATION / ENTERPRISE_DOSSIER", () => {
    expect(scoreAcquisition(inputs(GENOME_ENTERPRISE)).recommendation).toBe("ENTERPRISE_DOSSIER");
  });
  it("ranks a cheap, high-leverage source above an expensive enterprise one", () => {
    const r = rankAcquisition([inputs(GENOME_ENTERPRISE), inputs(GENOME_ODDS_API)]);
    expect(r[0]!.sourceId).toBe("the-odds-api");
  });
});
