import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  pickCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  pickUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  pickFindUnique: vi.fn<(args: unknown) => Promise<{ id: string; result: string; selection?: string } | null>>(),
  snapshotUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  resolveRundownApiKey: vi.fn<() => string>(),
  fetchRundownEventsForSport: vi.fn<(sport: string, key: string) => Promise<{ events: unknown[]; remaining: number | null }>>(),
  eventsBelowBookmakerThreshold: vi.fn<(events: unknown[], min?: number) => unknown[]>(),
  mergeBookmakersIntoPrimary: vi.fn<(primary: unknown[], secondary: unknown[], min?: number) => {
    events: unknown[];
    filledGameIds: string[];
    unmatchedSecondary: number;
    skippedWellCovered: number;
  }>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { create: mocks.ingestionRunCreate, update: mocks.ingestionRunUpdate },
    sport: { upsert: mocks.sportUpsert },
    game: { upsert: mocks.gameUpsert, findUnique: mocks.gameFindUnique },
    odds: { createMany: mocks.oddsCreateMany },
    pick: { upsert: mocks.pickUpsert, findUnique: mocks.pickFindUnique, updateMany: mocks.pickUpdateMany, create: mocks.pickCreate },
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
  // Independent fill path (Kalshi / ESPN FPI / team rates) — honest nulls in unit tests.
  getTeamScoringRecords: vi.fn().mockResolvedValue([]),
  getLeagueAverageScored: vi.fn().mockResolvedValue(null),
  KalshiClient: vi.fn().mockImplementation(() => ({
    getFairValue: vi.fn().mockResolvedValue(null),
  })),
  toIndependentFairValue: vi.fn().mockReturnValue({
    source: "kalshi",
    homeFairProb: null,
    awayFairProb: null,
  }),
  sportKeyToPowerIndexLeague: vi.fn().mockReturnValue(null),
  getCachedEspnPowerIndexMap: vi.fn().mockResolvedValue(new Map()),
  lookupTeamFpi: vi.fn().mockReturnValue(null),
  defaultPowerIndexSeason: vi.fn().mockReturnValue(2025),
  sportKeyToKalshiLeagueCode: vi.fn().mockReturnValue(null),
  getSharedClubEloClient: vi.fn(),
  isClubEloSport: vi.fn().mockReturnValue(false),
  isIngestible: vi.fn().mockReturnValue(false),
  resolveRundownApiKey: mocks.resolveRundownApiKey,
  fetchRundownEventsForSport: mocks.fetchRundownEventsForSport,
  eventsBelowBookmakerThreshold: mocks.eventsBelowBookmakerThreshold,
  mergeBookmakersIntoPrimary: mocks.mergeBookmakersIntoPrimary,
  THIN_FILL_MIN_BOOKMAKERS: 2,
  fetchEspnOddsForSport: vi.fn().mockResolvedValue({ events: [], provider: "espn_public" }),
  NFL_PRESEASON_ODDS_KEY: "americanfootball_nfl_preseason",
  NFL_CANONICAL_SPORT_KEY: "americanfootball_nfl",
  isNflPreseasonFetchWindow: vi.fn().mockReturnValue(false),
  remapPreseasonRows: vi.fn().mockReturnValue({ remapped: [], unmatched: 0 }),
  mergeFeedRowsById: vi.fn((primary: unknown[]) => primary),
  resolveOddsApiKey: vi.fn().mockReturnValue("key"),
  oddsApiKeyPresence: vi.fn().mockReturnValue({ present: true, matchedEnv: "THE_ODDS_API_KEY" }),
  rundownApiKeyPresence: vi.fn().mockReturnValue({ present: false, matchedEnv: null }),
}));

