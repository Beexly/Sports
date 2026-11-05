import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  computeCleanVsPressuredBadThrowSplit,
  computeWrTargetSuccessAlphaInteraction,
  computeRyoeIndependentVsLineSplit,
  evaluateBlitzBehindCoverageCounterFit,
  computeQbWrMofZoneOverlap,
  computeInteriorLinebackerDogAndSafetyBgapPressure,
  computePowerKickoutSpillDefenseFit,
  computeNeutralScriptEarlyDownUnderCenterEpa,
  computePlayoffLeverageMotivationDelta,
  computeWrAlignmentSideAdotTilt,
  computeDefensivePersonnelMatchingInExpectedPass,
  computeCleanPocketPassingSuccessSplit,
} from "../expected-metrics/situational-expected-metrics-catalog.js";
import {
  REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES,
  evaluateZeroOrphanExpectedMetricsOverlay,
} from "../nfl/zero-orphan-expected-metrics-bridge.js";
import { runMasterSituationalReasoningOverlay } from "../nfl/master-situational-reasoning-aggregator.js";

describe("Zero-Orphan GSE Engine Audit & W1-W14 / F2-F3 Dossier Calculators", () => {
  it("verifies zero orphaned non-test modules across src/expected-metrics and src/nfl", () => {
    const expectedMetricsDir = resolve(__dirname, "../expected-metrics");
    const nflDir = resolve(__dirname, "../nfl");

    const emFiles = readdirSync(expectedMetricsDir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts")
    );
    const nflFiles = readdirSync(nflDir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts")
    );

    for (const file of emFiles) {
      expect(REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES).toContain(`expected-metrics/${file}`);
    }
    for (const file of nflFiles) {
      expect(REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES).toContain(`nfl/${file}`);
    }
  });

  it("computes W1-W14 and F2-F3 dossier calculators deterministically", () => {
    const w1 = computeCleanVsPressuredBadThrowSplit(18, 180, 14, 50);
    expect(w1.cleanBadThrowRate).toBeCloseTo(0.1, 4);
    expect(w1.pressuredBadThrowRate).toBeCloseTo(0.28, 4);
    expect(w1.stickyAccuracyDelta).toBeGreaterThan(0);

    const w2 = computeWrTargetSuccessAlphaInteraction(0.58, 0.30);
    expect(w2).toBeGreaterThan(0.18);

    const w3 = computeRyoeIndependentVsLineSplit(0.85, 1.45);
    expect(w3.independentCreationShare).toBeGreaterThan(0.3);

    const w6 = evaluateBlitzBehindCoverageCounterFit(0.45, 0.87, 0.38, 0.32, 0.28, 0.25);
    expect(w6).toBeGreaterThan(0);

    const w8 = computeQbWrMofZoneOverlap(0.768, 0.348, 0.72);
    expect(w8).toBeGreaterThan(0.15);

    const w9w10 = computeInteriorLinebackerDogAndSafetyBgapPressure(0.22, 0.26, 0.24);
    expect(w9w10).toBeGreaterThan(0.05);

    const w11 = computePowerKickoutSpillDefenseFit(0.35, 0.68, 0.82);
    expect(w11).toBeGreaterThan(0.1);

    const w12 = computeNeutralScriptEarlyDownUnderCenterEpa(0.14, -0.02, 0.62);
    expect(w12).toBeGreaterThan(0.05);

    const w13 = computePlayoffLeverageMotivationDelta(0.68, 0.34, 0.12);
    expect(w13).toBeCloseTo(0.22, 4);

    const w14 = computeWrAlignmentSideAdotTilt(13.8, 8.4, 10.2, "LEFT");
    expect(w14).toBeGreaterThan(0);

    const f2 = computeDefensivePersonnelMatchingInExpectedPass(0.32, 0.24);
    expect(f2).toBeGreaterThan(0.05);

    const f3 = computeCleanPocketPassingSuccessSplit(0.54, 0.31, 0.34);
    expect(f3).toBeCloseTo(0.54 * 0.66 + 0.31 * 0.34, 3);
  });

  it("wires evaluateZeroOrphanExpectedMetricsOverlay into runMasterSituationalReasoningOverlay", () => {
    const overlay = evaluateZeroOrphanExpectedMetricsOverlay({
      cleanBadThrows: 14,
      cleanAttempts: 160,
      pressuredBadThrows: 12,
      pressuredAttempts: 45,
      wrTargetSuccessRate: 0.61,
      wrTargetShare: 0.348,
      qbMofCompletionRate: 0.768,
      defZoneRate: 0.71,
      ryoePerCarry: 0.72,
      yardsBeforeContactPerCarry: 1.5,
      underCenterEpa: 0.11,
      shotgunEpa: 0.01,
      neutralSnapShare: 0.58,
      winPlayoffProb: 0.64,
      lossPlayoffProb: 0.38,
      opponentWinPlayoffSwing: 0.14,
    });
    expect(overlay.wiredModuleCount).toBeGreaterThanOrEqual(45);

    const agg = runMasterSituationalReasoningOverlay({
      familyDeltas: {
        pressure: 0.01,
        weather: 0.0,
        restFatigue: 0.005,
        coveragePersonnel: 0.015,
        qbSkillScript: 0.02,
        marketMicrostructure: 0.005,
      },
      marketAnchorProb: 0.52,
      independentEdgeDecision: "SPEAK",
      zeroOrphanOverlay: {
        cleanBadThrows: 14,
        cleanAttempts: 160,
        pressuredBadThrows: 12,
        pressuredAttempts: 45,
        wrTargetSuccessRate: 0.61,
        wrTargetShare: 0.348,
        qbMofCompletionRate: 0.768,
        defZoneRate: 0.71,
        ryoePerCarry: 0.72,
        yardsBeforeContactPerCarry: 1.5,
        underCenterEpa: 0.11,
        shotgunEpa: 0.01,
        neutralSnapShare: 0.58,
        winPlayoffProb: 0.64,
        lossPlayoffProb: 0.38,
        opponentWinPlayoffSwing: 0.14,
      },
    });
    expect(agg.zeroOrphanResult).toBeDefined();
    expect(agg.zeroOrphanResult?.wiredModuleCount).toBeGreaterThanOrEqual(45);
  });
});
