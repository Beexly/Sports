import { describe, it, expect } from "vitest";
import {
  evaluateConformalSelectiveAbstention,
  computeBorghesiWeatherAndRosenQbBackupTransition,
  detectKatsMarketCusumAndHarmonicRegime,
  evaluateLayaGateOnSettledHoldout,
} from "../ig-consolidated-conformal-and-kats-signals";

describe("IG Consolidated Conformal, Kats & Fleet Systems Signals", () => {
  describe("Stream B Seq 7291: Conformal Selective Abstention (Romano / SCoRE / SASF / CROS)", () => {
    it("commits when interval stays clear of 50% and empirical coverage satisfies equalized target", () => {
      const res = evaluateConformalSelectiveAbstention({
        calibratedProb: 0.65,
        nonconformityQuantileQHat: 0.08,
        groupType: "FAVORITE",
        groupEmpiricalCoverage: 0.89,
        targetCoverageAlpha: 0.10,
      });

      expect(res.lowerProb).toBe(0.57);
      expect(res.upperProb).toBe(0.73);
      expect(res.straddlesFiftyPct).toBe(false);
      expect(res.equalizedCoverageGap).toBe(0.01);
      expect(res.verdict).toBe("COMMIT");
    });

    it("selectively abstains when conformal prediction interval straddles 50% tossup", () => {
      const res = evaluateConformalSelectiveAbstention({
        calibratedProb: 0.52,
        nonconformityQuantileQHat: 0.04,
        groupType: "UNDERDOG",
        groupEmpiricalCoverage: 0.90,
      });

      expect(res.lowerProb).toBe(0.48);
      expect(res.upperProb).toBe(0.56);
      expect(res.straddlesFiftyPct).toBe(true);
      expect(res.equalizedCoverageGap).toBe(0);
      expect(res.verdict).toBe("ABSTAIN_CONFORMAL");
    });

    it("abstains when group-level empirical coverage gap exceeds 5% threshold", () => {
      const res = evaluateConformalSelectiveAbstention({
        calibratedProb: 0.70,
        nonconformityQuantileQHat: 0.05,
        groupType: "FAVORITE",
        groupEmpiricalCoverage: 0.82, // target = 0.90, gap = 0.08 > 0.05
        targetCoverageAlpha: 0.10,
      });

      expect(res.lowerProb).toBe(0.65);
      expect(res.upperProb).toBe(0.75);
      expect(res.straddlesFiftyPct).toBe(false);
      expect(res.equalizedCoverageGap).toBe(0.08);
      expect(res.verdict).toBe("ABSTAIN_CONFORMAL");
    });

    it("clamps conformal interval boundaries to [0, 1]", () => {
      const res = evaluateConformalSelectiveAbstention({
        calibratedProb: 0.95,
        nonconformityQuantileQHat: 0.15,
        groupType: "FAVORITE",
        groupEmpiricalCoverage: 0.90,
      });

      expect(res.lowerProb).toBe(0.80);
      expect(res.upperProb).toBe(1.0);
      expect(res.straddlesFiftyPct).toBe(false);
      expect(res.verdict).toBe("COMMIT");
    });
  });

  describe("Borghesi Weather Non-Linearity + Rosen QB Backup Transition", () => {
    it("evaluates indoor dome conditions as zero weather impact", () => {
      const res = computeBorghesiWeatherAndRosenQbBackupTransition({
        windMph: 25,
        tempF: 20,
        isPrecipitation: true,
        isIndoor: true,
        qbStarterOut: false,
        backupPriorStartsThisSeason: 0,
        hasPost2011ByeRestAdvantage: false,
        isWestToEastEarlyKickoff: false,
      });

      expect(res.borghesiTotalDelta).toBe(0);
      expect(res.rosenQbSpreadDelta).toBe(0);
      expect(res.lopezByeSpreadDelta).toBe(0);
      expect(res.nicholsTravelSpreadDelta).toBe(0);
      expect(res.netSpreadAdjustmentPts).toBe(0);
    });

    it("calculates Borghesi wind thresholds and cold/wet precipitation non-linear total cuts", () => {
      // Wind > 15 mph (16-20 mph): -1.9 pts
      const moderateWind = computeBorghesiWeatherAndRosenQbBackupTransition({
        windMph: 18,
        tempF: 45,
        isPrecipitation: false,
        isIndoor: false,
        qbStarterOut: false,
        backupPriorStartsThisSeason: 0,
        hasPost2011ByeRestAdvantage: false,
        isWestToEastEarlyKickoff: false,
      });
      expect(moderateWind.borghesiTotalDelta).toBe(-1.9);

      // Severe wind > 20 mph + freezing precipitation: -2.8 + -1.1 = -3.9 pts
      const blizzard = computeBorghesiWeatherAndRosenQbBackupTransition({
        windMph: 24,
        tempF: 28,
        isPrecipitation: true,
        isIndoor: false,
        qbStarterOut: false,
        backupPriorStartsThisSeason: 0,
        hasPost2011ByeRestAdvantage: false,
        isWestToEastEarlyKickoff: false,
      });
      expect(blizzard.borghesiTotalDelta).toBe(-3.9);
    });

    it("applies Rosen QB backup transition decay with prior starts, Lopez bye, and Nichols travel", () => {
      // Backup start 0: max penalty -5.4 pts
      const start0 = computeBorghesiWeatherAndRosenQbBackupTransition({
        windMph: 5,
        tempF: 65,
        isPrecipitation: false,
        isIndoor: false,
        qbStarterOut: true,
        backupPriorStartsThisSeason: 0,
        hasPost2011ByeRestAdvantage: true,
        isWestToEastEarlyKickoff: true,
      });
      expect(start0.rosenQbSpreadDelta).toBe(-5.4);
      expect(start0.lopezByeSpreadDelta).toBe(0.15);
      expect(start0.nicholsTravelSpreadDelta).toBe(-0.45);
      expect(start0.netSpreadAdjustmentPts).toBeCloseTo(-5.70, 2);

      // Backup start 3: -5.4 * exp(-0.22 * 3) = -2.79 pts
      const start3 = computeBorghesiWeatherAndRosenQbBackupTransition({
        windMph: 5,
        tempF: 65,
        isPrecipitation: false,
        isIndoor: false,
        qbStarterOut: true,
        backupPriorStartsThisSeason: 3,
        hasPost2011ByeRestAdvantage: true,
        isWestToEastEarlyKickoff: false,
      });
      expect(start3.rosenQbSpreadDelta).toBe(-2.79);
      expect(start3.lopezByeSpreadDelta).toBe(0.15);
      expect(start3.nicholsTravelSpreadDelta).toBe(0);
      expect(start3.netSpreadAdjustmentPts).toBeCloseTo(-2.64, 2);
    });
  });

  describe("Stream D: Kats Market CUSUM Change-Point & Diurnal Harmonic Regime", () => {
    it("detects sharp steam break regime when CUSUM statistic exceeds 1.25", () => {
      // Line movement showing a sharp steam move
      const lineSeries = [
        -3.0, -3.0, -3.0, -3.0, -3.0,
        -4.5, -4.5, -4.5, -5.0, -5.0,
      ];
      const timestamps = [
        48, 44, 40, 36, 30,
        24, 20, 16, 8, 2,
      ];

      const res = detectKatsMarketCusumAndHarmonicRegime({
        lineSeries,
        timestampsHoursBeforeKickoff: timestamps,
      });

      expect(res.changePointDetected).toBe(true);
      expect(res.cusumMaxAbs).toBeGreaterThanOrEqual(1.25);
      expect(res.regimeTag).toBe("SHARP_STEAM_BREAK");
      expect(res.netLineSteamDelta).toBe(-2.0);
      expect(res.harmonicDiurnalAmplitude).toBeGreaterThanOrEqual(0);
    });

    it("classifies minor mean-reverting line fluctuations as stationary noise", () => {
      const lineSeries = [-3.0, -3.5, -3.0, -3.5, -3.0, -3.5, -3.0, -3.5];
      const timestamps = [28, 24, 20, 16, 12, 8, 4, 1];

      const res = detectKatsMarketCusumAndHarmonicRegime({
        lineSeries,
        timestampsHoursBeforeKickoff: timestamps,
      });

      expect(res.changePointDetected).toBe(false);
      expect(res.cusumMaxAbs).toBeLessThan(1.25);
      expect(res.regimeTag).toBe("STATIONARY_NOISE");
      expect(res.netLineSteamDelta).toBe(-0.5);
    });

    it("handles boundary series of fewer than 2 data points", () => {
      const res = detectKatsMarketCusumAndHarmonicRegime({
        lineSeries: [-3.0],
        timestampsHoursBeforeKickoff: [12],
      });

      expect(res.changePointDetected).toBe(false);
      expect(res.cusumMaxAbs).toBe(0);
      expect(res.regimeTag).toBe("STATIONARY_NOISE");
      expect(res.netLineSteamDelta).toBe(0);
    });
  });

  describe("Stream E1: Laya/OpenJev Gate Holdout Evaluation Harness", () => {
    it("promotes Laya gate model when all metrics clear §5.1/5.2 bar and prompt passes truncation canary", () => {
      const res = evaluateLayaGateOnSettledHoldout({
        statePromptTokens: 540,
        ece: 0.052,
        brier: 0.218,
        auc: 0.612,
        beatCloseRate: 0.538,
        abstentionLiftPp: 2.1,
      });

      expect(res.truncationCanaryPassed).toBe(true);
      expect(res.metricsPassed).toBe(true);
      expect(res.promotionVerdict).toBe("PROMOTE_LAYA_GATE");
    });

    it("holds in shadow when state prompt exceeds the 700 token truncation canary", () => {
      const res = evaluateLayaGateOnSettledHoldout({
        statePromptTokens: 820, // > 700 token canary threshold
        ece: 0.045,
        brier: 0.210,
        auc: 0.630,
        beatCloseRate: 0.540,
        abstentionLiftPp: 2.5,
      });

      expect(res.truncationCanaryPassed).toBe(false);
      expect(res.metricsPassed).toBe(true);
      expect(res.promotionVerdict).toBe("HOLD_SHADOW_ONLY");
    });

    it("holds in shadow when accuracy or calibration fails to clear §5.1/5.2 threshold", () => {
      // Failing beatCloseRate < 0.524
      const res1 = evaluateLayaGateOnSettledHoldout({
        statePromptTokens: 500,
        ece: 0.05,
        brier: 0.22,
        auc: 0.60,
        beatCloseRate: 0.518, // fails
        abstentionLiftPp: 1.0,
      });
      expect(res1.truncationCanaryPassed).toBe(true);
      expect(res1.metricsPassed).toBe(false);
      expect(res1.promotionVerdict).toBe("HOLD_SHADOW_ONLY");

      // Failing brier > 0.24
      const res2 = evaluateLayaGateOnSettledHoldout({
        statePromptTokens: 500,
        ece: 0.05,
        brier: 0.252, // fails
        auc: 0.60,
        beatCloseRate: 0.53,
        abstentionLiftPp: 1.0,
      });
      expect(res2.metricsPassed).toBe(false);
      expect(res2.promotionVerdict).toBe("HOLD_SHADOW_ONLY");

      // Failing ece > 0.07
      const res3 = evaluateLayaGateOnSettledHoldout({
        statePromptTokens: 500,
        ece: 0.082, // fails
        brier: 0.22,
        auc: 0.60,
        beatCloseRate: 0.53,
        abstentionLiftPp: 1.0,
      });
      expect(res3.metricsPassed).toBe(false);
      expect(res3.promotionVerdict).toBe("HOLD_SHADOW_ONLY");
    });
  });
});
