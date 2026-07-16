import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadinessGates } from "@sports/prediction-engine";

/**
 * Behavioral tests for processSport — the single pick-generation path
 * shared by the data-refresh worker and the admin trigger-refresh route.
 *
 * Pins the documented invariants:
 *   - isBootstrap derives from gates and flows to picks/enrichment/snapshots
 *   - stale data is rejected (freshness gate)
 *   - the CLV lock is set once at creation and never refreshed
 *   - PickSignalSnapshot is immutable (update: {})
 *   - featured promotion respects the gate
 *   - derived history is never fetched when the gate is off
 *   - errors mark the IngestionRun FAILED and return status:"failed"
 */

const mocks = vi.hoisted(() => ({
  // data-ingestion
  getOdds: vi.fn<(sport: string, markets: string[]) => Promise<{ data: unknown[]; remainingRequests: number }>>(),
  validateFreshness: vi.fn<(at: Date) => boolean>(),
  validateOddsFreshness: vi.fn<(odds: unknown[]) => boolean>(),
  freshGameIds: vi.fn<(odds: unknown[]) => Set<string>>(),
  normalizeGames: vi.fn<(events: unknown[]) => unknown[]>(),
  normalizeOdds: vi.fn<(events: unknown[], at: Date) => unknown[]>(),
  enrichGameContext: vi.fn<(args: unknown) => Promise<void>>(),
  getAtsForm: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getHeadToHeadForm: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  // prediction-engine
  scoreGames: vi.fn<(inputs: unknown[], at: Date) => unknown[]>(),
  buildPickSignalSnapshot: vi.fn<(...args: unknown[]) => Record<string, unknown>>(),
  buildPickProofReceipt: vi.fn<(...args: unknown[]) => Record<string, unknown>>(),
  // db
  ingestionRunCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  ingestionRunUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  sportUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  gameUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  oddsCreateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  pickCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  pickDelete: vi.fn<(args: unknown) => Promise<unknown>>(),
  pickFindUnique: vi.fn<(args: unknown) => Promise<{ id: string; result: string; selection: string } | null>>(),
  snapshotUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  receiptUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  notifyOwner: vi.fn<(message: string) => Promise<boolean>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { create: mocks.ingestionRunCreate, update: mocks.ingestionRunUpdate },
    sport: { upsert: mocks.sportUpsert },
    game: { upsert: mocks.gameUpsert, findUnique: mocks.gameFindUnique },
    odds: { createMany: mocks.oddsCreateMany },
    pick: { create: mocks.pickCreate, delete: mocks.pickDelete, findUnique: mocks.pickFindUnique },
    pickSignalSnapshot: { upsert: mocks.snapshotUpsert },
    pickProofReceipt: { upsert: mocks.receiptUpsert },
  },
}));

vi.mock("../owner-alert.js", () => ({
  notifyOwner: mocks.notifyOwner,
  ownerAlertsConfigured: () => false,
}));

vi.mock("@sports/data-ingestion", () => ({
  OddsApiClient: vi.fn().mockImplementation(() => ({ getOdds: mocks.getOdds })),
  DataNormalizer: vi.fn().mockImplementation(() => ({
    validateFreshness: mocks.validateFreshness,
    validateOddsFreshness: mocks.validateOddsFreshness,
    freshGameIds: mocks.freshGameIds,
    normalizeGames: mocks.normalizeGames,
    normalizeOdds: mocks.normalizeOdds,
    // The stale rejection path now embeds freshnessDiagnostics() output in its
    // error; the mock must be shape-complete or the TypeError masks the throw.
    freshnessDiagnostics: () => ({
      thresholdHours: 4,
      rows: 1,
      games: 1,
      unparseableRows: 0,
      newestAgeMinutes: 999,
    }),
  })),
  MARKETS: ["h2h", "spreads", "totals"],
  enrichGameContext: mocks.enrichGameContext,
  getAtsForm: mocks.getAtsForm,
  getHeadToHeadForm: mocks.getHeadToHeadForm,
}));

vi.mock("@sports/prediction-engine", () => ({
  scoreGames: mocks.scoreGames,
  buildPickSignalSnapshot: mocks.buildPickSignalSnapshot,
  buildPickProofReceipt: mocks.buildPickProofReceipt,
}));

