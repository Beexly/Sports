import { describe, it, expect } from "vitest";
import {
  TOOMRE_TL,
  evaluateTeagEpistemicContraction,
  evaluateMultiScaleRefinementResidual,
  evaluateDriftAdvectionPhaseTransition,
  computePhysicsInformedSobolSensitivity,
  runCounterfactualSelfInterrogation,
} from "../index.js";

describe("Stream 5: Introspective Meta-Reasoner & Navier-Stokes Open-Interface Operators", () => {
  it("evaluates TEAG contraction, Multi-Scale Refinement Residual, Drift-Advection Phase Transition, Sobol, and Counterfactual Self-Interrogation", () => {
    expect(TOOMRE_TL).toBeCloseTo(0.136899, 5);

    const teag = evaluateTeagEpistemicContraction([
      { id: "H1", phiMinus: 0.35, psiAnomaly: 0.42, falsifiabilityNk: 0.7, identifiabilityIk: 0.45 },
      { id: "H2", phiMinus: 0.85, psiAnomaly: 1.25, falsifiabilityNk: 0.4, identifiabilityIk: 0.4 },
    ]);
    expect(teag.admissibleIds).toContain("H1");
    expect(teag.falsifiedIds).toContain("H2");

    const multiScale = evaluateMultiScaleRefinementResidual([
      { label: "32^3", residual: 0.42 },
      { label: "64^3", residual: 0.31 },
      { label: "96^3", residual: 0.24 },
    ]);
    expect(multiScale.holds).toBe(true);
    expect(multiScale.classification).toBe("CONVERGENT_REFINEMENT");

    const drift = evaluateDriftAdvectionPhaseTransition({
      viscosityNu: 0.025,
      coreRadiusR: 0.2,
      inwardAdvectionSpeed: 0.35,
      holderHalfModulus: 1.8,
      torsionB: 0.08,
      generalizedForceP: 1.0,
    });
    expect(drift.geometricDepletionEnforced).toBe(true);
    expect(drift.toomreStable).toBe(true);

    const sobol = computePhysicsInformedSobolSensitivity([0.12, 0.08, 0.05], [0.18, 0.12, 0.07], 0.4);
    expect(sobol.firstOrderIndices.length).toBe(3);
    expect(sobol.interactionMass).toBeGreaterThan(0.1);

    const cf = runCounterfactualSelfInterrogation({
      modelProb: 0.62,
      marketFairProb: 0.52,
      gridResiduals: [
        { label: "coarse", residual: 0.35 },
        { label: "fine", residual: 0.22 },
      ],
      hypotheses: [
        { id: "H1", phiMinus: 0.3, psiAnomaly: 0.35, falsifiabilityNk: 0.7, identifiabilityIk: 0.5 },
      ],
    });
    expect(cf.decision).toBe("PUBLISH");
    expect(cf.adjustedProb).toBeGreaterThan(0.52);
  });
});
