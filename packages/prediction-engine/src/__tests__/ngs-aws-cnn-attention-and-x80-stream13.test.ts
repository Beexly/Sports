import { describe, expect, it } from "vitest";
import {
  engineerTrackingFramePairTensor,
  runNgsAwsCnnAttentionCoveragePipeline,
  type TrackingFrame,
} from "../nfl/coverage-scheme.js";
import {
  computeLeverageAdjustedEpa,
  computeNeutralScriptBaselineAndProe,
  evaluateRedZoneAndTwoMinuteSplits,
  evaluateDecisionBranchWp,
  evaluatePersonnelBoxPassInteraction,
  evaluateBackupQbReceiverDecoupling,
  evaluatePlayerSpecificWeatherInteraction,
  evaluateOffensiveLineAttritionCluster,
  evaluateMarketMoveInformationCompleteness,
  validateFeatureAgainstMisleadingStats,
  type SituationalPlay,
} from "../nfl/x-situational-80-rules.js";

function frame(seed: number): TrackingFrame {
  const defenders = Array.from({ length: 11 }, (_, i) => ({
    x: 5 + i * 0.8 + seed * 0.1,
    y: 10 + (i % 5) * 2,
    reportedSpeed: 6,
    reportedAcceleration: 1,
    displacementYards: 0.65,
  }));
  const offense = Array.from({ length: 10 }, (_, i) => ({
    x: 10 + i * 0.7,
    y: 8 + (i % 4) * 3 + seed * 0.2,
    reportedSpeed: 7,
    reportedAcceleration: 1,
    displacementYards: 0.7,
  }));
  return { defenders, offense };
}

const play: SituationalPlay = {
  wpBefore: 0.5,
  wpAfter: 0.6,
  epBefore: 0,
  epAfter: 2.69,
  quarter: 4,
  halfSecondsRemaining: 90,
  scoreMargin: 0,
  down: 3,
  ydstogo: 4,
  yardline100: 45,
  yardsGained: 6,
  playType: "pass",
  shortYardageConversion: true,
};

const plays: SituationalPlay[] = [
  play,
  { ...play, wpBefore: 0.7, wpAfter: 0.68, epBefore: 1, epAfter: 0.5, scoreMargin: 3, down: 1, quarter: 1 },
  { ...play, wpBefore: 0.2, wpAfter: 0.25, epBefore: 1, epAfter: 1.4, scoreMargin: -7, down: 2, playType: "rush" },
  { ...play, wpBefore: 0.45, wpAfter: 0.5, epBefore: 3, epAfter: 6.5, yardline100: 8, down: 1 },
  { ...play, wpBefore: 0.55, wpAfter: 0.6, epBefore: 2, epAfter: 4.2, yardline100: 15, down: 3, halfSecondsRemaining: 60 },
];

describe("Stream 13A — pair tensor and composed CNN-attention pipeline (RT-05)", () => {
  it("builds the (T x 11 x 10 x 8) tensor with the Zoo correction", () => {
    const t = engineerTrackingFramePairTensor([frame(0), frame(1), frame(2)]);
    expect(t.dims).toEqual({ frames: 3, defenders: 11, offense: 10, channels: 8 });
    expect(t.tensor.length).toBe(3);
    expect(t.tensor[0]!.length).toBe(11);
    expect(t.tensor[0]![0]!.length).toBe(10);
    expect(t.tensor[0]![0]![0]!.length).toBe(8);
    expect(t.sensorCorrections.framesCorrected).toBe(3);
    expect(t.sensorCorrections.maxSpeedDelta).toBeGreaterThan(0);
  });

  it("rejects a frame with the wrong player count", () => {
    const bad = frame(0);
    expect(() =>
      engineerTrackingFramePairTensor([{ defenders: bad.defenders.slice(0, 10), offense: bad.offense }]),
    ).toThrow(/11 defenders/);
  });

  it("runs all six stages in one graph and returns the three heads", () => {
    const r = runNgsAwsCnnAttentionCoveragePipeline({ frames: [frame(0), frame(1), frame(2), frame(3)] });
    expect(r.streamCalls).toEqual([
      "engineerTrackingFramePairTensor",
      "computeFrameEmbeddingsPermInvariant",
      "computeCnnAttentionPlayEmbedding",
      "classifyCoverageEnsemble",
      "discoverCoverageGlobalStructure",
      "attributeCoverageHighlights",
    ]);
    expect(r.tensorDims.frames).toBe(4);
    expect(r.alpha.length).toBe(4);
    expect(r.alpha.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 6);
    expect(r.classification.meanClassProbabilities.length).toBe(8);
    expect(r.classification.meanClassProbabilities.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 6);
    expect(r.classification.epistemicVariance.length).toBe(8);
    expect(r.classification.predictedProbability).toBeGreaterThan(0);
    expect(["man", "zone"]).toContain(r.classification.coverageFamily);
    expect(r.globalDiscovery.referenceCount).toBeGreaterThan(0);
    expect(r.globalDiscovery.referenceSource).toBe("temporal-self");
    expect(r.instanceHighlights.rankedPairs.length).toBe(10);
    expect(r.instanceHighlights.guidedGradCam.length).toBe(4);
    expect(r.instanceHighlights.peakFrame).toBeGreaterThanOrEqual(0);
    expect(r.instanceHighlights.peakFrame).toBeLessThan(4);
  });
});

