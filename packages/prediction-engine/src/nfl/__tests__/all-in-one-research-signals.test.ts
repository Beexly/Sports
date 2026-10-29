import { describe, it, expect } from "vitest";
import {
  computeCatchableBallAndPlacementEdge,
  evaluateTargetFunnelMatchup,
  computeMissedTackleYacAdjustment,
  computeMinimaxSequencePenalty,
  computeFloresVarianceAndSimPressureIndex,
  computeTrueOneOnOneTrenchIsolation,
  computeGoalLineAnytimeTdEquity,
  validateDfsTournamentLineupCrackingTheCode,
} from "../all-in-one-research-signals";

describe("2026 All-In-One Research & Human-Charted Analytics Engine", () => {
  it("computes QB Catchable Ball Rate (CTBL%), Open Target Rate, Pickable Pass Rate, and Drop-Luck Regression", () => {
    const jordanLove = {
      team: "GB",
      qb: "J.Love",
      chartedPassAttempts: 285,
      aimedPassAttempts: 278,
      catchableBallRateRawPct: 66.7,
      catchableBallRateAimedPct: 68.3,
      openTargetRatePct: 78.8,
      pickablePassRatePct: 3.51,
      receiverDropRatePct: 10.5,
      inPocketCatchablePct: 70.4,
      outOfPocketCatchablePct: 58.0,
      pressureToSackRatePct: 16.5,
      qbFaultSackSharePct: 18.0,
      outOfPocketPassSharePct: 12.6,
    };

    const bryceYoung = {
      team: "CAR",
      qb: "B.Young",
      chartedPassAttempts: 244,
      aimedPassAttempts: 218,
      catchableBallRateRawPct: 58.6,
      catchableBallRateAimedPct: 65.6,
      openTargetRatePct: 90.4,
      pickablePassRatePct: 1.64,
      receiverDropRatePct: 4.9,
      inPocketCatchablePct: 66.2,
      outOfPocketCatchablePct: 61.0,
      pressureToSackRatePct: 24.5,
      qbFaultSackSharePct: 28.0,
      outOfPocketPassSharePct: 19.2,
    };

    const res = computeCatchableBallAndPlacementEdge(jordanLove, bryceYoung);
    expect(res.aimedCatchableDeltaPp).toBeCloseTo(2.7, 1);
    expect(res.dropLuckRegressionBonusPts).toBeGreaterThan(0.2);
    expect(res.homeArchetype).toBe("IN_POCKET_MANIPULATOR");
    expect(res.awayArchetype).toBe("SCRAMBLE_CREATOR");
  });

  it("classifies defensive target funnels and separates pressure-forced checkdowns from coverage shell design", () => {
    const gbFunnel = evaluateTargetFunnelMatchup({
      wrTargetShareAllowedPct: 65.7,
      teTargetShareAllowedPct: 18.0,
      rbTargetShareAllowedPct: 16.3,
      proeAllowedPct: 26.6,
      defBlitzRatePct: 24.0,
    });
    expect(gbFunnel.classification).toBe("WR_PERIMETER_FUNNEL");
    expect(gbFunnel.boostedPositionGroup).toBe("WR");
    expect(gbFunnel.targetShareMultiplier).toBeGreaterThan(1.05);

    const detFunnel = evaluateTargetFunnelMatchup({
      wrTargetShareAllowedPct: 55.1,
      teTargetShareAllowedPct: 30.0,
      rbTargetShareAllowedPct: 14.4,
      proeAllowedPct: 29.3,
      defBlitzRatePct: 31.0,
    });
    expect(detFunnel.classification).toBe("TE_MIDDLE_SEAM_FUNNEL");
    expect(detFunnel.boostedPositionGroup).toBe("TE");

    const miaFunnel = evaluateTargetFunnelMatchup({
      wrTargetShareAllowedPct: 53.0,
      teTargetShareAllowedPct: 22.9,
      rbTargetShareAllowedPct: 24.1,
      proeAllowedPct: 34.7,
      defBlitzRatePct: 32.5,
    });
    expect(miaFunnel.classification).toBe("RB_CHECKDOWN_FUNNEL");
    expect(miaFunnel.primaryCause).toBe("PRESSURE_FORCED_CHECKDOWNS");
  });

  it("evaluates PFR missed tackles, Minimax play-call serial correlation, Flores variance, 1v1 trench, Goal-Line TDs, and 34,856-lineup DFS rules", () => {
    const detTackling = computeMissedTackleYacAdjustment(12);
    const denTackling = computeMissedTackleYacAdjustment(56);
    expect(detTackling.yacMultiplier).toBeLessThan(0.92);
    expect(denTackling.yacMultiplier).toBeGreaterThan(1.08);

    const minimax = computeMinimaxSequencePenalty({
      neutralPassRatePct: 48.2,
      secondAndLongRunAfterIncompletePct: 54.5,
      lag1PlayTypeAutocorrelation: -0.16,
    });
    expect(minimax.isPredictableSequencer).toBe(true);
    expect(minimax.epaPerPlayPenalty).toBeLessThan(0);

    const flores = computeFloresVarianceAndSimPressureIndex({
      defEpaRank: 1,
      defSuccessRateRank: 9,
      simulatedPressureDropOutRatePct: 22.4,
    });
    expect(flores.isBoomVarianceDefense).toBe(true);
    expect(flores.teTargetSuppressionFactor).toBeLessThan(0.95);

    const trench = computeTrueOneOnOneTrenchIsolation({
      defUnblitzedFourManDisruptionRatePct: 21.5,
      offOlPassBlockSackAllowedPct: 8.8,
    });
    expect(trench.isolatedTrenchEdgeScore).toBeGreaterThan(0);
    expect(trench.sackProbAdjustment).toBeGreaterThan(0);

    const tdEq = computeGoalLineAnytimeTdEquity({
      expectedTeamTotalPts: 25.5,
      playerInside5CarryShare: 0.72,
      playerRedZoneTargetShare: 0.14,
      teamInside5RushPlaySharePct: 62.0,
    });
    expect(tdEq.expectedRushTds).toBeGreaterThan(0.45);
    expect(tdEq.anytimeTdProb).toBeGreaterThan(0.42);

    const dfsCheck = validateDfsTournamentLineupCrackingTheCode({
      qbSalary: 6400,
      stackedPassCatcherRoles: ["WR1", "TE1"],
      hasSecondaryCorrelatedGamePair: true,
      sub10PctOwnedSkillPlayersCount: 2,
      flexPosition: "RB",
      primaryStackGameTotal: 46.5,
    });
    expect(dfsCheck.isValidGppBuild).toBe(true);
    expect(dfsCheck.complianceScore).toBe(100);
  });
});
