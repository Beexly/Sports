import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  TACKLE_FEATURE_NAMES,
  computeTackleProbabilityFeatures,
  computeTackleProbability,
  computeMissedTackleHazard,
  calibrateMissedTackleBand,
  type TackleProbabilityInput,
} from "../nfl/tackle-probability.js";
import {
  computeClobMicroPrice,
  fitLeadLagTransferEntropy,
  simulateExecutionShortfall,
  polymarketPublishAllowed,
} from "../markets/polymarket-sdks.js";
import { attachNflscraprPbpBaselines } from "../ingestion/nflscrapr-contract.js";
import {
  filterKnownAt,
  evaluateRewardBalancePassHeavy,
  evaluateMisleadingMinimum,
  evaluateProspectLinguisticBias,
  evaluateRollingScheduleVolatility,
  evaluateAgingCurvesByPosition,
} from "../nfl/universal-handoff-warehouse-priors.js";
import {
  bayesianReverseTokenLogitUpdate,
  llmEmbeddingTabularForecaster,
  evaluateSecondWaveArxivSituationalModels,
} from "../forecasting/llm-probability-and-hybrid-forecasters.js";
import {
  orthogonalizeAndShrink,
  scrubSensitive,
  runMasterSituationalReasoningOverlay,
  PROBABILITY_MOVEMENT_CAP,
} from "../nfl/master-situational-reasoning-aggregator.js";

const tackleInput: TackleProbabilityInput = {
  distanceToCarrier: 3,
  closingSpeed: 1.5,
  approachAngleCos: 0.8,
  blockersBetween: 1,
  openField: false,
  defenderSpeed: 8,
  defenderAcceleration: 2,
  pursuitAngleSin: 0.4,
  angleToSideline: 0.3,
  carrierSpeed: 7,
  timeToIntercept: 1.1,
  leverageDistance: 0.5,
  teammateSupportCount: 1,
  groupTackleContext: false,
  downDistancePressure: 1,
  yardsToGoal: 55,
  closingAcceleration: 0.5,
  defenderMassProxy: 0.7,
  surfaceGripProxy: 0.9,
};

const handoffRecords = [
  { knownAt: "2026-10-01T00:00:00Z", team: "AAA" },
  { knownAt: "2026-10-10T00:00:00Z", team: "BBB" },
  { knownAt: "2026-10-20T00:00:00Z", team: "CCC" },
  { knownAt: "not-a-date", team: "DDD" },
];

