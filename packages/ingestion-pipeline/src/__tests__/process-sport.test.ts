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
  // db
  ingestionRunCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  ingestionRunUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  sportUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  gameUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  oddsCreateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  pickUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  pickFindUnique: vi.fn<(args: unknown) => Promise<{ id: string; result: string; selection?: string } | null>>(),
  snapshotUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { create: mocks.ingestionRunCreate, update: mocks.ingestionRunUpdate },
    sport: { upsert: mocks.sportUpsert },
    game: { upsert: mocks.gameUpsert, findUnique: mocks.gameFindUnique },
    odds: { createMany: mocks.oddsCreateMany },
    pick: { upsert: mocks.pickUpsert, findUnique: mocks.pickFindUnique },
    pickSignalSnapshot: { upsert: mocks.snapshotUpsert },
  },
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
    commenceTime: new Date("2026-06-12T17:00:00.000Z"),
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
    mocks.pickUpsert.mockResolvedValue({ id: "pick-1" });
    mocks.oddsCreateMany.mockResolvedValue({ count: 0 });
    // Default: no existing pick → the create/update upsert path runs as before.
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.buildPickSignalSnapshot.mockReturnValue({ pickId: "pick-1" });
    mocks.snapshotUpsert.mockResolvedValue({});
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

  it("marks the run FAILED and returns status failed when the odds API errors", async () => {
    mocks.getOdds.mockRejectedValue(new Error("quota exhausted"));

    const result = await processSport(SPORT, "key", gates());

    expect(result).toMatchObject({ status: "failed", error: "quota exhausted" });
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", errorMessage: "quota exhausted" }),
      })
    );
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
  });

  it("rejects stale data — freshness failure fails the run (no-stale-data rule)", async () => {
    mocks.validateFreshness.mockReturnValue(false);

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/freshness/i);
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
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
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
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
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
    expect(mocks.oddsCreateMany).not.toHaveBeenCalled();
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS", gamesUpserted: 0, oddsInserted: 0 }),
      }),
    );
  });

  it("captures bookDisagreementAtLock (max-min book spread) write-once at pick creation", async () => {
    // Three books quoting the SPREAD for the game: -3, -3.5, -2.5 -> dispersion 1.0.
    mocks.normalizeGames.mockReturnValue([normalizedGame()]);
    mocks.normalizeOdds.mockReturnValue([
      { gameExternalId: "ext-1", bookmaker: "a", market: "SPREADS", spread: -3 },
      { gameExternalId: "ext-1", bookmaker: "b", market: "SPREADS", spread: -3.5 },
      { gameExternalId: "ext-1", bookmaker: "c", market: "SPREADS", spread: -2.5 },
    ]);
    mocks.freshGameIds.mockReturnValue(new Set(["ext-1"]));
    // scoredPick default is a SPREAD pick on game-1 (= gameUpsert id).

    await processSport(SPORT, "key", gates());

    const call = mocks.pickUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(call.create["bookDisagreementAtLock"]).toBeCloseTo(1.0, 10);
    // Write-once: never in the update path (immutable lock-time measurement).
    const upd = (mocks.pickUpsert.mock.calls[0]![0] as { update: Record<string, unknown> }).update;
    expect(upd).not.toHaveProperty("bookDisagreementAtLock");
  });

  it("captures an AWAY moneyline pick's bookDisagreementAtLock from the AWAY side, not home (write-once)", async () => {
    // normalizedGame default: home "Chiefs", away "Bills". Books AGREE on the home
    // price (both -150 → 0.6, dispersion 0) but DISAGREE on the away price. The
    // published pick is the AWAY team (Bills), so the lock must reflect the AWAY
    // side's dispersion (> 0). A home-hardcoded capture would (wrongly) persist 0.
    mocks.normalizeGames.mockReturnValue([normalizedGame()]);
    mocks.normalizeOdds.mockReturnValue([
      { gameExternalId: "ext-1", bookmaker: "a", market: "H2H", homePrice: -150, awayPrice: 130 },
      { gameExternalId: "ext-1", bookmaker: "b", market: "H2H", homePrice: -150, awayPrice: 110 },
    ]);
    mocks.freshGameIds.mockReturnValue(new Set(["ext-1"]));
    mocks.scoreGames.mockReturnValue([
      scoredPick({ pickType: "MONEYLINE", selection: "Bills ML (+120)", line: 120 }),
    ]);

    await processSport(SPORT, "key", gates());

    const call = mocks.pickUpsert.mock.calls[0]![0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    const awayDispersion = 100 / 210 - 100 / 230; // away implied-prob spread (+110 vs +130)
    expect(call.create["bookDisagreementAtLock"]).toBeCloseTo(awayDispersion, 10);
    expect(call.create["bookDisagreementAtLock"] as number).toBeGreaterThan(0);
    // Guard against the home-side regression: the home dispersion here is exactly 0.
    expect(call.create["bookDisagreementAtLock"]).not.toBe(0);
    // Write-once: never in the update path (immutable lock-time measurement).
    expect(call.update).not.toHaveProperty("bookDisagreementAtLock");
  });

  it("writes null bookDisagreementAtLock when fewer than two books quote the kind", async () => {
    mocks.normalizeGames.mockReturnValue([normalizedGame()]);
    mocks.normalizeOdds.mockReturnValue([
      { gameExternalId: "ext-1", bookmaker: "a", market: "SPREADS", spread: -3 },
    ]);
    mocks.freshGameIds.mockReturnValue(new Set(["ext-1"]));

    await processSport(SPORT, "key", gates());

    const call = mocks.pickUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(call.create["bookDisagreementAtLock"]).toBeNull();
  });

  it("MIGRATION SAFETY: a pre-migration missing-column write failure fails the run gracefully, never throws", async () => {
    // Reproduces the exact historical outage (#69/#70 -> #71): a Prisma Client
    // generated from a schema.prisma that declares bookDisagreementAtLock, run
    // against a database where the additive migration has not yet been applied
    // (the founder applies migrations manually; a deploy can land ahead of the
    // apply). Prisma surfaces this as a runtime Postgres error on the INSERT —
    // not a TypeScript-catchable precondition — so the only safety net is
    // processSport's function-level catch. It MUST swallow this into a FAILED
    // run and never let it escape as an unhandled rejection/throw, which is
    // what would turn a missing column into a 500 for any caller that awaits
    // this (the admin trigger-refresh route, the cron worker).
    mocks.pickUpsert.mockRejectedValue(
      Object.assign(
        new Error(
          "The column `picks.bookDisagreementAtLock` does not exist in the current database.",
        ),
        { code: "P2022" },
      ),
    );

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/bookDisagreementAtLock.*does not exist/);
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: expect.stringContaining("bookDisagreementAtLock"),
        }),
      }),
    );
  });

  it("derives isBootstrap from the canonical-history gate and propagates it", async () => {
    await processSport(SPORT, "key", gates({ canPersistCanonicalHistory: false }));

    expect(mocks.enrichGameContext).toHaveBeenCalledWith(
      expect.objectContaining({ isBootstrap: true })
    );
    expect(mocks.pickUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ isBootstrap: true }) })
    );
  });

  it("never lets a refresh overwrite isBootstrap or the CLV lock (immutable creation fields)", async () => {
    await processSport(SPORT, "key", gates());

    const call = mocks.pickUpsert.mock.calls[0]![0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(call.create["clvLockLine"]).toBe(-3.5);
    expect(call.update).not.toHaveProperty("isBootstrap");
    expect(call.update).not.toHaveProperty("clvLockLine");
    expect(call.update).not.toHaveProperty("clvLockPrice");
    expect(call.update).not.toHaveProperty("result");
    expect(call.update).not.toHaveProperty("settledAt");
  });

  it("freezes a SETTLED pick — a refresh never rewrites a graded row", async () => {
    // The pick already exists and has been graded WIN by settlement.
    mocks.pickFindUnique.mockResolvedValue({ id: "pick-1", result: "WIN" });

    const result = await processSport(SPORT, "key", gates());

    // The run still succeeds, but the settled pick is left exactly as graded:
    // no upsert touches its selection/line/confidence/grade/reasoning.
    expect(result.status).toBe("success");
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
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
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
  });

  it("a line move on the SAME side still refreshes (no false flip-freeze)", async () => {
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-1",
      result: "PENDING",
      selection: "Chiefs -4.0",
    });
    mocks.scoreGames.mockReturnValue([scoredPick({ selection: "Chiefs -3.5" })]);

    await processSport(SPORT, "key", gates());

    expect(mocks.pickUpsert).toHaveBeenCalledTimes(1);
  });

  it("locks the American price (not the line) for moneyline picks", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickType: "MONEYLINE", line: -135 })]);

    await processSport(SPORT, "key", gates());

    const call = mocks.pickUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(call.create["clvLockLine"]).toBeNull();
    expect(call.create["clvLockPrice"]).toBe(-135);
  });

  it("keeps PickSignalSnapshot immutable (upsert with empty update)", async () => {
    await processSport(SPORT, "key", gates());

    expect(mocks.snapshotUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pickId: "pick-1" }, update: {} })
    );
  });

  it("a snapshot failure never kills the pick or the run", async () => {
    mocks.snapshotUpsert.mockRejectedValue(new Error("snapshot table locked"));

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
  });

  it("suppresses featured promotion when the gate is off", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickGrade: "ELITE_PLAY", confidence: 90 })]);

    await processSport(SPORT, "key", gates({ canPromoteFeaturedPicks: false }));

    const call = mocks.pickUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(call.create["isFeatured"]).toBe(false);
  });

  it("promotes elite plays when the gate is on", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ pickGrade: "ELITE_PLAY", confidence: 90 })]);

    await processSport(SPORT, "key", gates({ canPromoteFeaturedPicks: true }));

    const call = mocks.pickUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    expect(call.create["isFeatured"]).toBe(true);
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