vi.mock("../source-snapshot.js", () => ({
  recordSourceSnapshot: vi.fn().mockResolvedValue(undefined),
}));

import { processSport, pickSelectionSide } from "../process-sport.js";

const SPORT = { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" } as const;

function gates(overrides: Partial<ReadinessGates> = {}): ReadinessGates {
  return {
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: true,
    canPromoteFeaturedPicks: true,
    canLearnFromOutcomes: true,
    isBootstrapMode: false,
    minDataQualityForGameLog: 60,
    ...overrides,
  } as unknown as ReadinessGates;
}

function normalizedGame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    externalId: "ext-1",
    homeTeam: "Chiefs",
    awayTeam: "Bills",
    commenceTime: new Date("2030-06-12T17:00:00.000Z"),
    ...overrides,
  };
}

function scoredPick(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    line: -3.5,
    confidence: 72,
    edgeScore: 61,
    consensusPct: 64,
    bookmakerCount: 8,
    tier: "PREMIUM",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning: "Line value against the market consensus.",
    reasoningShort: "Line value.",
    factorBreakdown: { dataQualityScore: 82 },
    modelVersion: "v5.0.0",
    dataFreshnessAt: new Date(),
    ...overrides,
  };
}

describe("processSport", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();

    mocks.ingestionRunCreate.mockResolvedValue({ id: "run-1" });
    mocks.ingestionRunUpdate.mockResolvedValue({});
    mocks.getOdds.mockResolvedValue({ data: [{ raw: true }], remainingRequests: 400 });
    mocks.validateFreshness.mockReturnValue(true);
    mocks.validateOddsFreshness.mockReturnValue(true);
    mocks.freshGameIds.mockReturnValue(new Set());
    mocks.normalizeGames.mockReturnValue([normalizedGame()]);
    mocks.normalizeOdds.mockReturnValue([]);
    mocks.sportUpsert.mockResolvedValue({ id: "sport-1" });
    mocks.gameUpsert.mockResolvedValue({ id: "game-1" });
    mocks.gameFindUnique.mockResolvedValue({ id: "game-1" });
    mocks.enrichGameContext.mockResolvedValue(undefined);
    mocks.getAtsForm.mockResolvedValue(null);
    mocks.getHeadToHeadForm.mockResolvedValue(null);
    mocks.scoreGames.mockReturnValue([scoredPick()]);
    mocks.pickCreate.mockResolvedValue({ id: "pick-1" });
    mocks.oddsCreateMany.mockResolvedValue({ count: 0 });
    // Default: no existing pick → the create/update upsert path runs as before.
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.buildPickSignalSnapshot.mockReturnValue({ pickId: "pick-1" });
    mocks.snapshotUpsert.mockResolvedValue({});
    mocks.pickDelete.mockResolvedValue({});
    mocks.receiptUpsert.mockResolvedValue({});
    mocks.notifyOwner.mockResolvedValue(false);
    mocks.buildPickProofReceipt.mockReturnValue({
      pickId: "pick-1",
      payload: "payload",
      contentHash: "hash",
      frozenAt: new Date().toISOString(),
      fields: {
        marketFairProb: 0.55,
        confidence: 72,
        edgeScore: 61,
        modelProb: null,
        entryOdds: -110,
        line: -3.5,
        modelVersion: "v5.0.0",
        asOf: new Date().toISOString(),
      },
    });
  });

  it("runs the happy path and marks the IngestionRun SUCCESS with counts", async () => {
    const result = await processSport(SPORT, "key", gates());

    expect(result).toMatchObject({ sport: SPORT.key, status: "success", games: 1, picks: 1 });
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "SUCCESS", gamesUpserted: 1 }),
      })
    );
  });

  it("does not mint sidecars after losing a concurrent create race", async () => {
    mocks.pickFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "pick-winner",
        result: "PENDING",
        selection: "Chiefs -3.5",
      });
    mocks.pickCreate.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));

    const result = await processSport(SPORT, "key", gates());

    expect(result).toMatchObject({ status: "success", picks: 1 });
    expect(mocks.snapshotUpsert).not.toHaveBeenCalled();
    expect(mocks.buildPickSignalSnapshot).not.toHaveBeenCalled();
  });

  it("preserves the calibrated arithmetic reference in enrichment and scoring context", async () => {
    const fetchedAt = new Date("2030-06-12T12:00:00.000Z");
    mocks.normalizeOdds.mockReturnValue([
      ...[-4, -3.5, -3, -2.5].map((spread, index) => ({
        gameExternalId: "ext-1",
        bookmaker: `spread-${index}`,
        market: "SPREADS",
        spread,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
        fetchedAt,
        bookmakerLastUpdate: fetchedAt,
      })),
      ...[48.5, 49, 49, 49.5].map((total, index) => ({
        gameExternalId: "ext-1",
        bookmaker: `total-${index}`,
        market: "TOTALS",
        total,
        overPrice: -110,
        underPrice: -110,
        fetchedAt,
        bookmakerLastUpdate: fetchedAt,
      })),
    ]);
    mocks.freshGameIds.mockReturnValue(new Set(["ext-1"]));
    mocks.oddsCreateMany.mockResolvedValue({ count: 8 });

    await processSport(SPORT, "key", gates());

    expect(mocks.enrichGameContext).toHaveBeenCalledWith(
      expect.objectContaining({ avgSpread: -3.25, avgTotal: 49 }),
    );
    const [inputs] = mocks.scoreGames.mock.calls[0]!;
    expect(inputs).toEqual([
      expect.objectContaining({
        context: expect.objectContaining({ currentSpread: -3.25, currentTotal: 49 }),
        bookmakerOdds: expect.arrayContaining([
          expect.objectContaining({ spread: -4 }),
          expect.objectContaining({ spread: -2.5 }),
        ]),
      }),
    ]);
  });

  it("propagates the normalized draw quote into three-way H2H scoring input", async () => {
    const fetchedAt = new Date("2026-07-15T12:00:00.000Z");
    mocks.normalizeOdds.mockReturnValue([
      {
        gameExternalId: "ext-1",
        bookmaker: "book-1",
        market: "H2H",
        homePrice: -125,
        awayPrice: 310,
        drawPrice: 260,
        fetchedAt,
        bookmakerLastUpdate: fetchedAt,
      },
    ]);
    mocks.freshGameIds.mockReturnValue(new Set(["ext-1"]));
    mocks.oddsCreateMany.mockResolvedValue({ count: 1 });

    await processSport(SPORT, "key", gates());

    const [inputs] = mocks.scoreGames.mock.calls[0]!;
    expect(inputs).toEqual([
      expect.objectContaining({
        bookmakerOdds: [expect.objectContaining({ drawPrice: 260 })],
      }),
    ]);
    expect(mocks.oddsCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ drawPrice: 260 })],
      }),
    );
  });

  it.each([
    ["at kickoff", new Date("2030-06-12T17:00:00.000Z")],
    ["after kickoff", new Date("2030-06-12T17:00:00.001Z")],
  ])("does not mint a pick %s", async (_label, now) => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      mocks.normalizeGames.mockReturnValue([
        normalizedGame({ commenceTime: new Date("2030-06-12T17:00:00.000Z") }),
      ]);

      const result = await processSport(SPORT, "key", gates());

      expect(result).toMatchObject({ status: "success", picks: 0 });
      expect(mocks.pickCreate).not.toHaveBeenCalled();
      expect(mocks.snapshotUpsert).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks the run FAILED and returns status failed when the odds API errors", async () => {
    mocks.getOdds.mockRejectedValue(new Error("quota exhausted"));

    const result = await processSport(SPORT, "key", gates());

    expect(result).toMatchObject({ status: "failed", error: "quota exhausted" });
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", errorMessage: "quota exhausted" }),
      })
    );
    expect(mocks.pickCreate).not.toHaveBeenCalled();
  });

  it("rejects stale data — freshness failure fails the run (no-stale-data rule)", async () => {
    mocks.validateFreshness.mockReturnValue(false);

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/freshness/i);
    expect(mocks.pickCreate).not.toHaveBeenCalled();
  });

  it("rejects a STALE UPSTREAM feed even when our fetch clock looks fresh (no-stale-data rule)", async () => {
    // We fetched now (validateFreshness passes) but every game's upstream odds are stale,
    // and a game commences INSIDE the quiet-board horizon — books always touch a live
    // pregame market in the final day, so this is a real incident: fail closed.
    mocks.validateFreshness.mockReturnValue(true);
    mocks.normalizeGames.mockReturnValue([
      normalizedGame({ commenceTime: new Date(Date.now() + 6 * 3_600_000) }),
    ]);
    mocks.normalizeOdds.mockReturnValue([{ gameExternalId: "ext-1", bookmaker: "x" }]);
    mocks.freshGameIds.mockReturnValue(new Set());

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/stale/i);
    expect(mocks.pickCreate).not.toHaveBeenCalled();
  });

  it("classifies an all-stale board with every game beyond the horizon as QUIET — zero-work success, no alarm, no picks", async () => {
    // Mid-week MLS shape (2026-07-10 false-alarm incident): weekend games 40h+
    // out, books untouched for 13h. Not an incident — but also NOT fresh: the
    // run records SUCCESS with oddsInserted 0 so the public freshness clock is
    // not reset, and no pick is generated from the stale rows.
    mocks.validateFreshness.mockReturnValue(true);
    mocks.normalizeGames.mockReturnValue([
      normalizedGame({ commenceTime: new Date(Date.now() + 40 * 3_600_000) }),
    ]);
    mocks.normalizeOdds.mockReturnValue([{ gameExternalId: "ext-1", bookmaker: "x" }]);
    mocks.freshGameIds.mockReturnValue(new Set());

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(result.note).toBe("quiet_board");
    expect(result.games).toBe(0);
    expect(result.picks).toBe(0);
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.oddsCreateMany).not.toHaveBeenCalled();
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS", gamesUpserted: 0, oddsInserted: 0 }),
      }),
    );
  });

  it("derives isBootstrap from the canonical-history gate and propagates it", async () => {
    await processSport(SPORT, "key", gates({ canPersistCanonicalHistory: false }));

    expect(mocks.enrichGameContext).toHaveBeenCalledWith(
      expect.objectContaining({ isBootstrap: true })
    );
    expect(mocks.pickCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isBootstrap: true }) })
    );
  });

  it("never lets a refresh overwrite isBootstrap or the CLV lock (immutable creation fields)", async () => {
    await processSport(SPORT, "key", gates());

    const call = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data["clvLockLine"]).toBe(-3.5);
    expect(call.data).not.toHaveProperty("result");
    expect(call.data).not.toHaveProperty("settledAt");
  });

  it("freezes a SETTLED pick — a refresh never rewrites a graded row", async () => {
    // The pick already exists and has been graded WIN by settlement.
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-1",
      result: "WIN",
      selection: "Chiefs -3.5",
    });

    const result = await processSport(SPORT, "key", gates());

    // The run still succeeds, but the settled pick is left exactly as graded:
    // no upsert touches its selection/line/confidence/grade/reasoning.
    expect(result.status).toBe("success");
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.snapshotUpsert).not.toHaveBeenCalled();
  });

  it("freezes a PENDING pick whose SIDE flipped — published picks are never silently reversed", async () => {
    // Published "Raiders +3.5"; the model now prefers the other side of the
    // same market. The CLV lock and proof receipt were minted for the Raiders
    // side, so the rewrite must be frozen, not applied.
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-1",
      result: "PENDING",
      selection: "Raiders +3.5",
    });
    mocks.scoreGames.mockReturnValue([scoredPick({ selection: "Chiefs -3.5" })]);

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(mocks.pickCreate).not.toHaveBeenCalled();
  });

  it("freezes a PENDING pick on the SAME side so its line cannot drift from its receipt", async () => {
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-1",
      result: "PENDING",
      selection: "Chiefs -4.0",
    });
    mocks.scoreGames.mockReturnValue([scoredPick({ selection: "Chiefs -3.5" })]);

    await processSport(SPORT, "key", gates());

    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.snapshotUpsert).not.toHaveBeenCalled();
  });

  it("locks the American price (not the line) for moneyline picks", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickType: "MONEYLINE", line: -135 })]);

    await processSport(SPORT, "key", gates());

    const call = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data["clvLockLine"]).toBeNull();
    expect(call.data["clvLockPrice"]).toBe(-135);
  });

  it("keeps PickSignalSnapshot immutable (upsert with empty update)", async () => {
    await processSport(SPORT, "key", gates());

    expect(mocks.snapshotUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pickId: "pick-1" }, update: {} })
    );
  });

  it("SNAPSHOT IS MANDATORY AT MINT (owner ruling R3): a snapshot failure rolls the pick back and alerts", async () => {
    mocks.snapshotUpsert.mockRejectedValue(new Error("snapshot table locked"));

    const result = await processSport(SPORT, "key", gates());

    // The run survives, but the pick does NOT — a pick may never exist whose
    // prediction-time snapshot is missing (it could later be silently excluded
    // from the public record; mint must fail loudly instead).
    expect(result.status).toBe("success");
    expect(result.picks).toBe(0);
    expect(mocks.pickDelete).toHaveBeenCalledWith({ where: { id: "pick-1" } });
    expect(mocks.notifyOwner).toHaveBeenCalledWith(
      expect.stringContaining("mandatory snapshot"),
    );
  });

  it("a proof-receipt mint failure ALERTS the owner — a receipt-less publish is a record-integrity event (M1)", async () => {
    mocks.scoreGames.mockReturnValue([
      scoredPick({ marketFairProb: 0.55, entryPrice: -110 }),
    ]);
    mocks.receiptUpsert.mockRejectedValue(new Error("receipt table locked"));

    const result = await processSport(SPORT, "key", gates());

    // The pick still publishes (receipt failure stays non-fatal for the pick)…
    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
    expect(mocks.pickDelete).not.toHaveBeenCalled();
    // …but the failure is pushed to the owner, never just console.warn'd.
    expect(mocks.notifyOwner).toHaveBeenCalledWith(
      expect.stringContaining("RECORD-INTEGRITY"),
    );
  });

  it("suppresses featured promotion when the gate is off", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickGrade: "ELITE_PLAY", confidence: 90 })]);

    await processSport(SPORT, "key", gates({ canPromoteFeaturedPicks: false }));

    const call = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data["isFeatured"]).toBe(false);
  });

  it("promotes elite plays when the gate is on", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickGrade: "ELITE_PLAY", confidence: 90 })]);

    await processSport(SPORT, "key", gates({ canPromoteFeaturedPicks: true }));

    const call = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data["isFeatured"]).toBe(true);
  });

  it("never fetches ATS/H2H history when the derived-history gate is off", async () => {
    await processSport(SPORT, "key", gates({ canUseDerivedHistory: false }));

    expect(mocks.getAtsForm).not.toHaveBeenCalled();
    expect(mocks.getHeadToHeadForm).not.toHaveBeenCalled();
  });

  it("an enrichment failure never blocks pick generation", async () => {
    mocks.enrichGameContext.mockRejectedValue(new Error("signal write failed"));

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
  });
});

