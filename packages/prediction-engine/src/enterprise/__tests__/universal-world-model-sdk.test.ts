import { describe, it, expect } from "vitest";
import {
  GSEWeatherCartridge,
  GSEGridCartridge,
  GSELogisticsCartridge,
  GSEVerifyCartridge,
  WorldModelCartridgeRegistry,
  ItcrTrace,
  evaluateAbnormalSituationManagement,
  evaluateVolveDualHeadAnomalyGate,
  evaluateLifecycleDataQualityGate,
  CausalBeamTransferEngine,
} from "../../index.js";

describe("Universal World Model SDK & Cartridges (Component 10)", () => {
  const dummyTrace: ItcrTrace = {
    nodes: [
      { id: "n1", layer: "L2", parents: [], validity: 0.95 },
      { id: "n2", layer: "L3", parents: ["n1"], validity: 0.95 },
    ],
    conclusion_node_id: "n2",
  };
  const dummyCalScores: readonly number[] = Array.from({ length: 20 }, () => 0.30);
  const dummyResiduals = [0.03, 0.04, 0.02, 0.05, 0.04, 0.03, 0.06, 0.02, 0.03, 0.04];

  it("manages all registered cartridges in WorldModelCartridgeRegistry", () => {
    const registry = new WorldModelCartridgeRegistry();
    const list = registry.listCartridges();
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.map((c) => c.vertical)).toEqual(
      expect.arrayContaining(["GSE_WEATHER", "GSE_GRID", "GSE_LOGISTICS", "GSE_VERIFY"]),
    );
  });

  it("executes GSE-Grid cartridge end-to-end (wind power, LMP spike, ADMG)", () => {
    const grid = new GSEGridCartridge();
    const watermark = { validTimeUtc: "2026-10-21T18:00:00Z", transactionTimeUtc: "2026-10-21T18:00:05Z" };
    const ingested = grid.ingestSignals(
      [
        {
          nodeOrSubstationId: "SUB-ERCOT-NORTH",
          ambientTempCelsius: 32.5,
          windSpeedMps: 9.5,
          solarIrradianceWm2: 850,
          realtimeLmpMwh: 48.5,
          dayaheadLmpMwh: 36.2,
        },
      ],
      watermark,
    );
    expect(ingested.rawCount).toBe(1);

    const graph = grid.buildCausalGraph(
      { balancingAuthority: "ERCOT", targetForecastHorizonHours: 4, nameplateCapacityMw: 250 },
      ingested,
    );
    expect(graph.nodes).toContain("RenewableResource");
    expect(graph.bidirected.length).toBe(1);

    const interventional = grid.solveInterventions(
      { treatmentNode: "RenewableGeneration", treatmentValue: 180, outcomeNode: "RealtimeLMP" },
      graph,
    );
    expect(interventional.isIdentifiable).toBe(true);
    expect(interventional.pointEstimate).toBe(0.68);

    const decision = grid.calibrateAndSize(
      interventional,
      { anchorPrice: 0.55, anchorTimestampUtc: "2026-10-21T18:00:00Z", dispersionStdDev: 0.02 },
      dummyTrace,
      dummyCalScores,
      dummyResiduals,
    );
    expect(decision.recommendedAction).toBe("PUBLISH_APEX");
    expect(decision.payload.expectedWindGenerationMw).toBeGreaterThan(0);
    expect(decision.payload.balancingAuthority).toBe("ERCOT");

    const feedback = grid.settleAndLearn([
      {
        decisionId: decision.decisionId,
        observationTimeUtc: "2026-10-21T22:00:00Z",
        realizedOutcome: 1,
        forecastedProbability: decision.interventionalDistribution.pointEstimate,
        closingBenchmark: 0.55,
      },
    ]);
    expect(feedback.brierScore).toBeGreaterThanOrEqual(0);
  });

  it("executes GSE-Logistics cartridge end-to-end (berth dwell time, demurrage)", () => {
    const logistics = new GSELogisticsCartridge();
    const watermark = { validTimeUtc: "2026-10-21T18:00:00Z", transactionTimeUtc: "2026-10-21T18:00:05Z" };
    const ingested = logistics.ingestSignals(
      [
        {
          vesselImo: "IMO-9811002",
          portCode: "USLAX",
          draftMeters: 14.2,
          speedKnots: 16.5,
          queueLengthVessels: 8,
          berthDwellHours: 38.5,
        },
      ],
      watermark,
    );
    expect(ingested.rawCount).toBe(1);

    const graph = logistics.buildCausalGraph(
      {
        originPort: "CNSHG",
        destinationPort: "USLAX",
        targetArrivalUtc: "2026-10-24T06:00:00Z",
        demurrageRateDailyUsd: 45000,
      },
      ingested,
    );
    expect(graph.nodes).toContain("BerthAllocation");

    const interventional = logistics.solveInterventions(
      { treatmentNode: "CraneOperatingRate", treatmentValue: 28.5, outcomeNode: "DwellTime" },
      graph,
    );
    expect(interventional.isIdentifiable).toBe(true);
    expect(interventional.pointEstimate).toBe(0.74);

    const decision = logistics.calibrateAndSize(
      interventional,
      { anchorPrice: 0.60, anchorTimestampUtc: "2026-10-21T18:00:00Z", dispersionStdDev: 0.03 },
      dummyTrace,
      dummyCalScores,
      dummyResiduals,
    );
    expect(decision.recommendedAction).toBe("PUBLISH_APEX");
    expect(decision.payload.congestionSurchargeRisk).toBe("ELEVATED");
    expect(decision.payload.rerouteRecommended).toBe(true);

    const feedback = logistics.settleAndLearn([
      {
        decisionId: decision.decisionId,
        observationTimeUtc: "2026-10-24T12:00:00Z",
        realizedOutcome: 1,
        forecastedProbability: decision.interventionalDistribution.pointEstimate,
        closingBenchmark: 0.60,
      },
    ]);
    expect(feedback.brierScore).toBeGreaterThanOrEqual(0);
  });

  it("evaluates Abnormal Situation Management (arXiv:2608.19819), Volve Dual-Head Anomaly Gate (arXiv:2608.05685), and Lifecycle DQA (arXiv:2609.31191)", () => {
    const asmEmergency = evaluateAbnormalSituationManagement({
      residualZScore: 4.5,
      sensorConcordance: 0.5,
      consecutiveViolationFrames: 4,
    });
    expect(asmEmergency.state).toBe("EMERGENCY_SHUTDOWN");
    expect(asmEmergency.humanEscalationRequired).toBe(true);

    const volve = evaluateVolveDualHeadAnomalyGate({
      supervisedAnomalyProb: 0.85,
      unsupervisedReconstructionScore: 0.8,
      alertThreshold: 0.7,
    });
    expect(volve.verifiedAnomalyAlert).toBe(true);
    expect(volve.regime).toBe("CONFIRMED_ANOMALY");

    const dqa = evaluateLifecycleDataQualityGate({
      completeness: 0.92,
      consistency: 0.88,
      timeliness: 0.85,
      lineage: 0.9,
      driftStability: 0.84,
      labelConcordance: 0.86,
    });
    expect(dqa.passesLifecycleGate).toBe(true);

    const beamEngine = new CausalBeamTransferEngine();
    const beam4 = beamEngine.transferBeamZeroShot("BEAM_SIGMA_4", "GSE_CLINICAL_ICU_SEPSIS");
    expect(beam4.transferStatus).toBe("ZERO_SHOT_VALIDATED");
    const beam5 = beamEngine.transferBeamZeroShot("BEAM_SIGMA_5", "GSE_INDUSTRIAL_VOLVE_ASM");
    expect(beam5.transferStatus).toBe("ZERO_SHOT_VALIDATED");
  });
});
