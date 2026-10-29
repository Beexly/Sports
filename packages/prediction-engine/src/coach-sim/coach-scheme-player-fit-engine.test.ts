import { describe, expect, it } from "vitest";
import {
  COACH_32_STAFF_PROFILES,
  computePassCoverageControlSurface,
  computeRbSchemeMatchupFit,
  computeSurfaceInjuryAndTrajectoryOverlay,
  computeTrenchPressureDecisionFit,
  computeWeightedEntropyPlayProbe,
  computeWrDbKinematicLeverageFit,
  evaluateClarusCoherenceRiskSuites,
  evaluateCoachSchemePlayerFitMatchup,
  evolvePlayCallPartitionWeights,
  getCoachStaffProfile,
} from "./coach-scheme-player-fit-engine.js";
import { assertCoachInputs } from "../public-baseline/fence.js";

describe("GSE Coach, Play-Call, Scheme & Player-Fit Reasoning Engine", () => {
  it("covers all 32 NFL coaching staffs with zero market/odds contamination", () => {
    expect(Object.keys(COACH_32_STAFF_PROFILES).length).toBe(32);
    for (const [team, profile] of Object.entries(COACH_32_STAFF_PROFILES)) {
      expect(profile.team).toBe(team);
      expect(profile.staffAggression).toBeGreaterThanOrEqual(0.51);
      expect(profile.staffAggression).toBeLessThanOrEqual(0.94);
      const nmfSum =
        profile.nmfArchetype.westCoastMotionPlayAction +
        profile.nmfArchetype.spreadRpoVertical +
        profile.nmfArchetype.powerGapPlayAction +
        profile.nmfArchetype.quickGameIsolationSpread;
      expect(nmfSum).toBeCloseTo(1.0, 4);
      expect(() => assertCoachInputs(profile as unknown as Record<string, unknown>)).not.toThrow();
    }
  });

  it("computes BDB 2027 WR Braking Z-score, VCR, KLD, and shell-matched YPRR (London vs SF Zone, Flowers vs CIN Slot)", () => {
    const sfDef = getCoachStaffProfile("SF").defenseScheme;
    const londonVsSf = computeWrDbKinematicLeverageFit(
      {
        wrWeightLbs: 215,
        wrBrakingDecelYdsPerSec2: -6.4,
        wrCutSpeedRetention: 0.86,
        wrVmaxYdsPerSec: 9.7,
        wrTauAccelSec: 1.22,
        wrClosingSpeedYdsPerSec: 8.8,
        dbClosingSpeedYdsPerSec: 7.4,
        initialCushionYards: 5.5,
        wrYprrVsMan: 1.57,
        wrYprrVsZone: 2.86,
        wrSlotSnapShare: 0.38,
      },
      sfDef,
    );
    expect(londonVsSf.massAdjustedBrakingZ).toBeGreaterThan(1.5);
    expect(londonVsSf.vectorControlRatingVcr).toBeGreaterThan(1.0);
    expect(londonVsSf.kinematicLeverageDeficitKld).toBeGreaterThan(0);
    expect(londonVsSf.shellMatchedYprrDelta).toBeGreaterThan(0.2);
    expect(londonVsSf.netPassingKinematicEpaDelta).toBeGreaterThan(0);

    const cinDef = getCoachStaffProfile("CIN").defenseScheme;
    const flowersVsCin = computeWrDbKinematicLeverageFit(
      {
        wrWeightLbs: 183,
        wrBrakingDecelYdsPerSec2: -6.8,
        wrCutSpeedRetention: 0.89,
        wrVmaxYdsPerSec: 10.1,
        wrTauAccelSec: 1.15,
        wrClosingSpeedYdsPerSec: 9.2,
        dbClosingSpeedYdsPerSec: 7.8,
        initialCushionYards: 6.0,
        wrSlotSnapShare: 0.82,
      },
      cinDef,
    );
    expect(flowersVsCin.slotFunnelBonusEpa).toBeGreaterThan(0.03);
  });

  it("computes BDB 2026 continuous Pass Coverage Control (PPCF) surface", () => {
    const ppcf = computePassCoverageControlSurface(
      { x: 35, y: 26.6 },
      1.1,
      [{ x: 26, y: 25, vx: 8.2, vy: 1.4, ax: 1.2, ay: 0.2 }],
      [{ x: 39, y: 31, vx: -4.1, vy: -2.0 }],
    );
    expect(ppcf.offensivePpcf).toBeGreaterThan(0.5);
    expect(ppcf.offensivePpcf + ppcf.defensivePpcf).toBeCloseTo(1.0, 2);
    expect(ppcf.openWindowAdvantage).toBeGreaterThan(0);
  });

  it("differentiates RB Zone vs Gap/Power scheme fit (Braelon Allen 4.77 vs Breece Hall 2.93 on NYJ zone runs)", () => {
    const nyjStaff = getCoachStaffProfile("NYJ");
    const defScheme = getCoachStaffProfile("TEN").defenseScheme;
    const allenFit = computeRbSchemeMatchupFit(
      { rbZoneYpc: 4.77, rbGapPowerYpc: 4.10, rbMissedTacklesForcedPerTouch: 0.24 },
      nyjStaff,
      defScheme,
    );
    const hallFit = computeRbSchemeMatchupFit(
      { rbZoneYpc: 2.93, rbGapPowerYpc: 4.10, rbMissedTacklesForcedPerTouch: 0.20 },
      nyjStaff,
      defScheme,
    );
    expect(allenFit.expectedSchemeBlendedYpc).toBeGreaterThan(hallFit.expectedSchemeBlendedYpc + 1.0);
    expect(allenFit.rushSchemeEpaDelta).toBeGreaterThan(hallFit.rushSchemeEpaDelta);
  });

  it("evaluates Trench Pressure Decision Time and all 8 ClarusC64 Coherence Risk suites", () => {
    const cinDef = getCoachStaffProfile("CIN").defenseScheme;
    const balTrench = computeTrenchPressureDecisionFit(
      {
        qbMeanTimeToThrowSec: 2.92,
        qbEpaWhenBlitzed: -0.11,
        qbEpaWithoutBlitz: 0.28,
        olPassBlockWinRate: 0.64,
      },
      "BAL",
      "CIN",
      cinDef,
    );
    expect(balTrench.blitzWeightedDropbackEpa).toBeCloseTo(0.143 * -0.11 + (1 - 0.143) * 0.28, 3);
    expect(balTrench.quickPressureHeldTaxEpa).toBeLessThan(0);

    const coherence = evaluateClarusCoherenceRiskSuites({
      redZonePlaycallCoherenceRisk: 0.72,
      routeTimingCoherenceRisk: 0.68,
      passProtectionCoherenceRisk: 0.75,
    });
    expect(coherence.elevatedRiskSuites.length).toBe(3);
    expect(coherence.scriptCollapseHazard).toBe(true);
    expect(coherence.coherenceEpaAdjustment).toBeLessThan(0);
  });

  it("computes grass-to-turf surface switching hazard, Biomechanical FSM, and full matchup synthesis", () => {
    const bio = computeSurfaceInjuryAndTrajectoryOverlay({
      teamHomeSurface: "grass",
      gameVenueSurface: "turf",
      recent3WeekWorkloadRatio: 1.24,
      highSpeedCutCountPerGame: 22,
      restDays: 6,
    });
    expect(bio.surfaceSwitchActive).toBe(true);
    expect(bio.turfHazardMultiplier).toBeGreaterThan(1.25);
    expect(bio.biomechanicalFsmState).toBe("COMPENSATORY_DECEL");

    const synthesis = evaluateCoachSchemePlayerFitMatchup({
      homeTeam: "BAL",
      awayTeam: "CIN",
      homeInjuryDropOffPoints: 2.0,
      awayInjuryDropOffPoints: 0.5,
    });
    expect(synthesis.homeFourthDownWpEdge).toBeGreaterThan(synthesis.awayFourthDownWpEdge);
    expect(synthesis.pureFootballExpectedMarginHome).toBeGreaterThan(0);
    expect(synthesis.belichickCounterInstallHome.length).toBeGreaterThan(0);
    expect(() => assertCoachInputs(synthesis as unknown as Record<string, unknown>)).not.toThrow();
  });

  it("evaluates CUDA weighted-entropy play-call coverage probing and stagnation-adaptive evolutionary weights (kernel.cu)", () => {
    const probe = computeWeightedEntropyPlayProbe({
      exactLeverageMatchesP: 2,
      partialDisplacementMatchesQ: 1,
      bucketCounts14: [12, 18, 25, 30, 22, 16, 14, 10, 8, 6, 4, 3, 2, 1],
    });
    // m(2, 1) = floor(-0.5*4 + 5.5*2 + 1) = floor(-2 + 11 + 1) = 10
    expect(probe.partitionIndexM).toBe(10);
    expect(probe.weightedEntropyScore).toBeGreaterThan(3.0);
    expect(probe.prefersImmediateResolutionSingleton).toBe(true);
    expect(probe.diagnosticInformationGainEpaBonus).toBeGreaterThan(0.02);

    const singleton = computeWeightedEntropyPlayProbe({
      exactLeverageMatchesP: 4,
      partialDisplacementMatchesQ: 0,
      bucketCounts14: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    });
    expect(singleton.partitionIndexM).toBe(13);
    expect(singleton.weightedEntropyScore).toBe(Number.MAX_SAFE_INTEGER);

    const evolved = evolvePlayCallPartitionWeights({
      parentAWeights14: Array(14).fill(1.0),
      parentBWeights14: Array(14).fill(2.0),
      crossoverPoint: 7,
      generation: 50,
      maxGenerations: 200,
      stagnantGenerations: 110,
      initialMutationRate: 0.12,
      finalMutationRate: 0.02,
      mutationStrength: 0.5,
      uniformDraws14: Array(14).fill(0.05),
      standardNormalPerturbations14: Array(14).fill(1.0),
    });
    // Stagnation > 100 boosts by 1.2 * 1.5 = 1.8x, capped at 0.20
    expect(evolved.effectiveMutationRate).toBeCloseTo(Math.min(0.20, 0.095 * 1.8), 3);
    expect(evolved.evolvedWeights14[0]).toBeCloseTo(1.5, 4);
    expect(evolved.evolvedWeights14[10]).toBeCloseTo(2.5, 4);
  });
});
