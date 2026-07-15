import type {
  CapturedEvidence,
  EvidenceKind,
  EvidenceRecord,
  FreshnessState,
  HealthState,
  NotCapturedEvidence,
  RightsState,
  SourceTier,
} from "./types";
import type {
  RoomEvidenceRecord,
  RoomGameSignalRecord,
  RoomOddsRecord,
  RoomSourceSnapshotRecord,
} from "./room-types";

const ODDS_HARD_TTL_MS = 4 * 60 * 60 * 1_000;
const ODDS_SOFT_TTL_MS = 30 * 60 * 1_000;
const ODDS_PROVIDER_IDS: ReadonlySet<string> = new Set(["the-odds-api", "the odds api", "odds-api"]);

function iso(date: Date): string {
  return date.toISOString();
}

function policyExpiry(date: Date): string {
  return new Date(date.getTime() + ODDS_HARD_TTL_MS).toISOString();
}

function oddsFreshness(fetchedAt: Date, decidedAt: Date): FreshnessState {
  const age = decidedAt.getTime() - fetchedAt.getTime();
  if (age < 0) return "UNKNOWN";
  if (age <= ODDS_SOFT_TTL_MS) return "FRESH";
  if (age <= ODDS_HARD_TTL_MS) return "AGING";
  return "STALE";
}

function sourceIdentity(provider: string): { id: string; rights: RightsState; tier: SourceTier } {
  const normalized = provider.trim().toLowerCase();
  if (ODDS_PROVIDER_IDS.has(normalized)) {
    return { id: "the-odds-api", rights: "PUBLIC_DERIVED", tier: "TIER_2" };
  }
  return { id: normalized || "unknown", rights: "UNKNOWN", tier: "UNKNOWN" };
}

function runHealth(status: RoomSourceSnapshotRecord["ingestionStatus"]): HealthState {
  if (status === "SUCCESS") return "HEALTHY";
  if (status === "PARTIAL" || status === "RUNNING") return "DEGRADED";
  if (status === "FAILED") return "UNHEALTHY";
  return "UNKNOWN";
}

function signalHealth(trustLevel: number): HealthState {
  if (trustLevel >= 0.8) return "HEALTHY";
  if (trustLevel >= 0.5) return "DEGRADED";
  return "UNHEALTHY";
}

function missing(kind: EvidenceKind, label: string, reason: string): NotCapturedEvidence {
  return { state: "NOT_CAPTURED", kind, label, reason };
}

function oddsEvidence(
  odds: RoomOddsRecord,
  decidedAt: Date,
  health: HealthState,
): CapturedEvidence {
  return {
    state: "CAPTURED",
    id: odds.id,
    kind: "ODDS_SNAPSHOT",
    label: `${odds.bookmaker} ${odds.market}`,
    sourceId: "the-odds-api",
    sourceTier: "TIER_2",
    rights: "PUBLIC_DERIVED",
    health,
    fetchedAt: iso(odds.fetchedAt),
    effectiveAt: null,
    expiresAt: policyExpiry(odds.fetchedAt),
    freshness: oddsFreshness(odds.fetchedAt, decidedAt),
    contradiction: "UNKNOWN",
    disposition: "CONTEXT",
    summary: "Stored book observation used only as derived market context.",
  };
}

function snapshotEvidence(snapshot: RoomSourceSnapshotRecord, decidedAt: Date): CapturedEvidence {
  const source = sourceIdentity(snapshot.provider);
  return {
    state: "CAPTURED",
    id: snapshot.id,
    kind: "SOURCE_SNAPSHOT",
    label: `${snapshot.provider} ${snapshot.sourceKind}`,
    sourceId: source.id,
    sourceTier: source.tier,
    rights: source.rights,
    health: runHealth(snapshot.ingestionStatus),
    fetchedAt: iso(snapshot.fetchedAt),
    effectiveAt: null,
    expiresAt: policyExpiry(snapshot.fetchedAt),
    freshness: oddsFreshness(snapshot.fetchedAt, decidedAt),
    contradiction: "UNKNOWN",
    disposition: "CONTEXT",
    summary: `Immutable source payload captured with hash ${snapshot.payloadHash.slice(0, 12)}.`,
  };
}

function gameSignalEvidence(
  signal: RoomGameSignalRecord,
  decidedAt: Date,
  gameCommenceAt: Date,
): CapturedEvidence {
  const validUntil = signal.expiresAt ?? gameCommenceAt;
  const freshness: FreshnessState = signal.fetchedAt.getTime() > decidedAt.getTime()
    ? "UNKNOWN"
    : validUntil.getTime() < decidedAt.getTime() ? "STALE" : "FRESH";
  return {
    state: "CAPTURED",
    id: signal.id,
    kind: "GAME_SIGNAL",
    label: signal.signalKey.replace(/_/g, " "),
    sourceId: sourceIdentity(signal.sourceName).id,
    sourceTier: "INTERNAL",
    rights: "INTERNAL_ONLY",
    health: signalHealth(signal.trustLevel),
    fetchedAt: iso(signal.fetchedAt),
    effectiveAt: null,
    expiresAt: signal.expiresAt ? iso(signal.expiresAt) : null,
    freshness,
    contradiction: "UNKNOWN",
    disposition: "SUPPORTING",
    summary: `${signal.sourceCategory} signal captured by ${signal.sourceName}.`,
  };
}

