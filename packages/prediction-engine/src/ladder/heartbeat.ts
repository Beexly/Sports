import {
  GAME_SETTLED_STAGES,
  RUNG_REQUIREMENTS,
  type GameSettledEvent,
  type GameSettledFanoutLedgerEntry,
  type GameSettledStage,
  type LadderEvent,
  type LadderState,
  type LadderTrack,
} from "@sports/types";
import { reduceLadder } from "./reduce.js";

export interface GameSettledFanoutInput {
  readonly event: GameSettledEvent;
  readonly priorLedger?: readonly GameSettledFanoutLedgerEntry[];
  readonly priorLadderEvents?: readonly LadderEvent[];
}

export interface GameSettledFanoutResult {
  readonly ledger: readonly GameSettledFanoutLedgerEntry[];
  readonly newLedgerEntries: readonly GameSettledFanoutLedgerEntry[];
  readonly ladderEvents: readonly LadderEvent[];
  readonly newLadderEvents: readonly LadderEvent[];
  readonly ladderState: LadderState;
  readonly completedStages: readonly GameSettledStage[];
}

const TRACKS: readonly LadderTrack[] = ["fantasy", "betting"] as const;

export function fanoutGameSettledHeartbeat(input: GameSettledFanoutInput): GameSettledFanoutResult {
  const priorLedger = sortedLedger(input.priorLedger ?? []);
  const priorLadderEvents = input.priorLadderEvents ?? [];
  const processedKeys = new Set(priorLedger.map((entry) => entry.idempotencyKey));
  const newLedgerEntries: GameSettledFanoutLedgerEntry[] = [];
  const newLadderEvents: LadderEvent[] = [];

  for (const stage of GAME_SETTLED_STAGES) {
    const idempotencyKey = stageIdempotencyKey(input.event, stage);
    if (processedKeys.has(idempotencyKey)) {
      continue;
    }

    newLedgerEntries.push(stageLedgerEntry(input.event, stage));
    processedKeys.add(idempotencyKey);

    // Emit the settled-sample increment once per game's PROOF stage. The
    // per-event idempotencyKey check above already prevents re-processing THIS
    // event's PROOF; the count must advance for every distinct settled game, so
    // it must NOT be gated on whether any prior game reached PROOF (that froze
    // settledSamples after the first game and stalled rung/projection unlocks).
    if (stage === "PROOF") {
      const stateBeforeProof = reduceLadder([...priorLadderEvents, ...newLadderEvents]);
      newLadderEvents.push(...settledSampleEvents(input.event, stateBeforeProof));
    }
  }

  const ledger = sortedLedger([...priorLedger, ...newLedgerEntries]);
  const ladderEvents = [...priorLadderEvents, ...newLadderEvents];

  return {
    ledger,
    newLedgerEntries,
    ladderEvents,
    newLadderEvents,
    ladderState: reduceLadder(ladderEvents),
    completedStages: ledger.map((entry) => entry.stage),
  };
}

function stageLedgerEntry(event: GameSettledEvent, stage: GameSettledStage): GameSettledFanoutLedgerEntry {
  return {
    id: `${event.id}:${stage}`,
    sourceEventId: event.id,
    idempotencyKey: stageIdempotencyKey(event, stage),
    stage,
    sequence: GAME_SETTLED_STAGES.indexOf(stage),
    occurredAt: event.occurredAt,
    modelVersion: event.modelVersion,
  };
}

function settledSampleEvents(event: GameSettledEvent, stateBeforeProof: LadderState): readonly LadderEvent[] {
  return TRACKS.map((track) => {
    const settledCount = stateBeforeProof.settledSamples.canonical[track] + 1;
    return {
      id: `${event.id}:PROOF:${track}:settled-sample`,
      type: "SETTLED_SAMPLE_REACHED",
      occurredAt: event.occurredAt,
      modelVersion: event.modelVersion,
      sourceEventId: event.id,
      payload: {
        track,
        sample: "canonical",
        settledCount,
        threshold: RUNG_REQUIREMENTS[track].PROVEN.settledSamples,
      },
    };
  });
}

function stageIdempotencyKey(event: GameSettledEvent, stage: GameSettledStage): string {
  return `${event.idempotencyKey}:${stage}`;
}

function sortedLedger(entries: readonly GameSettledFanoutLedgerEntry[]): readonly GameSettledFanoutLedgerEntry[] {
  return [...entries].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
}