vi.mock("@sports/prediction-engine", async () => {
  // selectionIsHomeSide is the REAL, canonical (#119) implementation — not a
  // hand-rolled test double — so these tests prove the actual side-resolution
  // boundary logic, not a stand-in for it.
  const actual = await vi.importActual<typeof import("@sports/prediction-engine")>(
    "@sports/prediction-engine",
  );
  return {
    scoreGames: mocks.scoreGames,
    buildPickSignalSnapshot: mocks.buildPickSignalSnapshot,
    selectionIsHomeSide: actual.selectionIsHomeSide,
    // The REAL grader and the REAL lock-selection rule, for the published-terms
    // tests below. Those grade the row this pipeline actually wrote; a stubbed
    // grader would only prove the stub agrees with itself.
    selectGradingLine: actual.selectGradingLine,
    calculatePickResult: actual.calculatePickResult,
    // Independent fair-value builders — null-safe stubs (network off in unit tests).
    isPoissonValidSport: actual.isPoissonValidSport ?? (() => false),
    poissonIndependentFairValue: vi.fn().mockReturnValue(null),
    fitEloRatingsFromResults: vi.fn().mockReturnValue(new Map()),
    eloFairValueFromRatings: vi.fn().mockReturnValue(null),
    powerIndexToIndependentFairValue: vi.fn().mockReturnValue(null),
  };
});

vi.mock("../source-snapshot.js", () => ({
  recordSourceSnapshot: vi.fn().mockResolvedValue(undefined),
}));

