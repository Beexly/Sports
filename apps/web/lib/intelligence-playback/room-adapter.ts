import { z } from "zod";
import { buildPickEvidenceEnvelope, type EvidenceHash } from "./build-envelope";
import { roomEvidenceRecords, selectRoomMarketEvidence } from "./room-evidence";
import type {
  Capture,
  ClvState,
  DecisionBoundary,
  EvidenceDecision,
  FactorInput,
  MarketState,
  PickEvidenceEnvelope,
  SettlementState,
} from "./types";
import type { RoomEvidenceRecord, RoomPickRecord } from "./room-types";

const refsSchema = z.object({
  boundary: z.object({
    metric: z.string().min(1),
    observedValue: z.number().finite().nullable(),
    threshold: z.number().finite().nullable(),
    crossed: z.boolean().nullable(),
  }).optional(),
  market: z.object({
    kind: z.string().min(1),
    offeredPrice: z.number().finite().nullable(),
    offeredPoint: z.number().finite().nullable(),
    bookCoverage: z.number().int().nonnegative().nullable(),
    dispersion: z.number().finite().nullable(),
    movement: z.number().finite().nullable(),
    capturedAt: z.string().datetime().nullable(),
  }).optional(),
});

function marketEnum(pickType: RoomPickRecord["pickType"]): "SPREADS" | "TOTALS" | "H2H" {
  if (pickType === "SPREAD") return "SPREADS";
  if (pickType === "TOTAL") return "TOTALS";
  return "H2H";
}

function dispersion(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length < 2) return null;
  return Number((Math.max(...present) - Math.min(...present)).toFixed(3));
}

function boundary(record: RoomEvidenceRecord): DecisionBoundary {
  const parsed = refsSchema.safeParse(record.gateDecision?.evidenceRefs);
  const stored = parsed.success ? parsed.data.boundary : undefined;
  return {
    metric: stored?.metric ?? "edgeIndex",
    observedValue: stored?.observedValue ?? record.gateDecision?.edgeIndex ?? null,
    threshold: stored?.threshold ?? null,
    crossed: stored?.crossed ?? null,
  };
}

function decision(record: RoomEvidenceRecord): EvidenceDecision | null {
  const pick = record.pick;
  const gate = record.gateDecision;
  const common = {
    gateDecisionId: gate?.id ?? null,
    decidedAt: (gate?.evaluatedAt ?? pick?.generatedAt)?.toISOString() ?? record.game.commenceTime.toISOString(),
    reason: gate?.reason ?? "Published pick exists, but its gate decision was not captured.",
    reasonCode: gate?.reasonCode ?? "GATE_DECISION_NOT_CAPTURED",
    boundary: boundary(record),
    reversalCondition: "Re-evaluate if the offered market, source health, or required evidence changes.",
  };
  if (pick) return { ...common, kind: "PUBLISHED", pickId: pick.id, selection: pick.selection };
  if (gate?.status === "GATED") return { ...common, kind: "PASSED" };
  return null;
}

function marketState(record: RoomEvidenceRecord, oddsValues: readonly { spread: number | null; total: number | null }[]): MarketState {
  const pick = record.pick;
  if (pick) {
    const points = pick.pickType === "SPREAD"
      ? oddsValues.map((row) => row.spread)
      : pick.pickType === "TOTAL" ? oddsValues.map((row) => row.total) : [];
    return {
      kind: pick.pickType,
      offeredPrice: pick.proofReceipt?.entryOdds ?? null,
      offeredPoint: pick.pickType === "MONEYLINE" ? null : pick.proofReceipt?.line ?? pick.line,
      bookCoverage: pick.bookmakerCount,
      dispersion: dispersion(points),
      movement: pick.pickType === "SPREAD" ? record.game.lineMovementSpread : pick.pickType === "TOTAL" ? record.game.lineMovementTotal : null,
      capturedAt: pick.dataFreshnessAt?.toISOString() ?? null,
    };
  }
  const parsed = refsSchema.safeParse(record.gateDecision?.evidenceRefs);
  const market = parsed.success ? parsed.data.market : undefined;
  return market ?? {
    kind: "UNKNOWN", offeredPrice: null, offeredPoint: null, bookCoverage: null,
    dispersion: null, movement: null, capturedAt: null,
  };
}

