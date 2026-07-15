import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildIntelligenceEvents,
  buildPickEvidenceEnvelope,
  projectIntelligenceEvents,
  projectPickEvidenceEnvelope,
  type CapturedEvidence,
  type PickEvidenceEnvelopeInput,
} from "@/lib/intelligence-playback";

const sha256 = (payload: string): string => createHash("sha256").update(payload).digest("hex");

const evidence = (
  id: string,
  kind: CapturedEvidence["kind"],
  rights: CapturedEvidence["rights"] = "PUBLIC_DERIVED",
): CapturedEvidence => ({
  state: "CAPTURED",
  id,
  kind,
  label: kind.replace(/_/g, " "),
  sourceId: kind === "SOURCE_SNAPSHOT" ? "the-odds-api" : "gse",
  sourceTier: kind === "SOURCE_SNAPSHOT" ? "TIER_2" : "INTERNAL",
  rights,
  health: "HEALTHY",
  fetchedAt: "2026-07-14T16:00:00.000Z",
  effectiveAt: "2026-07-14T16:00:00.000Z",
  expiresAt: "2026-07-14T20:00:00.000Z",
  freshness: "FRESH",
  contradiction: "NONE",
  disposition: "SUPPORTING",
  summary: `${kind} captured`,
});

function completeInput(kind: "PUBLISHED" | "PASSED" = "PUBLISHED"): PickEvidenceEnvelopeInput {
  const decisionBase = {
    gateDecisionId: "gate-1",
    decidedAt: "2026-07-14T16:05:00.000Z",
    reason: kind === "PUBLISHED" ? "The threshold cleared." : "The threshold did not clear.",
    reasonCode: kind === "PUBLISHED" ? "EDGE_CLEARED" : "EDGE_BELOW_FLOOR",
    boundary: { metric: "edgeIndex", observedValue: 71, threshold: 65, crossed: kind === "PUBLISHED" },
    reversalCondition: "Pass if the offered point moves below -3.5.",
  } as const;

  return {
    envelopeId: `envelope-${kind.toLowerCase()}`,
    createdAt: "2026-07-14T16:05:00.000Z",
    game: {
      id: "game-1",
      sport: "NFL",
      matchup: "Away at Home",
      commenceTime: "2026-07-14T20:00:00.000Z",
    },
    decision:
      kind === "PUBLISHED"
        ? { ...decisionBase, kind, pickId: "pick-1", selection: "Home -3.5" }
        : { ...decisionBase, kind },
    market: {
      kind: "SPREAD",
      offeredPrice: -110,
      offeredPoint: -3.5,
      bookCoverage: 8,
      dispersion: 0.5,
      movement: -0.5,
      capturedAt: "2026-07-14T16:00:00.000Z",
    },
    model: {
      version: "gse-v6",
      rawInternalOutput: "edge=71;confidence=78;weight=protected",
      publicRepresentation: kind === "PUBLISHED" ? "Home cleared the publish gate." : "No edge, no pick.",
      uncertainty: "Moderate; books disagree by 0.5 points.",
      disagreement: "Two books remain at -3.",
    },
    evidence: [
      evidence("odds-1", "ODDS_SNAPSHOT"),
      evidence("source-1", "SOURCE_SNAPSHOT"),
      evidence("context-1", "GAME_SIGNAL"),
      evidence("signal-1", "PICK_SIGNAL_SNAPSHOT", "INTERNAL_ONLY"),
      evidence("gate-1", "GATE_DECISION"),
      ...(kind === "PUBLISHED" ? [evidence("receipt-1", "PROOF_RECEIPT")] : []),
    ],
    factors: [
      {
        key: "market",
        label: "Market consensus",
        state: "ACTIVE",
        disposition: "SUPPORTING",
        evidenceIds: ["odds-1", "source-1"],
      },
    ],
    receipt:
      kind === "PUBLISHED"
        ? {
            state: "CAPTURED",
            value: {
              id: "receipt-1",
              contentHash: "abc123",
              frozenAt: "2026-07-14T16:05:00.000Z",
            },
          }
        : { state: "NOT_CAPTURED", reason: "A PASS has no published-pick receipt." },
    settlement: { state: "NOT_CAPTURED", reason: "Game has not settled." },
    clv: { state: "NOT_CAPTURED", reason: "Closing line is not available." },
    calibration: { state: "NOT_CAPTURED", reason: "No settled outcome exists." },
  };
}

