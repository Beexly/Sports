import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScoredPick } from "@sports/types";

// Mocked @sports/db. createMany / update default to the same shapes the real
// stub proxy returns ({ count } / { id: "stub" }) so the "stub/no-DB" case is
// exercised by the default mock — no special-casing needed in the module.
const mocks = vi.hoisted(() => ({
  createMany: vi.fn<(args?: unknown) => Promise<{ count: number }>>(),
  update: vi.fn<(args?: unknown) => Promise<{ id: string }>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { createMany: mocks.createMany },
    game: { update: mocks.update },
  },
}));

import { recordGateDecisions } from "../gate-decisions.js";

const MODEL_VERSION = "v5.0.0";

function makePick(overrides: Partial<ScoredPick> = {}): ScoredPick {
  return {
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "BOS -1.5",
    line: -1.5,
    confidence: 74,
    edgeScore: 72,
    consensusPct: 0.68,
    bookmakerCount: 11,
    dataQualityScore: 88,
    tier: "PREMIUM",
    pickGrade: "STRONG_PLAY",
    riskLevel: "LOW_RISK",
    reasoning: "test",
    reasoningShort: "test",
    factorBreakdown: {} as ScoredPick["factorBreakdown"],
    modelVersion: MODEL_VERSION,
    dataFreshnessAt: new Date("2026-05-22T15:30:00.000Z"),
    ...overrides,
  };
}

