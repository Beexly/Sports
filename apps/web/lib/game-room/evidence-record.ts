import type { Prisma } from "@prisma/client";
import type {
  RoomEvidenceRecord,
  RoomFactorRecord,
  RoomPickRecord,
  RoomSourceSnapshotRecord,
} from "@/lib/intelligence-playback";

export type GameRoomDbRecord = Prisma.GameGetPayload<{
  include: {
    sport: { select: { name: true } };
    picks: { include: { signalSnapshot: true; lossAutopsy: true; proofReceipt: true } };
    gameSignals: true;
    gateDecisions: true;
    odds: {
      select: {
        id: true;
        ingestionRunId: true;
        bookmaker: true;
        market: true;
        fetchedAt: true;
        spread: true;
        total: true;
        homePrice: true;
        awayPrice: true;
        ingestionRun: {
          select: {
            status: true;
            sourceSnapshots: {
              select: {
                id: true;
                ingestionRunId: true;
                provider: true;
                sourceKind: true;
                fetchedAt: true;
                payloadHash: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type PickRow = GameRoomDbRecord["picks"][number];
type SignalRow = GameRoomDbRecord["gameSignals"][number];
type SnapshotRow = NonNullable<PickRow["signalSnapshot"]>;

function signalIds(signals: readonly SignalRow[], predicate: (signal: SignalRow) => boolean): readonly string[] {
  return signals.filter(predicate).map((signal) => signal.id).sort();
}

function factors(snapshot: SnapshotRow, signals: readonly SignalRow[]): readonly RoomFactorRecord[] {
  const category = (name: string): readonly string[] => signalIds(signals, (signal) => signal.sourceCategory === name);
  const lineMovement = signalIds(signals, (signal) => signal.signalKey.toLowerCase().includes("line"));
  const factor = (
    key: string,
    label: string,
    active: boolean,
    gameSignalIds: readonly string[] = [],
  ): RoomFactorRecord => ({
    key,
    label,
    state: active ? "ACTIVE" : "INACTIVE",
    disposition: "UNKNOWN",
    gameSignalIds,
  });
  return [
    factor("market", "Market consensus", snapshot.hadOddsSignal),
    factor("line-movement", "Line movement", snapshot.hadLineMovementSignal, lineMovement),
    factor("rest", "Rest advantage", snapshot.hadRestSignal, category("SCHEDULE")),
    factor("schedule", "Schedule density", snapshot.hadScheduleSignal, category("SCHEDULE")),
    factor("ats-form", "ATS form", snapshot.hadAtsFormSignal),
    factor("head-to-head", "Head-to-head history", snapshot.hadH2HSignal),
    factor("venue", "Venue history", snapshot.hadVenueSignal),
    factor("weather", "Weather", snapshot.hadWeatherSignal, category("WEATHER")),
    factor("injuries", "Injuries", snapshot.hadInjurySignal, category("INJURIES")),
    factor("ratings", "Team ratings", snapshot.hadRatingsSignal, category("RATINGS")),
    factor("player-availability", "Player availability", snapshot.hadPlayerSignal, category("PLAYER_AVAILABILITY")),
    factor("officials", "Officials", snapshot.hadOfficialsSignal, category("OFFICIALS")),
    factor("venue-environment", "Venue environment", snapshot.hadVenueEnvironmentSignal, category("VENUE_ENVIRONMENT")),
    factor("pace", "Pace", snapshot.hadPaceSignal, category("PACE")),
    factor("milestones", "Milestones", snapshot.hadMilestoneSignal, category("MILESTONES")),
  ];
}

function rawSnapshot(snapshot: SnapshotRow): string {
  return [
    `snapshotId=${snapshot.id}`,
    `bookmakerCount=${snapshot.bookmakerCount}`,
    `dataQualityScore=${snapshot.dataQualityScore}`,
    `confidenceAtPrediction=${snapshot.confidenceAtPrediction}`,
    `modelVersion=${snapshot.modelVersion || "not-captured"}`,
  ].join(";");
}

function pickRecord(pick: PickRow, signals: readonly SignalRow[]): RoomPickRecord {
  const snapshot = pick.signalSnapshot;
  return {
    id: pick.id,
    selection: pick.selection,
    pickType: pick.pickType,
    line: pick.line,
    confidence: pick.confidence,
    edgeScore: pick.edgeScore,
    bookmakerCount: pick.bookmakerCount,
    reasoningShort: pick.reasoningShort,
    modelVersion: pick.modelVersion,
    generatedAt: pick.generatedAt,
    dataFreshnessAt: pick.dataFreshnessAt,
    result: pick.result,
    settledAt: pick.settledAt,
    clvKind: pick.clvKind,
    clvValue: pick.clvValue,
    clvVerdict: pick.clvVerdict,
    clvCapturedAt: pick.clvCapturedAt,
    signalSnapshot: snapshot
      ? {
          id: snapshot.id,
          capturedAt: snapshot.capturedAt,
          modelVersion: snapshot.modelVersion,
          factors: factors(snapshot, signals),
          rawOutput: rawSnapshot(snapshot),
        }
      : null,
    proofReceipt: pick.proofReceipt
      ? {
          id: pick.proofReceipt.id,
          contentHash: pick.proofReceipt.contentHash,
          frozenAt: pick.proofReceipt.frozenAt,
          entryOdds: pick.proofReceipt.entryOdds,
          line: pick.proofReceipt.line,
        }
      : null,
  };
}

function sourceSnapshots(game: GameRoomDbRecord): readonly RoomSourceSnapshotRecord[] {
  const snapshots = new Map<string, RoomSourceSnapshotRecord>();
  for (const odds of game.odds ?? []) {
    for (const snapshot of odds.ingestionRun?.sourceSnapshots ?? []) {
      if (snapshots.has(snapshot.id)) continue;
      snapshots.set(snapshot.id, {
        id: snapshot.id,
        ingestionRunId: snapshot.ingestionRunId,
        provider: snapshot.provider,
        sourceKind: snapshot.sourceKind,
        fetchedAt: snapshot.fetchedAt,
        payloadHash: snapshot.payloadHash,
        ingestionStatus: odds.ingestionRun?.status ?? null,
      });
    }
  }
  return [...snapshots.values()];
}

export function gameRoomEvidenceRecord(
  game: GameRoomDbRecord,
  visiblePick: PickRow | null,
): RoomEvidenceRecord {
  const gates = game.gateDecisions ?? [];
  const gate = visiblePick
    ? gates.find((decision) => decision.pickId === visiblePick.id) ?? null
    : gates.find((decision) => decision.status === "GATED") ?? null;
  return {
    game: {
      id: game.id,
      sport: game.sport.name,
      matchup: `${game.awayTeamName} at ${game.homeTeamName}`,
      commenceTime: game.commenceTime,
      lineMovementSpread: game.lineMovementSpread,
      lineMovementTotal: game.lineMovementTotal,
    },
    pick: visiblePick ? pickRecord(visiblePick, game.gameSignals ?? []) : null,
    gateDecision: gate
      ? {
          id: gate.id,
          pickId: gate.pickId,
          status: gate.status,
          reason: gate.reason,
          reasonCode: gate.reasonCode,
          edgeIndex: gate.edgeIndex,
          confidence: gate.confidence,
          modelVersion: gate.modelVersion,
          evaluatedAt: gate.evaluatedAt,
          evidenceRefs: gate.evidenceRefs,
        }
      : null,
    odds: (game.odds ?? []).map((odds) => ({
      id: odds.id,
      ingestionRunId: odds.ingestionRunId,
      bookmaker: odds.bookmaker,
      market: odds.market,
      fetchedAt: odds.fetchedAt,
      spread: odds.spread,
      total: odds.total,
      homePrice: odds.homePrice,
      awayPrice: odds.awayPrice,
    })),
    sourceSnapshots: sourceSnapshots(game),
    gameSignals: (game.gameSignals ?? []).map((signal) => ({
      id: signal.id,
      sourceCategory: signal.sourceCategory,
      sourceName: signal.sourceName,
      signalKey: signal.signalKey,
      fetchedAt: signal.fetchedAt,
      expiresAt: signal.expiresAt,
      trustLevel: signal.trustLevel,
      isBootstrap: signal.isBootstrap,
    })),
  };
}
