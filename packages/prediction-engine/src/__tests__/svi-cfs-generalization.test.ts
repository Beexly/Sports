import { describe, it, expect } from "vitest";
import {
  computeShootoutVelocityIndex,
  type ShootoutVelocityInput,
  calculateBilateralPli
} from "../signals/situational/shootout-velocity-index";
import {
  computeCeilingFunnelScore,
  type ReceiverMetrics,
  type MatchupDuressContext
} from "../signals/props/alpha-target-ceiling";

describe("SVI & CFS Multi-Game Generalization Suite (Anti-Overfitting)", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. SVI Generalization: Testing across distinct game archetypes
  // ───────────────────────────────────────────────────────────────────────────

  it("scores low (< 20) for high-wind, low-total, slow outdoor sludge games", () => {
    // Archetype: Cleveland @ Pittsburgh in 28mph wind, 18 deg F, low total
    const sludgeGame: ShootoutVelocityInput = {
      deltaPlayoffsTeamA: 0.05,
      deltaPlayoffsTeamB: 0.04,
      isInState: false,
      isDivisional: true,
      distanceMiles: 135.0,
      proeTeamA: -0.08,
      proeTeamB: -0.10,
      fourthDownAggressionA: 0.85,
      fourthDownAggressionB: 0.85,
      overUnder: 36.5,
      spread: 2.5,
      isDome: false,
      windMph: 28.0,
      secPerSnapA: 30.5,
      secPerSnapB: 31.0,
      explosivePassRateA: 0.04,
      explosivePassRateB: 0.05,
      passFunnelRatingA: -0.15,
      passFunnelRatingB: -0.18,
      wr1TargetShareA: 0.18,
      wr2TargetShareA: 0.14,
      wr1TargetShareB: 0.19,
      wr2TargetShareB: 0.15,
    };

    const res = computeShootoutVelocityIndex(sludgeGame);
    expect(res.sviScore).toBeLessThan(20.0);
    expect(res.isTopShootout).toBe(false);
  });

  it("scores moderate (35 to 65) for standard baseline NFL regular season games", () => {
    // Archetype: Standard outdoor Sunday 1pm game with average conditions
    const baselineGame: ShootoutVelocityInput = {
      deltaPlayoffsTeamA: 0.12,
      deltaPlayoffsTeamB: 0.14,
      isInState: false,
      isDivisional: false,
      distanceMiles: 650.0,
      proeTeamA: 0.01,
      proeTeamB: -0.01,
      fourthDownAggressionA: 1.05,
      fourthDownAggressionB: 1.00,
      overUnder: 44.5,
      spread: -3.0,
      isDome: false,
      windMph: 6.0,
      secPerSnapA: 27.2,
      secPerSnapB: 27.5,
      explosivePassRateA: 0.085,
      explosivePassRateB: 0.080,
      passFunnelRatingA: 0.02,
      passFunnelRatingB: -0.01,
      wr1TargetShareA: 0.24,
      wr2TargetShareA: 0.18,
      wr1TargetShareB: 0.23,
      wr2TargetShareB: 0.17,
    };

    const res = computeShootoutVelocityIndex(baselineGame);
    expect(res.sviScore).toBeGreaterThanOrEqual(35.0);
    expect(res.sviScore).toBeLessThanOrEqual(65.0);
    expect(res.isTopShootout).toBe(false);
  });

  it("scores high (>= 85) for dome shootouts with rapid pace and playoff leverage", () => {
    // Archetype: In-state dome shootout (Dallas @ Houston)
    const domeShootout: ShootoutVelocityInput = {
      deltaPlayoffsTeamA: 0.32,
      deltaPlayoffsTeamB: 0.35,
      isInState: true,
      isDivisional: false,
      distanceMiles: 240.0,
      proeTeamA: 0.08,
      proeTeamB: 0.06,
      fourthDownAggressionA: 1.25,
      fourthDownAggressionB: 1.20,
      overUnder: 49.5,
      spread: -1.5,
      isDome: true,
      windMph: 0.0,
      secPerSnapA: 23.5,
      secPerSnapB: 24.2,
      explosivePassRateA: 0.12,
      explosivePassRateB: 0.11,
      passFunnelRatingA: 0.14,
      passFunnelRatingB: 0.12,
      wr1TargetShareA: 0.32,
      wr2TargetShareA: 0.20,
      wr1TargetShareB: 0.28,
      wr2TargetShareB: 0.21,
    };

    const res = computeShootoutVelocityIndex(domeShootout);
    expect(res.sviScore).toBeGreaterThanOrEqual(85.0);
    expect(res.isTopShootout).toBe(true);
  });

  it("penalizes extreme blowouts (|spread| >= 16.5) despite high totals", () => {
    // Archetype: 17.5-point favorite; second half pace slows to run out the clock
    const blowoutGame: ShootoutVelocityInput = {
      deltaPlayoffsTeamA: 0.15,
      deltaPlayoffsTeamB: 0.02, // One team essentially out of race
      isInState: false,
      isDivisional: false,
      distanceMiles: 800.0,
      proeTeamA: 0.05,
      proeTeamB: -0.05,
      fourthDownAggressionA: 1.10,
      fourthDownAggressionB: 0.90,
      overUnder: 48.0,
      spread: -17.5, // Extreme spread
      isDome: true,
      windMph: 0.0,
      secPerSnapA: 25.0,
      secPerSnapB: 28.0,
      explosivePassRateA: 0.10,
      explosivePassRateB: 0.06,
      passFunnelRatingA: 0.05,
      passFunnelRatingB: 0.00,
      wr1TargetShareA: 0.25,
      wr2TargetShareA: 0.18,
      wr1TargetShareB: 0.20,
      wr2TargetShareB: 0.14,
    };

    const res = computeShootoutVelocityIndex(blowoutGame);
    expect(res.sviScore).toBeLessThan(75.0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CFS Generalization: Testing across receiver roles & duress conditions
  // ───────────────────────────────────────────────────────────────────────────

  const highPressureCtx: MatchupDuressContext = {
    oppTeam: "HOU",
    edgePrwr: 0.28,
    otPbwr: 0.62,
    blitzRate: 0.35,
    qbTimeToThrow: 2.38,
    teamProjectedDropbacks: 42,
    spread: 2.5,
    teamHhi: 0.19,
  };

  it("elevates Alpha underneath/intermediate WRs under fierce pass rush (CeeDee archetype)", () => {
    const alphaSlot: ReceiverMetrics = {
      playerId: "wr_alpha",
      name: "Alpha Receiver",
      team: "DAL",
      targetShare: 0.32,
      airYardShare: 0.38,
      firstReadShare: 0.40,
      tprr: 0.32,
      routeParticipation: 0.94,
      adot: 8.2, // Underneath/intermediate safety blanket
      redZoneShare: 0.33,
    };

    const cfs = computeCeilingFunnelScore(alphaSlot, highPressureCtx);
    expect(cfs.cfs).toBeGreaterThanOrEqual(80.0);
    expect(cfs.isAlphaMonopoly).toBe(true);
    expect(cfs.duressFunnelRatio).toBeGreaterThan(1.30);
  });

  it("destroys deep-threat vertical receivers under fierce pass rush (TTP collapse)", () => {
    const deepFieldStretcher: ReceiverMetrics = {
      playerId: "wr_deep",
      name: "Deep Field Stretcher",
      team: "DAL",
      targetShare: 0.16,
      airYardShare: 0.34,
      firstReadShare: 0.14,
      tprr: 0.16,
      routeParticipation: 0.85,
      adot: 16.5, // Takes 3.0s+ to develop, QB hit at 2.38s
      redZoneShare: 0.10,
    };

    const cfs = computeCeilingFunnelScore(deepFieldStretcher, highPressureCtx);
    expect(cfs.cfs).toBeLessThan(35.0);
    expect(cfs.isAlphaMonopoly).toBe(false);
    expect(cfs.duressFunnelRatio).toBeLessThan(1.0);
  });

  it("relegates ancillary WR3s with low target share to sub-15 CFS", () => {
    const wr3: ReceiverMetrics = {
      playerId: "wr3",
      name: "Ancillary WR3",
      team: "DAL",
      targetShare: 0.08,
      airYardShare: 0.10,
      firstReadShare: 0.07,
      tprr: 0.10,
      routeParticipation: 0.55,
      adot: 9.0,
      redZoneShare: 0.05,
    };

    const cfs = computeCeilingFunnelScore(wr3, highPressureCtx);
    expect(cfs.cfs).toBeLessThan(15.0);
    expect(cfs.isAlphaMonopoly).toBe(false);
  });
});
