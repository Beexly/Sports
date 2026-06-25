/**
 * INTELLIGENCE LEDGER — the Conscience cannot p-hack itself.
 *
 * Detection improves on a real, consistent trend → it reads as improving. Product Clarity ends HIGHER
 * than it started (a tempting "we improved!" cherry-pick) but its trend is noise → under BH-FDR it does
 * NOT read as a discovery. The remaining flat ledgers don't either. This is the statistician's guard
 * that keeps the organism honest.
 */

import { describe, it, expect } from "vitest";
import { buildIntelligenceLedger, type LedgerSample } from "../index.js";
import type { TheoryOrganism } from "@sports/engine";

const law = (id: string): TheoryOrganism => ({
  id, name: id, status: "LAW", fitness: 1.4, novelty: 0.3, compression: 0.4, decisionLeverage: 0.3,
  driftRisk: 0.1, ghostSimilarity: 0.1, governanceSafe: true, allowedSurfaces: ["proof"], lastReplaySurvived: true,
});
const hypo = (id: string): TheoryOrganism => ({
  id, name: id, status: "HYPOTHESIS", fitness: 1.0, novelty: 0.5, compression: 0.2, decisionLeverage: 0.2,
  driftRisk: 0.2, ghostSimilarity: 0.2, governanceSafe: true, allowedSurfaces: [], lastReplaySurvived: true,
});
const THEORIES: TheoryOrganism[] = [law("l1"), law("l2"), hypo("h1")];

function sample(cycleId: string, detectionValue: number, clarityDisplayed: number): LedgerSample {
  return {
    cycleId,
    detectionValue,
    trapAvoidanceValue: 0.5,
    falseSuppressionCost: 0.1,
    trueTrapSuppressions: 2,
    falseBlocks: 0,
    ghostSuppressions: 4,
    decisionLeverageCreated: 0.6,
    falseConfidenceCost: 0.1,
    sourceCost: 0.1,
    cardDecisionLeverage: 0.5,
    factVolumeCostNoise: 1,
    decisionLeverageDisplayed: clarityDisplayed,
    cognitiveLoad: 1,
    theories: THEORIES,
  };
}

// Detection: a real, consistent upward trend. Product clarity: noisy, ends higher by luck.
const DETECTION = [0.2, 0.31, 0.39, 0.52, 0.58, 0.72, 0.79];
const CLARITY = [0.5, 0.45, 0.55, 0.48, 0.52, 0.47, 0.53];
const SERIES: LedgerSample[] = DETECTION.map((d, i) => sample(`c${i}`, d, CLARITY[i]!));

describe("Intelligence Ledger — FDR-disciplined Conscience", () => {
  const report = buildIntelligenceLedger(SERIES, 0.1);

  it("declares Detection genuinely improving (a real trend that survives FDR)", () => {
    expect(report.ledgers.detection.improving).toBe(true);
    expect(report.ledgers.detection.meanDelta).toBeGreaterThan(0);
    expect(report.ledgers.detection.pValue).toBeLessThan(0.05);
  });

  it("does NOT declare Product Clarity improving, though it ended higher (no p-hacking)", () => {
    const clarity = report.ledgers.productClarity;
    // The cherry-pick: last value exceeds the first…
    expect(CLARITY[CLARITY.length - 1]!).toBeGreaterThan(CLARITY[0]!);
    // …but the trend is noise, so the Conscience refuses to call it a win.
    expect(clarity.improving).toBe(false);
    expect(clarity.pValue).toBeGreaterThan(0.1);
  });

  it("flat ledgers are not improving and the report is honest", () => {
    expect(report.ledgers.refusal.improving).toBe(false);
    expect(report.ledgers.compression.improving).toBe(false);
    expect(report.improvingCount).toBe(1);
    expect(report.intelligenceDelta).toBeGreaterThan(0);
  });
});