function factors(record: RoomEvidenceRecord, oddsIds: readonly string[], snapshotIds: readonly string[]): readonly FactorInput[] {
  const snapshot = record.pick?.signalSnapshot;
  if (!snapshot) return [];
  return snapshot.factors.map((factor) => ({
    key: factor.key,
    label: factor.label,
    state: factor.state,
    disposition: factor.disposition,
    evidenceIds: factor.key === "market"
      ? [snapshot.id, ...oddsIds, ...snapshotIds]
      : [snapshot.id, ...factor.gameSignalIds],
  }));
}

function settlement(record: RoomEvidenceRecord): Capture<SettlementState> {
  const pick = record.pick;
  if (pick && pick.result !== "PENDING" && pick.settledAt) {
    return { state: "CAPTURED", value: { result: pick.result, settledAt: pick.settledAt.toISOString() } };
  }
  return { state: "NOT_CAPTURED", reason: "No settled outcome is attached to this decision." };
}

function clv(record: RoomEvidenceRecord): Capture<ClvState> {
  const pick = record.pick;
  const validKind = pick?.clvKind === "POINTS" || pick?.clvKind === "PROBABILITY";
  const validVerdict = pick?.clvVerdict === "BEAT_CLOSE" || pick?.clvVerdict === "MATCHED_CLOSE" || pick?.clvVerdict === "LOST_TO_CLOSE";
  if (pick && validKind && validVerdict && pick.clvValue !== null && pick.clvCapturedAt) {
    return {
      state: "CAPTURED",
      value: { kind: pick.clvKind, value: pick.clvValue, verdict: pick.clvVerdict, capturedAt: pick.clvCapturedAt.toISOString() },
    };
  }
  return { state: "NOT_CAPTURED", reason: "A complete closing-line grade is not attached." };
}

export function buildRoomEvidenceEnvelope(
  record: RoomEvidenceRecord,
  hash: EvidenceHash,
): PickEvidenceEnvelope | null {
  const resolvedDecision = decision(record);
  if (!resolvedDecision) return null;
  const decidedAt = new Date(resolvedDecision.decidedAt);
  const market = record.pick ? marketEnum(record.pick.pickType) : null;
  const selected = selectRoomMarketEvidence(record, decidedAt, market);
  const marketRead = marketState(record, selected.odds);
  const pick = record.pick;
  return buildPickEvidenceEnvelope({
    envelopeId: `${record.game.id}:${pick?.id ?? record.gateDecision?.id ?? "decision-not-captured"}`,
    createdAt: resolvedDecision.decidedAt,
    game: {
      id: record.game.id,
      sport: record.game.sport,
      matchup: record.game.matchup,
      commenceTime: record.game.commenceTime.toISOString(),
    },
    decision: resolvedDecision,
    market: marketRead,
    model: {
      version: record.gateDecision?.modelVersion ?? pick?.modelVersion ?? "not-captured",
      rawInternalOutput: pick?.signalSnapshot?.rawOutput ?? null,
      publicRepresentation: pick
        ? `${pick.selection} ${pick.reasoningShort}`.trim()
        : `No edge, no pick. ${record.gateDecision?.reason ?? "The gate reason was not captured."}`,
      uncertainty: "No pick-specific calibrated probability interval was captured; confidence remains a labeled score.",
      disagreement: marketRead.dispersion === null ? null : `Observed book-point dispersion: ${marketRead.dispersion}.`,
    },
    evidence: roomEvidenceRecords(record, decidedAt, selected),
    factors: factors(record, selected.odds.map((row) => row.id), selected.snapshots.map((row) => row.id)),
    receipt: pick?.proofReceipt
      ? {
          state: "CAPTURED",
          value: {
            id: pick.proofReceipt.id,
            contentHash: pick.proofReceipt.contentHash,
            frozenAt: pick.proofReceipt.frozenAt.toISOString(),
          },
        }
      : { state: "NOT_CAPTURED", reason: pick ? "Published pick receipt is missing." : "A PASS has no pick receipt." },
    settlement: settlement(record),
    clv: clv(record),
    calibration: {
      state: "NOT_CAPTURED",
      reason: "The current schema has no immutable pick-to-calibration-effect record.",
    },
  }, hash);
}
