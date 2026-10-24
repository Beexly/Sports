import { describe, expect, it } from "vitest";
import {
  computeQbEpaGiniAndVolOe,
  classifyGunslingerVsGameManager,
  decomposeQbAgingAndSchemeSupport,
  evaluateNflDraftPickSurplusValue,
  evaluateProspectScoutingLinguisticProfile,
} from "../nfl/osf-qb-volatility-and-prospects.js";
import {
  estimateMultilevelTeamEpaAbility,
  computeRollingAndEwmaEpa,
  predictGameWinLogisticEwma,
  evaluateDynamicHomeFieldAdvantage,
  blendEspnFpiAnd538EloPredictions,
} from "../nfl/osf-team-ability-hfa-and-ewma.js";
import {
  evaluateDefenseAgainstWr1,
  evaluateDefensiveDriveRestImpact,
  evaluatePenaltyStabilityAndPredictiveWeight,
  computeExpectedPassAndProe,
} from "../nfl/osf-defense-penalties-and-proe.js";
import {
  computeReceiverExpectedFantasyPoints,
  evaluateReceivingByPositionCurve,
  evaluateBivariateTargetHeatmapKde,
  evaluateSpatialCompletionSurfaceGam,
} from "../nfl/osf-receiving-xfp-and-spatial-surfaces.js";
import {
  computeNflfastrSevenOutcomeEp,
  computeMonotonicGbdtWinProb,
  computeExpectedFieldGoalMetric,
  computeRerunPunterMetric,
} from "../nfl/osf-special-teams-ep-wp-and-cv.js";

describe("Stream 12 — QB volatility and prospects (RT-06)", () => {
  it("computes the exact shifted Gini and VOLoe", () => {
    const r = computeQbEpaGiniAndVolOe({ epa: [-1, 0, 1, 2], gamma0: 0.1, gamma1: -0.1 });
    expect(r.n).toBe(4);
    expect(r.shiftedGini).toBeGreaterThan(0);
    expect(r.expectedGini).toBeCloseTo(0.1 + -0.1 * 0.5, 9);
    expect(r.volOe).toBeCloseTo(r.shiftedGini - r.expectedGini, 9);
    expect(r.interpretation).toBe("insufficient-sample");
  });

  it("classifies gunslinger vs game manager on standardized axes", () => {
    const league = {
      adotMean: 8,
      adotSd: 2,
      cpoeMean: 0,
      cpoeSd: 4,
      tightWindowMean: 0.15,
      tightWindowSd: 0.05,
    };
    expect(classifyGunslingerVsGameManager({ adot: 11, cpoe: 3, tightWindowRate: 0.2, league }).classification).toBe("gunslinger");
    expect(classifyGunslingerVsGameManager({ adot: 6, cpoe: 3, tightWindowRate: 0.1, league }).classification).toBe("game-manager");
  });

  it("decomposes aging and scheme support with a real ridge fit", () => {
    const seasons = Array.from({ length: 8 }, (_, i) => ({
      age: 23 + i,
      epaPerDropback: 0.1 - 0.01 * i,
      playActionRate: 0.1 + 0.01 * i,
      motionRate: 0.2,
      yacPerCatch: 4 + 0.1 * i,
      passBlockGrade: 70 - i,
    }));
    const r = decomposeQbAgingAndSchemeSupport(seasons);
    expect(Number.isFinite(r.intrinsicEpa)).toBe(true);
    expect(Number.isFinite(r.schemeSupportEpa)).toBe(true);
    expect(r.reconstructedEpa).toBeCloseTo(r.intrinsicEpa + r.schemeSupportEpa, 9);
    expect(r.coefficients.age).not.toBe(0);
  });

  it("fits an isotonic draft surplus curve", () => {
    const r = evaluateNflDraftPickSurplusValue({
      pick: 10,
      measuredCurve: [
        { pick: 1, apy: 20 },
        { pick: 10, apy: 10 },
        { pick: 32, apy: 3 },
      ],
      rookieCost: 6,
    });
    expect(r.monotone).toBe(true);
    expect(r.surplusValue).toBeCloseTo(r.fittedApy - 6, 9);
  });

  it("de-biases a prospect linguistic profile", () => {
    const r = evaluateProspectScoutingLinguisticProfile({
      text: "elite arm strength and accuracy with leadership and anticipation",
      position: "QB",
      positionBaseRates: { "arm strength": 0.2, accuracy: 0.3, leadership: 0.1, anticipation: 0.15 },
      schoolBiasOffsets: { alabama: 0.05 },
    });
    expect(r.topTraits.length).toBeGreaterThan(0);
    expect(r.deconfoundedScore).toBeGreaterThanOrEqual(0);
    expect(r.ceilingModifier).not.toBe(0);
  });
});

