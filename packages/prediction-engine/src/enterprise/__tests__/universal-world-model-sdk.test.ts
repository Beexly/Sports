import { describe, it, expect } from "vitest";
import {
  GSEWeatherCartridge,
  GSEVerifyCartridge,
  WorldModelCartridgeRegistry,
  WeatherSignal,
  BenchmarkSignal,
  BitemporalWatermark,
} from "../universal-world-model-sdk.js";
import { ItcrTrace } from "../../calibration/itcr-orca-gate.js";

describe("Enterprise B2B World-Model Cartridge SDK", () => {
  const dummyWatermark: BitemporalWatermark = {
    validTimeUtc: "2026-10-21T18:00:00Z",
    transactionTimeUtc: "2026-10-21T18:00:05Z",
  };

  const cleanTrace: ItcrTrace = {
    conclusion_node_id: "T2",
    nodes: [
      { id: "T1", layer: "L2", validity: 0.98, parents: [] },
      { id: "T2", layer: "L4", validity: 0.95, parents: ["T1"] },
    ],
  };

  const dummyScores = [
    0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.14,
    0.15, 0.16, 0.17, 0.18, 0.19, 0.20, 0.21, 0.22, 0.23, 0.24,
  ];

  describe("GSE-Weather Cartridge", () => {
    const weather = new GSEWeatherCartridge();

    it("ingests bitemporally watermarked sensor data and constructs causal ADMG", () => {
      const signals: WeatherSignal[] = [
        {
          stationId: "KDEN",
          barometricPressureHpa: 1013.25,
          temperatureCelsius: 18.5,
          dewPointCelsius: 11.2,
          windSpeedMps: 7.2,
          precipitationMmHr: 0.0,
        },
      ];

      const ingested = weather.ingestSignals(signals, dummyWatermark);
      expect(ingested.vertical).toBe("GSE_WEATHER");
      expect(ingested.rawCount).toBe(1);

      const graph = weather.buildCausalGraph(
        { locationCode: "KDEN", targetForecastHorizonHours: 6, elevationMeters: 1609 },
        ingested,
      );

      expect(graph.nodes).toContain("BarometricPressure");
      expect(graph.nodes).toContain("RainProbability");
      expect(graph.directed.length).toBe(3);
      expect(graph.bidirected.length).toBe(1);
    });

    it("solves interventions and calibrates severe weather forecast", () => {
      const graph = weather.buildCausalGraph(
        { locationCode: "KDEN", targetForecastHorizonHours: 6, elevationMeters: 1609 },
        weather.ingestSignals([], dummyWatermark),
      );

      const interventionalDist = weather.solveInterventions(
        { treatmentNode: "BarometricPressure", treatmentValue: 998.0, outcomeNode: "RainProbability" },
        graph,
      );

      expect(interventionalDist.isIdentifiable).toBe(true);
      expect(interventionalDist.pointEstimate).toBeGreaterThan(0.5);

      const decision = weather.calibrateAndSize(
        interventionalDist,
        { anchorPrice: 0.40, anchorTimestampUtc: "2026-10-21T18:00:00Z", dispersionStdDev: 0.05 },
        cleanTrace,
        dummyScores,
        [0.05, 0.06, 0.04],
      );

      expect(decision.recommendedAction).toBe("PUBLISH_APEX");
      expect(decision.expectedEdge).toBeCloseTo(0.32, 2);
      expect(decision.payload.aviationFlightCategory).toBe("VFR");
    });

    it("settles weather forecasts and computes Murphy Brier decomposition", () => {
      const delta = weather.settleAndLearn([
        {
          decisionId: "D1",
          observationTimeUtc: "2026-10-21T19:00:00Z",
          realizedOutcome: 1,
          forecastedProbability: 0.85,
          closingBenchmark: 0.70,
        },
        {
          decisionId: "D2",
          observationTimeUtc: "2026-10-21T20:00:00Z",
          realizedOutcome: 0,
          forecastedProbability: 0.15,
          closingBenchmark: 0.20,
        },
      ]);

      expect(delta.brierScore).toBeDefined();
      expect(delta.murphyReliabilityRel).toBeDefined();
      expect(delta.murphyResolutionRes).toBeDefined();
      expect(delta.kalmanWeightDelta).toBeGreaterThan(0.0);
    });
  });

  describe("GSE-Verify Cartridge", () => {
    const verify = new GSEVerifyCartridge();

    it("verifies scientific benchmark proof and halts when ITCR threshold is exceeded", () => {
      const signals: BenchmarkSignal[] = [
        {
          benchmark: "HLE",
          problemId: "HLE-MATH-0492",
          naturalLanguagePremises: ["Let f(z) be holomorphic..."],
          candidateLemmas: ["Cauchy integral theorem applies"],
          rawModelConfidence: 0.98,
        },
      ];

      const ingested = verify.ingestSignals(signals, dummyWatermark);
      expect(ingested.vertical).toBe("GSE_VERIFY");

      const graph = verify.buildCausalGraph(
        { maxTokenBudget: 100000, forcedCutoffTokens: 66000, allowPythonSandbox: true },
        ingested,
      );

      const dist = verify.solveInterventions(
        { treatmentNode: "PremiseLemma", treatmentValue: true, outcomeNode: "TerminalProof" },
        graph,
      );

      expect(dist.isIdentifiable).toBe(true);

      const decision = verify.calibrateAndSize(
        dist,
        { anchorPrice: 0.50, anchorTimestampUtc: "2026-10-21T18:00:00Z", dispersionStdDev: 0.02 },
        cleanTrace,
        dummyScores,
        [0.02, 0.03],
      );

      expect(decision.recommendedAction).toBe("PUBLISH_APEX");
      expect(decision.payload.verifiedAnswer).toContain("\\pi");
      expect(decision.payload.calibratedConfidence).toBeCloseTo(0.94, 2);
    });
  });

  describe("WorldModelCartridgeRegistry", () => {
    it("registers and lists all enterprise cartridges", () => {
      const registry = new WorldModelCartridgeRegistry();
      const list = registry.listCartridges();

      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.some((c) => c.vertical === "GSE_WEATHER")).toBe(true);
      expect(list.some((c) => c.vertical === "GSE_VERIFY")).toBe(true);

      const weather = registry.getCartridge("GSE_WEATHER");
      expect(weather).toBeDefined();
      expect(weather?.name).toContain("GSE-Weather");
    });
  });
});
