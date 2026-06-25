import { describe, expect, it } from "vitest";
import { fanoutGameSettledHeartbeat } from "../heartbeat.js";
import type { GameSettledEvent, GameSettledFanoutLedgerEntry } from "@sports/types";

const heartbeat: GameSettledEvent = {
  id: "game-settled-2024-01",
  type: "GAME_SETTLED",
  idempotencyKey: "nfl-2024-week-01-kc-bal",
  occurredAt: "2024-09-06T04:12:00.000Z",
  gameId: "2024_01_BAL_KC",
  league: "NFL",
  season: 2024,
  week: 1,
  scoreline: {
    homeTeamId: "KC",
    awayTeamId: "BAL",
    homePoints: 27,
    awayPoints: 20,
  },
  modelVersion: "test-v1",
  completedStages: [],
};

describe("fanoutGameSettledHeartbeat", () => {
  it("emits DATA, FORECAST, PROOF, UNLOCK ledger entries in canonical order", () => {
    const result = fanoutGameSettledHeartbeat({ event: heartbeat });

    expect(result.newLedgerEntries.map((entry) => entry.stage)).toEqual(["DATA", "FORECAST", "PROOF", "UNLOCK"]);
    expect(result.completedStages).toEqual(["DATA", "FORECAST", "PROOF", "UNLOCK"]);
  });

  it("writes one canonical settled sample event per ladder track at PROOF and recomputes counters", () => {
    const result = fanoutGameSettledHeartbeat({ event: heartbeat });

    expect(result.newLadderEvents.map((event) => event.payload.track).sort()).toEqual(["betting", "fantasy"]);
    expect(result.ladderState.settledSamples.canonical).toEqual({ fantasy: 1, betting: 1 });
    expect(result.ladderState.trackRungs).toEqual({ fantasy: "FOUNDING", betting: "FOUNDING" });
  });

  it("is idempotent when replayed with its own ledger and ladder events", () => {
    const first = fanoutGameSettledHeartbeat({ event: heartbeat });
    const second = fanoutGameSettledHeartbeat({
      event: heartbeat,
      priorLedger: first.ledger,
      priorLadderEvents: first.ladderEvents,
    });

    expect(second.newLedgerEntries).toEqual([]);
    expect(second.newLadderEvents).toEqual([]);
    expect(second.ledger).toEqual(first.ledger);
    expect(second.ladderState).toEqual(first.ladderState);
  });

  it("resumes after a partial ledger without duplicating completed stages", () => {
    const priorLedger: GameSettledFanoutLedgerEntry[] = [
      {
        id: "game-settled-2024-01:DATA",
        sourceEventId: heartbeat.id,
        idempotencyKey: `${heartbeat.idempotencyKey}:DATA`,
        stage: "DATA",
        sequence: 0,
        occurredAt: heartbeat.occurredAt,
        modelVersion: heartbeat.modelVersion,
      },
    ];
    const result = fanoutGameSettledHeartbeat({ event: heartbeat, priorLedger });

    expect(result.newLedgerEntries.map((entry) => entry.stage)).toEqual(["FORECAST", "PROOF", "UNLOCK"]);
    expect(result.ledger.map((entry) => entry.stage)).toEqual(["DATA", "FORECAST", "PROOF", "UNLOCK"]);
    expect(result.newLadderEvents).toHaveLength(2);
  });

  it("counts settled samples per game — a second distinct game advances the counter", () => {
    // Regression: the PROOF guard used to be `!hasProofStage(priorLedger)`, which is
    // true only for the FIRST game ever; every later GAME_SETTLED then recorded its
    // PROOF stage but emitted no settled-sample event, freezing settledSamples at 1
    // and stalling rung/projection unlocks. Each distinct game must increment it.
    const first = fanoutGameSettledHeartbeat({ event: heartbeat });

    const secondGame: GameSettledEvent = {
      ...heartbeat,
      id: "game-settled-2024-02",
      idempotencyKey: "nfl-2024-week-02-buf-mia",
      gameId: "2024_02_MIA_BUF",
      week: 2,
    };
    const second = fanoutGameSettledHeartbeat({
      event: secondGame,
      priorLedger: first.ledger,
      priorLadderEvents: first.ladderEvents,
    });

    // The second game emits its own settled-sample events (one per track) and the
    // cumulative counter advances to 2 — the frozen-after-game-1 bug is gone.
    expect(second.newLadderEvents.map((e) => e.payload.track).sort()).toEqual(["betting", "fantasy"]);
    expect(second.newLadderEvents).toHaveLength(2);
    expect(second.ladderState.settledSamples.canonical).toEqual({ fantasy: 2, betting: 2 });
  });

  it("does not create a second sample event when only PROOF was already processed", () => {
    const first = fanoutGameSettledHeartbeat({ event: heartbeat });
    const proofOnlyLedger = first.ledger.filter((entry) => entry.stage === "PROOF");
    const second = fanoutGameSettledHeartbeat({
      event: heartbeat,
      priorLedger: proofOnlyLedger,
      priorLadderEvents: first.ladderEvents,
    });

    expect(second.newLedgerEntries.map((entry) => entry.stage)).toEqual(["DATA", "FORECAST", "UNLOCK"]);
    expect(second.newLadderEvents).toEqual([]);
    expect(second.ladderState.settledSamples.canonical).toEqual({ fantasy: 1, betting: 1 });
  });
});
