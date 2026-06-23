import { describe, expect, it } from "vitest";
import { reduceLadder } from "../reduce.js";
import type {
  BettingProofRecordedEvent,
  CalibrationPublishedEvent,
  FantasyProofRecordedEvent,
  LadderEvent,
  SettledSampleReachedEvent,
} from "@sports/types";

const MODEL_VERSION = "test-v1";

function settledEvent(overrides: {
  id: string;
  occurredAt?: string;
  payload: SettledSampleReachedEvent["payload"];
}): SettledSampleReachedEvent {
  return {
    id: overrides.id,
    type: "SETTLED_SAMPLE_REACHED",
    occurredAt: overrides.occurredAt ?? `2026-06-23T00:00:${overrides.id.slice(-2)}Z`,
    modelVersion: MODEL_VERSION,
    payload: overrides.payload,
  };
}

function calibrationEvent(overrides: {
  id: string;
  occurredAt?: string;
  payload: CalibrationPublishedEvent["payload"];
}): CalibrationPublishedEvent {
  return {
    id: overrides.id,
    type: "CALIBRATION_PUBLISHED",
    occurredAt: overrides.occurredAt ?? `2026-06-23T00:00:${overrides.id.slice(-2)}Z`,
    modelVersion: MODEL_VERSION,
    payload: overrides.payload,
  };
}

const validFantasyProof: FantasyProofRecordedEvent = {
  id: "evt-11",
  type: "FANTASY_PROOF_RECORDED",
  occurredAt: "2026-06-23T00:00:11Z",
  modelVersion: MODEL_VERSION,
  payload: {
    track: "fantasy",
    estimatorKey: "weekly-player-projection",
    proofWindow: "2024-regular-season",
    positions: [
      { position: "QB", sampleSize: 30, meanAbsoluteError: 3.1, intervalCoverage: 0.82, rankCorrelation: 0.39 },
      { position: "RB", sampleSize: 70, meanAbsoluteError: 2.7, intervalCoverage: 0.8, rankCorrelation: 0.34 },
      { position: "WR", sampleSize: 90, meanAbsoluteError: 2.8, intervalCoverage: 0.81, rankCorrelation: 0.36 },
      { position: "TE", sampleSize: 40, meanAbsoluteError: 2.1, intervalCoverage: 0.79, rankCorrelation: 0.31 },
    ],
  },
};

const validBettingProof: BettingProofRecordedEvent = {
  id: "evt-21",
  type: "BETTING_PROOF_RECORDED",
  occurredAt: "2026-06-23T00:00:21Z",
  modelVersion: MODEL_VERSION,
  payload: {
    track: "betting",
    estimatorKey: "market-anchor",
    proofWindow: "2024-regular-season",
    sampleSize: 125,
    clvBeatRate: 0.53,
    brierScore: 0.22,
    logLoss: 0.65,
  },
};

