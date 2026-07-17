import type { EvidenceDisposition } from "./types";

export interface RoomFactorRecord {
  readonly key: string;
  readonly label: string;
  readonly state: "ACTIVE" | "INACTIVE" | "UNKNOWN";
  readonly disposition: EvidenceDisposition | "UNKNOWN";
  readonly gameSignalIds: readonly string[];
}

export interface RoomSignalSnapshotRecord {
  readonly id: string;
  readonly capturedAt: Date;
  readonly modelVersion: string;
  readonly factors: readonly RoomFactorRecord[];
  readonly rawOutput: string | null;
}

export interface RoomProofReceiptRecord {
  readonly id: string;
  readonly contentHash: string;
  readonly frozenAt: Date;
  readonly entryOdds: number;
  readonly line: number;
}

export interface RoomPickRecord {
  readonly id: string;
  readonly selection: string;
  readonly pickType: "SPREAD" | "TOTAL" | "MONEYLINE";
  readonly line: number;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly bookmakerCount: number;
  readonly reasoningShort: string;
  readonly modelVersion: string;
  readonly generatedAt: Date;
  readonly dataFreshnessAt: Date | null;
  readonly result: "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly settledAt: Date | null;
  readonly clvKind: string | null;
  readonly clvValue: number | null;
  readonly clvVerdict: string | null;
  readonly clvCapturedAt: Date | null;
  readonly signalSnapshot: RoomSignalSnapshotRecord | null;
  readonly proofReceipt: RoomProofReceiptRecord | null;
}

export interface RoomGateDecisionRecord {
  readonly id: string;
  readonly pickId: string | null;
  readonly status: "SCORING" | "PUBLISHED" | "GATED";
  readonly reason: string;
  readonly reasonCode: string;
  readonly edgeIndex: number | null;
  readonly confidence: number | null;
  readonly modelVersion: string;
  readonly evaluatedAt: Date;
  readonly evidenceRefs: unknown;
}

export interface RoomOddsRecord {
  readonly id: string;
  readonly ingestionRunId: string;
  readonly bookmaker: string;
  readonly market: "H2H" | "SPREADS" | "TOTALS";
  readonly fetchedAt: Date;
  readonly spread: number | null;
  readonly total: number | null;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
}

export interface RoomSourceSnapshotRecord {
  readonly id: string;
  readonly ingestionRunId: string | null;
  readonly provider: string;
  readonly sourceKind: string;
  readonly fetchedAt: Date;
  readonly payloadHash: string;
  readonly ingestionStatus: "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL" | null;
}

export interface RoomGameSignalRecord {
  readonly id: string;
  readonly sourceCategory: string;
  readonly sourceName: string;
  readonly signalKey: string;
  readonly fetchedAt: Date;
  readonly expiresAt: Date | null;
  readonly trustLevel: number;
  readonly isBootstrap: boolean;
}

export interface RoomEvidenceRecord {
  readonly game: {
    readonly id: string;
    readonly sport: string;
    readonly matchup: string;
    readonly commenceTime: Date;
    readonly lineMovementSpread: number | null;
    readonly lineMovementTotal: number | null;
  };
  readonly pick: RoomPickRecord | null;
  readonly gateDecision: RoomGateDecisionRecord | null;
  readonly odds: readonly RoomOddsRecord[];
  readonly sourceSnapshots: readonly RoomSourceSnapshotRecord[];
  readonly gameSignals: readonly RoomGameSignalRecord[];
}