describe("Stream 13B — all 8 themes and 10 functions (RT-01)", () => {
  it("Theme 1: leverage-adjusted EPA separates raw EPA from leverage", () => {
    const r = computeLeverageAdjustedEpa(play);
    expect(r.rawEpa).toBeCloseTo(2.69, 9);
    expect(r.wpa).toBeCloseTo(0.1, 9);
    expect(r.leverageMultiplier).toBe(1.5);
    expect(r.edgeBoost).toBe(2);
    expect(r.shortYardageCredit).toBe(0.03);
  });

  it("Theme 2: neutral script and PROE", () => {
    const r = computeNeutralScriptBaselineAndProe(plays, "AAA");
    expect(r.neutralPlayCount).toBeGreaterThan(0);
    expect(Number.isFinite(r.proeResidual)).toBe(true);
    expect(r.playAction1stDownDelta).toBe(0.19);
  });

  it("Theme 3: red-zone and two-minute splits", () => {
    const r = evaluateRedZoneAndTwoMinuteSplits(plays);
    expect(r.rzPlayCount).toBeGreaterThan(0);
    expect(r.inside10HorizontalCompressionPenalty).toBe(-0.04);
    expect(Number.isFinite(r.twoMinEpa)).toBe(true);
  });

  it("Theme 4: decision branch WP and two-point states", () => {
    const r = evaluateDecisionBranchWp(
      { scoreMargin: -2, quarter: 4, halfSecondsRemaining: 120, yardline100: 65, ydstogo: 4, down: 4 },
      [
        { branch: "go", successProbability: 0.55, winProbabilityOnSuccess: 0.65, winProbabilityOnFailure: 0.2 },
        { branch: "kick", successProbability: 0.85, winProbabilityOnSuccess: 0.5, winProbabilityOnFailure: 0.25 },
        { branch: "punt", successProbability: 1, winProbabilityOnSuccess: 0.35, winProbabilityOnFailure: 0.35 },
      ],
    );
    expect(r.branches.length).toBe(3);
    expect(r.twoPointStates.length).toBe(4);
    expect(["go", "kick", "punt"]).toContain(r.recommendedBranch);
  });

  it("Theme 5: personnel and box interaction", () => {
    const r = evaluatePersonnelBoxPassInteraction({
      personnel: "13",
      boxCount: 8,
      formationWidth: "normal",
      secondTeOrFbReceivingThreat: true,
      shell: "loaded-box",
    });
    expect(r.passEpaAdjustment).toBeCloseTo(0.21 + 0.05 + 0.015, 9);
    expect(r.interactionNotes.length).toBeGreaterThan(0);
  });

  it("Theme 6A: backup QB and receiver decoupling", () => {
    const r = evaluateBackupQbReceiverDecoupling({
      alphaTargetShareWithStarter: 0.3,
      alphaTargetShareWithBackup: 0.27,
      yprrWithStarter: 2.5,
      yprrWithBackup: 2.2,
      redZoneShareWithStarter: 0.35,
      redZoneShareWithBackup: 0.25,
      timingDependentPerimeterWr: true,
    });
    expect(r.targetShareRetention).toBeCloseTo(0.9, 9);
    expect(r.perimeterPenalty).toBe(0.85);
    expect(r.decoupledValueMultiplier).toBeLessThan(0.9);
  });

  it("Theme 6B: player-specific weather", () => {
    const r = evaluatePlayerSpecificWeatherInteraction({
      position: "QB",
      temperatureF: 30,
      windMph: 18,
      precipitation: 1,
    });
    expect(r.coldPenalty).toBe(-0.05);
    expect(r.windPenalty).toBe(-0.11);
    expect(r.positionalMultiplier).toBeLessThan(1);
  });

  it("Theme 6C: offensive-line attrition cliff", () => {
    const r = evaluateOffensiveLineAttritionCluster({
      startersAbsent: 3,
      opponentDepleted: false,
      isWeek18: false,
      rookieBackup: false,
    });
    expect(r.cliffTriggered).toBe(true);
    expect(r.suWinRateDelta).toBeCloseTo(-0.2, 9);
  });

  it("Theme 7: market move information completeness", () => {
    const r = evaluateMarketMoveInformationCompleteness({
      stage: "rumor",
      spreadMove: 9,
      totalMove: 4,
      crossedKeyNumber: true,
      publicShare: 0.7,
    });
    expect(r.completeness).toBe(0.35);
    expect(r.overshootFlag).toBe(true);
    expect(r.fadeMultiplier).toBe(0.6);
  });

  it("Theme 8: rejects an unconditioned misleading stat and accepts a controlled one", () => {
    const rejected = validateFeatureAgainstMisleadingStats({
      name: "yards per play",
      definition: "raw yards per play",
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.record).toBe("8.1");
    const accepted = validateFeatureAgainstMisleadingStats({
      name: "adjusted yards per play",
      definition: "yards per play",
      controls: ["opponent", "game-state", "down-distance"],
    });
    expect(accepted.accepted).toBe(true);
    expect(accepted.requiredControls.length).toBe(3);
  });

  it("maps every Record group 1.x–8.x to a live function with finite output", () => {
    const groups = [
      { theme: "1.x", run: () => computeLeverageAdjustedEpa(play).leverageAdjustedEpa },
      { theme: "2.x", run: () => computeNeutralScriptBaselineAndProe(plays, "AAA").neutralEpa },
      { theme: "3.x", run: () => evaluateRedZoneAndTwoMinuteSplits(plays).rzEpa },
      {
        theme: "4.x",
        run: () =>
          evaluateDecisionBranchWp(
            { scoreMargin: 0, quarter: 2, halfSecondsRemaining: 600, yardline100: 50, ydstogo: 10, down: 2 },
            [{ branch: "punt", successProbability: 1, winProbabilityOnSuccess: 0.5, winProbabilityOnFailure: 0.5 }],
          ).recommendationEdge,
      },
      {
        theme: "5.x",
        run: () =>
          evaluatePersonnelBoxPassInteraction({
            personnel: "11",
            boxCount: 7,
            formationWidth: "normal",
            secondTeOrFbReceivingThreat: false,
            shell: "two-high",
          }).passEpaAdjustment,
      },
      {
        theme: "6.x",
        run: () =>
          evaluateBackupQbReceiverDecoupling({
            alphaTargetShareWithStarter: 0.3,
            alphaTargetShareWithBackup: 0.3,
            yprrWithStarter: 2,
            yprrWithBackup: 2,
            redZoneShareWithStarter: 0.3,
            redZoneShareWithBackup: 0.3,
            timingDependentPerimeterWr: false,
          }).decoupledValueMultiplier,
      },
      {
        theme: "7.x",
        run: () =>
          evaluateMarketMoveInformationCompleteness({
            stage: "confirmed",
            spreadMove: 6,
            totalMove: 3,
            crossedKeyNumber: false,
            publicShare: 0.4,
          }).completeness,
      },
      {
        theme: "8.x",
        run: () =>
          validateFeatureAgainstMisleadingStats({
            name: "completion percentage",
            definition: "completion percentage",
            controls: ["adot", "cpoe"],
          }).accepted
            ? 1
            : 0,
      },
    ];
    expect(groups.length).toBe(8);
    for (const group of groups) {
      const value = group.run();
      expect(Number.isFinite(value), `theme ${group.theme} produced a non-finite value`).toBe(true);
    }
  });
});
