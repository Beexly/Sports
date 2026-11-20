/**
 * Morning Analytics Sweep (Commit d333e74) — 5 Core Reasoning Engine Kernels
 * & 39 Transcribed CSV Table Bridges:
 *
 *   1. Unified Dual-Threat Index (@evduzit, ID 2119439097488191562)
 *   2. Splits+ Kicker Model (@MagicSportsGuy — magic-kicker-bass-dome-splits-2026.csv,
 *      magic-kicker-indoor-outdoor-since2015-2026.csv, paganetti-fg-by-distance-2026.csv)
 *   3. ShadowCoverage+ & Route IQ Man Split (@MagicSportsGuy & @statyxio —
 *      magic-shadowcoverage-gonzalez-partial-2026.csv, pff-20yd-targets-2026.csv,
 *      sfdata-man-coverage-rates-2026.csv)
 *   4. Pass Rush Performance Blitz/Non-Blitz Split & Edge PRWR (@The_Coach_A,
 *      omardouk-edge-prwr-2026.csv, gridiron-pressure-rate-allowed-2026.csv)
 *   5. CounterPlay Required-vs-Observed Action Conversion Kernel (@statyxio)
 */

import { round } from "./numeric.js";

// ── 1. Unified Dual-Threat Index (@evduzit) ──────────────────────────────────

export interface UnifiedDualThreatInput {
  readonly passEpaPerPlay: number;
  readonly rushEpaPerPlay: number;
  /** CPOE in percentage points (e.g. +3.5 for +3.5%). */
  readonly cpoePctPoints: number;
  /** Adjusted Net Yards per Dropback (ANY/DB). */
  readonly anyPerDropback: number;
  /** Rushing success rate in [0, 1]. */
  readonly rushSuccessRate: number;
  /** Broken tackle rate per rush in [0, 1]. */
  readonly brokenTackleRate: number;
  /** Turnover rate per play in [0, 1] (or percentage points if > 1, normalized automatically). */
  readonly turnoverRate: number;
}

export interface UnifiedDualThreatResult {
  readonly udtiScore: number;
  readonly passComponent: number;
  readonly rushComponent: number;
  readonly accuracyAndAnyComponent: number;
  readonly turnoverPenalty: number;
  readonly tier: "ELITE_KONAMI" | "DUAL_THREAT_PLUS" | "POCKET_EFFICIENT" | "VOLATILE_SCRAMBLER" | "BELOW_BASELINE";
}

/**
 * Exact @evduzit Unified Dual-Threat Index formula:
 *   UDTI = (PassEPA_per_play * 50) + (RushEPA_per_play * 50) + (CPOE * 2)
 *          + ANY_per_DB + (RushSuccessRate * 20) + (BrokenTackleRate * 20)
 *          - (TurnoverRate * 5)
 */
export function computeUnifiedDualThreatIndex(
  input: UnifiedDualThreatInput,
): UnifiedDualThreatResult {
  const passComponent = input.passEpaPerPlay * 50;
  const rushComponent =
    input.rushEpaPerPlay * 50 +
    input.rushSuccessRate * 20 +
    input.brokenTackleRate * 20;
  const accuracyAndAnyComponent = input.cpoePctPoints * 2 + input.anyPerDropback;
  const turnoverPenalty = input.turnoverRate * 5;

  const udtiScore =
    passComponent + rushComponent + accuracyAndAnyComponent - turnoverPenalty;

  let tier: UnifiedDualThreatResult["tier"] = "BELOW_BASELINE";
  if (udtiScore >= 38 && rushComponent >= 12) {
    tier = "ELITE_KONAMI";
  } else if (udtiScore >= 26 && rushComponent >= 8) {
    tier = "DUAL_THREAT_PLUS";
  } else if (udtiScore >= 24) {
    tier = "POCKET_EFFICIENT";
  } else if (rushComponent >= 10 && passComponent < 0) {
    tier = "VOLATILE_SCRAMBLER";
  }

  return {
    udtiScore: round(udtiScore, 4),
    passComponent: round(passComponent, 4),
    rushComponent: round(rushComponent, 4),
    accuracyAndAnyComponent: round(accuracyAndAnyComponent, 4),
    turnoverPenalty: round(turnoverPenalty, 4),
    tier,
  };
}

// ── 2. Splits+ Kicker Model (@MagicSportsGuy) ────────────────────────────────

export interface SplitsPlusKickerInput {
  readonly kickerName: string;
  readonly roofType: "DOME" | "OUTDOOR";
  readonly windMph: number;
  readonly tempF: number;
  readonly precipitation: boolean;
  readonly careerDomeFgPct: number;
  readonly careerOutdoorFgPct: number;
  readonly dome50PlusFgPct?: number;
  readonly projectedFgAttempts: number;
  readonly projectedPatAttempts: number;
}

export interface SplitsPlusKickerResult {
  readonly expectedFgMakeProb: number;
  readonly expectedKickingPoints: number;
  readonly domePointsBoost: number;
  readonly weatherPenaltyPoints: number;
  readonly over15FgProb: number;
}