import { processSport, pickSelectionSide } from "../process-sport.js";
import { calculatePickResult, selectGradingLine } from "@sports/prediction-engine";

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
    mocks.pickCreate.mockResolvedValue({ id: "pick-1" });
    mocks.pickUpdateMany.mockResolvedValue({ count: 0 });
    mocks.oddsCreateMany.mockResolvedValue({ count: 0 });
    // Default: no existing pick → the create/update upsert path runs as before.
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.buildPickSignalSnapshot.mockReturnValue({ pickId: "pick-1" });
    mocks.snapshotUpsert.mockResolvedValue({});
    mocks.resolveRundownApiKey.mockReturnValue("");
    mocks.fetchRundownEventsForSport.mockResolvedValue({ events: [], remaining: null });
    mocks.eventsBelowBookmakerThreshold.mockImplementation((events: unknown[], min = 2) =>
      (events as { bookmakers?: unknown[] }[]).filter((e) => (e.bookmakers?.length ?? 0) < min),
    );
    mocks.mergeBookmakersIntoPrimary.mockImplementation((primary: unknown[]) => ({
      events: primary,
      filledGameIds: [],
      unmatchedSecondary: 0,
      skippedWellCovered: 0,
    }));
  });

  it("does not call Rundown when every primary event already has two books", async () => {
    mocks.resolveRundownApiKey.mockReturnValue("rundown-key");
    mocks.getOdds.mockResolvedValue({
      data: [
        {
          id: "odds-1",
          home_team: "Chiefs",
          away_team: "Bills",
          commence_time: "2026-08-23T17:00:00Z",
          bookmakers: [{ key: "fanduel" }, { key: "betmgm" }],
        },
      ],
      remainingRequests: 400,
    });

    await processSport(SPORT, "key", gates());

    expect(mocks.fetchRundownEventsForSport).not.toHaveBeenCalled();
  });

  it("calls Rundown only to thin-fill when a primary event has one book", async () => {
    mocks.resolveRundownApiKey.mockReturnValue("rundown-key");
    const primary = {
      id: "odds-1",
      home_team: "Chiefs",
      away_team: "Bills",
      commence_time: "2026-08-23T17:00:00Z",
      bookmakers: [{ key: "fanduel" }],
    };
    const secondary = {
      id: "rundown-1",
      home_team: "Chiefs",
      away_team: "Bills",
      commence_time: "2026-08-23T17:00:00Z",
      bookmakers: [{ key: "betmgm" }],
    };
    mocks.getOdds.mockResolvedValue({ data: [primary], remainingRequests: 400 });
    mocks.fetchRundownEventsForSport.mockResolvedValue({ events: [secondary], remaining: 19 });
    mocks.mergeBookmakersIntoPrimary.mockReturnValue({
      events: [{ ...primary, bookmakers: [{ key: "fanduel" }, { key: "betmgm" }] }],
      filledGameIds: ["odds-1"],
      unmatchedSecondary: 0,
      skippedWellCovered: 0,
    });

    await processSport(SPORT, "key", gates());

    expect(mocks.fetchRundownEventsForSport).toHaveBeenCalledTimes(1);
    expect(mocks.fetchRundownEventsForSport).toHaveBeenCalledWith(SPORT.key, "rundown-key");
    expect(mocks.mergeBookmakersIntoPrimary).toHaveBeenCalledWith([primary], [secondary], 2);
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

  it("soft-fails Odds API and succeeds empty when Rundown is also ABSENT (dual free-path)", async () => {
    // Dual-path law: primary Odds API failure must not hard-fail the sport when
    // a free fallback is attempted. With Rundown key ABSENT and no events, the
    // honest outcome is SUCCESS with oddsInserted=0 (does not advance kill-switch).
    mocks.getOdds.mockRejectedValue(new Error("quota exhausted"));
    mocks.normalizeGames.mockReturnValue([]);
    mocks.normalizeOdds.mockReturnValue([]);
    mocks.scoreGames.mockReturnValue([]);

    const result = await processSport(SPORT, "key", gates());

    expect(result).toMatchObject({
      status: "success",
      games: 0,
      picks: 0,
      oddsInserted: 0,
    });
    expect(result.note).toMatch(/no_events/);
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESS", oddsInserted: 0 }),
      })
    );
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects stale data — freshness failure fails the run (no-stale-data rule)", async () => {
    mocks.validateFreshness.mockReturnValue(false);

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/freshness/i);
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
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
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
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
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
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

    const call = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data["bookDisagreementAtLock"]).toBeCloseTo(1.0, 10);
    // Write-once: never in the updateMany path (immutable lock-time measurement).
    const upd = (mocks.pickUpdateMany.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
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

    const call = mocks.pickCreate.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    const awayDispersion = 100 / 210 - 100 / 230; // away implied-prob spread (+110 vs +130)
    expect(call.data["bookDisagreementAtLock"]).toBeCloseTo(awayDispersion, 10);
    expect(call.data["bookDisagreementAtLock"] as number).toBeGreaterThan(0);
    // Guard against the home-side regression: the home dispersion here is exactly 0.
    expect(call.data["bookDisagreementAtLock"]).not.toBe(0);
    // Write-once: never in the updateMany path (immutable lock-time measurement).
    expect(mocks.pickUpdateMany.mock.calls[0]![0]).not.toHaveProperty("bookDisagreementAtLock");
  });

  it("resolves an away ML pick to the AWAY dispersion even when the away team name is a SPACED PREFIX of the home team (#119 regression class)", async () => {
    // Fable/#119 bug class: a spaced-prefix heuristic (pickSelectionSide) would
    // match "St. Louis City SC" (the away team) against the home team string
    // "St. Louis City SC 2" and mis-derive the side. The canonical
    // selectionIsHomeSide is boundary-aware and prefers the MOST SPECIFIC match:
    // the away selection "St. Louis City SC ML (+150)" must resolve to the away
    // dispersion, not home.
    mocks.normalizeGames.mockReturnValue([
      normalizedGame({ homeTeam: "St. Louis City SC 2", awayTeam: "St. Louis City SC" }),
    ]);
    mocks.normalizeOdds.mockReturnValue([
      { gameExternalId: "ext-1", bookmaker: "a", market: "H2H", homePrice: -150, awayPrice: 130 },
      { gameExternalId: "ext-1", bookmaker: "b", market: "H2H", homePrice: -150, awayPrice: 110 },
    ]);
    mocks.freshGameIds.mockReturnValue(new Set(["ext-1"]));
    mocks.scoreGames.mockReturnValue([
      scoredPick({
        pickType: "MONEYLINE",
        selection: "St. Louis City SC ML (+130)",
        line: 130,
      }),
    ]);

    await processSport(SPORT, "key", gates());

    const call = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    const awayDispersion = 100 / 210 - 100 / 230;
    expect(call.data["bookDisagreementAtLock"]).toBeCloseTo(awayDispersion, 10);
    expect(call.data["bookDisagreementAtLock"]).not.toBe(0);
  });

  it("resolves a selection EXACTLY equal to the home team to the HOME dispersion (#119 regression class)", async () => {
    mocks.normalizeGames.mockReturnValue([
      normalizedGame({ homeTeam: "St. Louis City SC 2", awayTeam: "St. Louis City SC" }),
    ]);
    mocks.normalizeOdds.mockReturnValue([
      { gameExternalId: "ext-1", bookmaker: "a", market: "H2H", homePrice: -150, awayPrice: 130 },
      { gameExternalId: "ext-1", bookmaker: "b", market: "H2H", homePrice: -150, awayPrice: 110 },
    ]);
    mocks.freshGameIds.mockReturnValue(new Set(["ext-1"]));
    mocks.scoreGames.mockReturnValue([
      scoredPick({
        pickType: "MONEYLINE",
        selection: "St. Louis City SC 2 ML (-150)",
        line: -150,
      }),
    ]);

    await processSport(SPORT, "key", gates());

    const call = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    // Both books agree on the home price (-150) → home dispersion is exactly 0.
    expect(call.data["bookDisagreementAtLock"]).toBe(0);
  });

  it("writes null bookDisagreementAtLock when fewer than two books quote the kind", async () => {
    mocks.normalizeGames.mockReturnValue([normalizedGame()]);
    mocks.normalizeOdds.mockReturnValue([
      { gameExternalId: "ext-1", bookmaker: "a", market: "SPREADS", spread: -3 },
    ]);
    mocks.freshGameIds.mockReturnValue(new Set(["ext-1"]));

    await processSport(SPORT, "key", gates());

    const call = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data["bookDisagreementAtLock"]).toBeNull();
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
    mocks.pickCreate.mockRejectedValue(
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
    expect(mocks.pickCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isBootstrap: true }) })
    );
  });

  it("never lets a refresh overwrite isBootstrap or the CLV lock (immutable creation fields)", async () => {
    await processSport(SPORT, "key", gates());

    const call = mocks.pickCreate.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(call.data["clvLockLine"]).toBe(-3.5);
    // The updateMany path must not touch immutable creation fields.
    const upd = mocks.pickUpdateMany.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(upd.data).not.toHaveProperty("isBootstrap");
    expect(upd.data).not.toHaveProperty("clvLockLine");
    expect(upd.data).not.toHaveProperty("clvLockPrice");
    expect(upd.data).not.toHaveProperty("result");
    expect(upd.data).not.toHaveProperty("settledAt");
  });

  it("freezes a SETTLED pick — a refresh never rewrites a graded row", async () => {
    // The pick already exists and has been graded WIN by settlement.
    mocks.pickFindUnique.mockResolvedValue({ id: "pick-1", result: "WIN" });

    const result = await processSport(SPORT, "key", gates());

    // The run still succeeds, but the settled pick is left exactly as graded:
    // no upsert touches its selection/line/confidence/grade/reasoning.
    expect(result.status).toBe("success");
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
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
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
  });

  it("a line move on the SAME side still refreshes (no false flip-freeze)", async () => {
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-1",
      result: "PENDING",
      selection: "Chiefs -4.0",
    });
    mocks.scoreGames.mockReturnValue([scoredPick({ selection: "Chiefs -3.5" })]);
    // Existing PENDING pick → updateMany returns count 1 (update path).
    mocks.pickUpdateMany.mockResolvedValue({ count: 1 });

    await processSport(SPORT, "key", gates());

    expect(mocks.pickUpdateMany).toHaveBeenCalledTimes(1);
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

  it("a snapshot failure never kills the pick or the run", async () => {
    mocks.snapshotUpsert.mockRejectedValue(new Error("snapshot table locked"));

    const result = await processSport(SPORT, "key", gates());

    expect(result.status).toBe("success");
    expect(result.picks).toBe(1);
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

  // Nested (not a sibling describe) so it inherits the outer beforeEach above,
  // which resets every `mocks.*` call history and default resolved values
  // before each test — without it, mocks.getOdds call counts leak across
  // tests in this block.
  describe("EU Pinnacle line archive leg — double gate", () => {
    const ORIGINAL_ENABLED = process.env["LINE_ARCHIVE_ENABLED"];
    const ORIGINAL_EU_PINNACLE = process.env["LINE_ARCHIVE_EU_PINNACLE"];

    beforeEach(() => {
      delete process.env["LINE_ARCHIVE_ENABLED"];
      delete process.env["LINE_ARCHIVE_EU_PINNACLE"];
    });

    afterEach(() => {
      delete process.env["LINE_ARCHIVE_ENABLED"];
      delete process.env["LINE_ARCHIVE_EU_PINNACLE"];
      if (ORIGINAL_ENABLED !== undefined) process.env["LINE_ARCHIVE_ENABLED"] = ORIGINAL_ENABLED;
      if (ORIGINAL_EU_PINNACLE !== undefined) {
        process.env["LINE_ARCHIVE_EU_PINNACLE"] = ORIGINAL_EU_PINNACLE;
      }
    });

    it("makes exactly one Odds API request per sport when both flags are off (the default)", async () => {
      await processSport(SPORT, "key", gates());

      expect(mocks.getOdds).toHaveBeenCalledTimes(1);
    });

    it("makes a second request (regions=eu, bookmakers=pinnacle) only when both flags are true", async () => {
      process.env["LINE_ARCHIVE_ENABLED"] = "true";
      process.env["LINE_ARCHIVE_EU_PINNACLE"] = "true";

      await processSport(SPORT, "key", gates());

      expect(mocks.getOdds).toHaveBeenCalledTimes(2);
      expect(mocks.getOdds).toHaveBeenNthCalledWith(
        2,
        SPORT.key,
        ["h2h", "spreads", "totals"],
        { regions: "eu", bookmakers: ["pinnacle"] },
      );
    });

    it("does not make the second request when only one of the two flags is true", async () => {
      process.env["LINE_ARCHIVE_ENABLED"] = "true"; // LINE_ARCHIVE_EU_PINNACLE left unset

      await processSport(SPORT, "key", gates());

      expect(mocks.getOdds).toHaveBeenCalledTimes(1);
    });

    it("a Pinnacle-leg fetch failure is swallowed with a warning and never blocks the main run", async () => {
      process.env["LINE_ARCHIVE_ENABLED"] = "true";
      process.env["LINE_ARCHIVE_EU_PINNACLE"] = "true";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // First call (main US-region fetch) succeeds; second call (the eu/pinnacle
      // leg, distinguished by the presence of the 3rd `options` arg) fails.
      mocks.getOdds.mockImplementation(
        (async (
          _sport: string,
          _markets: string[],
          options?: { regions: string; bookmakers: string[] },
        ) => {
          if (options) {
            throw new Error("eu region rate limited");
          }
          return { data: [{ raw: true }], remainingRequests: 400 };
        }) as typeof mocks.getOdds,
      );

      const result = await processSport(SPORT, "key", gates());

      expect(result.status).toBe("success");
      expect(result.picks).toBe(1);
      expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("EU Pinnacle line archive failed"),
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("eu region rate limited"));

      warnSpy.mockRestore();
    });
  });
});

