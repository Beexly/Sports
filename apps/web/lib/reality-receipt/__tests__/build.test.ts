import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildRoomEvidenceEnvelope, type RoomEvidenceRecord } from "@/lib/intelligence-playback";
import type { ReceiptForVerification } from "@/lib/proof/receipt-proof";
import { buildRealityReceipt } from "../build";
import type { RealityReceiptAnchor } from "../types";

const sha256 = (payload: string): string => createHash("sha256").update(payload).digest("hex");

const KICKOFF = new Date("2026-07-14T20:00:00.000Z");
const BEFORE_KICKOFF = new Date("2026-07-14T18:00:00.000Z");
const AFTER_KICKOFF = new Date("2026-07-15T00:00:00.000Z");

// Committed-field values below MUST agree with the canonical payload string
// (parseCanonicalPayload is what verifyReceiptIntegrity cross-checks against).
const PAYLOAD =
  "asOf=2026-07-14T16:00:00.000Z|confidence=78|edgeScore=71|entryOdds=-110|line=-3.5|marketFairProb=0.52|modelProb=none|modelVersion=gse-v6|selection=Home -3.5";

function publishedRecord(overrides: Partial<RoomEvidenceRecord["pick"]> = {}): RoomEvidenceRecord {
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
      { id: "odds-2", ingestionRunId: "run-1", bookmaker: "book-b", market: "SPREADS", fetchedAt: new Date("2026-07-14T16:00:00.000Z"), spread: -3, total: null, homePrice: null, awayPrice: null },
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

const NOT_REQUESTED: RealityReceiptAnchor = { state: "NOT_REQUESTED" };
const BITCOIN: RealityReceiptAnchor = { state: "BITCOIN_ATTESTED", slateKey: "NFL:2026-07-14", bitcoinBlockHeights: [905432] };

describe("buildRealityReceipt", () => {
  it("is SEALED before kickoff, unsettled — committed fields never appear", () => {
    const envelope = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    const receipt = buildRealityReceipt({ envelope, receiptRow, anchor: NOT_REQUESTED, now: BEFORE_KICKOFF }, sha256);

    expect(receipt.receipt.state).toBe("SEALED");
    expect(receipt.receipt).not.toHaveProperty("committed");
    if (receipt.receipt.state === "SEALED") expect(receipt.receipt.verified).toBe(true);
  });

  it("OPENS at kickoff and surfaces committed fields once verified", () => {
    const envelope = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    const receipt = buildRealityReceipt({ envelope, receiptRow, anchor: NOT_REQUESTED, now: AFTER_KICKOFF }, sha256);

    expect(receipt.receipt.state).toBe("OPEN");
    if (receipt.receipt.state === "OPEN") {
      expect(receipt.receipt.verified).toBe(true);
      expect(receipt.receipt.committed).toEqual({
        line: -3.5,
        entryOdds: -110,
        marketFairProb: 0.52,
        confidence: 78,
        edgeScore: 71,
        modelProb: null,
      });
    }
  });

  it("withholds committed fields on a failed tamper check, even once open", () => {
    const envelope = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    const tampered: ReceiptForVerification = { ...receiptRow, line: 999 }; // DB column drifted from the hashed payload
    const receipt = buildRealityReceipt({ envelope, receiptRow: tampered, anchor: NOT_REQUESTED, now: AFTER_KICKOFF }, sha256);

    expect(receipt.receipt.state).toBe("OPEN");
    if (receipt.receipt.state === "OPEN") {
      expect(receipt.receipt.verified).toBe(false);
      expect(receipt.receipt.committed).toBeNull();
    }
  });

  it("a PASSED decision (or missing receipt) is honestly NOT_CAPTURED, not fabricated", () => {
    const base = publishedRecord();
    const record: RoomEvidenceRecord = {
      ...base,
      pick: null,
      gateDecision: base.gateDecision ? { ...base.gateDecision, status: "GATED" } : null,
    };
    const envelope = buildRoomEvidenceEnvelope(record, sha256)!;
    const receipt = buildRealityReceipt({ envelope, receiptRow: null, anchor: NOT_REQUESTED, now: BEFORE_KICKOFF }, sha256);

    expect(receipt.decision.kind).toBe("PASSED");
    expect(receipt.receipt.state).toBe("NOT_CAPTURED");
  });

  it("is REPRODUCIBLE: identical inputs (fixed `now`) yield an identical digest, excluding generatedAt", () => {
    const envelope = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    const a = buildRealityReceipt({ envelope, receiptRow, anchor: BITCOIN, now: AFTER_KICKOFF }, sha256);
    // Rebuild with a different wall-clock `now` far later — generatedAt differs but the
    // digest must not, since kickoff/settlement state (isOpen) is unchanged (both after kickoff).
    const b = buildRealityReceipt({ envelope, receiptRow, anchor: BITCOIN, now: new Date("2027-01-01T00:00:00.000Z") }, sha256);

    expect(a.generatedAt).not.toBe(b.generatedAt);
    expect(a.digest).toBe(b.digest);
  });

  it("the digest genuinely depends on the anchor status, not just the envelope+receipt", () => {
    const envelope = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    const withoutAnchor = buildRealityReceipt({ envelope, receiptRow, anchor: NOT_REQUESTED, now: AFTER_KICKOFF }, sha256);
    const withAnchor = buildRealityReceipt({ envelope, receiptRow, anchor: BITCOIN, now: AFTER_KICKOFF }, sha256);

    expect(withoutAnchor.digest).not.toBe(withAnchor.digest);
  });

  it("a different envelope (different evidence) yields a different digest", () => {
    const envelopeA = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    const envelopeB = buildRoomEvidenceEnvelope(publishedRecord({ selection: "Home -7.5" }), sha256)!;
    expect(envelopeA.digest).not.toBe(envelopeB.digest);

    const a = buildRealityReceipt({ envelope: envelopeA, receiptRow, anchor: NOT_REQUESTED, now: AFTER_KICKOFF }, sha256);
    const b = buildRealityReceipt({ envelope: envelopeB, receiptRow, anchor: NOT_REQUESTED, now: AFTER_KICKOFF }, sha256);
    expect(a.digest).not.toBe(b.digest);
  });

  it("carries the envelope id, digest, and publication status through untouched", () => {
    const envelope = buildRoomEvidenceEnvelope(publishedRecord(), sha256)!;
    const receipt = buildRealityReceipt({ envelope, receiptRow, anchor: NOT_REQUESTED, now: BEFORE_KICKOFF }, sha256);

    expect(receipt.envelope.id).toBe(envelope.envelopeId);
    expect(receipt.envelope.digest).toBe(envelope.digest);
    expect(receipt.envelope.publicationStatus).toBe(envelope.publication.status);
    expect(receipt.schemaVersion).toBe("reality-receipt/v0");
  });
});
