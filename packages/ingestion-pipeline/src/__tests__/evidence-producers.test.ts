import { describe, it, expect } from "vitest";
import { buildLiveGateEvidence } from "../evidence-producers.js";
import { runPickGates, PickGate } from "@sports/prediction-engine";

describe("Live Evidence Producers for G1-G9 Gate Conjunction", () => {
  it("produces valid evidence that satisfies all 9 gates when criteria are met", () => {
    const evidence = buildLiveGateEvidence({
      gameId: "game_nfl_kc_bal",
      sport: "nfl",
      asOf: "2026-10-21T18:00:00Z",
      modelTrueProb: 0.58,
      marketFairProb: 0.52,
      activeSignalFamiliesCount: 8,
      totalRegisteredSignalFamiliesCount: 10,
      premises: [
        { id: "P_PASS_EPA", sampleCount: 45, probability: 0.57, homeSign: 1 },
        { id: "P_PRESSURE_RATE", sampleCount: 50, probability: 0.59, homeSign: 1 },
      ],
      trailingEce30: 0.012,
      baselineEce250: 0.014,
      trailingClv50: 0.015,
      conformalHalfWidth: 0.02,
      priceArchiveDecisionWritten: true,
    });

    const gateOutcomes = runPickGates(evidence);
    expect(gateOutcomes).toHaveLength(9);
    for (const outcome of gateOutcomes) {
      if (!outcome.passed) {
        console.error(`FAILED GATE: ${outcome.gate}, code: ${outcome.refusal_code}, reason: ${outcome.reason}`);
      }
      expect(outcome.passed).toBe(true);
      expect(outcome.refusal_code).toBeNull();
    }
  });

  it("fails closed at Gate G1 when signal coverage is insufficient", () => {
    const evidence = buildLiveGateEvidence({
      gameId: "game_nfl_chi_gb",
      sport: "nfl",
      asOf: "2026-10-21T18:00:00Z",
      modelTrueProb: 0.55,
      marketFairProb: 0.52,
      activeSignalFamiliesCount: 3,
      totalRegisteredSignalFamiliesCount: 10, // 30% coverage < 65% floor
      premises: [
        { id: "P_1", sampleCount: 35, probability: 0.55, homeSign: 1 },
      ],
    });

    const gateOutcomes = runPickGates(evidence);
    const g1 = gateOutcomes.find((g) => g.gate === "G1");
    expect(g1?.passed).toBe(false);
    expect(g1?.refusal_code).toBe("REFUSED_G1_INSUFFICIENT_BRIDGE_SAMPLES");
  });

  it("fails closed at Gate G8 when edge is negative or below conformal floor", () => {
    const evidence = buildLiveGateEvidence({
      gameId: "game_nfl_cle_cin",
      sport: "nfl",
      asOf: "2026-10-21T18:00:00Z",
      modelTrueProb: 0.51,
      marketFairProb: 0.53, // Negative edge
      activeSignalFamiliesCount: 9,
      totalRegisteredSignalFamiliesCount: 10,
      premises: [
        { id: "P_1", sampleCount: 40, probability: 0.51, homeSign: 1 },
      ],
      conformalHalfWidth: 0.02,
    });

    const gateOutcomes = runPickGates(evidence);
    const g8 = gateOutcomes.find((g) => g.gate === "G8");
    expect(g8?.passed).toBe(false);
    expect(g8?.refusal_code).toBe("REFUSED_G8_NEGATIVE_CLV_OR_SUBTHRESHOLD_EDGE");
  });
});