export interface RoomEvidenceSelection {
  readonly odds: readonly RoomOddsRecord[];
  readonly snapshots: readonly RoomSourceSnapshotRecord[];
}

export function selectRoomMarketEvidence(
  record: RoomEvidenceRecord,
  decidedAt: Date,
  market: RoomOddsRecord["market"] | null,
): RoomEvidenceSelection {
  const candidates = record.odds.filter(
    (row) => row.fetchedAt.getTime() <= decidedAt.getTime() && (market === null || row.market === market),
  );
  const latestTime = Math.max(-1, ...candidates.map((row) => row.fetchedAt.getTime()));
  const odds = candidates.filter((row) => row.fetchedAt.getTime() === latestTime);
  const runIds = new Set(odds.map((row) => row.ingestionRunId));
  const snapshots = record.sourceSnapshots.filter(
    (snapshot) =>
      snapshot.ingestionRunId !== null &&
      runIds.has(snapshot.ingestionRunId) &&
      snapshot.fetchedAt.getTime() <= decidedAt.getTime(),
  );
  return { odds, snapshots };
}

export function roomEvidenceRecords(
  record: RoomEvidenceRecord,
  decidedAt: Date,
  selection: RoomEvidenceSelection,
): readonly EvidenceRecord[] {
  const healthByRun = new Map(
    selection.snapshots.map((snapshot) => [snapshot.ingestionRunId, runHealth(snapshot.ingestionStatus)]),
  );
  const rows: EvidenceRecord[] = [
    ...selection.odds.map((odds) => oddsEvidence(odds, decidedAt, healthByRun.get(odds.ingestionRunId) ?? "UNKNOWN")),
    ...selection.snapshots.map((snapshot) => snapshotEvidence(snapshot, decidedAt)),
    ...record.gameSignals
      .filter((signal) => !signal.isBootstrap && signal.fetchedAt.getTime() <= decidedAt.getTime())
      .map((signal) => gameSignalEvidence(signal, decidedAt, record.game.commenceTime)),
  ];
  if (selection.odds.length === 0) rows.push(missing("ODDS_SNAPSHOT", "Market snapshot", "No pre-decision odds row was captured."));
  if (selection.snapshots.length === 0) rows.push(missing("SOURCE_SNAPSHOT", "Provider snapshot", "No source snapshot links to the selected odds run."));
  const pick = record.pick;
  if (pick?.signalSnapshot) {
    rows.push({
      state: "CAPTURED", id: pick.signalSnapshot.id, kind: "PICK_SIGNAL_SNAPSHOT",
      label: "Immutable pick signal snapshot", sourceId: "gse-prediction-engine", sourceTier: "INTERNAL",
      rights: "INTERNAL_ONLY", health: "HEALTHY", fetchedAt: iso(pick.signalSnapshot.capturedAt),
      effectiveAt: iso(pick.signalSnapshot.capturedAt), expiresAt: null, freshness: "FRESH",
      contradiction: "UNKNOWN", disposition: "CONTEXT", summary: "Signals active at scoring time were frozen.",
    });
  } else if (pick) rows.push(missing("PICK_SIGNAL_SNAPSHOT", "Pick signal snapshot", "The pick has no immutable signal snapshot."));
  if (record.gateDecision) {
    const gateContradictsDecision = pick
      ? record.gateDecision.status !== "PUBLISHED"
      : record.gateDecision.status !== "GATED";
    rows.push({
      state: "CAPTURED", id: record.gateDecision.id, kind: "GATE_DECISION", label: "Governed gate decision",
      sourceId: "gse-gate", sourceTier: "INTERNAL", rights: "PUBLIC_DERIVED",
      health: gateContradictsDecision ? "UNHEALTHY" : "HEALTHY",
      fetchedAt: iso(record.gateDecision.evaluatedAt), effectiveAt: iso(record.gateDecision.evaluatedAt), expiresAt: null,
      freshness: "FRESH", contradiction: gateContradictsDecision ? "PRESENT" : "NONE",
      disposition: gateContradictsDecision ? "CONTRADICTED" : "SUPPORTING",
      summary: gateContradictsDecision
        ? "The stored gate status contradicts the attached publish-or-pass decision."
        : record.gateDecision.reason,
    });
  } else rows.push(missing("GATE_DECISION", "Gate decision", "No persisted gate decision is attached."));
  if (pick?.proofReceipt) {
    rows.push({
      state: "CAPTURED", id: pick.proofReceipt.id, kind: "PROOF_RECEIPT", label: "Tamper-evident pick receipt",
      sourceId: "gse-proof-ledger", sourceTier: "INTERNAL", rights: "PUBLIC_DERIVED", health: "HEALTHY",
      fetchedAt: iso(pick.proofReceipt.frozenAt), effectiveAt: iso(pick.proofReceipt.frozenAt), expiresAt: null,
      freshness: "FRESH", contradiction: "NONE", disposition: "SUPPORTING",
      summary: `Receipt ${pick.proofReceipt.contentHash.slice(0, 12)} commits the published pick.`,
    });
  } else if (pick) rows.push(missing("PROOF_RECEIPT", "Proof receipt", "The published pick has no frozen receipt."));
  return rows;
}
