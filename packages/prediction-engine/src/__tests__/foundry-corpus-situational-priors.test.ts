import { describe, expect, it } from "vitest";
import {
  computePositivePartJamesSteinShrinkage,
  CORPUS_SITUATIONAL_FAMILIES,
  evaluateFoundryCorpusSituationalPriors,
  evaluateRulebookAndPsychologyOverlay,
  evaluateSplitFieldCoverageOverlay,
  FOUNDRY_CORPUS_BASELINE_SNAPSHOT,
  MAX_ABS_CORPUS_LOG_ODDS,
  MAX_CORPUS_FAMILY_PROB_MODULATION,
  NFL_2026_PLAYING_RULES_OPERATORS,
  SPLIT_FIELD_QUARTERS_COVERAGE_OPERATORS,
  SPORTS_PSYCHOLOGY_PRESSURE_OPERATORS,
} from "../nfl/foundry-corpus-situational-priors.js";
import {
  evaluateZeroOrphanExpectedMetricsOverlay,
  REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES,
} from "../nfl/zero-orphan-expected-metrics-bridge.js";

describe("foundry-corpus-situational-priors", () => {
  it("is registered in zero-orphan engine bridge and respects |Delta log-odds| <= 0.35", () => {
    expect(REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES).toContain(
      "nfl/foundry-corpus-situational-priors.ts",
    );

    const lowSample = computePositivePartJamesSteinShrinkage(6);
    const highSample = computePositivePartJamesSteinShrinkage(120);
    expect(highSample).toBeGreaterThan(lowSample);
    expect(computePositivePartJamesSteinShrinkage(Number.NaN)).toBe(0);

    const extreme = evaluateFoundryCorpusSituationalPriors({
      pressureSignalZ: 20,
      weatherDisruptionZ: 20,
      restFatigueZ: 20,
      coverageMismatchZ: 20,
      qbScriptStabilityZ: 20,
      microstructureDislocationZ: 20,
      observedSampleSizeN: 500,
      collinearCrossLayerVetoes: 0,
    });
    expect(extreme.allFiniteNonNan).toBe(true);
    expect(Math.abs(extreme.combinedLogOddsDelta)).toBeLessThanOrEqual(MAX_ABS_CORPUS_LOG_ODDS);

    for (const fam of CORPUS_SITUATIONAL_FAMILIES) {
      expect(FOUNDRY_CORPUS_BASELINE_SNAPSHOT[fam].shardBDocs).toBeGreaterThan(0);
      expect(Math.abs(extreme.familyProbModulations[fam])).toBeLessThanOrEqual(
        MAX_CORPUS_FAMILY_PROB_MODULATION,
      );
    }
  });

  it("integrates cleanly into evaluateZeroOrphanExpectedMetricsOverlay", () => {
    const res = evaluateZeroOrphanExpectedMetricsOverlay({
      cleanBadThrows: 12,
      cleanAttempts: 180,
      pressuredBadThrows: 10,
      pressuredAttempts: 42,
      wrTargetSuccessRate: 0.62,
      wrTargetShare: 0.31,
      qbMofCompletionRate: 0.75,
      defZoneRate: 0.69,
      ryoePerCarry: 0.78,
      yardsBeforeContactPerCarry: 1.4,
      underCenterEpa: 0.14,
      shotgunEpa: 0.01,
      neutralSnapShare: 0.6,
      winPlayoffProb: 0.68,
      lossPlayoffProb: 0.39,
      opponentWinPlayoffSwing: 0.12,
      restDaysOffense: 10,
      restDaysDefense: 6,
    });
    expect(res.foundryCorpusPriorsReceipt.allFiniteNonNan).toBe(true);
    expect(
      Math.abs(res.foundryCorpusPriorsReceipt.combinedLogOddsDelta),
    ).toBeLessThanOrEqual(MAX_ABS_CORPUS_LOG_ODDS);
  });

  it("wires 2026 NFL Rulebook and sports psychology situational operators deterministically", () => {
    expect(NFL_2026_PLAYING_RULES_OPERATORS.sourceBookId).toBe("64f765ba0a849b1d");
    expect(NFL_2026_PLAYING_RULES_OPERATORS.rules.map((r) => r.code)).toEqual([
      "6-1-3",
      "6-1-5",
      "6-1-6",
      "19-2",
    ]);
    expect(SPORTS_PSYCHOLOGY_PRESSURE_OPERATORS.sourceBookIds).toEqual([
      "4f750a0c8577fe9a",
      "7e5b2d626cb5c46f",
      "aad3618821cc9e26",
      "e2e0f698eee97fdc",
      "6cf36a29e51c0a02",
      "d38c2cd65c3f310d",
    ]);

    const receipt = evaluateRulebookAndPsychologyOverlay({
      kickoffReturnVolatilityZ: 2.0,
      declaredOnsideComebackNeedZ: 1.5,
      yerkesDodsonArousalZ: 1.8,
      firstCareerStartFlag: true,
      hostileRoadNoiseZ: 1.4,
      clutchComposureEdgeZ: -0.5,
    });
    expect(receipt.allFiniteNonNan).toBe(true);
    expect(receipt.activeRuleCodes).toContain("6-1-6");
    expect(receipt.psychologyDeltaLogOdds).toBeLessThan(0);
    expect(Math.abs(receipt.combinedProbDelta)).toBeLessThanOrEqual(MAX_CORPUS_FAMILY_PROB_MODULATION);

    const nanSafe = evaluateRulebookAndPsychologyOverlay({
      kickoffReturnVolatilityZ: Number.NaN,
      yerkesDodsonArousalZ: Number.POSITIVE_INFINITY,
    });
    expect(nanSafe.allFiniteNonNan).toBe(true);
    expect(nanSafe.combinedProbDelta).toBe(0);
  });

  it("evaluates bounded [DERIVED KERNEL] split-field quarters coverage operators cleanly", () => {
    expect(SPLIT_FIELD_QUARTERS_COVERAGE_OPERATORS.derivationTag).toBe("[DERIVED KERNEL]");
    expect(SPLIT_FIELD_QUARTERS_COVERAGE_OPERATORS.refusedStubBookIds).toEqual([
      "527e4d714a574106",
      "c3eb423c8b9f92fc",
    ]);
    const res = evaluateSplitFieldCoverageOverlay({
      offense3x1TripsRateZ: 1.6,
      defenseSplitFieldQuartersRateZ: 1.8,
      slotHorizontalStressZ: 1.2,
      boundaryIsoExposureZ: -0.4,
      verticalShotMismatchZ: 0.7,
    });
    expect(res.derivationTag).toBe("[DERIVED KERNEL]");
    expect(res.allFiniteNonNan).toBe(true);
    expect(res.activeChecks).toEqual([
      "MOD",
      "MEG",
      "Palms_2Read",
      "Poach_Solo_3x1",
      "Stubbie_Special",
      "Cover6_QQH_Cover8_HQQ",
    ]);
    expect(Math.abs(res.coverageShellDeltaLogOdds)).toBeLessThanOrEqual(MAX_ABS_CORPUS_LOG_ODDS);
    expect(Math.abs(res.probModulation)).toBeLessThanOrEqual(MAX_CORPUS_FAMILY_PROB_MODULATION);
    expect(evaluateSplitFieldCoverageOverlay({ offense3x1TripsRateZ: Number.NaN }).probModulation).toBe(0);
  });
});
