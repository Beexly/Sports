/**
 * W004 SportsIR v0 — adapter acceptance suite. Every ADAPTED primitive is
 * proven against a REAL object built by this repo's own production builders
 * (buildRoomEvidenceEnvelope, WorldlineStore, buildRealityReceipt) — never an
 * invented shape — so the vocabulary can only claim what the codebase
 * actually produces (contract: docs/frontier/WORKSTREAM_004_SPORTSIR_V0.md).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WorldlineStore, type WorldObservation } from "@/lib/worldline";
import { buildRoomEvidenceEnvelope, type RoomEvidenceRecord } from "@/lib/intelligence-playback";
import { buildRealityReceipt } from "@/lib/reality-receipt";
import type { ReceiptForVerification } from "@/lib/proof/receipt-proof";
import {
  makeSportsIrEntity,
  pickDecisionToSportsIrClaim,
  realityReceiptToSportsIrProof,
  settlementToSportsIrOutcome,
  worldObservationToSportsIrObservation,
  worldSnapshotToSportsIrState,
} from "../adapters";

const sha256 = (payload: string): string => createHash("sha256").update(payload).digest("hex");

// ── Real Worldline fixtures (W002 store) ─────────────────────────────────────

const OBS: WorldObservation = {
  id: "obs-final",
  entityId: "game-1",
  attribute: "score",
  value: "24-20",
  occurredAt: "2026-01-01T16:00:00.000Z",
  observedAt: "2026-01-01T20:00:00.000Z",
  source: "nflverse",
};

// ── Real playback-envelope fixture (W001 builder, reality-receipt test idiom) ─

const KICKOFF = new Date("2026-07-14T20:00:00.000Z");
const PAYLOAD =
  "asOf=2026-07-14T16:00:00.000Z|confidence=78|edgeScore=71|entryOdds=-110|line=-3.5|marketFairProb=0.52|modelProb=none|modelVersion=gse-v6|selection=Home -3.5";

function publishedRecord(overrides: Partial<NonNullable<RoomEvidenceRecord["pick"]>> = {}): RoomEvidenceRecord {
  const evaluatedAt = new Date("2026-07-14T16:05:00.000Z");
  return {
    game: {
      id: "game-1",
      sport: "NFL",
      matchup: "Away at Home",
      commenceTime: KICKOFF,
      lineMovementSpread: -0.5,
      lineMovementTotal: null,
    },
    pick: {
      id: "pick-1",
      selection: "Home -3.5",
      pickType: "SPREAD",
      line: -3.5,
      confidence: 78,
      edgeScore: 71,
      bookmakerCount: 2,
      reasoningShort: "Market and schedule evidence cleared the gate.",
      modelVersion: "gse-v6",
      generatedAt: evaluatedAt,
      dataFreshnessAt: new Date("2026-07-14T16:00:00.000Z"),
      result: "PENDING",
      settledAt: null,
      clvKind: null,
      clvValue: null,
      clvVerdict: null,
      clvCapturedAt: null,
      signalSnapshot: {
        id: "pick-signal-1",
        capturedAt: evaluatedAt,
        modelVersion: "gse-v6",
        rawOutput: "confidenceAtPrediction=78;dataQualityScore=84",
        factors: [
          { key: "market", label: "Market consensus", state: "ACTIVE", disposition: "SUPPORTING", gameSignalIds: [] },
        ],
      },
      proofReceipt: {
        id: "receipt-1",
        contentHash: sha256(`leaf:pick-1:${PAYLOAD}`),
        frozenAt: new Date("2026-07-14T16:00:00.000Z"),
        entryOdds: -110,
        line: -3.5,
      },
      ...overrides,
    },
    gateDecision: {
      id: "gate-1",
      pickId: "pick-1",
      status: "PUBLISHED",
      reason: "The governed edge floor cleared.",
      reasonCode: "EDGE_CLEARED",
      edgeIndex: 71,
      confidence: 78,
      modelVersion: "gse-v6",
      evaluatedAt,
      evidenceRefs: { boundary: { metric: "edgeIndex", observedValue: 71, threshold: 65, crossed: true } },
    },
    odds: [
      { id: "odds-1", ingestionRunId: "run-1", bookmaker: "book-a", market: "SPREADS", fetchedAt: new Date("2026-07-14T16:00:00.000Z"), spread: -3.5, total: null, homePrice: null, awayPrice: null },
    ],
    sourceSnapshots: [
      { id: "source-1", ingestionRunId: "run-1", provider: "the-odds-api", sourceKind: "ODDS_EVENTS", fetchedAt: new Date("2026-07-14T16:00:00.000Z"), payloadHash: "payload-hash", ingestionStatus: "SUCCESS" },
    ],
    gameSignals: [],
  };
}

const receiptRow: ReceiptForVerification = {
  pickId: "pick-1",
  payload: PAYLOAD,
  contentHash: sha256(`leaf:pick-1:${PAYLOAD}`),
  line: -3.5,
  entryOdds: -110,
  marketFairProb: 0.52,
  confidence: 78,
  edgeScore: 71,
  modelProb: null,
  modelVersion: "gse-v6",
  asOf: new Date("2026-07-14T16:00:00.000Z"),
};

// ── Entity ───────────────────────────────────────────────────────────────────

describe("Entity", () => {
  it("carries exactly the explicit id/kind/label — nothing inferred from the id string", () => {
    const entity = makeSportsIrEntity("game-1", "GAME", "Away at Home");
    expect(entity).toEqual({ id: "game-1", kind: "GAME", label: "Away at Home" });
  });
});

// ── Observation / State ← real WorldlineStore output ─────────────────────────

describe("Observation + State (← Worldline, W002)", () => {
  it("maps a real WorldObservation losslessly; absent optional clocks stay absent", () => {
    const ir = worldObservationToSportsIrObservation(OBS);
    expect(ir).toEqual({
      id: "obs-final",
      entityId: "game-1",
      attribute: "score",
      value: "24-20",
      source: "nflverse",
      occurredAt: "2026-01-01T16:00:00.000Z",
      observedAt: "2026-01-01T20:00:00.000Z",
    });
    expect("publishedAt" in ir).toBe(false);
    expect("effectiveAt" in ir).toBe(false);
  });

  it("carries publishedAt/effectiveAt through when the observation has them", () => {
    const ir = worldObservationToSportsIrObservation({
      ...OBS,
      publishedAt: "2026-01-01T20:05:00.000Z",
      effectiveAt: "2026-01-01T16:00:00.000Z",
    });
    expect(ir.publishedAt).toBe("2026-01-01T20:05:00.000Z");
    expect(ir.effectiveAt).toBe("2026-01-01T16:00:00.000Z");
  });

  it("maps a REAL resolved WorldSnapshot to a State, digest carried through untouched", () => {
    const store = new WorldlineStore();
    store.ingest(OBS);
    const snapshot = store.resolve({ validTime: "2026-01-01T23:00:00.000Z", knowledgeTime: "2026-01-01T21:00:00.000Z" });
    const state = worldSnapshotToSportsIrState(snapshot);

    expect(state.digest).toBe(snapshot.digest);
    expect(state.asOf).toEqual({ validTime: "2026-01-01T23:00:00.000Z", knowledgeTime: "2026-01-01T21:00:00.000Z" });
    expect(state.cells).toEqual([
      { entityId: "game-1", attribute: "score", value: "24-20", asOfObservationId: "obs-final" },
    ]);
  });

  it("a pre-knowledge snapshot maps to an honestly EMPTY State — never a fabricated cell", () => {
    const store = new WorldlineStore();
    store.ingest(OBS); // observedAt 20:00
    const state = worldSnapshotToSportsIrState(
      store.resolve({ validTime: "2026-01-01T23:00:00.000Z", knowledgeTime: "2026-01-01T18:00:00.000Z" }),
    );
    expect(state.cells).toHaveLength(0);
  });
});

// ── Claim / Outcome ← real envelope builder output ───────────────────────────

describe("Claim + Outcome (← PickEvidenceEnvelope, W001)", () => {
  it("a PUBLISHED decision maps to a PICK_PUBLISHED claim with honest null confidence", () => {
    const envelope = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    const claim = pickDecisionToSportsIrClaim(envelope);

    expect(claim.kind).toBe("PICK_PUBLISHED");
    expect(claim.subjectEntityId).toBe("game-1");
    expect(claim.assertedBy).toBe("gse-v6");
    expect(claim.statement).toContain("Home -3.5");
    // The envelope layer carries no numeric confidence — the adapter must not invent one.
    expect(claim.confidence).toBeNull();
    expect(claim.publishedAt).toBe(envelope.decision.decidedAt);
  });

  it("a PASSED decision maps to PICK_PASSED with NO publishedAt", () => {
    const base = publishedRecord();
    const record: RoomEvidenceRecord = {
      ...base,
      pick: null,
      gateDecision: base.gateDecision ? { ...base.gateDecision, status: "GATED" } : null,
    };
    const envelope = buildRoomEvidenceEnvelope(record, sha256)!;
    const claim = pickDecisionToSportsIrClaim(envelope);

    expect(claim.kind).toBe("PICK_PASSED");
    expect("publishedAt" in claim).toBe(false);
  });

  it("an unsettled envelope yields NO Outcome (null) — absence is never fabricated", () => {
    const envelope = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    expect(envelope.settlement.state).toBe("NOT_CAPTURED");
    expect(settlementToSportsIrOutcome(envelope)).toBeNull();
  });

  it("a settled envelope maps its real settlement into an Outcome", () => {
    const envelope = buildRoomEvidenceEnvelope(
      publishedRecord({ result: "WIN", settledAt: new Date("2026-07-15T00:30:00.000Z") }),
      sha256,
    )!;
    const outcome = settlementToSportsIrOutcome(envelope);

    expect(outcome).not.toBeNull();
    expect(outcome!.kind).toBe("WIN");
    expect(outcome!.entityId).toBe("game-1");
    expect(outcome!.settledAt).toBe("2026-07-15T00:30:00.000Z");
  });
});

// ── Proof ← real buildRealityReceipt output ──────────────────────────────────

describe("Proof (← RealityReceipt, W003)", () => {
  const envelope = () => buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
  const after = new Date("2026-07-15T00:00:00.000Z");

  it("maps a Bitcoin-attested receipt: digest + verified verdict + BITCOIN_ATTESTED anchor", () => {
    const receipt = buildRealityReceipt(
      { envelope: envelope(), receiptRow, anchor: { state: "BITCOIN_ATTESTED", slateKey: "NFL:2026-07-14", bitcoinBlockHeights: [905432] }, now: after },
      sha256,
    );
    const proof = realityReceiptToSportsIrProof(receipt);

    expect(proof.digest).toBe(receipt.digest);
    expect(proof.subjectEntityId).toBe("game-1");
    expect(proof.verified).toBe(true);
    expect(proof.anchor).toBe("BITCOIN_ATTESTED");
  });

  it("PENDING → PENDING and NOT_REQUESTED → NONE", () => {
    expect(
      realityReceiptToSportsIrProof(
        buildRealityReceipt({ envelope: envelope(), receiptRow, anchor: { state: "PENDING", slateKey: "NFL:2026-07-14", pendingCalendars: ["https://a.calendar"] }, now: after }, sha256),
      ).anchor,
    ).toBe("PENDING");
    expect(
      realityReceiptToSportsIrProof(
        buildRealityReceipt({ envelope: envelope(), receiptRow, anchor: { state: "NOT_REQUESTED" }, now: after }, sha256),
      ).anchor,
    ).toBe("NONE");
  });

  it.each([
    { state: "NOT_MIGRATED" } as const,
    { state: "NO_PROOF" } as const,
    { state: "UNAVAILABLE" } as const,
  ])("$state collapses to UNKNOWN — never asserted as anchored or not-anchored", (anchor) => {
    const receipt = buildRealityReceipt({ envelope: envelope(), receiptRow, anchor, now: after }, sha256);
    expect(realityReceiptToSportsIrProof(receipt).anchor).toBe("UNKNOWN");
  });

  it("a receipt with NO captured proof receipt maps verified to null, not false", () => {
    const base = publishedRecord();
    const record: RoomEvidenceRecord = {
      ...base,
      pick: null,
      gateDecision: base.gateDecision ? { ...base.gateDecision, status: "GATED" } : null,
    };
    const passedEnvelope = buildRoomEvidenceEnvelope(record, sha256)!;
    const receipt = buildRealityReceipt(
      { envelope: passedEnvelope, receiptRow: null, anchor: { state: "NOT_REQUESTED" }, now: after },
      sha256,
    );
    expect(receipt.receipt.state).toBe("NOT_CAPTURED");
    const proof = realityReceiptToSportsIrProof(receipt);
    expect(proof.verified).toBeNull();
  });

  it("a tamper-failed receipt maps verified:false — the adapter never launders a bad check", () => {
    const tampered: ReceiptForVerification = { ...receiptRow, line: 999 };
    const receipt = buildRealityReceipt(
      { envelope: envelope(), receiptRow: tampered, anchor: { state: "NOT_REQUESTED" }, now: after },
      sha256,
    );
    expect(realityReceiptToSportsIrProof(receipt).verified).toBe(false);
  });
});
