import { describe, expect, it } from "vitest";
import {
  americanToImpliedProb,
  computeBoundedLogitTdAndAeroDrag,
  computeDynamicKickoff35HiddenYardageEp,
  debiasExpertProjectionAndScoreStacks,
  EAGER_ERICKSON_STABILITY_R,
  evaluateLiveCorpusPlaybookAnd4BookBundle,
  evaluateLivePlaybookAndSplitFieldMatchup,
  priceOverdispersedNegativeBinomialProp,
  shrinkPlayerMetricByStability,
  type DefenseFrontFamily,
  type OffensePlaybookFamily,
} from "../nfl/live-corpus-playbook-and-4book-intelligence.js";
import {
  computePreProjectionAndSimulationConditionedOverlay,
  PROBABILITY_MOVEMENT_CAP,
  runMasterSituationalReasoningOverlay,
} from "../nfl/master-situational-reasoning-aggregator.js";
import { computeDynamicKickoff35HiddenYardageEp as specialTeamsKickoff35 } from "../nfl/osf-special-teams-ep-wp-and-cv.js";

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleNormal(rng: () => number): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function samplePoisson(rng: () => number, lambda: number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng();
  } while (p > l);
  return k - 1;
}

function sampleGamma(rng: () => number, shape: number): number {
  if (shape < 1) {
    return sampleGamma(rng, shape + 1) * Math.pow(Math.max(1e-9, rng()), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const z = sampleNormal(rng);
    const v = Math.pow(1 + c * z, 3);
    if (v <= 0) continue;
    const u = rng();
    if (u < 1 - 0.0331 * z ** 4 || Math.log(u) < 0.5 * z ** 2 + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

describe("Live Corpus Playbook, Split-Field & 4-Book/7-Paper Intelligence", () => {
  it("evaluates all 7x7 FootballXOs offensive vs defensive front combinations and Split-Field checks", () => {
    const offenses: OffensePlaybookFamily[] = [
      "WEST_COAST",
      "AIR_RAID",
      "SPREAD_RPO",
      "OPTION_VEER",
      "POWER_GAP_RUN",
      "SHANAHAN_WIDE_ZONE",
      "NFL_PRO_MULTIPLE",
    ];
    const defenses: DefenseFrontFamily[] = [
      "3_4_TWO_GAP_TITE",
      "3_3_5_STACK_AMOEBA",
      "4_2_5_SPLIT_FIELD",
      "46_BEAR_EIGHT_MAN",
      "4_4_GAPS",
      "4_3_OVER_UNDER_TAMPA2",
      "50_EAGLE_REDUCTION",
    ];

    for (const offenseFamily of offenses) {
      for (const defenseFamily of defenses) {
        const res = evaluateLivePlaybookAndSplitFieldMatchup({
          offenseFamily,
          defenseFamily,
          offensiveSurface: "3X1_TRIPS_OPEN",
        });
        expect(res.compositeSchemeEpaDelta).toBeGreaterThanOrEqual(-0.12);
        expect(res.compositeSchemeEpaDelta).toBeLessThanOrEqual(0.12);
      }
    }

    const compressed = evaluateLivePlaybookAndSplitFieldMatchup({
      defenseFamily: "4_2_5_SPLIT_FIELD",
      offensiveSurface: "2X2_COMPRESSED_BUNCH",
      numberTwoReceiverWidthYards: 4.5,
    });
    expect(compressed.splitFieldCheck).toBe("STUBBIE_SPECIAL");

    const tripsPush = evaluateLivePlaybookAndSplitFieldMatchup({
      defenseFamily: "4_2_5_SPLIT_FIELD",
      offensiveSurface: "3X1_TRIPS_OPEN",
      numberThreeFastFlat: true,
    });
    expect(tripsPush.splitFieldCheck).toBe("BOX_4_ON_3");

    const palms = evaluateLivePlaybookAndSplitFieldMatchup({
      defenseFamily: "4_3_OVER_UNDER_TAMPA2",
      offensiveSurface: "2X2",
      numberTwoReceiverWidthYards: 9.0,
    });
    expect(palms.splitFieldCheck).toBe("PALMS_2_READ");
  });

  it("models the +0.80 YPC 4-2-5 light-box rush tax, Fangio Penny 5-1 mitigation, and TOM/JOKER protection", () => {
    const staticNickel = evaluateLivePlaybookAndSplitFieldMatchup({
      offenseFamily: "POWER_GAP_RUN",
      defenseFamily: "4_2_5_SPLIT_FIELD",
      offensiveSurface: "HEAVY_21_12",
      defensiveBoxCount: 6,
      penny51WalkDownActive: false,
    });
    const pennyWalkDown = evaluateLivePlaybookAndSplitFieldMatchup({
      offenseFamily: "POWER_GAP_RUN",
      defenseFamily: "4_2_5_SPLIT_FIELD",
      offensiveSurface: "HEAVY_21_12",
      defensiveBoxCount: 6,
      penny51WalkDownActive: true,
    });

    expect(staticNickel.lightBoxNickelRushTaxYpc).toBeCloseTo(0.8, 4);
    expect(staticNickel.netRushYpcDelta).toBeCloseTo(0.8, 4);
    expect(pennyWalkDown.penny51RushMitigationYpcDelta).toBeCloseTo(-0.52, 4);
    expect(pennyWalkDown.netRushYpcDelta).toBeCloseTo(0.28, 4);

    const unadjustedWeak = evaluateLivePlaybookAndSplitFieldMatchup({
      rushersWeakSlideSide: 4,
      protectionAdjustment: "NONE",
    });
    const tomWeak = evaluateLivePlaybookAndSplitFieldMatchup({
      rushersWeakSlideSide: 4,
      protectionAdjustment: "TOM",
    });
    expect(unadjustedWeak.protectionUnblockedRusher).toBe(true);
    expect(tomWeak.protectionUnblockedRusher).toBe(false);
    expect(tomWeak.protectionPressureDelta).toBeLessThan(unadjustedWeak.protectionPressureDelta);
  });

  it("computes 2025-2026 35-yd Dynamic Kickoff hidden yardage EP advantage and exports cleanly", () => {
    const landingZone = specialTeamsKickoff35({
      expectedLandingZoneStartYardline: 27.0,
      landingZoneExecutionRate: 0.85,
      hangtimeSec: 3.4,
      fourthDownFailedCount: 0,
      highLeverageSackCount: 0,
    });
    expect(landingZone.touchbackRuleYardline).toBe(35);
    expect(landingZone.epTouchbackOpp).toBeGreaterThan(landingZone.epLandingZoneOpp);
    expect(landingZone.kickoffHiddenYardsSaved).toBeGreaterThan(6.5);
    expect(landingZone.kickoffEpAdvantagePerKick).toBeGreaterThan(0.5);

    const collapsed = computeDynamicKickoff35HiddenYardageEp({
      expectedLandingZoneStartYardline: 35,
      landingZoneExecutionRate: 0,
      fourthDownFailedCount: 2,
      highLeverageSackCount: 1,
    });
    expect(collapsed.totalHiddenYardageEpDelta).toBeLessThan(-4.0);
  });

  it("applies RMIT wind-tunnel Cd(yaw) drag curve and keeps bounded quadratic Logit TD inside (0,1)", () => {
    const spiral = computeBoundedLogitTdAndAeroDrag({
      carries: 0,
      windSpeedMph: 20,
      crosswindYawDeg: 0,
      targetAirYards: 30,
      isFourthQuarterTrailing: true,
      expectedTurnovers: 1,
    });
    const crosswind = computeBoundedLogitTdAndAeroDrag({
      carries: 400,
      windSpeedMph: 20,
      crosswindYawDeg: 90,
      targetAirYards: 30,
    });

    expect(spiral.rmitDragCoefficientCd).toBeCloseTo(0.19, 3);
    expect(crosswind.rmitDragCoefficientCd).toBeCloseTo(0.775, 3);
    expect(crosswind.aeroDynamicForceMultiplier / spiral.aeroDynamicForceMultiplier).toBeGreaterThan(4.0);
    expect(crosswind.aeroDeepPassPenaltyProb).toBeLessThan(spiral.aeroDeepPassPenaltyProb);

    // OLS extrapolation breaks negative at 0 carries whereas quadratic Logit stays in (0, 1)
    expect(spiral.linearOlsExtrapolationValue).toBeLessThan(0);
    expect(spiral.logitTdProbability).toBeGreaterThan(0);
    expect(spiral.logitTdProbability).toBeLessThan(1);
    expect(crosswind.logitTdProbability).toBeGreaterThan(0);
    expect(crosswind.logitTdProbability).toBeLessThan(1);
    expect(spiral.fourthQuarterTurnoverWpaShock).toBeCloseTo(-0.1973, 4);
  });

  it("OPTIMIZATION 1: Empirical-Bayes stability shrinkage reduces out-of-sample MSE by >= 25% on noisy RYOE/CPOE", () => {
    const rng = createMulberry32(20261119);
    const nPlayers = 400;
    let mseRaw = 0;
    let mseShrunk = 0;
    const prior = 0.0;
    const obsNoiseSd = 0.095;
    const trueSd = 0.045;
    const sampleSize = 85; // noisy partial season -> high leverage from lagged r

    for (let i = 0; i < nPlayers; i += 1) {
      const trueAbility = prior + trueSd * sampleNormal(rng);
      const y1 = trueAbility + obsNoiseSd * sampleNormal(rng);
      const y2 = trueAbility + obsNoiseSd * sampleNormal(rng);
      const res = shrinkPlayerMetricByStability({
        metricKey: "RYOE",
        observedMean: y1,
        priorMean: prior,
        sampleSize,
      });
      expect(res.reliabilityR).toBeCloseTo(EAGER_ERICKSON_STABILITY_R.RYOE.r, 4);
      mseRaw += (y1 - y2) ** 2;
      mseShrunk += (res.shrunkEstimate - y2) ** 2;
    }

    const improvementRatio = (mseRaw - mseShrunk) / mseRaw;
    expect(improvementRatio).toBeGreaterThanOrEqual(0.25);
  });

  it("OPTIMIZATION 2: Overdispersed Negative Binomial improves tail Brier score over Poisson and enforces -110 PASS gate", () => {
    const rng = createMulberry32(99117);
    const nProps = 400;
    const mu = 4.5;
    const trueAlpha = 0.28;
    let brierNb = 0;
    let brierPoisson = 0;

    const nbRes = priceOverdispersedNegativeBinomialProp({
      mu,
      propLine: 7.5,
      baseAlpha: trueAlpha,
      gameTotalLine: 45,
      overAmericanOdds: 175,
    });
    expect(nbRes.dispersionTailGap).toBeGreaterThan(0.03);

    for (let i = 0; i < nProps; i += 1) {
      // Gamma-Poisson mixture = exact Negative Binomial(mu, trueAlpha)
      const rShape = 1 / trueAlpha;
      const rateGamma = sampleGamma(rng, rShape) / rShape;
      const count = samplePoisson(rng, mu * rateGamma);
      const over8Plus = count >= 8 ? 1 : 0;
      brierNb += (nbRes.negBinOverProb - over8Plus) ** 2;
      brierPoisson += (nbRes.naivePoissonOverProb - over8Plus) ** 2;
    }

    expect(brierNb / nProps).toBeLessThan(brierPoisson / nProps);

    // Vigged -110 break-even guard: 51% win prob loses against 52.381% implied break-even -> PASS
    const badBet = priceOverdispersedNegativeBinomialProp({
      mu: 0.72,
      propLine: 0.5,
      baseAlpha: 0.2,
      overAmericanOdds: -110,
      underAmericanOdds: -110,
    });
    expect(badBet.viggedBreakEvenProb).toBeCloseTo(americanToImpliedProb(-110), 5);
    expect(badBet.decision).toBe("PASS");
    expect(badBet.publishAllowed).toBe(false);
  });

  it("OPTIMIZATION 3: Jayanti algorithmic expert debiasing lowers RMSE vs anchored/hype-skewed expert consensus", () => {
    const rng = createMulberry32(77331);
    const nObs = 250;
    let sqErrExpert = 0;
    let sqErrDebiased = 0;

    for (let i = 0; i < nObs; i += 1) {
      const truePts = 18.0 + 4.5 * sampleNormal(rng);
      const algoProj = truePts + 2.1 * sampleNormal(rng);
      const hypeSkew = sampleNormal(rng);
      // Human consensus exhibits systematic hype bias & underreacts to regression on skewed team narratives
      const expertConsensus = truePts + 1.15 * hypeSkew + 2.9 * sampleNormal(rng);

      const res = debiasExpertProjectionAndScoreStacks({
        expertConsensusProj: expertConsensus,
        pureAlgorithmicProj: algoProj,
        positionGroup: "QB",
        expertHypeSkewZ: hypeSkew,
        week: 16,
        unresetRecentMistakes: 2,
        nextPlayResetDiscipline: 0.25,
      });
      expect(res.playoffWeekMultiplier).toBe(1.2);
      expect(res.mentalTiltCompoundHazard).toBeGreaterThan(0.25);

      sqErrExpert += (expertConsensus - truePts) ** 2;
      sqErrDebiased += (res.debiasedProjection - truePts) ** 2;
    }

    const rmseExpert = Math.sqrt(sqErrExpert / nObs);
    const rmseDebiased = Math.sqrt(sqErrDebiased / nObs);
    expect(rmseDebiased).toBeLessThan(rmseExpert * 0.85);
  });

  it("wires Stream 15L live into runMasterSituationalReasoningOverlay and computePreProjectionAndSimulationConditionedOverlay", () => {
    const passCheck = computePreProjectionAndSimulationConditionedOverlay({
      awayTeam: "BUF",
      homeTeam: "KC",
      week: 11,
      marketAnchorProb: 0.54,
      independentEdgeDecision: "PASS",
      corpusPlaybookAnd4BookInput: {
        splitField: {
          offenseFamily: "NFL_PRO_MULTIPLE",
          defenseFamily: "4_2_5_SPLIT_FIELD",
          offensiveSurface: "2X2_COMPRESSED_BUNCH",
          numberTwoReceiverWidthYards: 4.0,
          penny51WalkDownActive: true,
          rushersWeakSlideSide: 4,
          protectionAdjustment: "TOM",
        },
        kickoff35: {
          expectedLandingZoneStartYardline: 26.5,
          landingZoneExecutionRate: 0.82,
          hangtimeSec: 3.4,
        },
        tdAndAero: {
          windSpeedMph: 18,
          crosswindYawDeg: 75,
          targetAirYards: 28,
        },
      },
    });

    expect(passCheck.liveCorpusPlaybookAnd4Book.activeHubCount).toBe(16);
    expect(passCheck.simulationTrajectoryConditioners.splitFieldCoverageCheck).toBe("STUBBIE_SPECIAL");
    expect(passCheck.simulationTrajectoryConditioners.penny51RushMitigationYpcDelta).toBeCloseTo(-0.52, 4);
    expect(passCheck.simulationTrajectoryConditioners.dynamicKickoff35HiddenYardageEpDelta).toBeGreaterThan(0.4);
    expect(passCheck.masterOverlayResult.publishAllowed).toBe(false);
    expect(Math.abs(passCheck.masterOverlayResult.orthogonalization.totalProbabilityDelta)).toBeLessThanOrEqual(
      PROBABILITY_MOVEMENT_CAP + 1e-9,
    );

    const streamNames = passCheck.masterOverlayResult.streamCalls.map((s) => s.stream);
    expect(streamNames).toContain("15L:evaluateLiveCorpusPlaybookAnd4BookBundle");

    // Verify independent single-call overlay also propagates corpus deltas when supplied
    const withCorpus = runMasterSituationalReasoningOverlay({
      familyDeltas: { pressure: 0.01, qbSkillScript: 0.015 },
      marketAnchorProb: 0.52,
      independentEdgeDecision: "SPEAK",
      corpusPlaybookAnd4BookInput: {
        stabilityShrink: {
          metricKey: "CPOE",
          observedMean: 0.08,
          priorMean: 0.0,
          sampleSize: 240,
        },
      },
    });
    expect(withCorpus.publishAllowed).toBe(true);
    expect(withCorpus.liveCorpusPlaybookAnd4Book.stabilityShrink.shrunkResidual).toBeGreaterThan(0.02);
    expect(evaluateLiveCorpusPlaybookAnd4BookBundle().activeHubCount).toBe(16);
  });
});
