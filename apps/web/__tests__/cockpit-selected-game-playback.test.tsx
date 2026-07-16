import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPlaybackConsumerBundle,
  type IntelligenceEvent,
  type PublicationState,
} from "@/lib/intelligence-playback";

const mocks = vi.hoisted(() => ({
  loadGameRoom: vi.fn<(gameId: string, viewer: unknown) => Promise<unknown>>(),
  requireCockpitAdmin: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/lib/game-room/load", () => ({ loadGameRoom: mocks.loadGameRoom }));
vi.mock("@/lib/cockpit/require-admin", () => ({
  requireCockpitAdmin: mocks.requireCockpitAdmin,
}));

import { SelectedGamePlayback } from "@/components/cockpit/selected-game-playback";
import CockpitSelectedGamePlaybackPage from "@/app/cockpit/market-twin/[gameId]/page";
import {
  loadSelectedGamePlayback,
  type SelectedGamePlaybackResult,
} from "@/lib/cockpit/load-selected-game-playback";

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
    act: state === "UNKNOWN" ? "OPEN" : "PUBLISH_OR_PASS",
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
    rawInternalOutput: "RAW_PRIVATE_VECTOR",
    publicRepresentation: `${state} share-safe representation.`,
    uncertainty: "Pick-specific calibrated probability was not captured.",
    disagreement: null,
    decisionBoundary: {
      metric: "publish_score",
      observedValue: captured ? 0.62 : null,
      threshold: captured ? 0.6 : null,
      crossed: captured ? true : null,
    },
    boundaryCrossed: captured ? true : null,
    supportingEvidenceIds: captured ? ["evidence-1"] : [],
    weakeningEvidenceIds: [],
    reversalCondition: "Re-evaluate when the stored market or evidence changes.",
    settlement: { state: "NOT_CAPTURED", reason: "Not settled." },
    clv: { state: "NOT_CAPTURED", reason: "No close." },
    calibration: { state: "NOT_CAPTURED", reason: "No settled outcome." },
    accessibleText: `${state} accessible event.`,
    ...overrides,
  };
}

const EVENTS = [event(0, "UNKNOWN"), event(1, "SCORED"), event(2, "PUBLISHED")];

function gameRoom(publication: PublicationState = PUBLICATION): unknown {
  return {
    node: { matchup: "Chicago at Detroit" },
    playback: {
      digest: "digest-1",
      publication,
      events: EVENTS,
    },
  };
}

function availableResult(): SelectedGamePlaybackResult {
  return {
    status: "AVAILABLE",
    gameId: "game-1",
    matchup: "Chicago at Detroit",
    bundle: buildPlaybackConsumerBundle({
      gameId: "game-1",
      envelopeDigest: "digest-1",
      publication: PUBLICATION,
      events: EVENTS,
    }),
  };
}

function settledResult(): SelectedGamePlaybackResult {
  const settled = event(3, "SETTLED", {
    act: "AFTER_CLOSE",
    settlement: { state: "CAPTURED", value: { result: "LOSS", settledAt: "2026-07-15T17:00:00.000Z" } },
    clv: {
      state: "CAPTURED",
      value: { kind: "POINTS", value: 0.5, verdict: "BEAT_CLOSE", capturedAt: "2026-07-15T16:59:00.000Z" },
    },
    calibration: {
      state: "CAPTURED",
      value: {
        effect: "Overstated totals edge after late weather move.",
        recordedAt: "2026-07-15T17:05:00.000Z",
      },
    },
  });
  return {
    status: "AVAILABLE",
    gameId: "game-1",
    matchup: "Chicago at Detroit",
    bundle: buildPlaybackConsumerBundle({
      gameId: "game-1",
      envelopeDigest: "digest-1",
      publication: PUBLICATION,
      events: [...EVENTS, settled],
    }),
  };
}

describe("selected-game Cockpit playback loader", () => {
  beforeEach(() => {
    mocks.loadGameRoom.mockReset();
    mocks.requireCockpitAdmin.mockReset();
  });

  it("loads one persisted Game Room query with the full operator viewer", async () => {
    // Given
    mocks.loadGameRoom.mockResolvedValue(gameRoom());

    // When
    const result = await loadSelectedGamePlayback("game-1");

    // Then
    expect(mocks.loadGameRoom).toHaveBeenCalledOnce();
    expect(mocks.loadGameRoom).toHaveBeenCalledWith("game-1", {
      canSeePremiumPicks: true,
      canSeeConfidence: true,
      canSeeFactorBreakdown: true,
      canSeeLineMovement: true,
    });
    expect(result.status).toBe("AVAILABLE");
    expect(JSON.stringify(result)).not.toContain("RAW_PRIVATE_VECTOR");
  });

  it("returns an honest unavailable result when playback was not captured", async () => {
    // Given
    mocks.loadGameRoom.mockResolvedValue({
      node: { matchup: "Chicago at Detroit" },
      playback: null,
    });

    // When
    const result = await loadSelectedGamePlayback("game-1");

    // Then
    expect(result).toMatchObject({
      status: "UNAVAILABLE",
      reason: "PLAYBACK_NOT_CAPTURED",
    });
  });

  it("rejects an invalid route ID before querying the Game Room", async () => {
    // Given
    const invalidGameId = "   ";

    // When
    const result = await loadSelectedGamePlayback(invalidGameId);

    // Then
    expect(result).toMatchObject({
      status: "UNAVAILABLE",
      reason: "INVALID_GAME_ID",
    });
    expect(mocks.loadGameRoom).not.toHaveBeenCalled();
  });

  it("returns an honest unavailable result when publication is withheld", async () => {
    // Given
    mocks.loadGameRoom.mockResolvedValue(gameRoom({
      ...PUBLICATION,
      status: "WITHHELD",
      reasonCodes: ["RIGHTS_BLOCKED"],
    }));

    // When
    const result = await loadSelectedGamePlayback("game-1");

    // Then
    expect(result).toMatchObject({
      status: "UNAVAILABLE",
      reason: "PLAYBACK_WITHHELD",
      reasonCodes: ["RIGHTS_BLOCKED"],
    });
  });

  it("does not query selected-game data when the admin gate rejects", async () => {
    // Given
    mocks.requireCockpitAdmin.mockRejectedValue(new Error("ADMIN_REQUIRED"));

    // When
    const page = CockpitSelectedGamePlaybackPage({ params: { gameId: "game-1" } });

    // Then
    await expect(page).rejects.toThrow("ADMIN_REQUIRED");
    expect(mocks.loadGameRoom).not.toHaveBeenCalled();
  });
});

describe("selected-game Cockpit playback rendering", () => {
  it("renders Twin and a cited deterministic Brain answer from one bundle", () => {
    // Given
    const result = availableResult();

    // When
    render(<SelectedGamePlayback result={result} />);

    // Then
    expect(screen.getByRole("heading", { name: "Selected-game Twin" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deterministic Brain answer" })).toBeInTheDocument();
    const brainSection = screen.getByRole("region", { name: "Deterministic Brain answer" });
    expect(within(brainSection).getByText(/causality is not inferred/i)).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Brain answer citations" })).getByText("event-2"))
      .toBeInTheDocument();
    expect(document.body.textContent).not.toContain("RAW_PRIVATE_VECTOR");
  });

  it("renders the captured postgame autopsy and draft-only Studio package with no posting action", () => {
    // Given
    const result = settledResult();

    // When
    render(<SelectedGamePlayback result={result} />);

    // Then
    const autopsySection = screen.getByRole("region", { name: "Postgame autopsy projection" });
    expect(within(autopsySection).getByText("READY")).toBeInTheDocument();
    expect(within(autopsySection).getByText("LOSS")).toBeInTheDocument();
    expect(within(autopsySection).getByText("Overstated totals edge after late weather move.")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Postgame autopsy citations" })).getByText("event-3"))
      .toBeInTheDocument();

    const studioSection = screen.getByRole("region", { name: "Draft-only Studio package" });
    expect(within(studioSection).getAllByText("DRAFT ONLY").length).toBeGreaterThan(0);
    expect(within(studioSection).getByText("No")).toBeInTheDocument();
    expect(within(studioSection).getByText("Blocked")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Studio package preflight blockers" })).getByText("human reviewer required"))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish|post|export/i })).toBeNull();
    expect(document.body.textContent).not.toContain("RAW_PRIVATE_VECTOR");
  });

  it("renders the unavailable reason without inventing a decision", () => {
    // Given
    const result: SelectedGamePlaybackResult = {
      status: "UNAVAILABLE",
      gameId: "game-missing",
      matchup: null,
      reason: "GAME_NOT_FOUND",
      reasonCodes: [],
      message: "No persisted game matched this ID.",
    };

    // When
    render(<SelectedGamePlayback result={result} />);

    // Then
    expect(screen.getByRole("heading", { name: "Playback unavailable" })).toBeInTheDocument();
    expect(screen.getByText("No persisted game matched this ID.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Deterministic Brain answer" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Postgame autopsy projection" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Draft-only Studio package" })).toBeNull();
  });
});