describe("Stream 14B — tackle probability, CLOB, nflscrapR baselines (RT-02)", () => {
  it("builds all 20 named tackle features", () => {
    const f = computeTackleProbabilityFeatures(tackleInput);
    expect(f.names).toEqual(TACKLE_FEATURE_NAMES);
    expect(f.values.length).toBe(20);
    expect(f.asRecord.relative_speed).toBe(1);
  });

  it("returns the honest 0.5 uncalibrated baseline and a logistic probability", () => {
    const base = computeTackleProbability(tackleInput);
    expect(base.probability).toBeCloseTo(0.5, 9);
    expect(base.calibrated).toBe(false);
    const fitted = computeTackleProbability(tackleInput, {
      intercept: -1,
      weights: new Array(20).fill(0.01),
    });
    expect(fitted.calibrated).toBe(true);
    expect(fitted.probability).toBeGreaterThan(0);
    expect(fitted.probability).toBeLessThan(1);
  });

  it("computes the missed-tackle hazard and calibrates into the 15-20% band", () => {
    const hazard = computeMissedTackleHazard({
      frame: 5,
      features: tackleInput,
      coefficients: { intercept: 0, weights: new Array(20).fill(0) },
      baselineHazardPerFrame: 0.01,
    });
    expect(Number.isFinite(hazard.cumulativeMissProbability)).toBe(true);
    const calibration = calibrateMissedTackleBand({
      attempts: Array.from({ length: 30 }, () => tackleInput),
      coefficients: { intercept: 0, weights: new Array(20).fill(0) },
      baselineHazardPerFrame: 0.01,
    });
    expect(calibration.inBand).toBe(true);
    expect(calibration.achievedRate).toBeGreaterThanOrEqual(0.15);
    expect(calibration.achievedRate).toBeLessThanOrEqual(0.2);
  });

  it("computes the CLOB microprice from size-weighted best quotes", () => {
    const r = computeClobMicroPrice({
      bids: [{ price: 0.48, size: 100 }],
      asks: [{ price: 0.52, size: 200 }],
    });
    expect(r.microPrice).toBeCloseTo((0.48 * 200 + 0.52 * 100) / 300, 9);
    expect(r.spread).toBeCloseTo(0.04, 9);
    expect(polymarketPublishAllowed()).toBe(false);
  });

  it("learns lead-lag transfer entropy and simulates execution shortfall", () => {
    const driver = Array.from({ length: 60 }, (_, i) => Math.sin(i / 3));
    const follower = driver.map((_, i) => (i >= 2 ? driver[i - 2]! : 0));
    const lag = fitLeadLagTransferEntropy({ driver, follower, maxLag: 4, bins: 4 });
    expect(lag.transferEntropyByLag.length).toBe(4);
    expect(Number.isFinite(lag.bestTransferEntropy)).toBe(true);
    const ex = simulateExecutionShortfall({
      order: { side: "buy", size: 100 },
      book: [
        { price: 0.5, size: 50 },
        { price: 0.52, size: 100 },
      ],
      midPrice: 0.49,
    });
    expect(ex.filledSize).toBe(100);
    expect(ex.averagePrice).toBeCloseTo(0.51, 9);
    expect(ex.shortfall).toBeCloseTo((0.51 - 0.49) * 100, 6);
  });

  it("attaches nflscrapR EP/WP/xYAC baselines", () => {
    const rows = [
      { gameId: "g1", playId: 1, team: "AAA", down: 1 as const, ydstogo: 10, yardline100: 75, scoreDifferential: 0, halfSecondsRemaining: 1800, epa: 0.1, wpa: 0.02, airYards: 8, yardsAfterCatch: 3, complete: true },
      { gameId: "g1", playId: 2, team: "AAA", down: 1 as const, ydstogo: 10, yardline100: 75, scoreDifferential: 0, halfSecondsRemaining: 1780, epa: 0.3, wpa: 0.05, airYards: 8, yardsAfterCatch: 5, complete: true },
      { gameId: "g1", playId: 3, team: "BBB", down: 2 as const, ydstogo: 7, yardline100: 40, scoreDifferential: -3, halfSecondsRemaining: 900, epa: -0.2, wpa: -0.04, airYards: 12, yardsAfterCatch: 0, complete: false },
      { gameId: "g1", playId: 4, team: "BBB", down: 2 as const, ydstogo: 7, yardline100: 40, scoreDifferential: -3, halfSecondsRemaining: 880, epa: 0.05, wpa: 0.01, airYards: 12, yardsAfterCatch: 2, complete: true },
    ];
    const r = attachNflscraprPbpBaselines(rows);
    expect(r.rows.length).toBe(4);
    expect(r.epBins).toBeGreaterThan(0);
    expect(r.rows[0]!.epBaseline).toBeCloseTo(0.2, 9);
    expect(r.rows[0]!.epaOverBaseline).toBeCloseTo(-0.1, 9);
  });
});

describe("Stream 14C — point-in-time warehouse priors (RT-04)", () => {
  it("admits only records known at or before the cutoff", () => {
    const r = filterKnownAt(handoffRecords, "2026-10-15T00:00:00Z");
    expect(r.admitted.length).toBe(2);
    expect(r.excluded).toBe(2);
  });

  it("computes all five warehouse priors", () => {
    const reward = evaluateRewardBalancePassHeavy({
      teamPassRate: 0.62,
      leaguePassRate: 0.57,
      leaguePassRateSd: 0.04,
      playerTargetShare: 0.28,
      leagueTargetShare: 0.2,
      leagueTargetShareSd: 0.05,
      games: 8,
    });
    expect(reward.adjustedMean).toBeGreaterThan(0.2);
    const minimum = evaluateMisleadingMinimum({
      observedValue: 3,
      neutralContextValue: 12,
      neutralGames: 5,
      leagueMean: 10,
      leagueSd: 4,
    });
    expect(minimum.adjustedMean).toBeGreaterThan(3);
    const bias = evaluateProspectLinguisticBias({
      traitScore: 0.8,
      positionBaseRate: 0.2,
      schoolBias: 0.05,
      sampleSize: 40,
      leagueSd: 0.2,
    });
    expect(bias.adjustedMean).toBeCloseTo(0.55, 9);
    const vol = evaluateRollingScheduleVolatility({
      weeklyValues: [1, 2, 1, 3, 2, 1],
      window: 4,
      leagueVolatilitySd: 1,
    });
    expect(vol.adjustedMean).toBeGreaterThan(0);
    const aging = evaluateAgingCurvesByPosition({
      position: "WR",
      age: 30,
      peakAge: 26,
      declinePerYear: 0.05,
      risePerYear: 0.04,
    });
    expect(aging.phase).toBe("declining");
    expect(aging.ageMultiplier).toBeCloseTo(0.8, 9);
  });
});