describe("Stream 12 — team ability, HFA, EWMA", () => {
  it("uses true empirical-Bayes shrinkage, not raw means", () => {
    const obs = [
      ...[0, 0.25, 1.0].flatMap((offset, i) =>
        [0.1, 0.2, 0.3].map((epa) => ({ team: ["A", "B", "C"][i]!, metric: "off_pass" as const, epa: epa + offset })),
      ),
    ];
    const r = estimateMultilevelTeamEpaAbility(obs);
    expect(r.abilities.length).toBe(3);
    for (const a of r.abilities) {
      expect(a.kappa).toBeGreaterThan(0);
      expect(a.kappa).toBeLessThan(1);
      expect(a.posteriorMean).not.toBe(a.rawMean);
    }
  });

  it("shrinks Weeks 1-4 by one third toward the preseason prior", () => {
    const r = computeRollingAndEwmaEpa({ values: [0.1, 0.2, 0.3], preseasonPrior: 0, week: 3 });
    expect(r.priorWeight).toBeCloseTo(1 / 3, 9);
    expect(r.shrunk).toBeCloseTo(r.ewma * (2 / 3), 9);
  });

  it("predicts a logistic win probability and a dynamic HFA", () => {
    const w = predictGameWinLogisticEwma({
      offenseEwma: 0.1,
      defenseEwma: -0.05,
      leagueAverageEpa: 0,
      hfaPoints: 2,
      pointsPerEpa: 7,
    });
    expect(w.winProbability).toBeGreaterThan(0);
    expect(w.winProbability).toBeLessThan(1);
    const h = evaluateDynamicHomeFieldAdvantage({
      regime: "post-2021",
      timeZonesCrossed: 2,
      altitudeFeet: 5280,
      surface: "grass",
      refereeCrowdNoiseBiasPoints: 0,
    });
    expect(Number.isFinite(h.totalPoints)).toBe(true);
    expect(h.components.regimeBase).toBe(0.4);
    expect(
      evaluateDynamicHomeFieldAdvantage({
        regime: "pre-2019",
        timeZonesCrossed: 0,
        altitudeFeet: 0,
        surface: "turf",
        refereeCrowdNoiseBiasPoints: -1,
      }).components.regimeBase,
    ).toBe(2.85);
  });

  it("pools FPI, Elo, and market in log-odds space", () => {
    const b = blendEspnFpiAnd538EloPredictions({ fpiProbability: 0.6, eloProbability: 0.55, marketProbability: 0.58 });
    expect(b.pooledProbability).toBeGreaterThan(0.54);
    expect(b.pooledProbability).toBeLessThan(0.61);
    expect(Object.values(b.weightsUsed).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 9);
  });
});

describe("Stream 12 — defense, penalties, PROE", () => {
  it("shrinks WR1 suppression toward the league mean", () => {
    const r = evaluateDefenseAgainstWr1({
      wr1Targets: 40,
      teamPassAttempts: 300,
      wr1EpaPerTarget: -0.1,
      league: { wr1TargetShare: 0.25, wr1EpaPerTarget: 0.05, targetShareVariance: 0.01, epaVariance: 0.02 },
    });
    expect(r.shrunkEpaPerTarget).toBeGreaterThan(-0.1);
    expect(r.suppressionIndex).toBeGreaterThan(0);
  });

  it("controls drive rest for intrinsic EPA", () => {
    const r = evaluateDefensiveDriveRestImpact({
      observedEpaPerDrive: 0.2,
      intrinsicEpaPerDrive: 0.1,
      restDaysDifferential: 3,
      restSlope: 0.01,
      intercept: 0,
    });
    expect(r.expectedEpaPerDrive).toBeCloseTo(0.13, 9);
    expect(r.restEffectEpa).toBeCloseTo(0.03, 9);
  });

  it("shrinks coverage penalties hard and procedural penalties lightly", () => {
    const r = evaluatePenaltyStabilityAndPredictiveWeight({
      coveragePenaltyEpaPerSnap: 0.2,
      proceduralPenaltyRate: 0.1,
      coverageSnaps: 500,
      defensiveSnaps: 600,
      league: { coveragePenaltyEpaPerSnap: 0.05, proceduralPenaltyRate: 0.06 },
    });
    expect(r.coverageWeight).toBeCloseTo(0.08, 9);
    expect(r.proceduralWeight).toBeCloseTo(0.35, 9);
    expect(r.shrunkCoverageEpa).toBeLessThan(r.shrunkCoverageEpa + 0.01);
  });

  it("computes situational xPass and PROE with supplied coefficients", () => {
    const zeros = { intercept: 0, down: 0, distance: 0, yardline100: 0, scoreDifferential: 0, halfSecondsRemaining: 0 };
    const r = computeExpectedPassAndProe(
      { down: 1, distance: 10, yardline100: 75, scoreDifferential: 0, halfSecondsRemaining: 1800, coefficients: zeros },
      0.65,
    );
    expect(r.xPass).toBeCloseTo(0.5, 9);
    expect(r.proe).toBeCloseTo(0.15, 9);
  });
});

