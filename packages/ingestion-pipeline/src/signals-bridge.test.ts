import { describe, expect, it } from "vitest";
import type { TeamGameEpaSplit } from "@sports/prediction-engine/src/signals/opponent-adjusted-epa.js";
import type { TurnoverLuckInput } from "@sports/prediction-engine/src/signals/turnover-luck.js";
import {
  SIGNALS_BRIDGE_MODULES,
  evalAgeConditionedRest,
  evalBackupQbTargetDistribution,
  evalByeWeekDefensiveInstallation,
  evalCircadianTravelFatigue,
  evalCoachingTendencies,
  evalContractMilestones,
  evalEarlyDownProeMomentum,
  evalExpectedTurnoverDiff,
  evalFourthDownCoachingAggressiveness,
  evalHighAltitudeFatigueDecay,
  evalInjuryTrajectory,
  evalLinearWindPassImpact,
  evalLopezSecondAndTenTendency,
  evalManZoneReceiverArchetype,
  evalOffensiveLineTrench,
  evalOpponentAdjustedEpa,
  evalPenaltyDifferentialMomentum,
  evalQbReceiverContinuity,
  evalQbTwpRegression,
  evalRedZonePersonnelGrouping,
  evalRedZoneTeLeverage,
  evalRefereeCrewTendencies,
  evalRookieBreakoutCohort,
  evalShortWeekRoadDeficit,
  evalTemperaturePrecipitationDecay,
  evalTurfSurfaceFatigue,
  evalTwoMinuteHurryUpEfficiency,
  evalTurnoverLuck,
  evalWindElasticity,
  evalWr1OutRedistribution,
} from "./signals-bridge.js";

describe("signals-bridge inventory", () => {
  it("wires all 30 signal modules with no duplicate kernel", () => {
    expect(SIGNALS_BRIDGE_MODULES).toHaveLength(30);
    const kernels = SIGNALS_BRIDGE_MODULES.map((m) => m.kernel);
    expect(new Set(kernels).size).toBe(kernels.length);
    expect(SIGNALS_BRIDGE_MODULES.every((m) => m.evals.length === 1)).toBe(true);
  });
});

// ============================================================================
// (a) efficiency
// ============================================================================

