import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildRoomEvidenceEnvelope,
  projectIntelligenceEvents,
  type RoomEvidenceRecord,
} from "@/lib/intelligence-playback";

const sha256 = (payload: string): string => createHash("sha256").update(payload).digest("hex");

function publishedRecord(): RoomEvidenceRecord {
  const evaluatedAt = new Date("2026-07-14T16:05:00.000Z");
  return {
    game: {
      id: "game-1",
      sport: "NFL",
      matchup: "Away at Home",
      commenceTime: new Date("2026-07-14T20:00:00.000Z"),
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
          {
            key: "market",
            label: "Market consensus",
            state: "ACTIVE",
            disposition: "SUPPORTING",
            gameSignalIds: [],
          },
        ],
      },
      proofReceipt: {
        id: "receipt-1",
        contentHash: "receipt-hash-a",
        frozenAt: evaluatedAt,
        entryOdds: -110,
        line: -3.5,
      },
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
      evidenceRefs: {
        boundary: { metric: "edgeIndex", observedValue: 71, threshold: 65, crossed: true },
      },
    },
    odds: [
      {
        id: "odds-1",
        ingestionRunId: "run-1",
        bookmaker: "book-a",
        market: "SPREADS",
        fetchedAt: new Date("2026-07-14T16:00:00.000Z"),
        spread: -3.5,
        total: null,
        homePrice: null,
        awayPrice: null,
      },
      {
        id: "odds-2",
        ingestionRunId: "run-1",
        bookmaker: "book-b",
        market: "SPREADS",
        fetchedAt: new Date("2026-07-14T16:00:00.000Z"),
        spread: -3,
        total: null,
        homePrice: null,
        awayPrice: null,
      },
    ],
    sourceSnapshots: [
      {
        id: "source-1",
        ingestionRunId: "run-1",
        provider: "the-odds-api",
        sourceKind: "ODDS_EVENTS",
        fetchedAt: new Date("2026-07-14T16:00:00.000Z"),
        payloadHash: "payload-hash",
        ingestionStatus: "SUCCESS",
      },
    ],
    gameSignals: [],
  };
}

describe("Game Room evidence adapter", () => {
  it("builds a public-eligible envelope from exact stored evidence and binds the receipt hash", () => {
    const record = publishedRecord();

    const first = buildRoomEvidenceEnvelope(record, sha256);
    const second = buildRoomEvidenceEnvelope(
      {
        ...record,
        pick: record.pick && {
          ...record.pick,
          proofReceipt: record.pick.proofReceipt && { ...record.pick.proofReceipt, contentHash: "receipt-hash-b" },
        },
      },
      sha256,
    );

    expect(first).not.toBeNull();
    expect(first?.publication.status).toBe("ELIGIBLE");
    expect(first?.factors[0]).toMatchObject({ key: "market", binding: "BOUND" });
    expect(first?.evidence.map((item) => item.kind)).toEqual(expect.arrayContaining([
      "ODDS_SNAPSHOT",
      "SOURCE_SNAPSHOT",
      "PICK_SIGNAL_SNAPSHOT",
      "GATE_DECISION",
      "PROOF_RECEIPT",
    ]));
    expect(first?.digest).not.toBe(second?.digest);
    expect(first && projectIntelligenceEvents(first, "PUBLIC").map((event) => event.state)).not.toContain("CORROBORATED");
  });

  it("keeps a stored PASS complete in the lifecycle but withheld when the schema did not capture its market and threshold", () => {
    const record = publishedRecord();
    const passRecord: RoomEvidenceRecord = {
      ...record,
      pick: null,
      gateDecision: record.gateDecision && {
        ...record.gateDecision,
        pickId: null,
        status: "GATED",
        reason: "No pick cleared the governed edge floor.",
        reasonCode: "EDGE_BELOW_FLOOR",
        evidenceRefs: null,
      },
    };

    const envelope = buildRoomEvidenceEnvelope(passRecord, sha256);
    const publicEvents = envelope ? projectIntelligenceEvents(envelope, "PUBLIC") : [];

    expect(envelope?.decision.kind).toBe("PASSED");
    expect(envelope?.publication).toMatchObject({
      status: "WITHHELD",
      reasonCodes: expect.arrayContaining(["MARKET_CONTEXT_INCOMPLETE", "DECISION_BOUNDARY_INCOMPLETE"]),
    });
    expect(publicEvents.map((event) => event.state)).toContain("PASSED");
    expect(publicEvents.at(-1)?.accessibleText).toContain("withheld");
  });

  it("treats a signal without an explicit expiry as valid only until game commence", () => {
    const record = publishedRecord();
    if (!record.pick?.signalSnapshot) throw new Error("Fixture requires a pick signal snapshot");
    const signal = {
      id: "weather-1",
      sourceCategory: "WEATHER",
      sourceName: "weather-provider",
      signalKey: "wind_mph",
      fetchedAt: new Date("2026-07-14T15:55:00.000Z"),
      expiresAt: null,
      trustLevel: 0.9,
      isBootstrap: false,
    } as const;
    const withSignal: RoomEvidenceRecord = {
      ...record,
      pick: {
        ...record.pick,
        signalSnapshot: {
          ...record.pick.signalSnapshot,
          factors: [
            ...record.pick.signalSnapshot.factors,
            {
              key: "weather",
              label: "Weather",
              state: "ACTIVE",
              disposition: "WEAKENING",
              gameSignalIds: [signal.id],
            },
          ],
        },
      },
      gameSignals: [signal],
    };

    const pregame = buildRoomEvidenceEnvelope(withSignal, sha256);
    const afterCommence = buildRoomEvidenceEnvelope(
      { ...withSignal, game: { ...withSignal.game, commenceTime: new Date("2026-07-14T16:01:00.000Z") } },
      sha256,
    );

    expect(pregame?.publication.status).toBe("ELIGIBLE");
    expect(afterCommence?.publication).toMatchObject({
      status: "WITHHELD",
      blockedEvidenceIds: [signal.id],
    });
  });

  it("withholds when a published pick is bound to a gated decision", () => {
    const record = publishedRecord();
    if (!record.gateDecision) throw new Error("Fixture requires a gate decision");
    const envelope = buildRoomEvidenceEnvelope(
      { ...record, gateDecision: { ...record.gateDecision, status: "GATED" } },
      sha256,
    );

    expect(envelope?.publication).toMatchObject({
      status: "WITHHELD",
      blockedEvidenceIds: [record.gateDecision.id],
      reasonCodes: ["EVIDENCE_POLICY_BLOCKED"],
    });
  });

  it("does not rewrite a past decision with an optional signal captured later", () => {
    const record = publishedRecord();
    const laterSignal = {
      id: "later-signal",
      sourceCategory: "WEATHER",
      sourceName: "weather-provider",
      signalKey: "late_weather_update",
      fetchedAt: new Date("2026-07-14T16:06:00.000Z"),
      expiresAt: new Date("2026-07-14T20:00:00.000Z"),
      trustLevel: 0.9,
      isBootstrap: false,
    } as const;
    const envelope = buildRoomEvidenceEnvelope(
      { ...record, gameSignals: [laterSignal] },
      sha256,
    );

    expect(envelope?.publication.status).toBe("ELIGIBLE");
    expect(envelope?.evidence.some((item) => item.state === "CAPTURED" && item.id === laterSignal.id)).toBe(false);
  });
});
