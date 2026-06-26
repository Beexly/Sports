/**
 * INTELLIGENCE LEDGER — the Conscience cannot p-hack OR overclaim.
 *
 * Fixture/thin-sample trends are reported as FIXTURE_TREND / UNVALIDATED — never "improving". A ledger
 * reaches VALIDATED_IMPROVING only on LIVE data with enough independent periods, an effect-size floor, a
 * confirmation window, and FDR survival. Zero-variance series are degenerate (no fabricated t=50).
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

function sample(cycleId: string, detectionValue: number, opts: Partial<LedgerSample> = {}): LedgerSample {
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
    decisionLeverageDisplayed: 0.5,
    cognitiveLoad: 1,
    theories: THEORIES,
    ...opts,
  };
}

describe("FIXTURE data is never 'genuinely improving'", () => {
  const DETECTION = [0.2, 0.31, 0.39, 0.52, 0.58, 0.72, 0.79];
  const report = buildIntelligenceLedger(DETECTION.map((d, i) => sample(`c${i}`, d))); // default dataMode FIXTURE

  it("reports detection as an UPWARD FIXTURE TREND, not validated", () => {
    const d = report.ledgers.detection;
    expect(d.trendDirection).toBe("UP");
    expect(d.status).toBe("FIXTURE_TREND");
    expect(d.improving).toBe(false);
  });

  it("nothing is validated on fixtures; the report says UNVALIDATED", () => {
    expect(report.validatedImprovingCount).toBe(0);
    expect(report.improvingCount).toBe(0);
    expect(report.intelligenceDelta).toBe(0);
    expect(report.validated).toBe(false);
    expect(report.upwardTrendCount).toBeGreaterThanOrEqual(1);
    expect(report.note).toMatch(/FIXTURE TREND|UNVALIDATED/);
  });
});

describe("LIVE data with enough periods can reach VALIDATED_IMPROVING", () => {
  // 10 periods, strong consistent detection trend with small jitter (non-zero variance).
  const DETECTION = [0.1, 0.19, 0.26, 0.36, 0.43, 0.53, 0.6, 0.7, 0.77, 0.87];
  const report = buildIntelligenceLedger(
    DETECTION.map((d, i) => sample(`c${i}`, d)),
    { dataMode: "LIVE", minPeriods: 8, effectFloor: 0.2 },
  );

  it("validates detection (FDR + effect floor + confirmation window) and reports a CI", () => {
    const d = report.ledgers.detection;
    expect(d.status).toBe("VALIDATED_IMPROVING");
    expect(d.improving).toBe(true);
    expect(d.pValue).toBeLessThan(0.05);
    expect(Math.abs(d.effectSize)).toBeGreaterThanOrEqual(0.2);
    expect(d.ci95Lower).toBeLessThanOrEqual(d.meanDelta);
    expect(d.ci95Upper).toBeGreaterThanOrEqual(d.meanDelta);
  });

  it("the other (flat) ledgers stay unvalidated", () => {
    expect(report.ledgers.refusal.improving).toBe(false);
    expect(report.ledgers.compression.improving).toBe(false);
    expect(report.validatedImprovingCount).toBe(1);
  });
});

describe("statistical guards", () => {
  it("a zero-variance (perfectly linear) series is degenerate — no fabricated t=50", () => {
    const linear = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]; // constant +0.1 deltas → variance 0
    const report = buildIntelligenceLedger(
      linear.map((d, i) => sample(`c${i}`, d)),
      { dataMode: "LIVE", minPeriods: 8 },
    );
    const d = report.ledgers.detection;
    expect(d.status).toBe("INSUFFICIENT_SAMPLE"); // zero variance → undefined, not "overwhelmingly significant"
    expect(d.pValue).toBe(1);
    expect(d.improving).toBe(false);
  });

  it("a thin LIVE sample (below minPeriods) cannot validate", () => {
    const short = [0.1, 0.3, 0.5]; // only 2 deltas
    const report = buildIntelligenceLedger(short.map((d, i) => sample(`c${i}`, d)), { dataMode: "LIVE", minPeriods: 8 });
    expect(report.ledgers.detection.status).toBe("INSUFFICIENT_SAMPLE");
    expect(report.validatedImprovingCount).toBe(0);
  });

  it("scar utility PENALIZES false blocks (precision-aware, not just hit count)", () => {
    const clean = buildIntelligenceLedger([0, 1].map((i) => sample(`c${i}`, 0.5, { trueTrapSuppressions: 3, falseBlocks: 0 })));
    const noisy = buildIntelligenceLedger([0, 1].map((i) => sample(`c${i}`, 0.5, { trueTrapSuppressions: 3, falseBlocks: 3 })));
    // Same true suppressions, but the false-block-heavy run scores a strictly lower scar utility.
    expect(noisy.ledgers.scar.latest).toBeLessThan(clean.ledgers.scar.latest);
  });

  it("repeated looks spend alpha (the effective q tightens)", () => {
    const series = [0.1, 0.19, 0.26, 0.36, 0.43, 0.53, 0.6, 0.7, 0.77, 0.87].map((d, i) => sample(`c${i}`, d));
    const first = buildIntelligenceLedger(series, { dataMode: "LIVE", q: 0.1, priorLooks: 0 });
    const tenth = buildIntelligenceLedger(series, { dataMode: "LIVE", q: 0.1, priorLooks: 9 });
    expect(tenth.effectiveQ).toBeLessThan(first.effectiveQ);
  });
});