describe("signals-bridge efficiency: redzone-te-leverage", () => {
  it("reproduces the kernel's Poisson TE-TD read on a real spread of inputs", () => {
    const r = evalRedZoneTeLeverage({
      teamRedZoneDrivesPerGame: 3.2,
      teamRedZoneTdConversionRate: 0.62,
      tightEndRedZoneTargetShare: 0.28,
      opponentAllowedRedZoneTdRate: 0.58,
      opponentTeAllowedDvoaRank: 27,
      gamesSampled: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 3.2 * (0.55*0.62 + 0.45*0.58) = 1.9264 -> 1.93
    expect(r.data.projectedTeamRedZoneTouchdowns).toBe(1.93);
    // 0.28 / 0.15 = 1.8667 -> 1.87, and 1.87 >= 1.6 with rank 27 >= 24 => ELITE
    expect(r.data.targetShareLeverageRatio).toBe(1.87);
    expect(r.data.matchupAdvantageGrade).toBe("ELITE");
    // 1 - exp(-(1.9264 * 0.28 * (0.85 + 27/32*0.35))) = 0.4609 -> 0.461
    expect(r.data.tightEndTouchdownProbability).toBe(0.461);
    // 1 / 0.4609 = 2.1700 -> 2.17
    expect(r.data.anytimeTdFairValueDecimal).toBe(2.17);
    expect(r.data.readingKind).toBe("PROBABILITY");
    expect(r.data.gamesSampled).toBe(8);
  });

  it("fails closed below the games-sampled floor, naming the count", () => {
    const r = evalRedZoneTeLeverage({
      teamRedZoneDrivesPerGame: 3.2,
      teamRedZoneTdConversionRate: 0.62,
      tightEndRedZoneTargetShare: 0.28,
      opponentAllowedRedZoneTdRate: 0.58,
      opponentTeAllowedDvoaRank: 27,
      gamesSampled: 2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 4 games sampled");
    expect(r.reason).toContain("got 2");
  });

  it("fails closed on a conversion rate that is not a probability", () => {
    const r = evalRedZoneTeLeverage({
      teamRedZoneDrivesPerGame: 3.2,
      teamRedZoneTdConversionRate: 1.6,
      tightEndRedZoneTargetShare: 0.28,
      opponentAllowedRedZoneTdRate: 0.58,
      opponentTeAllowedDvoaRank: 27,
      gamesSampled: 8,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("teamRedZoneTdConversionRate");
  });
});

describe("signals-bridge efficiency: man-zone-receiver-archetype", () => {
  it("gives a separator a smash spot against 42% man coverage", () => {
    const r = evalManZoneReceiverArchetype({
      opponentManCoverageRate: 0.42,
      opponentTwoHighShellRate: 0.35,
      receiverArchetype: "ELITE_SEPARATOR",
      baselineTargetShare: 0.22,
      baselineAdot: 9.5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // man >= 0.35 => targetShare x1.22, yprr x1.25, explosive +4.2pp
    expect(r.data.targetShareMultiplier).toBe(1.22);
    expect(r.data.yprrMultiplier).toBe(1.25);
    // 0.22 * 1.22 = 0.2684
    expect(r.data.adjustedTargetShare).toBe(0.2684);
    expect(r.data.adjustedAdot).toBe(9.5);
    expect(r.data.explosivePlayTiltPp).toBe(4.2);
    expect(r.data.matchupAdvantageTier).toBe("SMASH_SPOT");
  });

  it("keeps the sign on a deep burner capped by a two-high shell", () => {
    const r = evalManZoneReceiverArchetype({
      opponentManCoverageRate: 0.25,
      opponentTwoHighShellRate: 0.66,
      receiverArchetype: "DEEP_BURNER",
      baselineTargetShare: 0.24,
      baselineAdot: 12.0,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // twoHigh >= 0.60 => targetShare x0.84, adot -2.2, explosive -5.0pp
    expect(r.data.targetShareMultiplier).toBe(0.84);
    expect(r.data.adjustedAdot).toBe(9.8);
    expect(r.data.explosivePlayTiltPp).toBe(-5.0);
    expect(r.data.matchupAdvantageTier).toBe("SHUTDOWN_RISK");
  });

  it("fails closed on an out-of-range aDOT", () => {
    const r = evalManZoneReceiverArchetype({
      opponentManCoverageRate: 0.42,
      opponentTwoHighShellRate: 0.35,
      receiverArchetype: "ELITE_SEPARATOR",
      baselineTargetShare: 0.22,
      baselineAdot: 30,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("baselineAdot");
  });
});

describe("signals-bridge efficiency: qb-turnover-worthy-play-regression", () => {
  it("reproduces the regression read for a lucky 300-attempt quarterback", () => {
    const r = evalQbTwpRegression({
      passAttempts: 300,
      actualInterceptions: 6,
      turnoverWorthyPlays: 18,
      opponentDefensiveInterceptionRate: 0.021,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.actualIntRate).toBe(0.02);
    expect(r.data.twpRate).toBe(0.06);
    // 18 * 0.52 - 6 = 3.36 (the kernel returns this unrounded)
    expect(r.data.turnoverLuckDifferential).toBeCloseTo(3.36, 10);
    // 0.6*(0.06*0.52) + 0.25*0.02 + 0.15*0.021 = 0.02687 -> 0.0269
    expect(r.data.expectedFutureIntRate).toBe(0.0269);
    // -(3.36 / (300/35)) * 0.12 = -0.04704 -> -0.047
    expect(r.data.offensiveEpaTilt).toBe(-0.047);
    expect(r.data.turnoverRiskMultiplier).toBe(1.34);
    // min(0.92, 0.50 + log10(300)*0.18) saturates the cap
    expect(r.data.signalConfidenceScore).toBe(0.92);
    expect(r.data.explanation).toContain("positive turnover luck");
  });

  it("fails closed below the pass-attempt floor instead of forwarding the league fallback", () => {
    const r = evalQbTwpRegression({
      passAttempts: 39,
      actualInterceptions: 1,
      turnoverWorthyPlays: 2,
      opponentDefensiveInterceptionRate: 0.022,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 40 pass attempts");
    expect(r.reason).toContain("got 39");
  });

  it("fails closed when interceptions exceed pass attempts", () => {
    const r = evalQbTwpRegression({
      passAttempts: 100,
      actualInterceptions: 101,
      turnoverWorthyPlays: 5,
      opponentDefensiveInterceptionRate: 0.022,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("exceeds passAttempts");
  });
});

describe("signals-bridge efficiency: backup-qb-target-distribution", () => {
  it("funnels checkdowns to a receiving back under a raw backup", () => {
    const r = evalBackupQbTargetDistribution({
      isBackupStarting: true,
      backupCareerPassAttempts: 120,
      playerRole: "RECEIVING_RUNNING_BACK",
      baselineTargetShare: 0.12,
      baselineAdot: 6.0,
      baselineReceptionsLine: 3.5,
      gamesSampled: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // severity 1.0 (career < 400) => share x1.38, rec x1.32, adot -0.8
    expect(r.data.targetShareMultiplier).toBe(1.38);
    expect(r.data.receptionsProjectionMultiplier).toBe(1.32);
    expect(r.data.adjustedTargetShare).toBe(0.1656);
    expect(r.data.adjustedAdot).toBe(5.2);
    expect(r.data.targetFunnelCategory).toBe("HIGH_VOLUME_BENEFICIARY");
    expect(r.data.baselineReceptionsLine).toBe(3.5);
  });

  it("damps the funnel for a veteran backup and keeps the sign on a deep threat", () => {
    const r = evalBackupQbTargetDistribution({
      isBackupStarting: true,
      backupCareerPassAttempts: 900,
      playerRole: "BOUNDARY_DEEP_THREAT",
      baselineTargetShare: 0.25,
      baselineAdot: 11.0,
      baselineReceptionsLine: 5.0,
      gamesSampled: 12,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // severity 0.75 => share 1 - 0.36*0.75 = 0.73, rec 1 - 0.42*0.75 = 0.685
    expect(r.data.targetShareMultiplier).toBe(0.73);
    expect(r.data.receptionsProjectionMultiplier).toBe(0.69);
    expect(r.data.targetFunnelCategory).toBe("SEVERE_DECAY");
  });

  it("fails closed when the target-share window is a single game", () => {
    const r = evalBackupQbTargetDistribution({
      isBackupStarting: true,
      backupCareerPassAttempts: 120,
      playerRole: "TIGHT_END",
      baselineTargetShare: 0.12,
      baselineAdot: 6.0,
      baselineReceptionsLine: 3.5,
      gamesSampled: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 4 games sampled");
  });
});

describe("signals-bridge efficiency: wr1-out-target-redistribution", () => {
  it("reallocates a 28-share alpha WR1 to WR2/TE1/RB at the documented split", () => {
    const r = evalWr1OutRedistribution({
      team: "BUF",
      wr1Name: "Diggs",
      wr1BaselineTargetShare: 0.28,
      wr1Status: "OUT",
      wr2Name: "Cooks",
      wr2BaselineTargetShare: 0.16,
      te1BaselineTargetShare: 0.14,
      rb1TargetShare: 0.1,
      gamesSampled: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.isAlphaWr1Out).toBe(true);
    expect(r.data.vacatedTargetSharePool).toBe(0.28);
    // deltas: 0.28*0.36 = 0.1008 -> 0.101, 0.28*0.28 = 0.0784 -> 0.078, 0.28*0.18 = 0.0504 -> 0.05
    expect(r.data.wr2TargetShareDelta).toBe(0.101);
    expect(r.data.te1TargetShareDelta).toBe(0.078);
    expect(r.data.wr2ProjectedTargetShare).toBe(0.261);
    expect(r.data.te1ProjectedTargetShare).toBe(0.218);
    expect(r.data.rbProjectedTargetShare).toBe(0.15);
    // compression min(0.14, 0.07 + 0.28*0.20) = 0.126 => 0.874
    expect(r.data.wr2EfficiencyCompressionMultiplier).toBe(0.874);
    // -(0.28 * 8.5) = -2.38, which the kernel rounds to one decimal as -2.4
    expect(r.data.passingVolumeTiltAttemptsPerGame).toBe(-2.4);
  });

  it("is a no-op read when the WR1 is merely questionable", () => {
    const r = evalWr1OutRedistribution({
      team: "BUF",
      wr1Name: "Diggs",
      wr1BaselineTargetShare: 0.28,
      wr1Status: "QUESTIONABLE",
      wr2Name: "Cooks",
      wr2BaselineTargetShare: 0.16,
      te1BaselineTargetShare: 0.14,
      rb1TargetShare: 0.1,
      gamesSampled: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.isAlphaWr1Out).toBe(false);
    expect(r.data.vacatedTargetSharePool).toBe(0);
    expect(r.data.wr2EfficiencyCompressionMultiplier).toBe(1);
  });

  it("fails closed when WR1 and WR2 are the same player", () => {
    const r = evalWr1OutRedistribution({
      team: "BUF",
      wr1Name: "Diggs",
      wr1BaselineTargetShare: 0.28,
      wr1Status: "OUT",
      wr2Name: "Diggs",
      wr2BaselineTargetShare: 0.16,
      te1BaselineTargetShare: 0.14,
      rb1TargetShare: 0.1,
      gamesSampled: 8,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("same player");
  });
});

// ============================================================================
// (b) environment
// ============================================================================

describe("signals-bridge environmental: temperature-precipitation-decay", () => {
  it("stacks a deep freeze and snow into the documented total decay", () => {
    const r = evalTemperaturePrecipitationDecay({
      temperatureFahrenheit: 20,
      precipitationType: "SNOW",
      isDomeVenue: false,
      baselinePassingYards: 230,
      baselineGameTotal: 45,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // -21.0 (temp <= 22) then -28.0 (snow) = -49.0; floor is -55
    expect(r.data.passingYardsTilt).toBe(-49);
    // -3.2 then -5.1 = -8.3; floor is -9.0
    expect(r.data.gameTotalPointsTilt).toBe(-8.3);
    expect(r.data.rushAttemptBonus).toBe(10);
    // 3.5 + 5.2
    expect(r.data.completionRateTiltPp).toBe(8.7);
    // 1.25 * 1.55
    expect(r.data.turnoverVolatilityMultiplier).toBe(1.94);
    expect(r.data.weatherRegime).toBe("DEEP_FREEZE_PRECIP");
    expect(r.data.readingKind).toBe("PHYSICAL_MODIFIER");
  });

  it("is exactly neutral inside a dome", () => {
    const r = evalTemperaturePrecipitationDecay({
      temperatureFahrenheit: 20,
      precipitationType: "SNOW",
      isDomeVenue: true,
      baselinePassingYards: 230,
      baselineGameTotal: 45,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.weatherRegime).toBe("DOME_CONTROLLED");
    expect(r.data.passingYardsTilt).toBe(0);
    expect(r.data.gameTotalPointsTilt).toBe(0);
    expect(r.data.turnoverVolatilityMultiplier).toBe(1);
  });

  it("fails closed on an impossible temperature", () => {
    const r = evalTemperaturePrecipitationDecay({
      temperatureFahrenheit: 500,
      precipitationType: "NONE",
      isDomeVenue: false,
      baselinePassingYards: 230,
      baselineGameTotal: 45,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("temperatureFahrenheit");
  });
});

describe("signals-bridge environmental: high-altitude-fatigue-decay", () => {
  it("prices an unacclimated 5280ft visitor in a fast-pace game", () => {
    const r = evalHighAltitudeFatigueDecay({
      venueAltitudeFeet: 5280,
      isVisitingTeam: true,
      visitingTeamArrivalDaysPrior: 1,
      defensiveSnapCountPaceProjection: 75,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // min(5.5, 5.28 * 0.75 = 3.96) -> rounded to one decimal is 4.0
    expect(r.data.fieldGoalRangeExtensionYards).toBe(4);
    // 5.28 * 0.045 = 0.2376 -> 0.238
    expect(r.data.touchbackProbabilityBoostDelta).toBe(0.238);
    // 1 + 0.18 * 1.0 (no acclimation) * 1.25 (>70 snaps) = 1.225
    expect(r.data.secondHalfFatigueMultiplier).toBe(1.225);
    // 0.085 * 1.0 * 1.25 = 0.10625 -> 0.106
    expect(r.data.visitingDefensiveEpaTilt).toBe(0.106);
    // -1.45 * 1.0 * 1.25 = -1.8125 -> -1.81
    expect(r.data.spreadPointsTilt).toBe(-1.81);
    expect(r.data.signalConfidenceScore).toBe(0.88);
  });

  it("gives the home side the reciprocal spread tilt and zero fatigue decay", () => {
    const r = evalHighAltitudeFatigueDecay({
      venueAltitudeFeet: 5280,
      isVisitingTeam: false,
      visitingTeamArrivalDaysPrior: 1,
      defensiveSnapCountPaceProjection: 65,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.spreadPointsTilt).toBe(1.45);
    expect(r.data.secondHalfFatigueMultiplier).toBe(1);
    expect(r.data.visitingDefensiveEpaTilt).toBe(0);
  });

  it("fails closed on an impossible altitude", () => {
    const r = evalHighAltitudeFatigueDecay({
      venueAltitudeFeet: 20000,
      isVisitingTeam: true,
      visitingTeamArrivalDaysPrior: 1,
      defensiveSnapCountPaceProjection: 75,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("venueAltitudeFeet");
  });
});

describe("signals-bridge environmental: linear-wind-pass-impact", () => {
  it("applies the -3.007 yds/mph linear slope above the calm threshold", () => {
    const r = evalLinearWindPassImpact({
      windSpeedMph: 20,
      isEnclosedOrDome: false,
      gustSpeedMph: 28,
      baselinePassingYards: 250,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.windCategory).toBe("HEAVY_WIND");
    // 20 - 7.5
    expect(r.data.effectiveWindDecayMph).toBe(12.5);
    // 12.5 * -3.007 = -37.5875 -> -37.6
    expect(r.data.passingYardsTilt).toBe(-37.6);
    // 250 - 37.5875 = 212.4125 -> 212.4
    expect(r.data.projectedPassingYards).toBe(212.4);
    expect(r.data.completionRateTiltPp).toBe(-3);
    // 1 - 12.5*0.028 = 0.65
    expect(r.data.deepPassRateCompression).toBe(0.65);
  });

  it("treats a closed roof as exactly zero wind", () => {
    const r = evalLinearWindPassImpact({
      windSpeedMph: 30,
      isEnclosedOrDome: true,
      baselinePassingYards: 250,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.windCategory).toBe("CALM");
    expect(r.data.passingYardsTilt).toBe(0);
    expect(r.data.projectedPassingYards).toBe(250);
  });

  it("fails closed when a gust reads below the sustained wind", () => {
    const r = evalLinearWindPassImpact({
      windSpeedMph: 20,
      isEnclosedOrDome: false,
      gustSpeedMph: 5,
      baselinePassingYards: 250,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("below sustained wind");
  });
});

describe("signals-bridge environment: wind-elasticity", () => {
  it("blends gusts into the effective wind and keeps the tailwind range sign", () => {
    const r = evalWindElasticity({
      sustainedWindMph: 15,
      gustMph: 25,
      direction: "TAILWIND",
      isDomeOrRetractableClosed: false,
      isVisitor: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 15 + 0.5 * (25 - 15) = 20
    expect(r.data.effectiveWindMph).toBe(20);
    // windAboveBaseline 13; 0.00165 * 13^1.62 = 0.00165 * 63.79 = 0.10525
    expect(r.data.passingYardsMultiplier).toBeCloseTo(0.8948, 4);
    // -0.028 * 13^1.75 = -0.028 * 88.95 = -2.49
    expect(r.data.passingCompletionTiltPp).toBeCloseTo(-2.49, 2);
    // TAILWIND: negative shrinkage means range EXTENSION, -(0.8 * 10) = -8.0
    expect(r.data.fieldGoalRangeShiftYards).toBe(-8);
    // 1 + 0.0065 * 8^1.25 = 1 + 0.0065 * 13.454 = 1.0875
    expect(r.data.rushingVolumeMultiplier).toBeCloseTo(1.0875, 4);
    // -0.22 * 10^1.32 = -0.22 * 20.893 = -4.596
    expect(r.data.gameTotalPointsTilt).toBeCloseTo(-4.6, 1);
  });

  it("is exactly neutral at 7mph of sustained wind", () => {
    const r = evalWindElasticity({
      sustainedWindMph: 7,
      direction: "CROSSWIND",
      isDomeOrRetractableClosed: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.passingYardsMultiplier).toBe(1);
    expect(r.data.gameTotalPointsTilt).toBe(0);
  });

  it("fails closed on a gust below the sustained wind", () => {
    const r = evalWindElasticity({
      sustainedWindMph: 20,
      gustMph: 5,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("below sustained wind");
  });
});

// ============================================================================
// (c) tactical
// ============================================================================

describe("signals-bridge tactical: early-down-pass-rate-momentum", () => {
  it("computes the PROE differential and its capped total impact", () => {
    const r = evalEarlyDownProeMomentum({
      earlyDownPassRate: 0.58,
      expectedPassRate: 0.51,
      opponentPassDefenseEpaRank: 28,
      offensivePaceSecondsPerPlay: 24,
      playCountSample: 420,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.proeDifferential).toBeCloseTo(0.07, 10);
    expect(r.data.playCallingAggressivenessTier).toBe("MODERATE_PASS");
    // vuln multiplier clamps at 1.4; 1 + 0.07*0.45*1.4 = 1.0441 -> 1.044
    expect(r.data.driveEfficiencyMultiplier).toBe(1.044);
    // 0.07 * 22 * 1.2 (fast pace) * 1.4 = 2.5872 -> 2.59
    expect(r.data.gameTotalPointsTilt).toBe(2.59);
    // 0.07 * 1.65 * 100 = 11.55, which the kernel rounds to one decimal as 11.5
    expect(r.data.projectedPassingVolumeShiftPercent).toBe(11.5);
    expect(r.data.signalConfidenceScore).toBe(0.92);
    expect(r.data.readingKind).toBe("SIGNED_TILT");
  });

  it("flips the sign of the total tilt for a run-heavy offense", () => {
    const r = evalEarlyDownProeMomentum({
      earlyDownPassRate: 0.4,
      expectedPassRate: 0.52,
      opponentPassDefenseEpaRank: 4,
      offensivePaceSecondsPerPlay: 30,
      playCountSample: 400,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.playCallingAggressivenessTier).toBe("HYPER_CONSERVATIVE");
    expect(r.data.gameTotalPointsTilt).toBeLessThan(0);
  });

  it("fails closed below the play-count floor", () => {
    const r = evalEarlyDownProeMomentum({
      earlyDownPassRate: 0.58,
      expectedPassRate: 0.51,
      opponentPassDefenseEpaRank: 28,
      offensivePaceSecondsPerPlay: 24,
      playCountSample: 20,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 60 plays sampled");
    expect(r.reason).toContain("got 20");
  });
});

describe("signals-bridge tactical: redzone-personnel-grouping", () => {
  it("adds the trench-mismatch bonus to a 12-personnel run probability", () => {
    const r = evalRedZonePersonnelGrouping({
      primaryRedZonePersonnelGrouping: "TWELVE_12",
      offensiveLineRunBlockGrade: 78,
      opponentDefensiveFrontSevenGrade: 60,
      goalLineDistanceYards: 2,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 12-personnel short-yardage run prob 0.68 + 0.08 (trench diff >= 15)
    expect(r.data.expectedRunProbability).toBe(0.76);
    expect(r.data.expectedPassProbability).toBe(0.24);
    // 0.18 + (78-60)*0.005 = 0.27
    expect(r.data.playActionEpaTilt).toBe(0.27);
    expect(r.data.rbTouchdownShareModifier).toBe(1.2);
    expect(r.data.teTargetShareBonusPp).toBe(0.24);
    expect(r.data.defensivePersonnelMismatchTier).toBe("HEAVY_RUN_LEVERAGE");
  });

  it("keeps run and pass summing to one for a spread package", () => {
    const r = evalRedZonePersonnelGrouping({
      primaryRedZonePersonnelGrouping: "ELEVEN_11",
      offensiveLineRunBlockGrade: 50,
      opponentDefensiveFrontSevenGrade: 50,
      goalLineDistanceYards: 2,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.expectedRunProbability).toBe(0.44);
    expect(r.data.expectedPassProbability).toBe(0.56);
    expect(r.data.defensivePersonnelMismatchTier).toBe("SPREAD_ISOLATION");
  });

  it("fails closed on a grade above 100", () => {
    const r = evalRedZonePersonnelGrouping({
      primaryRedZonePersonnelGrouping: "TWELVE_12",
      offensiveLineRunBlockGrade: 150,
      opponentDefensiveFrontSevenGrade: 60,
      goalLineDistanceYards: 2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("offensiveLineRunBlockGrade");
  });
});

describe("signals-bridge tactical: two-minute-hurry-up-efficiency", () => {
  it("prices a converting two-minute offense with the middle-eight kickoff bonus", () => {
    const r = evalTwoMinuteHurryUpEfficiency({
      twoMinuteDrillDrives: 24,
      twoMinuteScoringDrives: 11,
      twoMinutePointsPerMinute: 2.1,
      qbPasserRatingInTwoMinute: 104,
      opponentDefensiveTwoMinuteEpaAllowed: 0.08,
      receivesSecondHalfKickoff: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 11 / 24 = 0.4583 -> 0.458
    expect(r.data.scoringDriveConversionRate).toBe(0.458);
    // 0.50 + 0.25 * (0.4583 / 0.385) = 0.7976 -> 0.798
    expect(r.data.middleEightLeverageScore).toBe(0.798);
    // 0.07333 * 4.2 * 1.18182 * 1.16 = 0.4222 -> 0.42
    expect(r.data.expectedPointsAddedPerTwoMinuteOpportunity).toBe(0.42);
    // 0.4222 * 1.35 * 0.40 = 0.2280 -> 0.23
    expect(r.data.spreadPointsTilt).toBe(0.23);
    expect(r.data.signalConfidenceScore).toBeCloseTo(0.814, 3);
  });

  it("removes the kickoff bonus when the offense does not receive", () => {
    const r = evalTwoMinuteHurryUpEfficiency({
      twoMinuteDrillDrives: 24,
      twoMinuteScoringDrives: 11,
      twoMinutePointsPerMinute: 2.1,
      qbPasserRatingInTwoMinute: 104,
      opponentDefensiveTwoMinuteEpaAllowed: 0.08,
      receivesSecondHalfKickoff: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 0.50 - 0.10 * (1 - 1.1904) = 0.51904 -> 0.519
    expect(r.data.middleEightLeverageScore).toBe(0.519);
    // no 1.35 multiplier: 0.4222 * 0.40 = 0.1689 -> 0.17
    expect(r.data.spreadPointsTilt).toBe(0.17);
  });

  it("fails closed below the two-minute drive floor rather than forwarding the league median", () => {
    const r = evalTwoMinuteHurryUpEfficiency({
      twoMinuteDrillDrives: 4,
      twoMinuteScoringDrives: 2,
      twoMinutePointsPerMinute: 1.8,
      qbPasserRatingInTwoMinute: 90,
      opponentDefensiveTwoMinuteEpaAllowed: 0,
      receivesSecondHalfKickoff: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 8 two-minute drives");
    expect(r.reason).toContain("got 4");
  });
});

// ============================================================================
// (d) situational
// ============================================================================

describe("signals-bridge situational: referee-crew-tendencies", () => {
  it("prices a low-flag crew's total tilt and home penalty-yardage edge", () => {
    const r = evalRefereeCrewTendencies({
      refereeName: "B. Vinovich",
      crewFlagsPerGame: 10.2,
      leagueAvgFlagsPerGame: 12.4,
      defensiveHoldingFlagsPerGame: 1.6,
      passInterferenceFlagsPerGame: 1.2,
      homePenaltyRateRatio: 0.46,
      isDomeVenue: false,
      gamesSampled: 60,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.penaltyPaceTier).toBe("LET_THEM_PLAY");
    expect(r.data.flagsAboveLeagueAverage).toBe(-2.2);
    // -(-2.2)*0.28 + (-0.2)*0.65 - (-0.3)*0.42 = 0.616 - 0.130 + 0.126 = 0.612 -> 0.61
    expect(r.data.gameTotalPointsTilt).toBe(0.61);
    // 7.2 * (1 - 0) = 7.2, no dome multiplier
    expect(r.data.homeFieldPenaltyYardageAdvantage).toBe(7.2);
    expect(r.data.dpiVolatilityMultiplier).toBe(0.96);
    // 1 + (-2.2/12.4)*0.45 = 0.9202 -> 0.92
    expect(r.data.driveStallProbabilityMultiplier).toBe(0.92);
  });

  it("spends the dome multiplier on the home penalty-yardage edge", () => {
    const r = evalRefereeCrewTendencies({
      refereeName: "B. Vinovich",
      crewFlagsPerGame: 10.2,
      leagueAvgFlagsPerGame: 12.4,
      defensiveHoldingFlagsPerGame: 1.6,
      passInterferenceFlagsPerGame: 1.2,
      homePenaltyRateRatio: 0.46,
      isDomeVenue: true,
      gamesSampled: 60,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 7.2 * 1.25 = 9.0
    expect(r.data.homeFieldPenaltyYardageAdvantage).toBe(9);
  });

  it("fails closed below the crew sample floor", () => {
    const r = evalRefereeCrewTendencies({
      refereeName: "B. Vinovich",
      crewFlagsPerGame: 10.2,
      leagueAvgFlagsPerGame: 12.4,
      defensiveHoldingFlagsPerGame: 1.6,
      passInterferenceFlagsPerGame: 1.2,
      homePenaltyRateRatio: 0.46,
      gamesSampled: 5,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 20 games sampled");
  });
});

describe("signals-bridge situational: coaching-tendencies", () => {
  it("applies the 2nd-and-10 run-after-pass alternation bias", () => {
    const r = evalCoachingTendencies({
      down: 2,
      distance: 10,
      previousPlayType: "PASS",
      previousPlayGain: 0,
      coachAggressivenessScore: 0.8,
      isRoadTeam: true,
      halfSecondsRemaining: 75,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // baseline 2nd-and-10 run prob 0.32 + 0.19 alternation
    expect(r.data.expectedRunProbability).toBe(0.51);
    expect(r.data.baselineRunProbability).toBe(0.32);
    expect(r.data.runAlternationDeltaPp).toBe(0.19);
    expect(r.data.lateHalfScoringTiltRoad).toBe(-1.65);
    expect(r.data.fourthDownGoForItTiltEv).toBe(0);
  });

  it("returns a fourth-down EV tilt for an aggressive coach", () => {
    const r = evalCoachingTendencies({
      down: 4,
      distance: 1,
      coachAggressivenessScore: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // (0.70 - 0.55) * (1.0 / 0.50) * 2.2 = 0.66
    expect(r.data.fourthDownGoForItTiltEv).toBe(0.66);
  });

  it("fails closed on an impossible down", () => {
    const r = evalCoachingTendencies({ down: 5 as 1, distance: 10 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("down must be");
  });
});

describe("signals-bridge situational: fourth-down-coaching-aggressiveness", () => {
  it("prices an analytics-aggressive coach and keeps the WP bonus signed", () => {
    const r = evalFourthDownCoachingAggressiveness({
      coachName: "Dan Campbell",
      fourthDownGoRateOverExpected: 0.18,
      redZoneFourthDownGoRate: 0.55,
      scoreDifferential: 0,
      quarter: 2,
      gamesSampled: 40,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.aggressivenessTier).toBe("ANALYTICS_AGGRESSIVE");
    // 0.48 + 0.18
    expect(r.data.expectedGoProbabilityOnFourthAndShort).toBe(0.66);
    expect(r.data.gameTotalPointsTilt).toBe(1.65);
    expect(r.data.winProbabilityTiltDelta).toBe(0.024);
    expect(r.data.driveContinuationMultiplier).toBe(1.14);
  });

  it("keeps the WP bonus negative for a punt-first coach", () => {
    const r = evalFourthDownCoachingAggressiveness({
      coachName: "C. Conservative",
      fourthDownGoRateOverExpected: -0.15,
      redZoneFourthDownGoRate: 0.2,
      scoreDifferential: 0,
      quarter: 1,
      gamesSampled: 40,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.aggressivenessTier).toBe("CONSERVATIVE_PUNT_FIRST");
    expect(r.data.winProbabilityTiltDelta).toBe(-0.018);
    expect(r.data.gameTotalPointsTilt).toBe(-1.2);
  });

  it("fails closed below the coach sample floor", () => {
    const r = evalFourthDownCoachingAggressiveness({
      coachName: "Dan Campbell",
      fourthDownGoRateOverExpected: 0.18,
      redZoneFourthDownGoRate: 0.55,
      scoreDifferential: 0,
      quarter: 2,
      gamesSampled: 3,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 8 games sampled");
  });
});

describe("signals-bridge situational: lopez-second-and-ten-tendency", () => {
  it("reproduces the measured 37.73% pass rate after a 1st-down pass", () => {
    const r = evalLopezSecondAndTenTendency({
      priorFirstDownPlayType: "PASS",
      scoreDifferential: 0,
      quarter: 2,
      timeRemainingSeconds: 3600,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.expectedPassProbability).toBe(0.3773);
    expect(r.data.expectedRunProbability).toBe(0.6227);
    // (0.3773 - 0.352) * 100
    expect(r.data.tendencyShiftOverBaselinePp).toBe(2.53);
    expect(r.data.playCallingRegime).toBe("BALANCED");
    expect(r.data.passOverExpectedModifier).toBe(0);
  });

  it("keeps the disjoint after-a-run rate and the two-score urgency lift", () => {
    const base = evalLopezSecondAndTenTendency({
      priorFirstDownPlayType: "RUSH",
      scoreDifferential: 0,
      quarter: 2,
      timeRemainingSeconds: 3600,
    });
    const urgent = evalLopezSecondAndTenTendency({
      priorFirstDownPlayType: "RUSH",
      scoreDifferential: -14,
      quarter: 4,
      timeRemainingSeconds: 600,
    });
    expect(base.ok).toBe(true);
    expect(urgent.ok).toBe(true);
    if (!base.ok || !urgent.ok) return;
    // 27.37% after a run
    expect(base.data.expectedPassProbability).toBe(0.2737);
    // +0.12 urgency on top of the 27.37% base
    expect(urgent.data.expectedPassProbability).toBe(0.3937);
    expect(urgent.data.playCallingRegime).toBe("BALANCED");
  });

  it("fails closed on an impossible quarter", () => {
    const r = evalLopezSecondAndTenTendency({
      priorFirstDownPlayType: "PASS",
      scoreDifferential: 0,
      quarter: 6 as 1,
      timeRemainingSeconds: 3600,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("quarter must be");
  });
});

describe("signals-bridge situational: short-week-road-deficit", () => {
  it("stacks travel and rest asymmetry into the road penalty", () => {
    const r = evalShortWeekRoadDeficit({
      isRoadTeam: true,
      restDays: 4,
      travelDistanceMiles: 1800,
      opponentRestDays: 7,
      isDivisionRivalry: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.acuteTravelDeficit).toBe(true);
    // -1.75 base, -0.65 long travel, -0.50 opponent had normal rest
    expect(r.data.spreadPointsTilt).toBe(-2.9);
    expect(r.data.fourthQuarterFatigueFactor).toBeCloseTo(1.35, 10);
    expect(r.data.restDifferential).toBe(-3);
    expect(r.data.signalConfidenceScore).toBe(0.88);
  });

  it("hands a small positive tilt to the home side of a mutual short week", () => {
    const r = evalShortWeekRoadDeficit({
      isRoadTeam: false,
      restDays: 4,
      travelDistanceMiles: 100,
      opponentRestDays: 4,
      isDivisionRivalry: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.acuteTravelDeficit).toBe(false);
    expect(r.data.spreadPointsTilt).toBe(0.6);
  });

  it("fails closed on an impossible rest window", () => {
    const r = evalShortWeekRoadDeficit({
      isRoadTeam: true,
      restDays: 45,
      travelDistanceMiles: 100,
      opponentRestDays: 7,
      isDivisionRivalry: false,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("restDays");
  });
});

describe("signals-bridge situational: circadian-travel-fatigue", () => {
  it("prices a West-to-East 1pm kickoff with two weeks of travel mileage", () => {
    const r = evalCircadianTravelFatigue({
      team: "LAR",
      isVisitor: true,
      originTimeZoneOffset: -8,
      destinationTimeZoneOffset: -5,
      localKickoffHour24: 13,
      daysOfRest: 7,
      opponentDaysOfRest: 7,
      trailing14DayTravelMiles: 2400,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.timeZoneShiftEastward).toBe(3);
    expect(r.data.bodyClockKickoffHour).toBe(10);
    // 0.85 circadian + 0.30 travel, capped at 1.0
    expect(r.data.circadianDeficitMagnitude).toBe(1);
    // -(0.85 * 1.85) = -1.5725 -> -1.57, and the spread step reuses THAT
    // rounded value: -1.57 * 0.85 - 1.15 (deficit >= 0.7) = -2.4845 -> -2.48
    expect(r.data.firstHalfMarginTiltPoints).toBe(-1.57);
    expect(r.data.netGameSpreadTiltPoints).toBe(-2.48);
    expect(r.data.fourthQuarterFatigueRisk).toBe("HIGH");
    expect(r.data.readingKind).toBe("PHYSICAL_MODIFIER");
  });

  it("is exactly neutral for a home team with equal rest", () => {
    const r = evalCircadianTravelFatigue({
      team: "BUF",
      isVisitor: false,
      originTimeZoneOffset: -5,
      destinationTimeZoneOffset: -5,
      localKickoffHour24: 13,
      daysOfRest: 7,
      opponentDaysOfRest: 7,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.circadianDeficitMagnitude).toBe(0);
    expect(r.data.netGameSpreadTiltPoints).toBe(0);
    expect(r.data.fourthQuarterFatigueRisk).toBe("LOW");
  });

  it("fails closed on an impossible kickoff hour", () => {
    const r = evalCircadianTravelFatigue({
      team: "LAR",
      isVisitor: true,
      originTimeZoneOffset: -8,
      destinationTimeZoneOffset: -5,
      localKickoffHour24: 30,
      daysOfRest: 7,
      opponentDaysOfRest: 7,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("localKickoffHour24");
  });
});

describe("signals-bridge situational: age-conditioned-rest", () => {
  it("gives a veteran roster the full post-bye lift plus the OL bonus", () => {
    const r = evalAgeConditionedRest({
      teamName: "PIT",
      daysOfRest: 14,
      snapWeightedRosterAge: 28,
      startingQbAge: 39,
      offensiveLineAvgAge: 30,
      gamesSampled: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.ageBracket).toBe("VETERAN_HEAVY");
    expect(r.data.restRegime).toBe("FULL_BYE");
    // 2.45 + 0.45 (OL age >= 29 on >= 10 days)
    expect(r.data.expectedMarginTiltPoints).toBe(2.9);
    expect(r.data.fourthQuarterFatigueFactor).toBe(0.82);
    expect(r.data.injuryRiskMultiplier).toBe(0.72);
  });

  it("keeps the sign on a short-rest veteran penalty", () => {
    const r = evalAgeConditionedRest({
      teamName: "PIT",
      daysOfRest: 4,
      snapWeightedRosterAge: 28,
      startingQbAge: 39,
      offensiveLineAvgAge: 30,
      gamesSampled: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.restRegime).toBe("SHORT_REST_TNF");
    expect(r.data.expectedMarginTiltPoints).toBe(-2.85);
    expect(r.data.fourthQuarterFatigueFactor).toBe(1.32);
  });

  it("fails closed below the roster-age sample floor", () => {
    const r = evalAgeConditionedRest({
      teamName: "PIT",
      daysOfRest: 14,
      snapWeightedRosterAge: 28,
      startingQbAge: 39,
      offensiveLineAvgAge: 30,
      gamesSampled: 2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 4 games sampled");
  });
});

// ============================================================================
// (e) chemistry / discipline / narrative / schematic / trench / bio / biomech
// ============================================================================

describe("signals-bridge chemistry: qb-receiver-continuity", () => {
  it("puts a 40-game pairing plus scheme tenure in the telepathic tier", () => {
    const r = evalQbReceiverContinuity({
      qbName: "P. Mahomes",
      receiverName: "T. Kelce",
      position: "TE",
      regularSeasonGamesPlayedTogether: 40,
      targetShareBaseline: 0.18,
      offensiveSchemeTenureSeasonsWithCoordinator: 3,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.continuityTier).toBe("TELEPATHIC");
    // 0.18 + 0.028
    expect(r.data.adjustedTargetShare).toBe(0.208);
    expect(r.data.targetShareShiftPp).toBe(2.8);
    // 0.046 + 0.010 scheme tenure
    expect(r.data.epaPerTargetTilt).toBe(0.056);
    // 1.38 + 0.06, capped at 1.50
    expect(r.data.trustIndexScore).toBe(1.44);
    expect(r.data.highLeverageTargetConcentrationMultiplier).toBe(1.28);
  });

  it("puts a short pairing in the developing tier with a negative EPA/target tilt", () => {
    const r = evalQbReceiverContinuity({
      qbName: "Rookie QB",
      receiverName: "Rookie WR",
      position: "WR3",
      regularSeasonGamesPlayedTogether: 5,
      targetShareBaseline: 0.1,
      offensiveSchemeTenureSeasonsWithCoordinator: 0,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.continuityTier).toBe("DEVELOPING");
    expect(r.data.epaPerTargetTilt).toBe(-0.012);
    expect(r.data.targetShareShiftPp).toBe(-0.5);
  });

  it("fails closed below the shared-games floor", () => {
    const r = evalQbReceiverContinuity({
      qbName: "P. Mahomes",
      receiverName: "T. Kelce",
      position: "TE",
      regularSeasonGamesPlayedTogether: 3,
      targetShareBaseline: 0.18,
      offensiveSchemeTenureSeasonsWithCoordinator: 3,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 5 shared games");
    expect(r.reason).toContain("got 3");
  });
});

describe("signals-bridge discipline: penalty-differential-momentum", () => {
  it("prices a disciplined team's net yardage and spread tilt", () => {
    const r = evalPenaltyDifferentialMomentum({
      teamName: "BUF",
      opponentName: "MIA",
      rollingFiveGameNetPenaltyYards: -24,
      teamPreSnapFoulsPerGame: 1.4,
      opponentPreSnapFoulsPerGame: 2.6,
      teamDpiBeneficiaryYardsPerGame: 8.2,
      opponentDpiBeneficiaryYardsPerGame: 6,
      gamesSampled: 5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.disciplineTier).toBe("ELITE_DISCIPLINE");
    expect(r.data.netPenaltyYardAdvantage).toBe(24);
    // (24/20)*0.95 + (2.2/15)*0.45 = 1.206 -> 1.21
    expect(r.data.expectedSpreadTiltPoints).toBe(1.21);
    // 1.4 * 26 = 36.4
    expect(r.data.driveStallRiskIndex).toBe(36.4);
    expect(r.data.chunkPenaltyYardsExpectation).toBe(8.2);
  });

  it("flips the spread tilt negative for a penalty liability", () => {
    const r = evalPenaltyDifferentialMomentum({
      teamName: "DET",
      opponentName: "GB",
      rollingFiveGameNetPenaltyYards: 30,
      teamPreSnapFoulsPerGame: 2.9,
      opponentPreSnapFoulsPerGame: 1.1,
      teamDpiBeneficiaryYardsPerGame: 4,
      opponentDpiBeneficiaryYardsPerGame: 8,
      gamesSampled: 5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.disciplineTier).toBe("HIGH_PENALTY_LIABILITY");
    expect(r.data.netPenaltyYardAdvantage).toBe(-30);
    expect(r.data.expectedSpreadTiltPoints).toBeLessThan(0);
  });

  it("fails closed below the five-game penalty window", () => {
    const r = evalPenaltyDifferentialMomentum({
      teamName: "BUF",
      opponentName: "MIA",
      rollingFiveGameNetPenaltyYards: -24,
      teamPreSnapFoulsPerGame: 1.4,
      opponentPreSnapFoulsPerGame: 2.6,
      teamDpiBeneficiaryYardsPerGame: 8.2,
      opponentDpiBeneficiaryYardsPerGame: 6,
      gamesSampled: 4,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 5 games sampled");
  });
});

describe("signals-bridge narrative: contract-incentives-milestones", () => {
  it("reads a 68-of-75 catches milestone as high proximity", () => {
    const r = evalContractMilestones({
      playerName: "G. Kittle",
      position: "TE",
      metricType: "RECEPTIONS",
      currentSeasonTotal: 68,
      milestoneTarget: 75,
      bonusValueUsd: 150000,
      remainingGamesInSeason: 3,
      isContractYear: true,
      teamPlayoffStatus: "IN_HUNT",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.incentiveProximityRatio).toBe(0.907);
    expect(r.data.neededPerGame).toBe(2.3);
    expect(r.data.incentiveAttainability).toBe("HIGH_PROXIMITY");
    // 1 + 0.18 * 1.0 * 1.15
    expect(r.data.touchPriorityBoostMultiplier).toBe(1.207);
    expect(r.data.projectedTargetShareDeltaPp).toBe(3.2);
    // min(100, 50 + 2.25 + 15) = 67
    expect(r.data.financialUrgencyIndex).toBe(67);
  });

  it("reads an out-of-reach milestone as out of reach with no usage boost", () => {
    const r = evalContractMilestones({
      playerName: "G. Kittle",
      position: "TE",
      metricType: "RECEPTIONS",
      currentSeasonTotal: 20,
      milestoneTarget: 120,
      bonusValueUsd: 500000,
      remainingGamesInSeason: 2,
      isContractYear: false,
      teamPlayoffStatus: "CLINCHED",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.incentiveAttainability).toBe("OUT_OF_REACH");
    expect(r.data.touchPriorityBoostMultiplier).toBe(1);
    expect(r.data.projectedTargetShareDeltaPp).toBe(0);
  });

  it("fails closed on a milestone with no documented bonus", () => {
    const r = evalContractMilestones({
      playerName: "G. Kittle",
      position: "TE",
      metricType: "RECEPTIONS",
      currentSeasonTotal: 68,
      milestoneTarget: 75,
      bonusValueUsd: 0,
      remainingGamesInSeason: 3,
      isContractYear: true,
      teamPlayoffStatus: "IN_HUNT",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("bonusValueUsd");
  });
});

describe("signals-bridge narrative: rookie-breakout-cohort", () => {
  it("adds the post-bye acceleration to an inflection-phase first-rounder", () => {
    const r = evalRookieBreakoutCohort({
      rookieName: "P. Washington",
      rookieDraftRound: 1,
      currentWeekOfSeason: 7,
      hasHadByeWeek: true,
      isImmediatelyPostBye: true,
      baselineTargetShare: 0.14,
      baselineRouteParticipation: 0.55,
      depthChartRank: 1,
      gamesPlayed: 6,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.breakoutPhase).toBe("INFLECTION_SURGE");
    // 0.14 * 1.25 + 0.048
    expect(r.data.adjustedTargetShare).toBe(0.223);
    // 0.55 * 1.22 = 0.671
    expect(r.data.adjustedRouteParticipation).toBe(0.671);
    expect(r.data.postByeAccelerationBonusPp).toBe(4.8);
    expect(r.data.isPrimeBreakoutCandidate).toBe(true);
  });

  it("is a no-op read for a UDFA", () => {
    const r = evalRookieBreakoutCohort({
      rookieName: "Camp Filler",
      rookieDraftRound: "UDFA",
      currentWeekOfSeason: 12,
      hasHadByeWeek: true,
      isImmediatelyPostBye: false,
      baselineTargetShare: 0.03,
      baselineRouteParticipation: 0.2,
      depthChartRank: 6,
      gamesPlayed: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.breakoutPhase).toBe("LIMITED_ROLE");
    expect(r.data.adjustedTargetShare).toBe(0.03);
    expect(r.data.isPrimeBreakoutCandidate).toBe(false);
  });

  it("fails closed below the rookie games-played floor", () => {
    const r = evalRookieBreakoutCohort({
      rookieName: "P. Washington",
      rookieDraftRound: 1,
      currentWeekOfSeason: 2,
      hasHadByeWeek: false,
      isImmediatelyPostBye: false,
      baselineTargetShare: 0.14,
      baselineRouteParticipation: 0.55,
      depthChartRank: 1,
      gamesPlayed: 2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(">= 3 games played");
  });
});

describe("signals-bridge schematic: bye-week-defensive-installation", () => {
  it("compounds an elite coordinator's prep against an inexperienced quarterback", () => {
    const r = evalByeWeekDefensiveInstallation({
      defensiveCoordinatorName: "B. Flores",
      coordinatorPedigreeTier: "ELITE_ARCHITECT",
      daysOfPreparation: 12,
      opponentQbExperienceSeasons: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.extendedPrepActive).toBe(true);
    // -0.078 then -0.025 for the young QB = -0.103
    expect(r.data.opponentFirstHalfEpaTilt).toBe(-0.103);
    expect(r.data.opponentThirdDownTiltPp).toBe(-11.2);
    // -2.85 then -0.65
    expect(r.data.firstHalfTotalPointsTilt).toBe(-3.5);
    // 1.35 + 0.22
    expect(r.data.opponentTurnoverProbabilityMultiplier).toBe(1.57);
    expect(r.data.defensiveConfusionTier).toBe("MAXIMUM_CONFUSION");
  });

  it("is exactly neutral without extended prep", () => {
    const r = evalByeWeekDefensiveInstallation({
      defensiveCoordinatorName: "B. Flores",
      coordinatorPedigreeTier: "ELITE_ARCHITECT",
      daysOfPreparation: 6,
      opponentQbExperienceSeasons: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.extendedPrepActive).toBe(false);
    expect(r.data.opponentFirstHalfEpaTilt).toBe(0);
    expect(r.data.defensiveConfusionTier).toBe("NEUTRAL");
  });

  it("fails closed on an impossible prep window", () => {
    const r = evalByeWeekDefensiveInstallation({
      defensiveCoordinatorName: "B. Flores",
      coordinatorPedigreeTier: "ELITE_ARCHITECT",
      daysOfPreparation: 60,
      opponentQbExperienceSeasons: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("daysOfPreparation");
  });
});

describe("signals-bridge trench: offensive-line-continuity", () => {
  it("charges a missing starting tackle on sack rate and pressure advantage", () => {
    const r = evalOffensiveLineTrench({
      team: "SF",
      startingLinemenCount: 5,
      returningStartersFromPriorWeek: 4,
      backupTacklesStarting: 1,
      backupInteriorStarting: 0,
      teamPbwrPercent: 64.2,
      opponentPrwrPercent: 41.8,
      trailingThreeWeekContinuityScore: 0.9,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 4/5 = 0.8 continuity, minus a 0.15 tackle penalty halved = 0.725
    expect(r.data.continuityScore).toBe(0.725);
    // 22.4 raw differential minus a 2.3375 coordination deduction
    expect(r.data.trenchNetPressureAdvantagePp).toBe(20.06);
    // 1.85 + 0 + 0.275 * 1.2
    expect(r.data.sackRateTiltPp).toBe(2.18);
    expect(r.data.yardsBeforeContactTilt).toBe(-0.14);
    // -(0.0218 * 1.65) + 0.03 (advantage > 20) = -0.00597 -> -0.006
    expect(r.data.offensiveEpaTilt).toBe(-0.006);
    expect(r.data.leadRusherEfficiencyMultiplier).toBe(0.983);
  });

  it("keeps the sign on a full reshuffle", () => {
    const r = evalOffensiveLineTrench({
      team: "SF",
      startingLinemenCount: 5,
      returningStartersFromPriorWeek: 0,
      backupTacklesStarting: 2,
      backupInteriorStarting: 3,
      teamPbwrPercent: 48,
      opponentPrwrPercent: 58,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 0 - (0.30 + 0.30) * 0.5 = -0.3, floored at 0.1
    expect(r.data.continuityScore).toBe(0.1);
    expect(r.data.trenchNetPressureAdvantagePp).toBeLessThan(0);
    expect(r.data.sackRateTiltPp).toBeGreaterThan(0);
  });

  it("fails closed when more starters return than are on the line", () => {
    const r = evalOffensiveLineTrench({
      team: "SF",
      startingLinemenCount: 5,
      returningStartersFromPriorWeek: 6,
      backupTacklesStarting: 0,
      backupInteriorStarting: 0,
      teamPbwrPercent: 64.2,
      opponentPrwrPercent: 41.8,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("exceeds startingLinemenCount");
  });
});

describe("signals-bridge bio: injury-trajectory", () => {
  it("prices a questionable elite WR1 who went full practice Friday", () => {
    const r = evalInjuryTrajectory({
      wednesday: "FP",
      thursday: "LP",
      friday: "FP",
      officialStatus: "QUESTIONABLE",
      positionTier: "WR1_ELITE",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.estimatedPlayProbability).toBe(0.88);
    expect(r.data.trajectoryTrend).toBe("STATIC_HEALTHY");
    expect(r.data.spreadImpactPointsIfOut).toBe(2.25);
    // 2.25 * 0.35
    expect(r.data.marketOverreactionTiltPoints).toBe(0.79);
    expect(r.data.practiceReportsObserved).toBe(3);
    expect(r.data.readingKind).toBe("PROBABILITY");
  });

  it("reads a Thursday downgrade as an early warning", () => {
    const r = evalInjuryTrajectory({
      wednesday: "FP",
      thursday: "DNP",
      friday: "DNP",
      positionTier: "QB_STARTER",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.trajectoryTrend).toBe("DETERIORATING");
    expect(r.data.estimatedPlayProbability).toBe(0.18);
    expect(r.data.hasEarlyWarningDowngrade).toBe(true);
    expect(r.data.spreadImpactPointsIfOut).toBe(4.5);
  });

  it("fails closed when there is no report to read", () => {
    const r = evalInjuryTrajectory({ positionTier: "WR1_ELITE" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("nothing to read");
  });
});

describe("signals-bridge biomechanical: turf-surface-fatigue", () => {
  it("stacks weight, age and volume on slit-film turf", () => {
    const r = evalTurfSurfaceFatigue({
      playingSurface: "SLIT_FILM_TURF",
      playerWeightLbs: 225,
      playerAge: 29,
      baselineYardsPerCarry: 4.8,
      expectedTouches: 24,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // -0.34 base, -0.12 heavy, -0.10 veteran, -0.08 volume = -0.64
    expect(r.data.fourthQuarterYacTilt).toBe(-0.64);
    // 0.82 - 0.06 veteran
    expect(r.data.lateGameExplosiveRunDecayMultiplier).toBe(0.76);
    // 78 + 8 + 9 + 5
    expect(r.data.lowerBodySoftTissueFatigueIndex).toBe(100);
    // 4.8 - 0.64 * 0.45 = 4.512 -> 4.51
    expect(r.data.adjustedYardsPerCarry).toBe(4.51);
    expect(r.data.surfaceFrictionTier).toBe("HIGH_TRACTION_FATIGUE");
  });

  it("gives natural grass a positive YAC shift", () => {
    const r = evalTurfSurfaceFatigue({
      playingSurface: "HYBRID_GRASS",
      playerWeightLbs: 225,
      playerAge: 29,
      baselineYardsPerCarry: 4.8,
      expectedTouches: 24,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.surfaceFrictionTier).toBe("COMPLIANT_NATURAL");
    expect(r.data.fourthQuarterYacTilt).toBe(0.08);
    expect(r.data.lateGameExplosiveRunDecayMultiplier).toBe(1);
  });

  it("fails closed when a player is projected for zero touches", () => {
    const r = evalTurfSurfaceFatigue({
      playingSurface: "SLIT_FILM_TURF",
      playerWeightLbs: 225,
      playerAge: 29,
      baselineYardsPerCarry: 4.8,
      expectedTouches: 0,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("expectedTouches");
  });
});

// ============================================================================
// (f) top-level signal modules
// ============================================================================

/** The module's own documented worked case: strong occurrence, poor recovery. */
const underRecoveringTeam: TurnoverLuckInput = {
  team: "DET",
  defensivePlays: 1500,
  opponentDropbacks: 620,
  fumblesForced: 19,
  fumblesRecoveredByTeam: 5,
  interceptions: 11,
};

const overRecoveringTeam: TurnoverLuckInput = {
  team: "BUF",
  defensivePlays: 1500,
  opponentDropbacks: 600,
  fumblesForced: 20,
  fumblesRecoveredByTeam: 14,
  interceptions: 8,
};

describe("signals-bridge turnover-luck", () => {
  it("splits occurrence from recovery on the module's own worked case", () => {
    const r = evalTurnoverLuck({ turnoverLuckInput: underRecoveringTeam });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // occurrence is reported at face value against the measured league baseline
    expect(r.data.forcedFumbleRatePerPlay).toBeCloseTo(19 / 1500, 10);
    expect(r.data.forcedFumbleOverExpected).toBeCloseTo(19 / 1500 - 0.013817, 6);
    expect(r.data.interceptionOverExpected).toBeCloseTo(11 / 620 - 0.018666, 6);
    // recovery is shrunk hard toward the 0.463 league mean
    expect(r.data.recovery).not.toBeNull();
    if (r.data.recovery === null) return;
    expect(r.data.recovery.recoveryShare).toBeCloseTo(5 / 19, 10);
    expect(r.data.recovery.regressedRecoveryShare).toBeCloseTo(0.443, 3);
    // under-recovering => positive expected regression, sign preserved
    expect(r.data.recovery.recoveryShareOverExpected).toBeLessThan(0);
    expect(r.data.recovery.expectedRegressionTiltPoints).toBeCloseTo(15.38, 2);
    expect(r.data.readingKind).toBe("RATE");
  });

  it("gives a null recovery read, not a zero, below the forced-fumble floor", () => {
    const r = evalTurnoverLuck({
      turnoverLuckInput: { ...underRecoveringTeam, fumblesForced: 3, fumblesRecoveredByTeam: 1 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.recovery).toBeNull();
    expect(r.data.recoveryGaps).toHaveLength(1);
    expect(r.data.recoveryGaps[0]).toContain("recovery null");
    expect(r.data.forcedFumbleRatePerPlay).toBeCloseTo(3 / 1500, 10);
  });

  it("fails closed on a null kernel read rather than defaulting to zero", () => {
    const r = evalTurnoverLuck({
      turnoverLuckInput: { ...underRecoveringTeam, defensivePlays: 50 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("returned null");
    expect(r.reason).toContain("insufficient sample, not a zero");
  });

  it("fails closed when the bridge input claims more recoveries than forced fumbles", () => {
    const r = evalTurnoverLuck({
      turnoverLuckInput: { ...underRecoveringTeam, fumblesForced: 3, fumblesRecoveredByTeam: 4 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("exceeds fumblesForced");
  });
});

describe("signals-bridge expected-turnover-diff", () => {
  it("returns the signed home-minus-away regression differential", () => {
    const r = evalExpectedTurnoverDiff({
      home: { teamId: "MIA", input: underRecoveringTeam },
      away: { teamId: "BUF", input: overRecoveringTeam },
      options: { enabled: true },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // home ~ +15.38, away ~ -19.20 => ~ +34.58
    expect(r.data.expectedTurnoverDiffPoints).toBeCloseTo(34.58, 1);
    expect(r.data.enabled).toBe(true);
    expect(r.data.home).not.toBeNull();
    expect(r.data.away).not.toBeNull();
    expect(r.data.readingKind).toBe("SIGNED_TILT");
  });

  it("fails closed when the kernel flag is not explicitly enabled", () => {
    const r = evalExpectedTurnoverDiff({
      home: { teamId: "MIA", input: underRecoveringTeam },
      away: { teamId: "BUF", input: overRecoveringTeam },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("EXPECTED_TURNOVER_DIFF_ENABLED");
  });

  it("fails closed when one side has no recovery component", () => {
    const r = evalExpectedTurnoverDiff({
      home: { teamId: "MIA", input: { ...underRecoveringTeam, fumblesForced: 2, fumblesRecoveredByTeam: 0 } },
      away: { teamId: "BUF", input: overRecoveringTeam },
      options: { enabled: true },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("null");
  });
});

describe("signals-bridge opponent-adjusted-epa", () => {
  // A four-game chain: PIT-BAL, BAL-CIN, CIN-PIT, PIT-DET. Games per team are
  // PIT 3, BAL 2, CIN 2, DET 1, and the play counts are held constant so the
  // play-weighted league average is a plain mean of the eight dropback EPAs.
  //
  // The schedule SHAPE is the one the kernel's own test file proves converges
  // (its "converges within the default cap on a normal, well-connected
  // schedule" fixture). A balanced double round robin does NOT converge -- see
  // the explicit regression test at the bottom of this block, which pins that
  // measurement. Reaching the kernel through the bridge needs a fixture the
  // kernel can actually solve, so this block uses the solvable shape and the
  // block below pins the unsolvable one.
  const epaGames: TeamGameEpaSplit[] = [
    // PIT vs BAL: PIT posts 0.20 against a BAL defense that allows 0.00
    { team: "PIT", opponent: "BAL", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.2, offRushPlays: 25, offRushEpaPerPlay: 0.05, defDropbackPlays: 30, defDropbackEpaPerPlayAllowed: 0.0, defRushPlays: 25, defRushEpaPerPlayAllowed: 0.0 },
    { team: "BAL", opponent: "PIT", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.0, offRushPlays: 25, offRushEpaPerPlay: 0.0, defDropbackPlays: 30, defDropbackEpaPerPlayAllowed: 0.2, defRushPlays: 25, defRushEpaPerPlayAllowed: 0.05 },
    // BAL vs CIN
    { team: "BAL", opponent: "CIN", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.1, offRushPlays: 25, offRushEpaPerPlay: 0.02, defDropbackPlays: 30, defDropbackEpaPerPlayAllowed: 0.1, defRushPlays: 25, defRushEpaPerPlayAllowed: 0.02 },
    { team: "CIN", opponent: "BAL", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.1, offRushPlays: 25, offRushEpaPerPlay: 0.02, defDropbackPlays: 30, defDropbackEpaPerPlayAllowed: 0.1, defRushPlays: 25, defRushEpaPerPlayAllowed: 0.02 },
    // CIN vs PIT
    { team: "CIN", opponent: "PIT", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.0, offRushPlays: 25, offRushEpaPerPlay: 0.0, defDropbackPlays: 30, defDropbackEpaPerPlayAllowed: 0.2, defRushPlays: 25, defRushEpaPerPlayAllowed: 0.05 },
    { team: "PIT", opponent: "CIN", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.2, offRushPlays: 25, offRushEpaPerPlay: 0.05, defDropbackPlays: 30, defDropbackEpaPerPlayAllowed: 0.0, defRushPlays: 25, defRushEpaPerPlayAllowed: 0.0 },
    // PIT vs DET
    { team: "PIT", opponent: "DET", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.15, offRushPlays: 25, offRushEpaPerPlay: 0.03, defDropbackPlays: 30, defDropbackEpaPerPlayAllowed: 0.05, defRushPlays: 25, defRushEpaPerPlayAllowed: 0.01 },
    { team: "DET", opponent: "PIT", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.05, offRushPlays: 25, offRushEpaPerPlay: 0.01, defDropbackPlays: 30, defDropbackEpaPerPlayAllowed: 0.15, defRushPlays: 25, defRushEpaPerPlayAllowed: 0.03 },
  ];

  it("converges and returns the play-weighted league average for off dropback EPA", () => {
    const r = evalOpponentAdjustedEpa({
      games: epaGames,
      requestedTeams: ["PIT", "BAL", "CIN", "DET"],
      options: { minGames: 2 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.converged).toBe(true);
    expect(r.data.iterations).toBeGreaterThan(0);
    expect(r.data.iterations).toBeLessThan(100);
    // eight equal-play dropback rows summing to 0.80 EPA / 240 plays
    expect(r.data.leagueAverages?.offDropbackEpaPerPlay).toBeCloseTo(0.8 / 8, 9);
    expect(r.data.readingKind).toBe("SIGNED_TILT");
    // DET played one game, below the explicit minGames of 2
    expect(r.data.underSampledTeams).toEqual(["DET"]);
    expect(r.data.ratings.map((x) => x.team).sort()).toEqual(["BAL", "CIN", "PIT"]);
    const pit = r.data.ratings.find((x) => x.team === "PIT");
    const bal = r.data.ratings.find((x) => x.team === "BAL");
    const cin = r.data.ratings.find((x) => x.team === "CIN");
    expect(pit).toBeDefined();
    expect(bal).toBeDefined();
    expect(cin).toBeDefined();
    if (pit === undefined || bal === undefined || cin === undefined) return;
    expect(pit.games).toBe(3);
    // three games into a six-game linear fade with no external prior supplied
    expect(pit.priorWeightOffense).toBeCloseTo(0.498, 9);
    expect(pit.priorWeightDefense).toBeCloseTo(0.588, 9);
    // the best raw dropback offense stays positive through the opponent netting
    // AND the early-season shrinkage toward a league-neutral prior
    expect(pit.ratedOffDropbackEpaPerPlay).toBeGreaterThan(0);
    // NOT asserted: PIT.ratedOffDropbackEpaPerPlay vs BAL's. PIT and BAL post
    // IDENTICAL raw dropback output (0.20) and the kernel's whole point is that
    // BAL, having faced the tougher opposing offenses, is credited higher -- but
    // that comparison only holds on the PRE-shrinkage `adjOffDropbackEpaPerPlay`
    // field. The rated field is shrunk by a games-played-dependent weight
    // (0.498 at PIT's 3 games vs 0.664 at BAL's 2), so the ordering legitimately
    // inverts after shrinkage, and the bridge deliberately exposes only the
    // rated fields (the kernel's own admissibility contract names exactly those
    // four) so a caller cannot accidentally read a shrinkage-weighted number as
    // a like-for-like skill comparison.
    expect(bal.ratedOffDropbackEpaPerPlay).toBeGreaterThan(0);
    // BAL and CIN were interchangeable in the raw data (identical outputs, same
    // game count), so they must stay interchangeable after netting + shrinkage
    expect(cin.ratedOffDropbackEpaPerPlay).toBeCloseTo(bal.ratedOffDropbackEpaPerPlay, 6);
    // the ratings stay inside the legal EPA/play band the bridge enforces
    for (const rating of r.data.ratings) {
      expect(Math.abs(rating.ratedOffDropbackEpaPerPlay)).toBeLessThan(5);
      expect(Math.abs(rating.ratedDefRushEpaPerPlayAllowed)).toBeLessThan(5);
    }
  });

  it("refuses a truncated, unconverged solve rather than publishing a partial fit", () => {
    const r = evalOpponentAdjustedEpa({
      games: epaGames,
      requestedTeams: ["PIT"],
      options: { minGames: 2, maxIterations: 1 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("did NOT converge");
  });

  it("converges on a balanced double round robin once the additive gauge is pinned", () => {
    // Every row is a symmetric two-sided record and each team plays four games,
    // so the opponent-weight matrix is doubly stochastic. The kernel pins each
    // split's play-weighted mean to the raw league average, which removes the
    // constant mode under-relaxation cannot contract. A truncated fit is still
    // refused; this fixture is no longer truncated.
    const roundRobin: TeamGameEpaSplit[] = [
      { team: "A", opponent: "B", offDropbackPlays: 35, offDropbackEpaPerPlay: 0.2, offRushPlays: 30, offRushEpaPerPlay: 0.02, defDropbackPlays: 32, defDropbackEpaPerPlayAllowed: -0.1, defRushPlays: 33, defRushEpaPerPlayAllowed: 0.03 },
      { team: "B", opponent: "A", offDropbackPlays: 30, offDropbackEpaPerPlay: 0.05, offRushPlays: 33, offRushEpaPerPlay: -0.01, defDropbackPlays: 35, defDropbackEpaPerPlayAllowed: -0.2, defRushPlays: 30, defRushEpaPerPlayAllowed: -0.02 },
      { team: "A", opponent: "C", offDropbackPlays: 38, offDropbackEpaPerPlay: 0.24, offRushPlays: 28, offRushEpaPerPlay: 0.03, defDropbackPlays: 33, defDropbackEpaPerPlayAllowed: -0.12, defRushPlays: 31, defRushEpaPerPlayAllowed: 0.04 },
      { team: "C", opponent: "A", offDropbackPlays: 31, offDropbackEpaPerPlay: 0.02, offRushPlays: 34, offRushEpaPerPlay: -0.03, defDropbackPlays: 38, defDropbackEpaPerPlayAllowed: -0.24, defRushPlays: 28, defRushEpaPerPlayAllowed: -0.03 },
      { team: "B", opponent: "C", offDropbackPlays: 34, offDropbackEpaPerPlay: 0.07, offRushPlays: 31, offRushEpaPerPlay: 0.0, defDropbackPlays: 34, defDropbackEpaPerPlayAllowed: -0.02, defRushPlays: 32, defRushEpaPerPlayAllowed: 0.01 },
      { team: "C", opponent: "B", offDropbackPlays: 32, offDropbackEpaPerPlay: 0.0, offRushPlays: 35, offRushEpaPerPlay: -0.05, defDropbackPlays: 34, defDropbackEpaPerPlayAllowed: -0.07, defRushPlays: 31, defRushEpaPerPlayAllowed: 0.0 },
      { team: "A", opponent: "B", offDropbackPlays: 36, offDropbackEpaPerPlay: 0.18, offRushPlays: 29, offRushEpaPerPlay: 0.01, defDropbackPlays: 31, defDropbackEpaPerPlayAllowed: -0.08, defRushPlays: 34, defRushEpaPerPlayAllowed: 0.02 },
      { team: "B", opponent: "A", offDropbackPlays: 31, offDropbackEpaPerPlay: 0.04, offRushPlays: 34, offRushEpaPerPlay: -0.02, defDropbackPlays: 36, defDropbackEpaPerPlayAllowed: -0.18, defRushPlays: 29, defRushEpaPerPlayAllowed: -0.01 },
      { team: "A", opponent: "C", offDropbackPlays: 37, offDropbackEpaPerPlay: 0.22, offRushPlays: 29, offRushEpaPerPlay: 0.02, defDropbackPlays: 32, defDropbackEpaPerPlayAllowed: -0.1, defRushPlays: 33, defRushEpaPerPlayAllowed: 0.03 },
      { team: "C", opponent: "A", offDropbackPlays: 32, offDropbackEpaPerPlay: 0.01, offRushPlays: 33, offRushEpaPerPlay: -0.04, defDropbackPlays: 37, defDropbackEpaPerPlayAllowed: -0.22, defRushPlays: 29, defRushEpaPerPlayAllowed: -0.04 },
      { team: "B", opponent: "C", offDropbackPlays: 33, offDropbackEpaPerPlay: 0.06, offRushPlays: 32, offRushEpaPerPlay: -0.01, defDropbackPlays: 33, defDropbackEpaPerPlayAllowed: -0.01, defRushPlays: 34, defRushEpaPerPlayAllowed: 0.0 },
      { team: "C", opponent: "B", offDropbackPlays: 33, offDropbackEpaPerPlay: 0.03, offRushPlays: 34, offRushEpaPerPlay: -0.02, defDropbackPlays: 33, defDropbackEpaPerPlayAllowed: -0.06, defRushPlays: 32, defRushEpaPerPlayAllowed: 0.01 },
    ];
    const r = evalOpponentAdjustedEpa({
      games: roundRobin,
      requestedTeams: ["A", "B", "C"],
      options: { minGames: 4, maxIterations: 1000 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.converged).toBe(true);
    expect(r.data.iterations).toBeLessThan(1000);
    const a = r.data.ratings.find((x) => x.team === "A");
    const c = r.data.ratings.find((x) => x.team === "C");
    expect(a).toBeDefined();
    expect(c).toBeDefined();
    if (a === undefined || c === undefined) return;
    expect(a.ratedOffDropbackEpaPerPlay).toBeGreaterThan(c.ratedOffDropbackEpaPerPlay);
  });

  it("lists a below-minimum-games team as under-sampled instead of rating it zero", () => {
    // Same table, minGames raised to 3: only PIT (3 games) clears the floor.
    const r = evalOpponentAdjustedEpa({
      games: epaGames,
      requestedTeams: ["PIT", "BAL", "CIN", "DET"],
      options: { minGames: 3 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.underSampledTeams).toEqual(["BAL", "CIN", "DET"]);
    expect(r.data.ratings.map((x) => x.team)).toEqual(["PIT"]);
  });  it("fails closed on an empty table, an unknown team, and a negative play count", () => {
    expect(evalOpponentAdjustedEpa({ games: [], requestedTeams: ["PIT"] }).ok).toBe(false);

    const unknown = evalOpponentAdjustedEpa({
      games: epaGames,
      requestedTeams: ["XXX"],
      options: { minGames: 2 },
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reason).toContain("does not appear");

    const negative = evalOpponentAdjustedEpa({
      games: [{ ...(epaGames[0] as TeamGameEpaSplit), offDropbackPlays: -3 }],
      requestedTeams: ["PIT"],
      options: { minGames: 1 },
    });
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.reason).toContain("negative play count");
  });
});
