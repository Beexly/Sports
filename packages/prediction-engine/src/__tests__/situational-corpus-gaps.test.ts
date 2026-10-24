import { describe, it, expect } from "vitest";
import {
  evaluateDecisionTimeRepricing,
  evaluatePreventDefenseRegime,
  evaluateCompoundScheduleFatigueSpot,
  evaluateDomeColdWindTransition,
  parseBetSlipMetadata,
  evaluateTimeoutPreserveVsIceValue,
  evaluateCoachChallengeEV,
  evaluateEndOfHalfClockBoundary,
  NGS_LEAGUE_AVG_SEPARATION,
  computeNgsCpoePercentagePoints,
  computeNgsYacoe,
  computeNgsRyoe,
  computeBdbContextXComp,
  computeGhostDefenderDensity,
  evaluateReceiverSeparationResidual,
  evaluateBdb2027SubjectTrackingGate,
  evaluatePreSnapMotionAndCoveragePrior,
  evaluateRouteCoverageInteractionResidual,
  computePropFinderRatingExact,
} from "../index.js";

describe("Stream 4 & Stream 11: Situational Corpus Gaps & Reconstructed NFL Equations", () => {
  it("evaluates Decision-Time Repricing, Prevent Defense, Compound Schedule Fatigue, Dome Cold/Wind, and Bet Slip Parser", () => {
    const repricing = evaluateDecisionTimeRepricing({
      openFairProb: 0.52,
      decisionFairProb: 0.55,
      modelTrueProb: 0.59,
    });
    expect(repricing.action).toBe("PUBLISH_LIVE_EDGE");
    expect(repricing.edgeVsDecisionLine).toBeCloseTo(0.04, 4);

    const prevent = evaluatePreventDefenseRegime(17, 300);
    expect(prevent.preventActive).toBe(true);
    expect(prevent.underneathCompletionLift).toBeGreaterThan(0);

    const compound = evaluateCompoundScheduleFatigueSpot({
      consecutiveRoadGames: 2,
      priorGameOvertimeOrMnf: true,
      timeZonesCrossed: 3,
      restDaysDelta: -3,
    });
    expect(compound.compoundFatigueActive).toBe(true);
    expect(compound.pointSpreadPenalty).toBeLessThan(-2.0);

    const domeCold = evaluateDomeColdWindTransition({
      isDomeTeamOnRoadOutdoors: true,
      temperatureF: 25,
      windMph: 22,
    });
    expect(domeCold.transitionActive).toBe(true);
    expect(domeCold.totalPointsDelta).toBeLessThan(-3.0);

    const parsedSlip = parseBetSlipMetadata(
      "NFL Kansas City Chiefs -3.5 -110 SGP 1.5u",
    );
    expect(parsedSlip.americanOdds).toBe(-110);
    expect(parsedSlip.lineValue).toBe(-3.5);
    expect(parsedSlip.isSameGameParlay).toBe(true);
  });

  it("evaluates 4th-Down Tactical Extensions (Timeout Preserve vs Ice, Challenge EV, End-of-Half Clock Boundary)", () => {
    const timeout = evaluateTimeoutPreserveVsIceValue({
      fieldGoalDistanceYards: 53,
      halfSecondsRemaining: 65,
      scoreDifferential: -3,
      timeoutsRemaining: 2,
    });
    expect(timeout.recommendation).toBe("PRESERVE_TIMEOUT");
    expect(timeout.netPreserveAdvantageWp).toBeGreaterThan(0.01);

    const challenge = evaluateCoachChallengeEV({
      callCategory: "BOUNDARY_CATCH",
      winProbSwingIfOverturned: 0.14,
      quarter: 3,
      halfSecondsRemaining: 180,
      scoreDifferential: -4,
    });
    expect(challenge.shouldChallenge).toBe(true);
    expect(challenge.expectedNetWp).toBeGreaterThan(0.01);

    const clock = evaluateEndOfHalfClockBoundary({
      yardline100: 28,
      halfSecondsRemaining: 95,
      offenseTimeouts: 1,
      receivesSecondHalfKickoff: true,
    });
    expect(clock.doubleDipAvailable).toBe(true);
    expect(clock.optimalClockRunoffSeconds).toBeGreaterThan(50);
  });

  it("verifies Stream 11 Universal Handoff Reconstructed NFL Equations & Empirical Guards", () => {
    expect(NGS_LEAGUE_AVG_SEPARATION).toBeCloseTo(2.9866993, 6);
    expect(computeNgsYacoe(7.4, 4.2)).toBeCloseTo(3.2, 4);
    expect(computeNgsRyoe(8.5, 4.1)).toBeCloseTo(4.4, 4);
    expect(computeNgsCpoePercentagePoints(22, 30, 19.5)).toBeCloseTo(8.3333, 3);

    const xComp = computeBdbContextXComp({
      separationAtPassYards: 3.8,
      passLengthAirYards: 12,
      down: 2,
      yardsToGo: 7,
      yardline100: 55,
    });
    expect(xComp.depthSensitive).toBe(true);
    expect(xComp.xComp).toBeGreaterThan(0.5);

    const ghost = computeGhostDefenderDensity(65, 26.65, 55);
    expect(ghost).toBeGreaterThan(0);

    const sepLift = evaluateReceiverSeparationResidual({
      avgSeparationYards: 3.9866993,
      avgDepthOfTargetYards: 9.71,
      position: "TE",
      avgCushionYards: 6.2,
    });
    expect(sepLift.separationOverLeagueBaseline).toBeCloseTo(1.0, 3);
    expect(sepLift.expectedCatchRateDelta).toBeCloseTo(0.0645, 3);
    expect(sepLift.cushionWeightApplied).toBe(0);

    const bdbGuard = evaluateBdb2027SubjectTrackingGate({
      trackedPlayersInPlay: 3,
      receiverSpeedAtPassYps: 5.17,
    });
    expect(bdbGuard.geometricSeparationAllowed).toBe(false);
    expect(bdbGuard.subjectKinematicsAllowed).toBe(true);

    const motionGate = evaluatePreSnapMotionAndCoveragePrior({
      inMotionAtBallSnap: true,
      down: 3,
      yardsToGo: 6,
    });
    expect(motionGate.impliedPassProbability).toBeCloseTo(0.9994, 4);
    expect(motionGate.manCoveragePrior).toBeCloseTo(0.425, 3);

    const routeCell = evaluateRouteCoverageInteractionResidual("COVER_2_ZONE", "CORNER");
    expect(routeCell.expectedSeparationResidualYards).toBeCloseTo(2.29, 2);
    expect(routeCell.unregularisedRouteYoeAfterCoverage).toBeCloseTo(0.054, 3);
    expect(routeCell.isLeverageRouteSurvivor).toBe(false);

    const pf = computePropFinderRatingExact({
      gameTotalScore: 80,
      matchupScore: 75,
      l5Hits: 4,
      l5Sample: 5,
      l5AvgScore: 70,
      seasonAvgScore: 65,
      seasonHits: 18,
      seasonSample: 25,
      bestPriceAmerican: -115,
    });
    expect(pf.pfRating).toBeCloseTo(74.3, 3);
    expect(pf.impliedProbFromBestPrice).toBeCloseTo(115 / 215, 3);
  });
});
