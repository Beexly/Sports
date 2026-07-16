import { describe, expect, it } from "vitest";
import {
  buildDecisionChangeCertificate,
  buildEpistemicDeltaLedger,
} from "@/lib/intelligence-playback";
import type { IntelligenceEvent } from "@/lib/intelligence-playback";

function event(
  sequence: number,
  state: IntelligenceEvent["state"],
  overrides: Partial<IntelligenceEvent> = {},
): IntelligenceEvent {
  return {
    id: `event-${sequence}`,
    sequence,
    state,
    act: "EVIDENCE_ARRIVES",
    eventTime: `2026-07-15T12:0${sequence}:00.000Z`,
    effectiveTime: `2026-07-15T12:0${sequence}:00.000Z`,
    evidenceIds: [],
    sourceIds: [],
    sourceTier: "UNKNOWN",
    rights: "UNKNOWN",
    health: "UNKNOWN",
    freshness: "UNKNOWN",
    contradiction: "UNKNOWN",
    market: {
      kind: "SPREAD",
      offeredPrice: null,
      offeredPoint: null,
      bookCoverage: null,
      dispersion: null,
      movement: null,
      capturedAt: null,
    },
    modelVersion: "v-test",
    rawInternalOutput: null,
    publicRepresentation: "Evidence state recorded.",
    uncertainty: "Uncertainty not yet scored.",
    disagreement: null,
    decisionBoundary: {
      metric: "publish_score",
      observedValue: null,
      threshold: null,
      crossed: null,
    },
    boundaryCrossed: null,
    supportingEvidenceIds: [],
    weakeningEvidenceIds: [],
    reversalCondition: "Withhold if required evidence expires.",
    settlement: { state: "NOT_CAPTURED", reason: "Pregame." },
    clv: { state: "NOT_CAPTURED", reason: "Pregame." },
    calibration: { state: "NOT_CAPTURED", reason: "Pregame." },
    accessibleText: "Evidence state recorded.",
    ...overrides,
  };
}

describe("epistemic delta ledger", () => {
  it("records evidence additions and removals without copying raw model output", () => {
    const events = [
      event(0, "UNKNOWN", { rawInternalOutput: "never serialize me" }),
      event(1, "OBSERVED", {
        evidenceIds: ["odds-1", "source-1"],
        supportingEvidenceIds: ["source-1"],
        sourceIds: ["provider-a"],
      }),
      event(2, "SCORED", {
        evidenceIds: ["source-1", "signal-1"],
        supportingEvidenceIds: ["source-1"],
        weakeningEvidenceIds: ["signal-1"],
        sourceIds: ["provider-a", "provider-b"],
      }),
    ];

    const deltas = buildEpistemicDeltaLedger(events);

    expect(deltas[1]?.evidenceAdded).toEqual(["odds-1", "source-1"]);
    expect(deltas[2]?.evidenceAdded).toEqual(["signal-1"]);
    expect(deltas[2]?.evidenceRemoved).toEqual(["odds-1"]);
    expect(deltas[2]?.weakeningAdded).toEqual(["signal-1"]);
    expect(JSON.stringify(deltas)).not.toContain("never serialize me");
  });

  it("distinguishes boundary and contradiction transitions from causal claims", () => {
    const deltas = buildEpistemicDeltaLedger([
      event(0, "OBSERVED", { contradiction: "NONE" }),
      event(1, "SCORED", {
        contradiction: "PRESENT",
        boundaryCrossed: true,
        decisionBoundary: {
          metric: "publish_score",
          observedValue: 0.64,
          threshold: 0.6,
          crossed: true,
        },
      }),
    ]);

    expect(deltas[1]?.boundaryTransition).toBe("BECAME_CROSSED");
    expect(deltas[1]?.contradictionTransition).toBe("APPEARED");
    expect(deltas[1]?.causalScope).toBe("OBSERVED_TRANSITION_ONLY");
    expect(deltas[1]?.summary).toMatch(/causality is not inferred/i);
  });

  it("captures finite market changes but not absent values", () => {
    const deltas = buildEpistemicDeltaLedger([
      event(0, "OBSERVED", {
        market: { kind: "SPREAD", offeredPrice: -110, offeredPoint: -2.5, bookCoverage: 3, dispersion: null, movement: null, capturedAt: "2026-07-15T12:00:00.000Z" },
      }),
      event(1, "SCORED", {
        market: { kind: "SPREAD", offeredPrice: -105, offeredPoint: -3, bookCoverage: 5, dispersion: null, movement: -0.5, capturedAt: "2026-07-15T12:01:00.000Z" },
      }),
    ]);

    expect(deltas[1]?.marketDelta).toEqual({
      offeredPrice: 5,
      offeredPoint: -0.5,
      bookCoverage: 2,
      movement: null,
    });
  });

  it("builds a deterministic cited decision-change certificate", () => {
    const events = [
      event(0, "UNKNOWN"),
      event(1, "OBSERVED", { evidenceIds: ["source-1"], sourceIds: ["provider-a"] }),
      event(2, "SCORED", { evidenceIds: ["source-1"], boundaryCrossed: false }),
      event(3, "PASSED", { evidenceIds: ["source-1"], boundaryCrossed: false }),
    ];

    const certificate = buildDecisionChangeCertificate("digest-123", events);

    expect(certificate.status).toBe("ANSWERED");
    expect(certificate.decisionState).toBe("PASSED");
    expect(certificate.causalScope).toBe("OBSERVED_TRANSITION_ONLY");
    expect(certificate.citations).toContain("event-3");
    expect(certificate.answer).toMatch(/did not cross/i);
    // M5 (2026-07-16): the copy says "derived" — these are read-time
    // projections of a mutable envelope, and the wording must not imply an
    // append-only recorded log that does not exist yet.
    expect(certificate.answer).toMatch(/derived events/);
    expect(certificate.answer).not.toMatch(/recorded transitions/);
    expect(buildDecisionChangeCertificate("digest-123", events)).toEqual(certificate);
  });

  it("refuses to explain a stream that has no publish-or-pass decision", () => {
    const certificate = buildDecisionChangeCertificate("digest-123", [event(0, "UNKNOWN")]);

    expect(certificate.status).toBe("REFUSED");
    expect(certificate.answer).toMatch(/not captured/i);
    expect(certificate.citations).toEqual(["event-0"]);
  });

  it("rejects duplicate IDs and non-canonical sequences", () => {
    expect(() => buildEpistemicDeltaLedger([event(0, "UNKNOWN"), event(0, "OBSERVED")])).toThrow(/sequence/i);
    expect(() => buildEpistemicDeltaLedger([
      event(0, "UNKNOWN", { id: "duplicate" }),
      event(1, "OBSERVED", { id: "duplicate" }),
    ])).toThrow(/duplicate/i);
  });
});
