import { describe, expect, it } from "vitest";
import {
  computePreProjectionAndSimulationConditionedOverlay,
  runMasterSituationalReasoningOverlay,
} from "../master-situational-reasoning-aggregator.js";

describe("Master Situational Pre-Projection & Simulation Conditioned Overlay E2E", () => {
  it("evaluates all 6 Universal NFL Metric Suites, all 6 Deep Non-Stationary Kernels, and the Mega-Sweep 2026-11-06 Pipeline inside runMasterSituationalReasoningOverlay", () => {
    const t0 = performance.now();
    const res = runMasterSituationalReasoningOverlay({
      familyDeltas: {
        pressure: 0.03,
        weather: -0.01,
        restFatigue: -0.02,
        coveragePersonnel: 0.025,
        qbSkillScript: 0.035,
        marketMicrostructure: 0.015,
      },
      marketAnchorProb: 0.56,
      independentEdgeDecision: "SPEAK",
    });
    const elapsedMs = performance.now() - t0;

    expect(elapsedMs).toBeLessThan(250);
    expect(res.universal360AndDeepKernels.all_6_suites_active).toBe(true);
    expect(res.universal360AndDeepKernels.all_6_deep_kernels_active).toBe(true);
    expect(
      res.universal360AndDeepKernels.deep_non_stationary_kernels
        .gsi_sports_medicine_and_coupled_5api.coupled_5api_scientific_nodes_wired,
    ).toBe(204);
    expect(res.megaSweep20261106Pipeline.allKernelsActive).toBe(true);
    expect(
      res.megaSweep20261106Pipeline.doubleDqnFourthDown
        .actionSelectionDecoupledFromEvaluation,
    ).toBe(true);
    expect(
      res.megaSweep20261106Pipeline.gseMlService5ModelEnsemble.all5ModelsActive,
    ).toBe(true);
    expect(
      res.megaSweep20261106Pipeline.morningSweep30CsvAnd10InnovationKernels
        .all30CsvsIngested,
    ).toBe(true);
    expect(
      res.megaSweep20261106Pipeline.morningSweep30CsvAnd10InnovationKernels
        .ngsAndCommercialFeaturesActiveInReasoning,
    ).toBe(true);

    const streamNames = res.streamCalls.map((c) => c.stream);
    expect(streamNames).toContain(
      "15J:evaluateUniversalNfl360MetricAndSituationalDossier",
    );
    expect(streamNames).toContain("15K:evaluateMegaSweep20261106Pipeline");
  });

  it("computes computePreProjectionAndSimulationConditionedOverlay with trajectory conditioners for 10,000 worlds x 175 snaps in < 100ms", () => {
    const t0 = performance.now();
    const conditioned = computePreProjectionAndSimulationConditionedOverlay({
      awayTeam: "JAX",
      homeTeam: "BAL",
      week: 9,
      marketAnchorProb: 0.58,
      independentEdgeDecision: "SPEAK",
    });
    const elapsedMs = performance.now() - t0;

    expect(elapsedMs).toBeLessThan(100);
    expect(conditioned.awayTeam).toBe("JAX");
    expect(conditioned.homeTeam).toBe("BAL");
    expect(
      conditioned.simulationTrajectoryConditioners.conditionAppliedTo10kWorlds175Snaps,
    ).toBe(true);
    expect(
      conditioned.simulationTrajectoryConditioners.scripted1To15EpaBoost,
    ).toBeGreaterThan(0);
    expect(
      conditioned.simulationTrajectoryConditioners.postScript16To65CliffDelta,
    ).toBeLessThan(0);
    expect(
      conditioned.simulationTrajectoryConditioners.secondHalfTutFatigueMultiplier,
    ).toBeGreaterThan(0.75);
    expect(
      conditioned.simulationTrajectoryConditioners.secondHalfTutFatigueMultiplier,
    ).toBeLessThan(1.0);
    expect(
      conditioned.simulationTrajectoryConditioners.qbTraumaPhantomBailoutProb,
    ).toBeGreaterThan(0);
    expect(
      conditioned.simulationTrajectoryConditioners.gsiReturnToPlaySnapCap,
    ).toBeGreaterThan(0.5);
    expect(
      conditioned.simulationTrajectoryConditioners.gsiReturnToPlaySnapCap,
    ).toBeLessThan(1.0);
    expect(conditioned.masterOverlayResult.publishAllowed).toBe(true);
  });

  it("enforces PASS discipline when independentEdgeDecision is PASS", () => {
    const conditioned = computePreProjectionAndSimulationConditionedOverlay({
      awayTeam: "SF",
      homeTeam: "SEA",
      week: 9,
      marketAnchorProb: 0.52,
      independentEdgeDecision: "PASS",
    });
    expect(conditioned.masterOverlayResult.publishAllowed).toBe(false);
  });
});