describe("Stream 14D — LLM probability and hybrid forecasters", () => {
  it("updates a prior in log-odds space", () => {
    const r = bayesianReverseTokenLogitUpdate({
      priorProbability: 0.5,
      tokens: [
        { token: "injury", logLikelihoodRatio: 0.6 },
        { token: "limited", logLikelihoodRatio: 0.4 },
      ],
    });
    expect(r.posteriorProbability).toBeCloseTo(1 / (1 + Math.exp(-1)), 9);
    expect(r.clipped).toBe(false);
    expect(r.contributions.length).toBe(2);
  });

  it("blends an embedding kNN with a tabular head", () => {
    const r = llmEmbeddingTabularForecaster({
      queryEmbedding: [1, 0],
      queryFeatures: [0.9],
      examples: [
        { embedding: [1, 0], features: [0.9], label: 1 },
        { embedding: [0.9, 0.1], features: [0.8], label: 1 },
        { embedding: [0, 1], features: [0.1], label: 0 },
      ],
      k: 2,
    });
    expect(r.blendedProbability).toBeGreaterThan(0.5);
    expect(r.neighboursUsed).toBe(2);
  });

  it("ranks second-wave arXiv evaluations honestly", () => {
    const r = evaluateSecondWaveArxivSituationalModels({
      models: [
        { arxivId: "2609.31191", name: "A", brier: 0.18, logLoss: 0.5, coverage: 0.9, n: 100 },
        { arxivId: "2609.04014", name: "B", brier: 0.22, logLoss: 0.6, coverage: 0.8, n: 20 },
      ],
    });
    expect(r.modelsEvaluated).toBe(2);
    expect(r.bestModel).toBe("2609.31191");
    expect(r.note).toMatch(/fewer than 30/);
  });
});

