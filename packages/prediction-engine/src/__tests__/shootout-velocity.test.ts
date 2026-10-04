import { describe, it, expect } from "vitest";
import {
  calculateBilateralPli,
  calculateRivalryFactor,
  computeGameScriptUrgency,
  computeShootoutVelocityIndex,
  type ShootoutVelocityInput
} from "../signals/situational/shootout-velocity-index";
import {
  calculateWopr,
  calculatePocketCollapseProb,
  calculateDuressFunnelRatio,
  computeCeilingFunnelScore,
  type ReceiverMetrics,
  type MatchupDuressContext
} from "../signals/props/alpha-target-ceiling";

describe("Shootout Velocity Index (SVI) Engine", () => {
  it("computes bilateral harmonic mean PLI enforcing mutual stakes", () => {
    expect(calculateBilateralPli(0.30, 0.0)).toBe(0.0);
    const pli = calculateBilateralPli(0.30, 0.30);
    expect(pli).toBeCloseTo(0.30, 3);
  });

  it("amplifies in-state geographic rivalry for Battle of Texas", () => {
    const rInState = calculateRivalryFactor(true, false, 240);
    const rFar = calculateRivalryFactor(false, false, 1200);
    expect(rInState).toBeGreaterThan(rFar);
    expect(rInState).toBeGreaterThanOrEqual(1.50);
  });

  it("ranks Cowboys vs Texans as top shootout on the slate", () => {
    const cowboysTexans: ShootoutVelocityInput = {
      deltaPlayoffsTeamA: 0.28, deltaPlayoffsTeamB: 0.31,
      isInState: true, isDivisional: false, distanceMiles: 240,
      proeTeamA: 0.06, proeTeamB: 0.05,
      fourthDownAggressionA: 1.25, fourthDownAggressionB: 1.20,
      overUnder: 49.5, spread: 2.5, isDome: true, windMph: 0,
      secPerSnapA: 25.8, secPerSnapB: 25.5,
      explosivePassRateA: 0.14, explosivePassRateB: 0.13,
      passFunnelRatingA: 1.2, passFunnelRatingB: 1.1,
      wr1TargetShareA: 0.32, wr2TargetShareA: 0.19,
      wr1TargetShareB: 0.30, wr2TargetShareB: 0.20
    };

    const res = computeShootoutVelocityIndex(cowboysTexans);
    expect(res.sviScore).toBeGreaterThanOrEqual(95.0);
    expect(res.isTopShootout).toBe(true);
    expect(res.gsuIndex).toBeGreaterThanOrEqual(70.0);
  });
});

describe("Alpha WR Target Ceiling & Duress Funnel Engine", () => {
  it("calculates WOPR accurately matching empirical benchmarks", () => {
    // CeeDee Lamb: 32% TS, 44% AY -> WOPR = 1.5*0.32 + 0.7*0.44 = 0.788
    const wopr = calculateWopr(0.32, 0.44);
    expect(wopr).toBeCloseTo(0.788, 3);
  });

  it("identifies CeeDee Lamb under duress vs Houston as an Alpha Target Monopoly", () => {
    const lamb: ReceiverMetrics = {
      playerId: "lamb", name: "CeeDee Lamb", team: "DAL",
      targetShare: 0.32, airYardShare: 0.44, firstReadShare: 0.38,
      tprr: 0.32, routeParticipation: 0.96, adot: 8.8, redZoneShare: 0.35
    };

    const houstonPassRush: MatchupDuressContext = {
      oppTeam: "HOU", edgePrwr: 0.28, otPbwr: 0.62, blitzRate: 0.32,
      qbTimeToThrow: 2.58, teamProjectedDropbacks: 44, spread: 2.5, teamHhi: 0.18
    };

    const res = computeCeilingFunnelScore(lamb, houstonPassRush);
    expect(res.cfs).toBeGreaterThanOrEqual(80.0);
    expect(res.isAlphaMonopoly).toBe(true);
    expect(res.duressFunnelRatio).toBeGreaterThan(1.30);
  });
});