describe("pickSelectionSide", () => {
  it("derives OVER/UNDER for totals regardless of the number", () => {
    expect(pickSelectionSide("TOTAL", "OVER 8.5")).toBe("OVER");
    expect(pickSelectionSide("TOTAL", "UNDER 9.0")).toBe("UNDER");
    expect(pickSelectionSide("TOTAL", "OVER 8.5")).not.toBe(
      pickSelectionSide("TOTAL", "UNDER 8.5"),
    );
  });

  it("derives the team for moneylines (multi-word names included)", () => {
    expect(pickSelectionSide("MONEYLINE", "Kansas City Chiefs ML (-150)")).toBe(
      "Kansas City Chiefs",
    );
    expect(pickSelectionSide("MONEYLINE", "Jets ML (+130)")).toBe("Jets");
  });

  it("derives the team for spreads by stripping only the trailing points token", () => {
    expect(pickSelectionSide("SPREAD", "Los Angeles Lakers -3.5")).toBe("Los Angeles Lakers");
    expect(pickSelectionSide("SPREAD", "Chiefs +7")).toBe("Chiefs");
    // A pure line move is NOT a side change…
    expect(pickSelectionSide("SPREAD", "Chiefs -4.0")).toBe(
      pickSelectionSide("SPREAD", "Chiefs -3.5"),
    );
    // …but the other team is.
    expect(pickSelectionSide("SPREAD", "Raiders +3.5")).not.toBe(
      pickSelectionSide("SPREAD", "Chiefs -3.5"),
    );
  });
});