describe("PickEvidenceEnvelope", () => {
  it("builds the same digest regardless of evidence input order", () => {
    const first = completeInput();
    const second = { ...first, evidence: [...first.evidence].reverse() };

    const firstEnvelope = buildPickEvidenceEnvelope(first, sha256);
    const secondEnvelope = buildPickEvidenceEnvelope(second, sha256);

    expect(firstEnvelope.publication.status).toBe("ELIGIBLE");
    expect(firstEnvelope.digest).toBe(secondEnvelope.digest);
    expect(firstEnvelope.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("withholds a published decision when required proof or factor bindings are missing", () => {
    const input = completeInput();
    const marketFactor = input.factors[0];
    if (!marketFactor) throw new Error("Test fixture requires the market factor");
    const incomplete = {
      ...input,
      evidence: input.evidence.filter((item) => item.kind !== "PROOF_RECEIPT"),
      factors: [{ ...marketFactor, evidenceIds: [] }],
      receipt: { state: "NOT_CAPTURED", reason: "Legacy pick has no receipt." } as const,
    };

    const envelope = buildPickEvidenceEnvelope(incomplete, sha256);
    const publicView = projectPickEvidenceEnvelope(envelope, "PUBLIC");
    const cockpitView = projectPickEvidenceEnvelope(envelope, "COCKPIT");

    expect(envelope.publication).toMatchObject({
      status: "WITHHELD",
      missingKinds: ["PROOF_RECEIPT"],
      unboundFactors: ["market"],
    });
    expect(publicView.decision.selection).toBeNull();
    expect(publicView.decision.publicRepresentation).toContain("withheld");
    expect(publicView.publication.unboundFactors).toEqual([]);
    expect(cockpitView.publication.unboundFactors).toEqual(["market"]);
  });

  it("uses one projection policy and keeps raw output cockpit-only", () => {
    const input = completeInput();
    const envelope = buildPickEvidenceEnvelope(
      { ...input, evidence: [...input.evidence, evidence("internal-1", "GAME_SIGNAL", "INTERNAL_ONLY")] },
      sha256,
    );

    const publicView = projectPickEvidenceEnvelope(envelope, "PUBLIC");
    const paidView = projectPickEvidenceEnvelope(envelope, "PAID");
    const cockpitView = projectPickEvidenceEnvelope(envelope, "COCKPIT");

    expect(publicView.decision.rawInternalOutput).toBeNull();
    expect(paidView.decision.rawInternalOutput).toBeNull();
    expect(cockpitView.decision.rawInternalOutput).toContain("weight=protected");
    expect(publicView.evidence.some((item) => item.state === "CAPTURED" && item.id === "internal-1")).toBe(false);
    expect(cockpitView.evidence.some((item) => item.state === "CAPTURED" && item.id === "internal-1")).toBe(true);
  });

  it("treats a fully evidenced PASS as a complete publish-or-pass decision", () => {
    const envelope = buildPickEvidenceEnvelope(completeInput("PASSED"), sha256);
    const events = buildIntelligenceEvents(envelope);

    expect(envelope.publication.status).toBe("ELIGIBLE");
    expect(events.map((event) => event.state)).toEqual([
      "UNKNOWN",
      "OBSERVED",
      "CORROBORATED",
      "SCORED",
      "PASSED",
    ]);
    expect(events.at(-1)).toMatchObject({
      state: "PASSED",
      accessibleText: expect.stringContaining("No edge, no pick"),
    });
  });

  it("extends the lifecycle only when settlement and calibration were captured", () => {
    const input = completeInput();
    const envelope = buildPickEvidenceEnvelope(
      {
        ...input,
        settlement: { state: "CAPTURED", value: { result: "LOSS", settledAt: "2026-07-15T00:00:00.000Z" } },
        clv: {
          state: "CAPTURED",
          value: { kind: "POINTS", value: 0.5, verdict: "BEAT_CLOSE", capturedAt: "2026-07-14T19:59:00.000Z" },
        },
        calibration: { state: "CAPTURED", value: { effect: "Bucket miss recorded.", recordedAt: "2026-07-15T00:05:00.000Z" } },
      },
      sha256,
    );

    const events = buildIntelligenceEvents(envelope);

    expect(events.map((event) => event.state)).toEqual([
      "UNKNOWN",
      "OBSERVED",
      "CORROBORATED",
      "SCORED",
      "PUBLISHED",
      "SETTLED",
      "RECALIBRATED",
    ]);
    expect(events.at(-2)?.clv).toMatchObject({ state: "CAPTURED", value: { verdict: "BEAT_CLOSE" } });
  });

  it("withholds a PASS when its offered market or decision boundary was not captured", () => {
    const input = completeInput("PASSED");
    const envelope = buildPickEvidenceEnvelope(
      {
        ...input,
        market: { ...input.market, kind: "UNKNOWN", offeredPrice: null, offeredPoint: null },
        decision: { ...input.decision, boundary: { ...input.decision.boundary, threshold: null, crossed: null } },
      },
      sha256,
    );

    expect(envelope.publication).toMatchObject({
      status: "WITHHELD",
      reasonCodes: ["MARKET_CONTEXT_INCOMPLETE", "DECISION_BOUNDARY_INCOMPLETE"],
    });
  });

  it("withholds when the boundary result contradicts publish-or-pass", () => {
    const published = completeInput("PUBLISHED");
    const passed = completeInput("PASSED");
    const publishedEnvelope = buildPickEvidenceEnvelope(
      { ...published, decision: { ...published.decision, boundary: { ...published.decision.boundary, crossed: false } } },
      sha256,
    );
    const passedEnvelope = buildPickEvidenceEnvelope(
      { ...passed, decision: { ...passed.decision, boundary: { ...passed.decision.boundary, crossed: true } } },
      sha256,
    );

    expect(publishedEnvelope.publication).toMatchObject({
      status: "WITHHELD",
      reasonCodes: ["DECISION_BOUNDARY_MISMATCH"],
    });
    expect(passedEnvelope.publication).toMatchObject({
      status: "WITHHELD",
      reasonCodes: ["DECISION_BOUNDARY_MISMATCH"],
    });
  });

  it("withholds when an active factor binds to stale supporting evidence", () => {
    const input = completeInput();
    const staleSignal = {
      ...evidence("stale-signal-1", "GAME_SIGNAL", "INTERNAL_ONLY"),
      freshness: "STALE" as const,
    };
    const envelope = buildPickEvidenceEnvelope(
      {
        ...input,
        evidence: [...input.evidence, staleSignal],
        factors: [
          ...input.factors,
          {
            key: "injury",
            label: "Injury context",
            state: "ACTIVE",
            disposition: "WEAKENING",
            evidenceIds: [staleSignal.id],
          },
        ],
      },
      sha256,
    );

    expect(envelope.publication).toMatchObject({
      status: "WITHHELD",
      blockedEvidenceIds: ["stale-signal-1"],
      reasonCodes: ["EVIDENCE_POLICY_BLOCKED"],
    });
    expect(projectPickEvidenceEnvelope(envelope, "PUBLIC").publication.blockedEvidenceIds).toEqual([]);
    expect(projectPickEvidenceEnvelope(envelope, "COCKPIT").publication.blockedEvidenceIds).toEqual([
      "stale-signal-1",
    ]);
  });

  it("withholds an envelope with ambiguous duplicate evidence IDs", () => {
    const input = completeInput();
    const duplicateId = evidence("odds-1", "GAME_SIGNAL");
    const envelope = buildPickEvidenceEnvelope(
      { ...input, evidence: [...input.evidence, duplicateId] },
      sha256,
    );

    expect(envelope.publication).toMatchObject({
      status: "WITHHELD",
      reasonCodes: ["EVIDENCE_ID_COLLISION"],
    });
  });

  it("withholds when proof or gate IDs do not bind to the decision", () => {
    const input = completeInput();
    if (input.decision.kind !== "PUBLISHED" || input.receipt.state !== "CAPTURED") {
      throw new Error("Fixture requires a published decision and receipt");
    }
    const envelope = buildPickEvidenceEnvelope(
      {
        ...input,
        decision: { ...input.decision, gateDecisionId: "different-gate" },
        receipt: { ...input.receipt, value: { ...input.receipt.value, id: "different-receipt" } },
      },
      sha256,
    );

    expect(envelope.publication).toMatchObject({
      status: "WITHHELD",
      reasonCodes: ["EVIDENCE_BINDING_MISMATCH"],
    });
  });

  it("withholds evidence and market context captured after the decision", () => {
    const input = completeInput();
    const lateEvidence = {
      ...evidence("late-context", "GAME_SIGNAL"),
      fetchedAt: "2026-07-14T16:06:00.000Z",
    };
    const envelope = buildPickEvidenceEnvelope(
      {
        ...input,
        evidence: [...input.evidence, lateEvidence],
        market: { ...input.market, capturedAt: "2026-07-14T16:06:00.000Z" },
      },
      sha256,
    );

    expect(envelope.publication).toMatchObject({
      status: "WITHHELD",
      blockedEvidenceIds: [lateEvidence.id],
      reasonCodes: ["EVIDENCE_TIME_INVALID", "MARKET_CONTEXT_INCOMPLETE"],
    });
  });

  it("projects one public-safe event stream without internal IDs or raw output", () => {
    const input = completeInput();
    const envelope = buildPickEvidenceEnvelope(
      { ...input, evidence: [...input.evidence, evidence("internal-1", "GAME_SIGNAL", "INTERNAL_ONLY")] },
      sha256,
    );

    const publicEvents = projectIntelligenceEvents(envelope, "PUBLIC");
    const paidEvents = projectIntelligenceEvents(envelope, "PAID");
    const cockpitEvents = projectIntelligenceEvents(envelope, "COCKPIT");

    expect(publicEvents.every((event) => event.rawInternalOutput === null)).toBe(true);
    expect(publicEvents.every((event) => !event.evidenceIds.includes("internal-1"))).toBe(true);
    expect(publicEvents.every((event) => event.disagreement === null)).toBe(true);
    expect(publicEvents.every((event) => event.market.dispersion === null && event.market.movement === null)).toBe(true);
    expect(paidEvents.some((event) => event.disagreement?.includes("Two books"))).toBe(true);
    expect(paidEvents.some((event) => event.market.dispersion === 0.5 && event.market.movement === -0.5)).toBe(true);
    expect(cockpitEvents.some((event) => event.rawInternalOutput?.includes("weight=protected"))).toBe(true);
    expect(cockpitEvents.some((event) => event.evidenceIds.includes("internal-1"))).toBe(true);
  });
});