describe("Stream 14E — orthogonalizer and master overlay (RT-03 & RT-04)", () => {
  it("residualizes six families, precision-weights them, and caps at 0.12", () => {
    const r = orthogonalizeAndShrink(
      {
        pressure: [5, 4],
        weather: 3,
        restFatigue: [-2, 1],
        coveragePersonnel: [4, 3, 2],
        qbSkillScript: 2,
        marketMicrostructure: [1, 1],
      },
      0.55,
    );
    expect(Object.keys(r.familyResiduals).length).toBe(6);
    expect(Object.values(r.familyResiduals).every((v) => v !== null)).toBe(true);
    expect(Object.keys(r.precisionDiagonalWeights).length).toBe(6);
    expect(Object.values(r.normalizedWeights).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 6);
    expect(r.capApplied).toBe(true);
    expect(Math.abs(r.totalProbabilityDelta)).toBeCloseTo(PROBABILITY_MOVEMENT_CAP, 9);
  });

  it("scrubs credential-shaped tokens", () => {
    const scrubbed = scrubSensitive({
      token: "sk-abcdefghijklmnop1234567890",
      note: "contact me at a@b.com",
    }) as Record<string, string>;
    expect(scrubbed.token).toBe("[REDACTED]");
    expect(scrubbed.note).toContain("[REDACTED]");
  });

  it("runs every stream, enforces PASS discipline, and appends the feed", () => {
    const full = runMasterSituationalReasoningOverlay({
      coverageFrames: [
        {
          defenders: Array.from({ length: 11 }, (_, i) => ({ x: i, y: 10, reportedSpeed: 6, reportedAcceleration: 1, displacementYards: 0.6 })),
          offense: Array.from({ length: 10 }, (_, i) => ({ x: 8 + i, y: 9, reportedSpeed: 7, reportedAcceleration: 1, displacementYards: 0.7 })),
        },
        {
          defenders: Array.from({ length: 11 }, (_, i) => ({ x: i + 1, y: 10, reportedSpeed: 6, reportedAcceleration: 1, displacementYards: 0.65 })),
          offense: Array.from({ length: 10 }, (_, i) => ({ x: 9 + i, y: 9, reportedSpeed: 7, reportedAcceleration: 1, displacementYards: 0.75 })),
        },
      ],
      situationalPlay: {
        wpBefore: 0.5,
        wpAfter: 0.58,
        epBefore: 0,
        epAfter: 2.1,
        quarter: 4,
        halfSecondsRemaining: 90,
        scoreMargin: 0,
        down: 3,
        ydstogo: 4,
        yardline100: 45,
        yardsGained: 6,
        playType: "pass",
      },
      decisionState: { scoreMargin: -2, quarter: 4, halfSecondsRemaining: 120, yardline100: 65, ydstogo: 4, down: 4 },
      decisionOptions: [
        { branch: "go", successProbability: 0.55, winProbabilityOnSuccess: 0.65, winProbabilityOnFailure: 0.2 },
        { branch: "kick", successProbability: 0.85, winProbabilityOnSuccess: 0.5, winProbabilityOnFailure: 0.25 },
      ],
      tackle: tackleInput,
      tackleCoefficients: { intercept: -1, weights: new Array(20).fill(0.01) },
      clobBook: { bids: [{ price: 0.48, size: 100 }], asks: [{ price: 0.52, size: 200 }] },
      handoffRecords,
      asOf: "2026-10-15T00:00:00Z",
      qbEpa: { epa: [-1, 0, 1, 2, 3] },
      teamObservations: [
        { team: "AAA", metric: "off_pass", epa: 0.1 },
        { team: "AAA", metric: "off_pass", epa: 0.2 },
        { team: "BBB", metric: "off_pass", epa: 0.4 },
        { team: "BBB", metric: "off_pass", epa: 0.5 },
      ],
      wr1: {
        wr1Targets: 40,
        teamPassAttempts: 300,
        wr1EpaPerTarget: -0.1,
        league: { wr1TargetShare: 0.25, wr1EpaPerTarget: 0.05, targetShareVariance: 0.01, epaVariance: 0.02 },
      },
      llmPrior: { priorProbability: 0.5, tokens: [{ token: "injury", logLikelihoodRatio: 0.5 }] },
      featureUnderTest: { name: "xFP", definition: "expected fantasy points", controls: ["game-script"] },
      familyDeltas: {
        pressure: [3, 2],
        weather: 1,
        restFatigue: [-1, 0.5],
        coveragePersonnel: [2, 1.5, 1],
        qbSkillScript: 1.2,
        marketMicrostructure: [0.4, 0.3],
      },
      marketAnchorProb: 0.55,
      independentEdgeDecision: "SPEAK",
    });
    const expectedStreams = [
      "13A:runNgsAwsCnnAttentionCoveragePipeline",
      "13B:computeLeverageAdjustedEpa",
      "13B:evaluateDecisionBranchWp",
      "14B:computeTackleProbability",
      "14B:computeClobMicroPrice",
      "14C:filterKnownAt",
      "12B:computeQbEpaGiniAndVolOe",
      "12C:estimateMultilevelTeamEpaAbility",
      "12D:evaluateDefenseAgainstWr1",
      "14D:bayesianReverseTokenLogitUpdate",
      "8:validateFeatureAgainstMisleadingStats",
      "14E:emitMindFeedRecord",
    ];
    for (const stream of expectedStreams) {
      const call = full.streamCalls.find((c) => c.stream === stream);
      expect(call, `missing stream call ${stream}`).toBeDefined();
      expect(call!.called, `${stream} was skipped`).toBe(true);
    }
    expect(full.publishAllowed).toBe(true);
    expect(full.feedRecord.lineBytes).toBeGreaterThan(100);
    expect(full.featureValidation!.accepted).toBe(true);

    const feedPath = resolve(process.cwd(), "brain/feeds/2026-10-22/master_aggregator_runtime_feed.jsonl");
    const lines = readFileSync(feedPath, "utf8").trim().split("\n");
    const last = JSON.parse(lines[lines.length - 1]!);
    expect(last.recordType).toBe("master_aggregator_runtime");
    expect(Object.keys(last.result.familyResiduals).length).toBe(6);
    expect(Object.keys(last.result.precisionDiagonalWeights).length).toBe(6);
    expect(Math.abs(last.result.totalProbabilityDelta)).toBeLessThanOrEqual(0.12 + 1e-9);

    const pass = runMasterSituationalReasoningOverlay({
      familyDeltas: { pressure: 1 },
      marketAnchorProb: 0.5,
      independentEdgeDecision: "PASS",
      provenance: {
        source: "pass-discipline-test",
        streamId: "stream14e:pass-discipline",
        computedAt: new Date().toISOString(),
        feedPath: "brain/feeds/2026-10-22/pass_discipline_feed.jsonl",
      },
    });
    expect(pass.publishAllowed).toBe(false);
  });
});