describe("recordGateDecisions", () => {
  beforeEach(() => {
    mocks.createMany.mockReset();
    mocks.update.mockReset();
    // Default to the real stub-proxy return shapes.
    mocks.createMany.mockResolvedValue({ count: 0 });
    mocks.update.mockResolvedValue({ id: "stub" });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes a PUBLISHED GateDecision for a game that produced a pick", async () => {
    await recordGateDecisions({
      evaluatedGames: [
        { gameId: "game-1", bookmakerCoverageMax: 11, dataQualityScore: 88 },
      ],
      scoredPicks: [makePick({ gameId: "game-1", edgeScore: 72, confidence: 74 })],
      pickIdByGameId: new Map([["game-1", "pick-1"]]),
      isBootstrap: false,
      modelVersion: MODEL_VERSION,
    });

    expect(mocks.createMany).toHaveBeenCalledTimes(1);
    const rows = (mocks.createMany.mock.calls[0]?.[0] as { data: unknown[] }).data as Array<
      Record<string, unknown>
    >;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      gameId: "game-1",
      pickId: "pick-1",
      status: "PUBLISHED",
      reasonCode: "CLEARED_PUBLISH_THRESHOLD",
      edgeIndex: 72,
      confidence: 74,
      modelVersion: MODEL_VERSION,
      isBootstrap: false,
    });

    // currentEdgeIndex is lit up for the published game with the 0–100 edge.
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "game-1" },
      data: { currentEdgeIndex: 72 },
    });
  });

  it("writes a GATED GateDecision with a reason for a game with no pick", async () => {
    await recordGateDecisions({
      evaluatedGames: [
        // Thin market depth → market-depth reason.
        { gameId: "g-thin", bookmakerCoverageMax: 2, dataQualityScore: 90 },
        // Adequate depth but low evidence health → evidence-health reason.
        { gameId: "g-evidence", bookmakerCoverageMax: 6, dataQualityScore: 50 },
        // Depth + evidence both fine but nothing cleared → generic reason.
        { gameId: "g-generic", bookmakerCoverageMax: 8, dataQualityScore: 85 },
      ],
      scoredPicks: [],
      pickIdByGameId: new Map(),
      isBootstrap: false,
      modelVersion: MODEL_VERSION,
    });

    const rows = (mocks.createMany.mock.calls[0]?.[0] as { data: unknown[] }).data as Array<
      Record<string, unknown>
    >;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      gameId: "g-thin",
      status: "GATED",
      pickId: null,
      edgeIndex: null,
      confidence: null,
      reasonCode: "MARKET_DEPTH_BELOW_THRESHOLD",
      reason: "Market depth below publish threshold.",
    });
    expect(rows[1]).toMatchObject({
      gameId: "g-evidence",
      status: "GATED",
      reasonCode: "EVIDENCE_HEALTH_BELOW_THRESHOLD",
      reason: "Evidence health below publish threshold.",
    });
    expect(rows[2]).toMatchObject({
      gameId: "g-generic",
      status: "GATED",
      reasonCode: "NO_PICK_CLEARED_THRESHOLD",
      reason: "No pick cleared the publish threshold.",
    });

    // No published game → no currentEdgeIndex writes.
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("writes mixed PUBLISHED + GATED rows and picks the top pick per game", async () => {
    await recordGateDecisions({
      evaluatedGames: [
        { gameId: "pub", bookmakerCoverageMax: 11, dataQualityScore: 90 },
        { gameId: "gated", bookmakerCoverageMax: 2, dataQualityScore: 90 },
      ],
      // Two picks for the published game — the higher-confidence one wins.
      scoredPicks: [
        makePick({ gameId: "pub", pickType: "TOTAL", confidence: 60, edgeScore: 55 }),
        makePick({ gameId: "pub", pickType: "SPREAD", confidence: 81, edgeScore: 77 }),
      ],
      pickIdByGameId: new Map([["pub", "pick-top"]]),
      isBootstrap: false,
      modelVersion: MODEL_VERSION,
    });

    const rows = (mocks.createMany.mock.calls[0]?.[0] as { data: unknown[] }).data as Array<
      Record<string, unknown>
    >;
    expect(rows).toHaveLength(2);
    const pub = rows.find((r) => r["gameId"] === "pub");
    expect(pub).toMatchObject({
      status: "PUBLISHED",
      confidence: 81,
      edgeIndex: 77,
      pickId: "pick-top",
    });
    expect(rows.find((r) => r["gameId"] === "gated")).toMatchObject({ status: "GATED" });
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("no-ops cleanly in stub / no-DB mode without throwing", async () => {
    // Stub proxy returns { count: 0 } / { id: "stub" } — the default mocks here.
    await expect(
      recordGateDecisions({
        evaluatedGames: [
          { gameId: "game-1", bookmakerCoverageMax: 11, dataQualityScore: 88 },
        ],
        scoredPicks: [makePick({ gameId: "game-1" })],
        pickIdByGameId: new Map([["game-1", "pick-1"]]),
        isBootstrap: false,
        modelVersion: MODEL_VERSION,
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createMany).toHaveBeenCalledTimes(1);
  });

  it("does nothing and does not throw when there are no evaluated games", async () => {
    await expect(
      recordGateDecisions({
        evaluatedGames: [],
        scoredPicks: [],
        pickIdByGameId: new Map(),
        isBootstrap: false,
        modelVersion: MODEL_VERSION,
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("swallows a createMany rejection (degraded path) without throwing", async () => {
    mocks.createMany.mockRejectedValue(new Error("database unavailable"));

    await expect(
      recordGateDecisions({
        evaluatedGames: [
          { gameId: "game-1", bookmakerCoverageMax: 11, dataQualityScore: 88 },
        ],
        scoredPicks: [makePick({ gameId: "game-1" })],
        pickIdByGameId: new Map([["game-1", "pick-1"]]),
        isBootstrap: false,
        modelVersion: MODEL_VERSION,
      }),
    ).resolves.toBeUndefined();

    // Failure is contained before the edge-index write loop is reached.
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("swallows a per-game currentEdgeIndex update rejection without throwing", async () => {
    mocks.update.mockRejectedValue(new Error("update failed"));

    await expect(
      recordGateDecisions({
        evaluatedGames: [
          { gameId: "game-1", bookmakerCoverageMax: 11, dataQualityScore: 88 },
        ],
        scoredPicks: [makePick({ gameId: "game-1" })],
        pickIdByGameId: new Map([["game-1", "pick-1"]]),
        isBootstrap: false,
        modelVersion: MODEL_VERSION,
      }),
    ).resolves.toBeUndefined();

    // The GateDecision rows were still written even though the edge update failed.
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
  });
});