/**
 * FINDING 2 — the pick the customer sees must be the pick that gets graded.
 *
 * Settlement grades SPREAD/TOTAL against the write-once CLV lock
 * (`selectGradingLine` → `clvLockLine ?? line`, settle-sport.ts). The refresh
 * cycle used to rewrite `selection`, `line`, `reasoning` and `reasoningShort`
 * on every pass while the row was PENDING, so the published artifact walked
 * away from the number it would be settled at:
 *
 *   Tue  created at consensus -3.0 → clvLockLine = -3.0, card "Chiefs -3.0"
 *   Thu  consensus moves to -4.5   → card "Chiefs -4.5", lock still -3.0
 *   Chiefs win by 4 → we book a WIN at -3.0; every customer who opened /picks
 *                     after Thursday saw -4.5, which LOST.
 *
 * Grading at lock time is correct and is NOT changed here. What is fixed is the
 * published artifact drifting off it. These tests run the real pipeline write
 * path and then grade the row it produced with the real grader.
 */
describe("published bet terms are write-once (Finding 2 — display must equal the graded line)", () => {
  /** The number a customer reads off a card — parsed back out of `selection`. */
  function displayedNumber(selection: string): number {
    const match = selection.match(/[+-]?\d+(?:\.\d+)?$/);
    expect(match, `no number in selection "${selection}"`).toBeTruthy();
    return Number(match![0]);
  }

  beforeEach(() => {
    // This describe sits OUTSIDE `describe("processSport")`, so the reset in that
    // block's beforeEach does not reach it. Reset here or call history leaks in
    // from earlier tests and `mock.calls[0]` reads someone else's write.
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
    mocks.pickCreate.mockResolvedValue({ id: "pick-1" });
    mocks.oddsCreateMany.mockResolvedValue({ count: 0 });
    mocks.buildPickSignalSnapshot.mockReturnValue({ pickId: "pick-1" });
    mocks.snapshotUpsert.mockResolvedValue({});
    mocks.resolveRundownApiKey.mockReturnValue("");
    mocks.fetchRundownEventsForSport.mockResolvedValue({ events: [], remaining: null });
    mocks.eventsBelowBookmakerThreshold.mockReturnValue([]);
    mocks.mergeBookmakersIntoPrimary.mockImplementation((primary: unknown[]) => ({
      events: primary,
      filledGameIds: [],
      unmatchedSecondary: 0,
      skippedWellCovered: 0,
    }));
  });

  it("a refresh never rewrites selection / line / reasoning on a PENDING pick", async () => {
    mocks.scoreGames.mockReturnValue([scoredPick({ selection: "Chiefs -4.5", line: -4.5 })]);
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-1",
      result: "PENDING",
      selection: "Chiefs -3.0",
    });
    mocks.pickUpdateMany.mockResolvedValue({ count: 1 });

    await processSport(SPORT, "key", gates());

    const upd = mocks.pickUpdateMany.mock.calls[0]![0] as { data: Record<string, unknown> };
    // The four published-bet fields. `line` is what `selectGradingLine` falls
    // back to for legacy rows and what the TOTAL card prints; `selection` is the
    // SPREAD card's only number; the two reasoning strings QUOTE the handicap.
    expect(upd.data).not.toHaveProperty("selection");
    expect(upd.data).not.toHaveProperty("line");
    expect(upd.data).not.toHaveProperty("reasoning");
    expect(upd.data).not.toHaveProperty("reasoningShort");
    // Genuinely live fields still refresh — freezing the bet is not freezing the row.
    expect(upd.data).toHaveProperty("confidence");
    expect(upd.data).toHaveProperty("bookmakerCount");
  });

  it("mints display, lock and graded line as ONE value at creation", async () => {
    mocks.scoreGames.mockReturnValue([
      scoredPick({
        selection: "Chiefs -3.0",
        line: -3,
        // The engine's real reasoning QUOTES the handicap (scoring.ts), which is
        // why it is frozen with the other published terms.
        reasoning: "Chiefs -3.0 backed by 83% of 6 bookmakers.",
      }),
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.pickUpdateMany.mockResolvedValue({ count: 0 });

    await processSport(SPORT, "key", gates());

    const created = (mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(created["clvLockLine"]).toBe(-3);
    expect(created["line"]).toBe(created["clvLockLine"]);
    expect(displayedNumber(created["selection"] as string)).toBe(created["line"]);
    expect(created["reasoning"]).toContain("-3.0");
  });

  it("END-TO-END: after the consensus moves, the number on the card is still the number settlement grades", async () => {
    // ── Tuesday: the pick is published at the consensus -3.0. ──
    mocks.scoreGames.mockReturnValue([
      scoredPick({
        selection: "Chiefs -3.0",
        line: -3,
        reasoning: "Chiefs -3.0 backed by 83% of 6 bookmakers.",
        reasoningShort: "83% of bookmakers favor Chiefs -3.0.",
      }),
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.pickUpdateMany.mockResolvedValue({ count: 0 });

    await processSport(SPORT, "key", gates());

    const created = (mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    // The stored row, exactly as the DB now holds it.
    const row = {
      selection: created["selection"] as string,
      line: created["line"] as number,
      reasoning: created["reasoning"] as string,
      clvLockLine: created["clvLockLine"] as number | null,
    };
    expect(row.clvLockLine).toBe(-3);

    // ── Thursday: the market moves to -4.5 and the refresh cycle runs again. ──
    // Clear BOTH write mocks: the create-path cycle above also calls updateMany
    // first (it returns count 0 before falling through to create), so reading
    // `calls[0]` below would read Tuesday's payload and the test would pass
    // against pre-fix code.
    mocks.pickCreate.mockClear();
    mocks.pickUpdateMany.mockClear();
    mocks.scoreGames.mockReturnValue([
      scoredPick({
        selection: "Chiefs -4.5",
        line: -4.5,
        reasoning: "Chiefs -4.5 backed by 91% of 6 bookmakers.",
        reasoningShort: "91% of bookmakers favor Chiefs -4.5.",
      }),
    ]);
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-1",
      result: "PENDING",
      selection: row.selection,
    });
    mocks.pickUpdateMany.mockResolvedValue({ count: 1 });

    await processSport(SPORT, "key", gates());

    // Apply the refresh payload to the stored row, the way Postgres would.
    const upd = (mocks.pickUpdateMany.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    Object.assign(row, upd);

    // The published bet is untouched by the move.
    expect(row.selection).toBe("Chiefs -3.0");
    expect(row.line).toBe(-3);
    expect(row.reasoning).toContain("-3.0");
    expect(row.clvLockLine).toBe(-3);

    // ── Saturday: Chiefs win 24-20 (by 4). Settlement grades the LOCK. ──
    const gradingLine = selectGradingLine(row);
    // THE FINDING-2 INVARIANT: the number a customer reads off the card is the
    // number settlement grades. Asserted at settlement time, on the real row.
    expect(displayedNumber(row.selection)).toBe(gradingLine);

    const graded = calculatePickResult(
      "SPREAD",
      row.selection,
      gradingLine,
      "Chiefs",
      24,
      20,
      "americanfootball_nfl",
      "Bills",
    );
    // Grading the DISPLAYED number and grading the LOCKED number must not be
    // two different bets. Pre-fix the card read "Chiefs -4.5" (4 - 4.5 < 0 =
    // LOSS) while we booked this WIN at -3.0.
    const gradedAtDisplayed = calculatePickResult(
      "SPREAD",
      row.selection,
      displayedNumber(row.selection),
      "Chiefs",
      24,
      20,
      "americanfootball_nfl",
      "Bills",
    );
    expect(graded).toBe("WIN");
    expect(gradedAtDisplayed).toBe(graded);
  });

  it("END-TO-END (TOTAL): the printed total and the graded total stay one number", async () => {
    mocks.scoreGames.mockReturnValue([
      scoredPick({ pickType: "TOTAL", selection: "OVER 45.0", line: 45 }),
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.pickUpdateMany.mockResolvedValue({ count: 0 });

    await processSport(SPORT, "key", gates());
    const created = (mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    const row = {
      selection: created["selection"] as string,
      line: created["line"] as number,
      clvLockLine: created["clvLockLine"] as number | null,
    };

    // The total drifts up to 48.5 on the next cycle. Clear the create-cycle's
    // own updateMany call first — see the SPREAD test above.
    mocks.pickCreate.mockClear();
    mocks.pickUpdateMany.mockClear();
    mocks.scoreGames.mockReturnValue([
      scoredPick({ pickType: "TOTAL", selection: "OVER 48.5", line: 48.5 }),
    ]);
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-1",
      result: "PENDING",
      selection: row.selection,
    });
    mocks.pickUpdateMany.mockResolvedValue({ count: 1 });

    await processSport(SPORT, "key", gates());
    Object.assign(
      row,
      (mocks.pickUpdateMany.mock.calls[0]![0] as { data: Record<string, unknown> }).data,
    );

    // A TOTAL card prints BOTH `selection` and `line`; they must agree with each
    // other and with the lock, or the same card contradicts itself.
    expect(row.selection).toBe("OVER 45.0");
    expect(row.line).toBe(45);
    expect(displayedNumber(row.selection)).toBe(selectGradingLine(row));
    expect(row.line).toBe(selectGradingLine(row));

    // A 45-point final pushes at the printed number — and is graded a PUSH.
    expect(
      calculatePickResult(
        "TOTAL",
        row.selection,
        selectGradingLine(row),
        "Chiefs",
        24,
        21,
        "americanfootball_nfl",
        "Bills",
      ),
    ).toBe("PUSH");
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