export const LEAGUE_DOME_FG_PCT_SINCE_2015 = 0.854;
export const LEAGUE_OUTDOOR_FG_PCT_SINCE_2015 = 0.844;

export function evaluateSplitsPlusKickerModel(
  input: SplitsPlusKickerInput,
): SplitsPlusKickerResult {
  const isDome = input.roofType === "DOME";
  const basePct = isDome ? input.careerDomeFgPct : input.careerOutdoorFgPct;
  const leagueBase = isDome
    ? LEAGUE_DOME_FG_PCT_SINCE_2015
    : LEAGUE_OUTDOOR_FG_PCT_SINCE_2015;

  // Shrink kicker's split toward environment baseline
  const blendedFgPct = 0.65 * basePct + 0.35 * leagueBase;

  let weatherPenaltyProb = 0;
  if (!isDome) {
    if (input.windMph > 12) {
      weatherPenaltyProb += (input.windMph - 12) * 0.008;
    }
    if (input.tempF < 40) {
      weatherPenaltyProb += (40 - input.tempF) * 0.002;
    }
    if (input.precipitation) {
      weatherPenaltyProb += 0.035;
    }
  }

  const expectedFgMakeProb = Math.max(
    0.5,
    Math.min(0.98, blendedFgPct - weatherPenaltyProb),
  );
  const domeBoostProb = isDome
    ? Math.max(0, input.careerDomeFgPct - input.careerOutdoorFgPct)
    : 0;
  const domePointsBoost = isDome
    ? round(
        (LEAGUE_DOME_FG_PCT_SINCE_2015 - LEAGUE_OUTDOOR_FG_PCT_SINCE_2015) * 100 +
          domeBoostProb * input.projectedFgAttempts * 3.0,
        4,
      )
    : 0;
  const weatherPenaltyPoints = round(
    weatherPenaltyProb * input.projectedFgAttempts * 3.0,
    4,
  );

  const expectedMadeFgs = input.projectedFgAttempts * expectedFgMakeProb;
  const expectedMadePats = input.projectedPatAttempts * (isDome ? 0.965 : 0.945);
  const expectedKickingPoints = expectedMadeFgs * 3.0 + expectedMadePats * 1.0;

  // Poisson/Binomial approximation for P(Made FGs >= 2)
  const lam = Math.max(0.05, expectedMadeFgs);
  const over15FgProb = 1 - Math.exp(-lam) * (1 + lam);

  return {
    expectedFgMakeProb: round(expectedFgMakeProb, 4),
    expectedKickingPoints: round(expectedKickingPoints, 4),
    domePointsBoost: round(domePointsBoost, 4),
    weatherPenaltyPoints: round(weatherPenaltyPoints, 4),
    over15FgProb: round(Math.max(0, Math.min(0.99, over15FgProb)), 4),
  };
}

// ── 3. ShadowCoverage+ & Route IQ Man Split (@MagicSportsGuy & @statyxio) ────

export interface ShadowCoveragePlusInput {
  readonly receiverName: string;
  readonly shadowCornerName: string;
  /** Projected route share shadowed by CB1 (ShadowCoverage+ threshold = 0.65). */
  readonly projectedShadowRouteShare: number;
  readonly receiverSlotRate: number;
  readonly cornerSlotShadowRate: number;
  readonly receiverYprrVsMan: number;
  readonly receiverYprrVsZone: number;
  readonly receiverDeep20PlusTargets: number;
  readonly opponentManCoverageRate: number;
}

export interface ShadowCoveragePlusResult {
  readonly shadowActive: boolean;
  readonly effectivePerimeterLockRate: number;
  readonly manEfficiencyDelta: number;
  readonly projectionMultiplier: number;
  readonly recommendation: "DOWNGRADE_SHADOW_LOCK" | "UPGRADE_MAN_BEATER" | "NEUTRAL";
}

export const SHADOW_COVERAGE_PLUS_ROUTE_THRESHOLD = 0.65;