describe("reduceLadder", () => {
  it("keeps founding state without proof and does not flip shadow surfaces", () => {
    const state = reduceLadder([]);

    expect(state.currentRung).toBe("FOUNDING");
    expect(state.trackRungs).toEqual({ fantasy: "FOUNDING", betting: "FOUNDING" });
    expect(state.surfaceEligibility.canPublishProjections).toBe(false);
    expect(state.surfaceEligibility.performanceStatsEnabled).toBe(false);
    expect(state.pricedEstimators).toEqual([]);
  });

  it("does not advance a rung from settled samples alone", () => {
    const state = reduceLadder([
      settledEvent({
        id: "evt-01",
        payload: { track: "betting", sample: "canonical", settledCount: 125, threshold: 100 },
      }),
    ]);

    expect(state.trackRungs.betting).toBe("FOUNDING");
    expect(state.surfaceEligibility.performanceStatsEnabled).toBe(false);
  });

  it("ignores bootstrap samples for canonical rung advancement", () => {
    const state = reduceLadder([
      settledEvent({
        id: "evt-02",
        payload: { track: "fantasy", sample: "bootstrap", settledCount: 1000, threshold: 100 },
      }),
      validFantasyProof,
      calibrationEvent({
        id: "evt-12",
        payload: {
          track: "fantasy",
          proposalStatus: "IMPLEMENTED",
          calibrationProposalId: "cal-1",
          frozenModelVersion: MODEL_VERSION,
        },
      }),
    ]);

    expect(state.settledSamples.canonical.fantasy).toBe(0);
    expect(state.settledSamples.bootstrap.fantasy).toBe(1000);
    expect(state.trackRungs.fantasy).toBe("FOUNDING");
    expect(state.surfaceEligibility.canPublishProjections).toBe(false);
  });

  it("requires a model-freeze-backed calibration publish before calibration counts", () => {
    const state = reduceLadder([
      settledEvent({
        id: "evt-03",
        payload: { track: "fantasy", sample: "canonical", settledCount: 125, threshold: 100 },
      }),
      validFantasyProof,
      calibrationEvent({
        id: "evt-13",
        payload: {
          track: "fantasy",
          proposalStatus: "DRAFT",
          calibrationProposalId: "cal-draft",
          frozenModelVersion: null,
        },
      }),
    ]);

    expect(state.validCalibration.fantasy).toBe(false);
    expect(state.trackRungs.fantasy).toBe("FOUNDING");
  });

  it("keeps fantasy and betting evidence on separate tracks", () => {
    const state = reduceLadder([
      settledEvent({
        id: "evt-04",
        payload: { track: "fantasy", sample: "canonical", settledCount: 125, threshold: 100 },
      }),
      validFantasyProof,
      calibrationEvent({
        id: "evt-14",
        payload: {
          track: "fantasy",
          proposalStatus: "IMPLEMENTED",
          calibrationProposalId: "cal-fantasy",
          frozenModelVersion: MODEL_VERSION,
        },
      }),
    ]);

    expect(state.trackRungs.fantasy).toBe("PROVEN");
    expect(state.trackRungs.betting).toBe("FOUNDING");
    expect(state.surfaceEligibility.canPublishProjections).toBe(true);
    expect(state.surfaceEligibility.performanceStatsEnabled).toBe(false);
    expect(state.pricedEstimators).toEqual([]);
  });

  it("derives betting rung, priced estimator, and performance stats from the same evidence milestone", () => {
    const settled = settledEvent({
      id: "evt-05",
      payload: { track: "betting", sample: "canonical", settledCount: 125, threshold: 100 },
    });
    const calibration = calibrationEvent({
      id: "evt-15",
      payload: {
        track: "betting",
        proposalStatus: "IMPLEMENTED",
        calibrationProposalId: "cal-betting",
        frozenModelVersion: MODEL_VERSION,
      },
    });
    const state = reduceLadder([validBettingProof, calibration, settled]);

    expect(state.trackRungs.betting).toBe("PROVEN");
    expect(state.pricedEstimators).toEqual(["market-anchor"]);
    expect(state.surfaceEligibility.performanceStatsEnabled).toBe(true);

    const bettingDerivations = state.derivations.filter((derivation) => derivation.track === "betting");
    expect(bettingDerivations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "RUNG_ADVANCED",
          sourceEventIds: ["evt-05", "evt-15", "evt-21"],
        }),
        expect.objectContaining({
          type: "ESTIMATOR_PRICED",
          sourceEventIds: ["evt-05", "evt-15", "evt-21"],
        }),
        expect.objectContaining({
          type: "PERFORMANCE_STATS_ENABLED",
          sourceEventIds: ["evt-05", "evt-15", "evt-21"],
        }),
      ])
    );
  });

  it("replays deterministically regardless of input order", () => {
    const events: LadderEvent[] = [
      validBettingProof,
      settledEvent({
        id: "evt-06",
        payload: { track: "betting", sample: "canonical", settledCount: 125, threshold: 100 },
      }),
      calibrationEvent({
        id: "evt-16",
        payload: {
          track: "betting",
          proposalStatus: "IMPLEMENTED",
          calibrationProposalId: "cal-betting",
          frozenModelVersion: MODEL_VERSION,
        },
      }),
    ];

    const first = reduceLadder(events);
    const second = reduceLadder([...events].reverse());

    expect(second).toEqual(first);
  });
});
