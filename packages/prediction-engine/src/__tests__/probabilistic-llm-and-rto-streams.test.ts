import { describe, it, expect } from "vitest";
import {
  computeLlmDirichletPosterior,
  evaluateBidirectionalBayesTokenCoherence,
  aggregateSuperforecastProbability,
  evaluateModelSmcCandidatePool,
  evaluateArtificialAnalysisDecisionIndex,
  rerankToolCandidatesWithParamProbe,
  auditPhantomOptimaRto,
  evaluateErrorCalibratedSafetyBuffer,
  resampleFloorFractionResidual,
  computeMarchenkoPasturSpectralHealth,
  computeLayerWiseWassersteinDriftBound,
  alignGradientWithReplayCurvature,
  computeNtkSampleWeightDecay,
} from "../index.js";

describe("Streams 6, 7 & 8: Probabilistic LLM Reasoning, RTO Phantom Optima & Free-Prob Resampling", () => {
  it("evaluates Stream 6 LLM Dirichlet Posterior, Bidirectional Bayes Token Coherence & ModelSMC (arXiv:2505.15918, 2602.18266)", () => {
    const dir = computeLlmDirichletPosterior({
      llmPriorProbs: [0.5, 0.3, 0.2],
      pseudoCountStrengthN0: 10,
      empiricalCounts: [12, 5, 3],
    });
    expect(dir.posteriorMeanProbs.length).toBe(3);
    expect(dir.posteriorMeanProbs[0]).toBeGreaterThan(0.5);

    const coh = evaluateBidirectionalBayesTokenCoherence([0.4, 0.35], [0.38, 0.36], [1.05, 0.98]);
    expect(coh.coherent).toBe(true);

    const sf = aggregateSuperforecastProbability([0.58, 0.62, 0.65, 0.61, 0.64], 1.35, [0.62, 0.64]);
    expect(sf.extremizedProb).toBeGreaterThan(sf.trimmedMeanProb);

    const smc = evaluateModelSmcCandidatePool(
      [
        { modelId: "M1", equationExpr: "a*x + b", numParametersK: 2, priorWeight: 0.5, logLikelihood: -12.4 },
        { modelId: "M2", equationExpr: "a*x^2 + b*x + c", numParametersK: 3, priorWeight: 0.5, logLikelihood: -13.1 },
      ],
      100,
    );
    expect(smc.mapModelId).toBe("M1");
    expect(smc.effectiveSampleSize).toBeGreaterThan(1.0);
  });

  it("evaluates Stream 7 AA Decision Index Gate, ParamBench Probe & Phantom Optima RTO Audit (arXiv:2608.23885)", () => {
    const aaGate = evaluateArtificialAnalysisDecisionIndex({
      omniscienceAccuracy: 0.78,
      omniscienceHallucinationRate: 0.06,
      hleCalibrationScore: 0.82,
      when2CallF1: 0.74,
      wildGuardCompliance: 0.96,
    });
    expect(aaGate.verdict).toBe("AUTHORIZE_EXECUTION");
    expect(aaGate.abstentionRequired).toBe(false);

    const probe = rerankToolCandidatesWithParamProbe(
      [
        { candidateId: "C1", greedyRankScore: 0.8, hiddenStateFeatures: [0.1, -0.5], schemaValid: true },
        { candidateId: "C2", greedyRankScore: 0.72, hiddenStateFeatures: [1.5, 1.2], schemaValid: true },
      ],
      [1.2, 1.0],
    );
    expect(probe.selectedCandidateId).toBe("C2");
    expect(probe.rerankedChangedTop1).toBe(true);

    const phantom = auditPhantomOptimaRto({
      candidateStepDelta: [0.4, -0.2],
      gradientNorm: 1e-4,
      hessianEigenvalues: [-0.8, 0.15],
      mahalanobisDistanceSq: 4.2,
      chiSquareTrustRadius: 7.81,
    });
    expect(phantom.isPhantomOptimum).toBe(true);
    expect(phantom.reason).toBe("PHANTOM_CURVATURE_FAILURE");

    const buf = evaluateErrorCalibratedSafetyBuffer({
      estimatedEdge: 0.055,
      aleatoricSigma: 0.015,
      epistemicSigma: 0.012,
    });
    expect(buf.clearsSafetyGate).toBe(true);
  });

  it("evaluates Stream 8 Free-Probability Resampling (arXiv:2610.16680) & Continual Drift Plasticity (arXiv:2608.11690)", () => {
    const freeResample = resampleFloorFractionResidual([0.1, 0.35, 0.4, 0.15], 20, 1.0);
    expect(freeResample.deterministicAllocated).toBeGreaterThan(10);
    expect(freeResample.expectedSpectralRankRetention).toBeGreaterThan(0.8);

    const mp = computeMarchenkoPasturSpectralHealth([1.8, 1.2, 0.9, 0.5], 0.5);
    expect(mp.effectiveRank).toBeGreaterThan(3.0);

    const wBound = computeLayerWiseWassersteinDriftBound([1.1, 1.05, 1.2], [0.02, 0.04, 0.01]);
    expect(wBound.cumulativeDriftBound).toBeGreaterThan(0.05);

    const align = alignGradientWithReplayCurvature([0.5, -0.4], [-0.5, 0.4]);
    expect(align.destructiveInterferenceDetected).toBe(true);

    const swd = computeNtkSampleWeightDecay({
      sampleAgeSteps: 50,
      decayRateGamma: 0.01,
      empiricalNtkEffectiveRank: 20,
      nominalDimensionD: 100,
    });
    expect(swd.plasticityResetRecommended).toBe(true);
  });
});
