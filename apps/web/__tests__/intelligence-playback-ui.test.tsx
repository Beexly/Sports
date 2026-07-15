import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { IntelligencePlayback } from "@/components/game-room/intelligence-playback";
import type { GameRoomPlayback } from "@/lib/game-room/types";
import {
  buildDecisionChangeCertificate,
  buildEpistemicDeltaLedger,
  type IntelligenceEvent,
} from "@/lib/intelligence-playback";

function event(sequence: number, state: IntelligenceEvent["state"]): IntelligenceEvent {
  const observed = state !== "UNKNOWN";
  const decision = state === "SCORED" || state === "PUBLISHED";
  return {
    id: `event-${sequence}`,
    sequence,
    state,
    act: state === "UNKNOWN" ? "OPEN" : decision ? "PUBLISH_OR_PASS" : "EVIDENCE_ARRIVES",
    eventTime: `2026-07-14T16:0${sequence}:00.000Z`,
    effectiveTime: observed ? `2026-07-14T16:0${sequence}:00.000Z` : null,
    evidenceIds: observed ? ["odds-1", "source-1"] : [],
    sourceIds: observed ? ["the-odds-api"] : [],
    sourceTier: observed ? "TIER_2" : "UNKNOWN",
    rights: observed ? "PUBLIC_DERIVED" : "UNKNOWN",
    health: observed ? "HEALTHY" : "UNKNOWN",
    freshness: observed ? "FRESH" : "UNKNOWN",
    contradiction: "NONE",
    market: {
      kind: "SPREAD",
      offeredPrice: observed ? -110 : null,
      offeredPoint: observed ? -3.5 : null,
      bookCoverage: observed ? 8 : null,
      dispersion: null,
      movement: null,
      capturedAt: observed ? "2026-07-14T16:00:00.000Z" : null,
    },
    modelVersion: "gse-v6",
    rawInternalOutput: null,
    publicRepresentation: decision ? "Home -3.5 cleared the governed gate." : "Evidence was observed.",
    uncertainty: decision ? "Moderate disagreement remains." : "Unknown until evidence is scored.",
    disagreement: decision ? "Two books remain at -3." : null,
    decisionBoundary: {
      metric: "edgeIndex",
      observedValue: decision ? 71 : null,
      threshold: decision ? 65 : null,
      crossed: decision ? true : null,
    },
    boundaryCrossed: decision ? true : null,
    supportingEvidenceIds: observed ? ["odds-1"] : [],
    weakeningEvidenceIds: observed ? ["source-1"] : [],
    reversalCondition: "Pass if the offered point moves below -3.5.",
    settlement: { state: "NOT_CAPTURED", reason: "Game has not settled." },
    clv: { state: "NOT_CAPTURED", reason: "Closing line is not available." },
    calibration: { state: "NOT_CAPTURED", reason: "No outcome exists." },
    accessibleText: `${state} accessible event text.`,
  };
}

const EVENTS = [event(0, "UNKNOWN"), event(1, "OBSERVED"), event(2, "SCORED"), event(3, "PUBLISHED")];

const PLAYBACK: GameRoomPlayback = {
  digest: "a".repeat(64),
  publication: {
    status: "ELIGIBLE",
    requiredKinds: ["ODDS_SNAPSHOT", "SOURCE_SNAPSHOT", "GATE_DECISION"],
    missingKinds: [],
    unboundFactors: [],
    blockedEvidenceIds: [],
    reasonCodes: [],
  },
  events: EVENTS,
  deltas: buildEpistemicDeltaLedger(EVENTS),
  changeCertificate: buildDecisionChangeCertificate("a".repeat(64), EVENTS),
};

describe("Intelligence Playback", () => {
  it("renders a useful DOM shell with provenance, transcript, and both evidence directions", () => {
    render(<IntelligencePlayback playback={PLAYBACK} />);

    expect(screen.getByRole("heading", { name: "Intelligence Playback" })).toBeInTheDocument();
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Playback time" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Intelligence event data" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Scrollable intelligence event data" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Supporting evidence")).toBeInTheDocument();
    expect(screen.getByText("Weakening evidence")).toBeInTheDocument();
    expect(screen.getByText("Accessible transcript")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Why did the decision change?" })).toBeInTheDocument();
    expect(screen.getAllByText(/causality is not inferred/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/rawInternalOutput/i)).not.toBeInTheDocument();
  });

  it("supports next, previous, stop, scrubber, and keyboard event navigation", async () => {
    const user = userEvent.setup();
    render(<IntelligencePlayback playback={PLAYBACK} />);

    await user.click(screen.getByRole("button", { name: "Next event" }));
    expect(screen.getByText("OBSERVED")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("SCORED")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("slider", { name: "Playback time" }), { target: { value: "3" } });
    expect(screen.getByText("PUBLISHED")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous event" }));
    expect(screen.getByText("SCORED")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });
});
