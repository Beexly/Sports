import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CPU_WORKER_CAP,
  IGPU_SHARED_MEMORY_CEILING_MB,
  L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB,
  MANDATORY_FIVE_TRACKS,
  WEEKLY_CYCLE_FIXED_ORDER,
  computeCpcContrastiveDriveAlignment,
  computeDoubleDqnFourthDownQValues,
  computeGseMlService5ModelEnsemble,
  computeKatsBocpdRegimeChangepoint,
  computePerTdSurprisePriority,
  evaluateAutoresearchKeepOrReset,
  evaluateLaptopHardwareExecutionPlan,
  evaluateMegaSweep5TrackAnd7StepReasoning,
  evaluateMorningSweep30CsvAnd10InnovationKernels,
  evaluateNofxFourPlanConjunctionGate,
} from "../mega-sweep-2026-11-06-reasoning-engine.js";

describe("mega-sweep-2026-11-06-reasoning-engine", () => {
  it("preserves the 5-track L1-L5 and 7-step weekly cycle reasoning contract", () => {
    const trace = evaluateMegaSweep5TrackAnd7StepReasoning({
      cleanBadThrowRate: 0.11,
      pressureBadThrowDelta: 0.08,
      wrTargetShare: 0.27,
      wrTargetSuccessRate: 0.56,
      qbMofCompletionRate: 0.64,
      defZoneRate: 0.68,
      underCenterEpa: 0.12,
      shotgunEpa: 0.05,
      neutralSnapShare: 0.54,
      projectedPressureRate: 0.29,
      restDaysOffense: 7,
      restDaysDefense: 6,
      priorCareerConcussions: 1,
      recent72hSubconcussiveHits: 12,
    });

    expect(trace.engineIdentity).toBe("GSE_GSI_REASONING_ENGINE_NOT_EQUATION_ENGINE");
    expect(trace.traceValid).toBe(true);
    expect(trace.uncheckedItemsAtL3OrDeeper).toBe(0);
    expect(MANDATORY_FIVE_TRACKS).toHaveLength(5);
    expect(L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB[0]).toBe("3_offensive_line");
    expect(L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB[1]).toBe("5_scheme_matchup");
    expect(L5_SYNTHESIS_ORDER_OL_TO_SCHEME_TO_QB[3]).toBe("1_qb_behavior");
    expect(trace.olToSchemeToQbOrderEnforced).toBe(true);
    expect(WEEKLY_CYCLE_FIXED_ORDER[6]).toBe("7_books_last_price_check");
    expect(trace.marketWeightInReasoning).toBe(0.06);
    expect(trace.marketIsHeadlineReason).toBe(false);
    expect(trace.receivingMetricsReceipt.yprr.yprr).toBeGreaterThan(0);
    expect(trace.gsiStep2HealthReceipt.careConsortium37pctBiomarkerNegativeRuleIn).toBe(true);
  });

  it("computes Double-DQN 4th-down Q-values by decoupling action selection from target evaluation", () => {
    const res = computeDoubleDqnFourthDownQValues({
      onlineQCurrent: { go_for_it: 1.9, field_goal: 1.5, punt: 0.6 },
      onlineQNext: { go_for_it: 2.3, field_goal: 1.8, punt: 0.7 },
      targetQNext: { go_for_it: 2.0, field_goal: 2.45, punt: 0.75 },
      immediateRewards: { go_for_it: 0.45, field_goal: 0.25, punt: -0.05 },
      gamma: 0.98,
      done: false,
    });

    expect(res.actionSelectionDecoupledFromEvaluation).toBe(true);
    expect(res.greedyNextAction).toBe("go_for_it");
    expect(res.targetEvaluatedQNext).toBeCloseTo(2.0, 6);
    expect(res.naiveMaxTargetQNext).toBeCloseTo(2.45, 6);
    expect(res.overestimationBiasRemoved).toBeCloseTo(0.45, 6);
    expect(res.recommendedAction).toBe("go_for_it");
  });

  it("computes PER-DQN TD-surprise priorities and importance-sampling weights", () => {
    const res = computePerTdSurprisePriority({
      tdErrors: [1.2, -0.3, 0.05, -2.1],
      alpha: 0.6,
      beta: 0.4,
      epsilon: 1e-5,
    });

    expect(res.count).toBe(4);
    const sumProb = res.samplingProbabilities.reduce((a, b) => a + b, 0);
    expect(sumProb).toBeCloseTo(1.0, 5);
    expect(res.rawPriorities[3]).toBe(res.maxPriority);
    expect(res.normalizedIsWeights[2]).toBeCloseTo(1.0, 6);
  });

  it("computes CPC/SimCLR contrastive drive alignment regularized by L1/L2 logistic baseline", () => {
    const res = computeCpcContrastiveDriveAlignment({
      currentDriveVector: [0.74, 0.49, 0.63, 0.32, 0.57],
      temperature: 0.12,
      l1Lambda: 0.005,
      l2Lambda: 0.015,
    });

    expect(res.cosineSimilarityPositiveMean).toBeGreaterThan(res.cosineSimilarityNegativeMean);
    expect(res.contrastiveAlignmentProb).toBeGreaterThan(0.5);
    expect(res.infonceLoss).toBeGreaterThanOrEqual(0);
    expect(res.glmLogisticProb).toBeGreaterThan(0);
    expect(res.glmLogisticProb).toBeLessThan(1);
    expect(res.regularizedDriveTdProb).toBeGreaterThan(0);
  });

  it("evaluates Karpathy autoresearch single-process keep-or-reset gate", () => {
    const keep = evaluateAutoresearchKeepOrReset(0.188, 0.189, 0.0215, 0.021, 0.0);
    expect(keep.decision).toBe("keep");
    expect(keep.keepMutation).toBe(true);
    expect(keep.triggerGitReset).toBe(false);

    const resetBrier = evaluateAutoresearchKeepOrReset(0.1888, 0.189, 0.0205, 0.021, 0.0);
    expect(resetBrier.decision).toBe("reset");
    expect(resetBrier.keepMutation).toBe(false);
    expect(resetBrier.triggerGitReset).toBe(true);

    const resetEce = evaluateAutoresearchKeepOrReset(0.187, 0.189, 0.0235, 0.021, 0.1);
    expect(resetEce.decision).toBe("reset");
    expect(resetEce.keepMutation).toBe(false);
  });

  it("evaluates Laptop Hardware Governor with CPU_WORKER_CAP=6, 4096MB iGPU ceiling, and 100% model execution", () => {
    const plan = evaluateLaptopHardwareExecutionPlan({
      requestedWorkers: 16,
      requestedIgpuMemoryMb: 8192,
      windMph: 18,
    });

    expect(plan.cpuWorkerCap).toBe(CPU_WORKER_CAP);
    expect(plan.enforcedCpuWorkers).toBe(6);
    expect(plan.mklNumThreads).toBe(6);
    expect(plan.igpuSharedMemoryCeilingMb).toBe(IGPU_SHARED_MEMORY_CEILING_MB);
    expect(plan.allocatedIgpuMemoryMb).toBeLessThanOrEqual(4096);
    expect(plan.withinIgpu4096MbCeiling).toBe(true);
    expect(plan.backends.DirectML.enabled).toBe(true);
    expect(plan.backends.Kompute.enabled).toBe(true);
    expect(plan.backends.FluidX3D.precision).toBe("FP16S");
    expect(plan.backends.Taichi.runtime).toBe("ti.vulkan");
    expect(plan.backends.AirLLM.enabled).toBe(true);
    expect(plan.localCudaDockerVllmBlocked).toBe(true);
    expect(plan.heavyWorkloadRoute).toBe("tier_c_cloud_offload");
    expect(plan.cloudOrServerlessExecution).toBe(true);
    expect(plan.zeroModelDropOrCompression).toBe(true);
    expect(plan.modelsExecutedPct).toBe(100.0);
  });

  it("computes the gse-ml-service 5-model ensemble bridge (TDA, MPS, IRL, Friston Free Energy, ETKF)", () => {
    const res = computeGseMlService5ModelEnsemble();
    expect(res.all5ModelsActive).toBe(true);
    expect(res.tdaPersistenceEntropy).toBeGreaterThan(0);
    expect(res.tdaNormalizedEntropy).toBeGreaterThan(0);
    expect(res.mpsSchmidtEntanglement).toBeGreaterThan(0);
    expect(res.mpsEffectiveBondDimension).toBeGreaterThan(1);
    expect(Number.isFinite(res.irlCoachingRewardRecovery)).toBe(true);
    expect(Number.isFinite(res.fristonVariationalFreeEnergy)).toBe(true);
    expect(res.fristonKlDivergence).toBeGreaterThanOrEqual(0);
    expect(res.etkfKalmanInnovation).toBeGreaterThan(0);
    expect(res.etkfPosteriorState).toHaveLength(3);
  });

  it("computes Kats BOCPD regime changepoints and NOFX 4-plan conjunction gate", () => {
    const bocpd = computeKatsBocpdRegimeChangepoint({
      series: [0.48, 0.5, 0.49, 0.51, 0.84, 0.86, 0.85, 0.87],
      hazardRate: 0.12,
      threshold: 0.5,
    });
    expect(bocpd.regimeShiftDetected).toBe(true);
    expect(bocpd.mostLikelyChangepointIndex).toBe(4);
    expect(bocpd.postRegimeMean).toBeGreaterThan(bocpd.preRegimeMean);

    const passGate = evaluateNofxFourPlanConjunctionGate({
      situationalEdgeEpa: 0.032,
      devigClv: 0.018,
      conformalIntervalWidth: 0.14,
      currentDrawdown: 0.03,
      proposedExposureUnits: 1.0,
    });
    expect(passGate.publishAllowed).toBe(true);
    expect(passGate.decision).toBe("PUBLISH");
    expect(passGate.plansPassedCount).toBe(4);

    const failGate = evaluateNofxFourPlanConjunctionGate({
      situationalEdgeEpa: 0.032,
      devigClv: 0.004,
      conformalIntervalWidth: 0.14,
      currentDrawdown: 0.03,
      proposedExposureUnits: 1.0,
    });
    expect(failGate.publishAllowed).toBe(false);
    expect(failGate.decision).toBe("PASS");
    expect(failGate.planVerdicts.Plan_2_DeVig_CLV).toBe(false);
  });

  it("evaluates all 30 Morning Sweep CSVs, NGS & commercial features, and 10 Innovation Kernels without shortcuts", () => {
    const res = evaluateMorningSweep30CsvAnd10InnovationKernels({
      rosterVerified: true,
      playerGp: 6,
      teamGp: 9,
    });

    expect(res.stage0RosterVerified).toBe(true);
    expect(res.activePlayerGpUsed).toBe(6);
    expect(res.perActiveGameNormalizer).toBeCloseTo(1 / 6, 5);
    expect(res.internal_only_ngs_Protected).toBe(true);
    expect(res.internalOnlyNgsProtected).toBe(true);
    expect(res.rawXyCoordinatesExportedPublicly).toBe(false);
    expect(res.ngsAndCommercialFeaturesActiveInReasoning).toBe(true);
    expect(res.all30CsvsIngested).toBe(true);
    expect(res.ingestedCsvCount).toBe(30);
    expect(res.innovationKernelsCount).toBe(10);

    for (const val of Object.values(res.innovationKernels10)) {
      expect(Number.isFinite(val)).toBe(true);
    }

    const srcFile = path.resolve(__dirname, "../mega-sweep-2026-11-06-reasoning-engine.ts");
    const srcText = fs.readFileSync(srcFile, "utf-8");
    expect(srcText.includes(".normal(")).toBe(false);
    expect(srcText.includes("tanh(")).toBe(false);
  });
});
