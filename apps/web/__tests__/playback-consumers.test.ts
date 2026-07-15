import { describe, expect, it } from "vitest";
import {
  buildPlaybackConsumerBundle,
  type IntelligenceEvent,
  type PublicationState,
} from "@/lib/intelligence-playback";

const PUBLICATION: PublicationState = {
  status: "ELIGIBLE",
  requiredKinds: ["ODDS_SNAPSHOT", "SOURCE_SNAPSHOT", "GATE_DECISION"],
  missingKinds: [],
  unboundFactors: [],
  blockedEvidenceIds: [],
  reasonCodes: [],
};

function event(
  sequence: number,
  state: IntelligenceEvent["state"],
  overrides: Partial<IntelligenceEvent> = {},
): IntelligenceEvent {
  const captured = state !== "UNKNOWN";
  return {
    id: `event-${sequence}`,
    sequence,
    state,
    act: state === "UNKNOWN" ? "OPEN" : state === "SETTLED" ? "AFTER_CLOSE" : "PUBLISH_OR_PASS",
    eventTime: `2026-07-15T13:0${sequence}:00.000Z`,
    effectiveTime: captured ? `2026-07-15T13:0${sequence}:00.000Z` : null,
    evidenceIds: captured ? ["evidence-1"] : [],
    sourceIds: captured ? ["provider-a"] : [],
    sourceTier: captured ? "TIER_1" : "UNKNOWN",
    rights: captured ? "PUBLIC_DERIVED" : "UNKNOWN",
    health: captured ? "HEALTHY" : "UNKNOWN",
    freshness: captured ? "FRESH" : "UNKNOWN",
    contradiction: "NONE",
    market: {
      kind: "TOTAL",
      offeredPrice: captured ? -110 : null,
      offeredPoint: captured ? 47.5 : null,
      bookCoverage: captured ? 5 : null,
      dispersion: null,
      movement: null,
      capturedAt: captured ? "2026-07-15T13:00:00.000Z" : null,
    },
    modelVersion: "gse-v6",
    rawInternalOutput: "private model vector",
    publicRepresentation: `${state} public representation.`,
    uncertainty: "Uncertainty retained.",
    disagreement: null,
    decisionBoundary: {
      metric: "publish_score",
      observedValue: captured ? 0.58 : null,
      threshold: captured ? 0.6 : null,
      crossed: captured ? false : null,
    },
    boundaryCrossed: captured ? false : null,
    supportingEvidenceIds: captured ? ["evidence-1"] : [],
    weakeningEvidenceIds: [],
    reversalCondition: "Publish only if the stored boundary crosses.",
    settlement: { state: "NOT_CAPTURED", reason: "Not settled." },
    clv: { state: "NOT_CAPTURED", reason: "No close." },
    calibration: { state: "NOT_CAPTURED", reason: "No settled outcome." },
    accessibleText: `${state} accessible event.`,
    ...overrides,
  };
}

describe("playback consumer bundle", () => {
  it("projects one event stream into Twin, Brain, autopsy, and draft media consumers", () => {
    const events = [event(0, "UNKNOWN"), event(1, "SCORED"), event(2, "PASSED")];

    const bundle = buildPlaybackConsumerBundle({
      gameId: "game-1",
      envelopeDigest: "digest-1",
      publication: PUBLICATION,
      events,
    });

    expect(bundle.twin.selectedGameId).toBe("game-1");
    expect(bundle.twin.eventIds).toEqual(["event-0", "event-1", "event-2"]);
    expect(bundle.twin.currentState).toBe("PASSED");
    expect(bundle.brain.status).toBe("ANSWERED");
    expect(bundle.brain.answer).toMatch(/causality is not inferred/i);
    expect(bundle.autopsy.status).toBe("NOT_CAPTURED");
    expect(bundle.mediaStudio.state).toBe("DRAFT_ONLY");
    expect(bundle.mediaStudio.autoPublishAllowed).toBe(false);
  });

  it("never copies raw model output into any consumer projection", () => {
    const bundle = buildPlaybackConsumerBundle({
      gameId: "game-1",
      envelopeDigest: "digest-1",
      publication: PUBLICATION,
      events: [event(0, "UNKNOWN"), event(1, "PASSED")],
    });

    expect(JSON.stringify(bundle)).not.toContain("private model vector");
  });

  it("keeps Media Studio export blocked pending human review", () => {
    const bundle = buildPlaybackConsumerBundle({
      gameId: "game-1",
      envelopeDigest: "digest-1",
      publication: PUBLICATION,
      events: [event(0, "UNKNOWN"), event(1, "PASSED")],
    });

    expect(bundle.mediaStudio.exportPreflight.allowed).toBe(false);
    expect(bundle.mediaStudio.exportPreflight.blockers).toContain("human reviewer required");
    expect(bundle.mediaStudio.scenes.every((scene) => scene.reviewStatus === "HUMAN_REVIEW_REQUIRED")).toBe(true);
  });

  it("adds rights, freshness, and publication blockers to media preflight", () => {
    const bundle = buildPlaybackConsumerBundle({
      gameId: "game-1",
      envelopeDigest: "digest-1",
      publication: { ...PUBLICATION, status: "WITHHELD", reasonCodes: ["MISSING_REQUIRED_EVIDENCE"] },
      events: [
        event(0, "UNKNOWN"),
        event(1, "PASSED", { rights: "INTERNAL_ONLY", freshness: "STALE" }),
      ],
    });

    expect(bundle.mediaStudio.exportPreflight.blockers).toEqual(expect.arrayContaining([
      "publication withheld",
      "non-public evidence rights",
      "evidence is not fresh",
      "human reviewer required",
    ]));
  });

  it("builds a postgame autopsy only from captured settlement history", () => {
    const settled = event(3, "SETTLED", {
      settlement: { state: "CAPTURED", value: { result: "LOSS", settledAt: "2026-07-15T17:00:00.000Z" } },
      clv: { state: "CAPTURED", value: { kind: "POINTS", value: 0.5, verdict: "BEAT_CLOSE", capturedAt: "2026-07-15T16:59:00.000Z" } },
      calibration: { state: "NOT_CAPTURED", reason: "Pick-specific effect was not persisted." },
    });
    const bundle = buildPlaybackConsumerBundle({
      gameId: "game-1",
      envelopeDigest: "digest-1",
      publication: PUBLICATION,
      events: [event(0, "UNKNOWN"), event(1, "SCORED"), event(2, "PUBLISHED", { boundaryCrossed: true }), settled],
    });

    expect(bundle.autopsy.status).toBe("READY");
    expect(bundle.autopsy.result).toBe("LOSS");
    expect(bundle.autopsy.clvState).toBe("CAPTURED");
    expect(bundle.autopsy.calibrationState).toBe("NOT_CAPTURED");
    expect(bundle.autopsy.citations).toContain("event-3");
  });

  it("is deterministic for identical input", () => {
    const input = {
      gameId: "game-1",
      envelopeDigest: "digest-1",
      publication: PUBLICATION,
      events: [event(0, "UNKNOWN"), event(1, "PASSED")],
    } as const;

    expect(buildPlaybackConsumerBundle(input)).toEqual(buildPlaybackConsumerBundle(input));
  });
});
