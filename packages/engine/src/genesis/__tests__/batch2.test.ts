import { describe, it, expect } from "vitest";
import { forgeFormula, scoreFormulaFitness, complexityScore, SEED_FORMULAS, type FormulaEvidence } from "../formula-forge.js";
import { scoutUnknowns, type ResidualObservation } from "../unknown-unknown-scout.js";
import { crossbreed, generateMutants, type ParentConcept } from "../mutant-hypothesis-generator.js";
import { scoreCreativity, type CreativityInputs } from "../proof-weighted-creativity.js";
import { evaluateConstitution, type ConstitutionEvidence } from "../law-making-constitution.js";

describe("Formula Forge", () => {
  it("forges a ratio formula with an expression and a complexity score", () => {
    const f = forgeFormula({ id: "t", target: "Lag", form: "ratio", variables: ["a", "b", "c"], assumptions: [], falsifier: "x", leakageRisk: 0.05, expectedDecisionUse: "timing" });
    expect(f.expression).toMatch(/Lag ≈/);
    expect(f.complexityScore).toBeGreaterThan(0);
  });
  it("ships nine seed formulas", () => {
    expect(SEED_FORMULAS.length).toBe(9);
  });
  it("more variables raise complexity", () => {
    expect(complexityScore(6, "product")).toBeGreaterThan(complexityScore(2, "product"));
  });
  it("promotes a high-fitness, cross-surface-surviving, actionable formula", () => {
    const e: FormulaEvidence = { outOfSampleDecisionGain: 0.4, compressionGain: 0.4, causalPlausibility: 0.3, crossSurfaceSurvival: 0.5, actionability: 0.3, complexityPenalty: 0.2, leakageRisk: 0.05, rightsRisk: 0.05, ghostSimilarityPenalty: 0.05, conceptDriftPenalty: 0.05 };
    expect(scoreFormulaFitness(e).status).toBe("promoted");
  });
  it("buries a leaky formula regardless of fitness", () => {
    const e: FormulaEvidence = { outOfSampleDecisionGain: 0.9, compressionGain: 0.9, causalPlausibility: 0.9, crossSurfaceSurvival: 0.9, actionability: 0.9, complexityPenalty: 0, leakageRisk: 0.6, rightsRisk: 0, ghostSimilarityPenalty: 0, conceptDriftPenalty: 0 };
    expect(scoreFormulaFitness(e).status).toBe("buried");
  });
});

describe("Unknown-Unknown Scout", () => {
  it("proposes a concept for an unexplained, recurring, cross-surface residual", () => {
    const obs: ResidualObservation[] = [
      { id: "r1", label: "pre_box_value_move", surface: "dfs_salary", residual: 0.6, explainedByExistingConcept: false, distanceFromOntology: 0.8, recurrence: 0.7, crossSurface: 0.7, decisionLeverageGain: 0.5, complexity: 0.2, hallucinationRisk: 0.1, proofGap: 0.2 },
      { id: "r2", label: "known_thing", surface: "prop", residual: 0.5, explainedByExistingConcept: true, distanceFromOntology: 0.2, recurrence: 0.5, crossSurface: 0.5, decisionLeverageGain: 0.3, complexity: 0.2, hallucinationRisk: 0.1, proofGap: 0.2 },
    ];
    const proposals = scoutUnknowns(obs);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.sourceId).toBe("r1");
    expect(proposals[0]!.recommendedExperiment).toMatch(/replay/i);
  });
  it("does not propose concepts for already-explained residuals", () => {
    const obs: ResidualObservation[] = [
      { id: "r2", label: "known_thing", surface: "prop", residual: 0.9, explainedByExistingConcept: true, distanceFromOntology: 0.9, recurrence: 0.9, crossSurface: 0.9, decisionLeverageGain: 0.9, complexity: 0, hallucinationRisk: 0, proofGap: 0 },
    ];
    expect(scoutUnknowns(obs)).toHaveLength(0);
  });
});

describe("Mutant Hypothesis Generator", () => {
  const concepts: ParentConcept[] = [
    { id: "rmt", name: "Role Mass Transfer", mechanism: "vacated touches redistribute", surfaces: ["fantasy", "dfs"], fitness: 0.8 },
    { id: "dog", name: "DFS Ownership Gravity", mechanism: "ownership crowds value", surfaces: ["dfs"], fitness: 0.7 },
    { id: "blag", name: "Book Lag", mechanism: "books refresh slowly", surfaces: ["betting"], fitness: 0.6 },
  ];
  it("cross-breeds two concepts that share a surface into a viable mutant", () => {
    const m = crossbreed(concepts[0]!, concepts[1]!);
    expect(m.sharedSurfaces).toContain("dfs");
    expect(m.viability).toBeGreaterThan(0.3);
  });
  it("ranks mutants and drops the non-viable, non-overlapping ones below threshold", () => {
    const mutants = generateMutants(concepts, { viabilityThreshold: 0.45 });
    expect(mutants[0]!.parents).toEqual(["rmt", "dog"]); // highest-fitness overlapping pair
    expect(mutants.every((m) => m.viability >= 0.45)).toBe(true);
  });
});

describe("Proof-Weighted Creativity", () => {
  const base: CreativityInputs = { novelty: 0.6, compression: 0.5, decisionLeverage: 0.4, crossSurfaceSupport: 0.4, hallucinationRisk: 0.1, complexity: 0.2, ghostSimilarity: 0.1, governanceRisk: 0.1 };
  it("rewards a novel, compressing, cross-surface concept", () => {
    expect(scoreCreativity(base).verdict).toBe("proof_backed_creative");
  });
  it("rejects a cool name that adds language without compression or leverage", () => {
    expect(scoreCreativity({ ...base, novelty: 0.8, compression: 0.05, decisionLeverage: 0.05, crossSurfaceSupport: 0.1 }).verdict).toBe("language_without_substance");
  });
  it("hard-stops a ghost-resembling concept", () => {
    expect(scoreCreativity({ ...base, ghostSimilarity: 0.7 }).verdict).toBe("hallucination_risk");
  });
});

describe("Law-Making Constitution", () => {
  const passing: ConstitutionEvidence = { novelty: 0.5, compression: 0.4, decisionLeverage: 0.3, falsifiable: true, replaySurvived: true, crossSurfaceSupport: 0.5, ghostDefense: 0.8, governanceSafe: true, simplicity: 0.6, oosWindowsSurvived: 1 };
  it("graduates an all-gates-pass concept to HYPOTHESIS, not LAW, without enough OOS windows", () => {
    const r = evaluateConstitution(passing);
    expect(r.verdict).toBe("GRADUATE_HYPOTHESIS");
    expect(r.passedCount).toBe(9);
  });
  it("graduates to LAW only with enough OOS windows", () => {
    expect(evaluateConstitution({ ...passing, oosWindowsSurvived: 3 }).verdict).toBe("GRADUATE_LAW");
  });
  it("rejects a concept that fails any gate (no falsifier)", () => {
    expect(evaluateConstitution({ ...passing, falsifiable: false }).verdict).toBe("REJECTED");
  });
});