export function evaluateShadowCoveragePlusSplit(
  input: ShadowCoveragePlusInput,
): ShadowCoveragePlusResult {
  const shadowActive =
    input.projectedShadowRouteShare >= SHADOW_COVERAGE_PLUS_ROUTE_THRESHOLD;
  const slotEscapeShare = Math.max(
    0,
    input.receiverSlotRate * (1 - input.cornerSlotShadowRate),
  );
  const effectivePerimeterLockRate = Math.max(
    0,
    Math.min(1, input.projectedShadowRouteShare - slotEscapeShare * 0.5),
  );

  // League baseline YPRR vs Man ~ 1.85
  const manEfficiencyDelta = input.receiverYprrVsMan - 1.85;
  const deepBonus = Math.min(0.12, input.receiverDeep20PlusTargets * 0.004);

  let projectionMultiplier = 1.0;
  let recommendation: ShadowCoveragePlusResult["recommendation"] = "NEUTRAL";

  if (shadowActive && input.receiverYprrVsMan < 1.2) {
    // e.g. Christian Watson (73% Gonzalez shadow, 0.65 YPRR vs Man)
    projectionMultiplier = Math.max(
      0.72,
      1.0 - effectivePerimeterLockRate * 0.25 + manEfficiencyDelta * 0.08,
    );
    recommendation = "DOWNGRADE_SHADOW_LOCK";
  } else if (input.receiverYprrVsMan >= 2.4) {
    // e.g. Matthew Golden (3.11 YPRR vs Man, 25 deep 20+ yd targets, avoids Gonzalez)
    projectionMultiplier = Math.min(
      1.28,
      1.0 + manEfficiencyDelta * 0.10 + deepBonus,
    );
    recommendation = "UPGRADE_MAN_BEATER";
  }

  return {
    shadowActive,
    effectivePerimeterLockRate: round(effectivePerimeterLockRate, 4),
    manEfficiencyDelta: round(manEfficiencyDelta, 4),
    projectionMultiplier: round(projectionMultiplier, 4),
    recommendation,
  };
}

// ── 4. Pass Rush Performance Blitz/Non-Blitz Split (@The_Coach_A) ────────────

export interface PassRushPerformanceSplitInput {
  readonly defenseTeam: string;
  readonly nonBlitzPassRushRating: number;
  readonly blitzPassRushRating: number;
  readonly blitzEpaAllowedPerPlay: number;
  readonly topEdgePrwr: number;
  readonly offensePressureRateAllowed: number;
  readonly opposingQbIsMobileScrambler: boolean;
}

export interface PassRushPerformanceSplitResult {
  readonly blitzLeverageRatio: number;
  readonly forcedBlitzRegimeActive: boolean;
  readonly expectedPocketCollapseRate: number;
  readonly qbScrambleBoostMultiplier: number;
  readonly intermediateTeTargetPenalty: number;
}

export function evaluatePassRushPerformanceSplit(
  input: PassRushPerformanceSplitInput,
): PassRushPerformanceSplitResult {
  const safeNonBlitz = Math.max(1, input.nonBlitzPassRushRating);
  const blitzLeverageRatio = input.blitzPassRushRating / safeNonBlitz;
  // NYG: nonBlitz=15 (32nd in NFL), blitz=30 (4th in NFL, -0.172 EPA/play) -> ratio 2.0
  const forcedBlitzRegimeActive =
    input.nonBlitzPassRushRating <= 18 && blitzLeverageRatio >= 1.6;

  const expectedPocketCollapseRate = Math.min(
    0.55,
    input.offensePressureRateAllowed * 0.65 + input.topEdgePrwr * 0.35,
  );

  const qbScrambleBoostMultiplier =
    forcedBlitzRegimeActive && input.opposingQbIsMobileScrambler
      ? round(1.0 + (blitzLeverageRatio - 1.0) * 0.16, 4)
      : 1.0;

  const intermediateTeTargetPenalty =
    forcedBlitzRegimeActive && input.opposingQbIsMobileScrambler
      ? round(Math.min(0.24, (blitzLeverageRatio - 1.0) * 0.14), 4)
      : 0.0;

  return {
    blitzLeverageRatio: round(blitzLeverageRatio, 4),
    forcedBlitzRegimeActive,
    expectedPocketCollapseRate: round(expectedPocketCollapseRate, 4),
    qbScrambleBoostMultiplier,
    intermediateTeTargetPenalty,
  };
}

// ── 5. CounterPlay Required-vs-Observed Action Conversion Kernel (@statyxio) ─

export interface CounterPlayConversionInput {
  readonly propLineValue: number;
  readonly projectedOpportunityVolume: number;
  readonly observedPerOpportunityRate: number;
  readonly opponentSchemeModifier: number;
}

export interface CounterPlayConversionResult {
  readonly requiredPerOpportunityRate: number;
  readonly conditionedObservedRate: number;
  readonly conversionDelta: number;
  readonly counterPlayEdgeRatio: number;
  readonly publishAllowed: boolean;
}

export function evaluateCounterPlayConversionKernel(
  input: CounterPlayConversionInput,
): CounterPlayConversionResult {
  const safeVol = Math.max(0.1, input.projectedOpportunityVolume);
  const requiredPerOpportunityRate = input.propLineValue / safeVol;
  const conditionedObservedRate =
    input.observedPerOpportunityRate * input.opponentSchemeModifier;
  const conversionDelta = conditionedObservedRate - requiredPerOpportunityRate;
  const counterPlayEdgeRatio =
    requiredPerOpportunityRate > 0
      ? conversionDelta / requiredPerOpportunityRate
      : 0;

  return {
    requiredPerOpportunityRate: round(requiredPerOpportunityRate, 4),
    conditionedObservedRate: round(conditionedObservedRate, 4),
    conversionDelta: round(conversionDelta, 4),
    counterPlayEdgeRatio: round(counterPlayEdgeRatio, 4),
    publishAllowed: counterPlayEdgeRatio >= 0.04,
  };
}