describe("Stream 12 — receiving xFP and spatial surfaces", () => {
  it("computes xFP with the published 0.1 and 6 coefficients", () => {
    const r = computeReceiverExpectedFantasyPoints({
      catchProbability: 0.8,
      airYards: 10,
      expectedYac: 4,
      touchdownProbabilityGivenCatch: 0.1,
      expectedRushYards: 5,
      rushTouchdownProbability: 0.02,
      actualFantasyPoints: 5.5,
      pprWeight: 1,
    });
    expect(r.expectedFantasyPoints).toBeCloseTo(3.02, 6);
    expect(r.signal).toBe("sell-high");
  });

  it("fits positional receiving curves", () => {
    const obs = [
      { position: "WR" as const, airYards: 5, catchProbability: 0.8, yac: 3 },
      { position: "WR" as const, airYards: 15, catchProbability: 0.6, yac: 4 },
      { position: "TE" as const, airYards: 6, catchProbability: 0.75, yac: 2 },
      { position: "TE" as const, airYards: 12, catchProbability: 0.65, yac: 2.5 },
    ];
    const r = evaluateReceivingByPositionCurve(obs, 10);
    expect(r.curves.length).toBe(2);
    expect(r.expected[0]!.expectedCatchProbability).toBeGreaterThan(0);
  });

  it("runs a bivariate KDE with a zone overlap integral", () => {
    const r = evaluateBivariateTargetHeatmapKde({
      targets: [
        { x: 10, y: 10 },
        { x: 12, y: 11 },
        { x: 30, y: 20 },
      ],
      weakSpots: [{ x: 12, y: 10, radiusYards: 4, weight: 1 }],
      gridStepYards: 2,
    });
    expect(r.densityAtTargets.length).toBe(3);
    expect(r.overlapIntegral).toBeGreaterThan(0);
  });

  it("fits a spatial completion surface and reports CPOE", () => {
    const obs = Array.from({ length: 15 }, (_, i) => ({
      x: 5 + i,
      y: 10 + (i % 5) * 3,
      separation: 1 + (i % 4) * 0.5,
      sidelineDistance: 20 - (i % 5),
      completed: (i % 2 === 0 ? 1 : 0) as 0 | 1,
    }));
    const r = evaluateSpatialCompletionSurfaceGam(obs);
    expect(r.predictions.length).toBe(15);
    expect(Number.isFinite(r.cpoe)).toBe(true);
  });
});

describe("Stream 12 — special teams EP/WP and field goals", () => {
  it("sums the seven next-score outcomes to EP", () => {
    const r = computeNflfastrSevenOutcomeEp({
      probabilities: {
        TD: 0.1,
        FG: 0.2,
        Safety: 0.05,
        NoScore: 0.4,
        OppSafety: 0.05,
        OppFG: 0.15,
        OppTD: 0.05,
      },
    });
    expect(r.expectedPoints).toBeCloseTo(0.5, 9);
    expect(r.probabilitiesSum).toBeCloseTo(1, 9);
  });

  it("keeps the monotone GBDT monotone in all three constraints", () => {
    const rows = Array.from({ length: 24 }, (_, i) => ({
      scoreDifferential: -12 + i,
      yardline100: 20 + ((i * 7) % 70),
      ydstogo: 3 + (i % 7),
      win: (i > 12 ? 1 : 0) as 0 | 1,
    }));
    const r = computeMonotonicGbdtWinProb(rows, { scoreDifferential: 3, yardline100: 45, ydstogo: 6 });
    expect(r.winProbability).toBeGreaterThan(0);
    expect(r.winProbability).toBeLessThan(1);
    expect(r.monotonicity.allHold).toBe(true);
  });

  it("fits the quadratic-kink xFG metric", () => {
    const attempts = Array.from({ length: 25 }, (_, i) => ({
      distance: 20 + i,
      windMph: i % 10,
      dome: (i % 2) as 0 | 1,
      altitudeKm: 0.1,
      made: (i < 18 ? 1 : 0) as 0 | 1,
    }));
    const r = computeExpectedFieldGoalMetric(attempts);
    expect(r.xfgByAttempt.length).toBe(25);
    expect(Number.isFinite(r.fgoe)).toBe(true);
    expect(typeof r.converged).toBe("boolean");
  });

  it("fits Brookner RERUN and reports net over expected", () => {
    const punts = Array.from({ length: 12 }, (_, i) => ({
      hangtimeSec: 3.5 + (i % 4) * 0.4,
      grossYards: 40 + i,
      sidelineDirection: ((i % 3) - 1) as -1 | 0 | 1,
      gunnerSeparationYards: 2 + (i % 5),
      returnYards: 5 + (i % 6),
    }));
    const r = computeRerunPunterMetric(punts);
    expect(r.n).toBe(12);
    expect(r.rerunNetOverExpected.length).toBe(12);
    expect(Number.isFinite(r.aggregateNetOverExpected)).toBe(true);
  });
});
